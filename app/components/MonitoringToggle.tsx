'use client';
import { useState, useEffect } from 'react';

interface MonitoringStatus {
  isMonitored: boolean;
  scheduledTasks: number;
  nextRun: string | null;
  upcomingRuns: Array<{
    id: string;
    scheduledFor: string;
    priority: number;
  }>;
}

export function MonitoringToggle({ projectId }: { projectId: string }) {
  const [status, setStatus] = useState<MonitoringStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadMonitoringStatus();
  }, [projectId]);

  async function loadMonitoringStatus() {
    try {
      const response = await fetch(`/api/projects/${projectId}/monitoring`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to load monitoring status:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleMonitoring() {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/monitoring`, {
        method: status?.isMonitored ? 'DELETE' : 'POST'
      });

      if (response.ok) {
        await loadMonitoringStatus();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error?.message || 'Failed to update monitoring'}`);
      }
    } catch (error) {
      console.error('Failed to toggle monitoring:', error);
      alert('Failed to update monitoring status');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="card p-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
          <span className="text-sm text-gray-600">Loading monitoring status...</span>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="card p-4">
        <div className="text-sm text-gray-600">Monitoring status unavailable</div>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Real-time Monitoring</h3>
          <p className="text-sm text-gray-600 mt-1">
            Automatically re-run analysis to detect competitive changes
          </p>
        </div>
        <button
          onClick={toggleMonitoring}
          disabled={actionLoading}
          className={`btn ${status.isMonitored ? 'btn-danger' : 'btn-primary'}`}
        >
          {actionLoading ? 'Working...' : status.isMonitored ? 'Disable Monitoring' : 'Enable Monitoring'}
        </button>
      </div>

      {status.isMonitored && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-700">Monitoring enabled</span>
          </div>

          {status.nextRun && (
            <div className="text-sm">
              <span className="text-gray-600">Next scheduled run: </span>
              <span className="font-medium">
                {new Date(status.nextRun).toLocaleDateString()} at {new Date(status.nextRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}

          {status.upcomingRuns.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Upcoming Runs</h4>
              <div className="space-y-2">
                {status.upcomingRuns.slice(0, 3).map((run) => (
                  <div key={run.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                      {new Date(run.scheduledFor).toLocaleDateString()} at {new Date(run.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-gray-500">
                      Priority {run.priority}
                    </span>
                  </div>
                ))}
                {status.upcomingRuns.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{status.upcomingRuns.length - 3} more scheduled runs
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>How it works:</strong> CompeteIQ will automatically re-run your competitive analysis every 7 days, alerting you to important changes in the competitive landscape.
            </div>
          </div>
        </div>
      )}

      {!status.isMonitored && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-sm text-gray-600">Monitoring disabled</span>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg">
            <div className="text-sm text-amber-800">
              <strong>Enable monitoring</strong> to automatically detect competitive changes and receive alerts when significant updates occur.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}