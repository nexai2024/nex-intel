'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardStats {
  totalProjects: number;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  avgRunTime: number;
  creditsUsed: number;
  creditsLimit: number;
  recentRuns: Array<{
    id: string;
    projectName: string;
    status: string;
    createdAt: string;
    completedAt?: string | null;
  }>;
  topProjects: Array<{
    id: string;
    name: string;
    runCount: number;
    lastRunStatus: string;
    lastRunDate: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const response = await fetch('/api/dashboard/stats');
        if (!response.ok) throw new Error('Failed to load dashboard data');
        const data = await response.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const creditUsagePercent = stats ? Math.round((stats.creditsUsed / stats.creditsLimit) * 100) : 0;
  const successRate = stats ? Math.round((stats.completedRuns / stats.totalRuns) * 100) : 0;

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your competitive intelligence activities</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-indigo-600 rounded-full"></div>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Projects</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.totalProjects || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-green-600 rounded-full"></div>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed Runs</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.completedRuns || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{successRate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-purple-600 rounded-full"></div>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Run Time</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.avgRunTime || 0}m</p>
            </div>
          </div>
        </div>
      </div>

      {/* Credits Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Credits Usage</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Used</span>
                <span className="font-medium">{stats?.creditsUsed || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Limit</span>
                <span className="font-medium">{stats?.creditsLimit || 1000}</span>
              </div>
              <div className="pt-3">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Usage</span>
                  <span className="font-medium">{creditUsagePercent}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      creditUsagePercent >= 80 ? 'bg-red-500' : creditUsagePercent >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${creditUsagePercent}%` }}
                  ></div>
                </div>
                {creditUsagePercent >= 80 && (
                  <p className="text-xs text-red-600 mt-2">Approaching credit limit</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {stats?.recentRuns.length === 0 ? (
                <p className="text-gray-500 text-sm">No recent activity</p>
              ) : (
                stats?.recentRuns.map((run) => (
                  <div key={run.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        run.status === 'COMPLETE' ? 'bg-green-500' :
                        run.status === 'FAILED' ? 'bg-red-500' :
                        run.status === 'RUNNING' ? 'bg-blue-500' : 'bg-gray-400'
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{run.projectName}</p>
                        <p className="text-xs text-gray-500">{new Date(run.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        run.status === 'COMPLETE' ? 'bg-green-100 text-green-800' :
                        run.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                        run.status === 'RUNNING' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {run.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top Projects */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Top Projects</h3>
          <Link href="/projects" className="text-sm text-indigo-600 hover:text-indigo-800">
            View all projects →
          </Link>
        </div>
        <div className="space-y-3">
          {stats?.topProjects.length === 0 ? (
            <p className="text-gray-500 text-sm">No projects yet</p>
          ) : (
            stats?.topProjects.map((project) => (
              <div key={project.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{project.name}</p>
                    <p className="text-xs text-gray-500">{project.runCount} runs</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    project.lastRunStatus === 'COMPLETE' ? 'bg-green-100 text-green-800' :
                    project.lastRunStatus === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {project.lastRunStatus}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(project.lastRunDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}