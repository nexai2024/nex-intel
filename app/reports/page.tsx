'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Report {
  id: string;
  headline: string;
  format: string;
  createdAt: string;
  projectId: string;
  runId: string;
  project: {
    id: string;
    name: string;
  };
  run: {
    id: string;
    status: string;
    createdAt: string;
  };
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'markdown' | 'notion'>('all');

  useEffect(() => {
    loadReports();
  }, [filter]);

  async function loadReports() {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports?format=${filter === 'all' ? '' : filter}`);
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Reports</h1>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-gray-600 mt-1">
            View all your competitive intelligence reports and analyses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Reports</option>
            <option value="markdown">Markdown Reports</option>
            <option value="notion">Notion Exports</option>
          </select>
        </div>
      </header>

      {reports.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reports yet</h3>
          <p className="text-gray-600 mb-6">
            Start by creating a project and running your first competitive analysis.
          </p>
          <Link href="/projects/new" className="btn btn-primary">
            Create Your First Project
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {report.headline}
                    </h3>
                    <span className={`badge ${
                      report.format === 'MARKDOWN'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {report.format === 'MARKDOWN' ? 'Markdown' : 'Notion'}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      <span className="font-medium">Project:</span>{' '}
                      <Link
                        href={`/projects/${report.projectId}`}
                        className="text-indigo-600 hover:text-indigo-800 underline"
                      >
                        {report.project.name}
                      </Link>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>{' '}
                      <span className={`badge ${
                        report.run.status === 'COMPLETE'
                          ? 'bg-green-100 text-green-800'
                          : report.run.status === 'ERROR'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {report.run.status}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>{' '}
                      {new Date(report.createdAt).toLocaleDateString()} at{' '}
                      {new Date(report.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Link
                    href={`/runs/${report.runId}`}
                    className="btn btn-ghost text-sm"
                  >
                    View Analysis
                  </Link>
                  {report.format === 'MARKDOWN' && (
                    <>
                      <a
                        href={`/api/runs/${report.runId}/matrix/features`}
                        className="btn btn-ghost text-sm"
                        download
                      >
                        Download CSV
                      </a>
                      <form
                        method="POST"
                        action={`/api/exports/pdf`}
                        className="inline"
                      >
                        <input type="hidden" name="runId" value={report.runId} />
                        <button type="submit" className="btn btn-ghost text-sm">
                          Export PDF
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}