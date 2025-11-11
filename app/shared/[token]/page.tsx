'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface SharedReportData {
  report: {
    id: string;
    headline: string;
    mdContent: string;
    format: string;
    createdAt: string;
  };
  project: {
    id: string;
    name: string;
  };
  share: {
    id: string;
    token: string;
    expiresAt?: string;
    hasPassword: boolean;
    allowDownload: boolean;
    createdAt: string;
  };
  createdBy: {
    name?: string;
    email: string;
  };
}

export default async function SharedReportPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<SharedReportData | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    fetchReport();
  }, [token]);

  const fetchReport = async (attemptPassword?: string) => {
    try {
      setLoading(true);
      setError(null);
      setPasswordError('');

      const response = await fetch(`/api/shared/${token}`, {
        method: attemptPassword ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        ...(attemptPassword && {
          body: JSON.stringify({ password: attemptPassword }),
        }),
      });

      if (response.status === 401) {
        setPasswordRequired(true);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load report');
      }

      const data = await response.json();
      setReportData(data);
      setPasswordRequired(false);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid password')) {
        setPasswordError('Invalid password');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setPasswordError('Password is required');
      return;
    }
    fetchReport(password);
  };

  const handleDownload = async () => {
    if (!reportData?.share.allowDownload) return;

    try {
      const response = await fetch(`/api/shared/${token}/download`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportData.project.name} - ${reportData.report.headline}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download report');
    }
  };

  const renderMarkdown = async (content: string) => {
    if (typeof content !== 'string') {
      return { __html: '' };
    }
    let html = typeof marked.parse === 'function'
      ? await Promise.resolve(marked.parse(content as string))
      : await Promise.resolve(marked(content as string));

    if (typeof html !== 'string') html = '';

    return { __html: DOMPurify.sanitize(html) };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Unavailable</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Nex-Intel
          </button>
        </div>
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <div className="text-blue-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Required</h1>
            <p className="text-gray-600">This report is password protected. Please enter the password to view it.</p>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter password"
              />
              {passwordError && (
                <p className="mt-2 text-sm text-red-600">{passwordError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Unlock Report
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  const { report, project, share, createdBy } = reportData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                <span>Shared by {createdBy.name || createdBy.email}</span>
                <span>•</span>
                <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                {share.expiresAt && (
                  <>
                    <span>•</span>
                    <span>Expires {new Date(share.expiresAt).toLocaleDateString()}</span>
                  </>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{report.headline}</h1>
              <p className="text-lg text-gray-600 mt-2">{project.name}</p>
            </div>

            {share.allowDownload && (
              <button
                onClick={handleDownload}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download PDF</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-8">
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={await renderMarkdown(report.mdContent)}
            >
          </div>
        </div>
      </div>
      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          This report was generated by{' '}
          <a href="/" className="text-blue-600 hover:text-blue-700">
            Nex-Intel
          </a>{' '}
          - Evidence-first competitive intelligence.
        </p>
        {share.expiresAt && (
          <p className="mt-2">
            This link expires on {new Date(share.expiresAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
    </div >
  );
}