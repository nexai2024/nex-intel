'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';
import { LoadingTable } from '@/app/components/LoadingStates';
import { useLoading } from '@/app/hooks/useGlobalLoading';
import { useError } from '@/app/hooks/useGlobalError';

type ProjectRow = {
  id: string;
  name: string;
  category?: string | null;
  createdAt: string;
  runsCount?: number;
  lastRun?: { id: string; status: string; createdAt: string; completedAt?: string | null } | null;
};

export default function ProjectsPage() {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [bulkBusy, setBulkBusy] = useState(false);
  const { withLoading } = useLoading();
  const { showError } = useError();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await fetch('/api/projects?includeStats=1').then(r => r.json());
        setRows(data);
      } catch (error) {
        showError('Failed to load projects');
        console.error('Failed to load projects:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const allChecked = useMemo(() => rows.length > 0 && selected.size === rows.length, [rows, selected]);

  function toggleAll() {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(rows.map(r => r.id)));
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function startSelected() {
    if (selected.size === 0) return;
    await withLoading(
      fetch('/api/runs/bulk-start', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectIds: Array.from(selected) })
      }),
      'Starting runs for selected projects'
    );
    alert('Runs started for selected projects.');
  }

  async function rerunLatestSelected() {
    if (selected.size === 0) return;
    await withLoading(
      fetch('/api/runs/bulk-rerun-latest', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectIds: Array.from(selected) })
      }),
      'Rerunning latest runs for selected projects'
    );
    alert('Reruns kicked for selected projects.');
  }

  async function startSingle(projectId: string) {
    await fetch('/api/runs/start', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId })
    });
    alert('Run started.');
  }

  async function rerunLast(projectId: string, lastRunId?: string) {
    if (!lastRunId) return;
    await fetch(`/api/runs/${lastRunId}/rerun`, { method: 'POST' });
    alert('Rerun started.');
  }

  return (
    <main className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Projects', current: true }
        ]}
      />

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-gray-600">Manage projects and kick off analyses from a single screen.</p>
        </div>
        <Link href="/projects/new" className="btn btn-primary">New Project</Link>
      </header>

      <div className="card p-3 flex items-center justify-between">
        <div className="text-sm">
          Selected: <strong>{selected.size}</strong> of {rows.length}
        </div>
        <div className="flex gap-2">
          <button disabled={selected.size === 0 || bulkBusy} className="btn" onClick={startSelected}>
            {bulkBusy ? 'Working…' : 'Start Runs for Selected'}
          </button>
          <button disabled={selected.size === 0 || bulkBusy} className="btn" onClick={rerunLatestSelected}>
            {bulkBusy ? 'Working…' : 'Rerun Latest for Selected'}
          </button>
        </div>
      </div>

      <div className="overflow-auto">
        {loading ? (
          <LoadingTable rows={5} columns={7} />
        ) : rows.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📁</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-6">Create your first competitive intelligence project</p>
            <Link href="/projects/new" className="btn btn-primary">Create Your First Project</Link>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-black/5">
              <tr>
                <th className="p-2">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                </th>
                <th className="p-2 text-left">Project</th>
                <th className="p-2 text-left">Category</th>
                <th className="p-2 text-left">Runs</th>
                <th className="p-2 text-left">Last Run</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
              <tr key={r.id} className="border-b">
                <td className="p-2">
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} />
                </td>
                <td className="p-2">
                  <div className="font-medium">
                    <Link className="underline" href={`/projects/${r.id}`}>{r.name}</Link>
                  </div>
                  <div className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</div>
                </td>
                <td className="p-2">{r.category ?? '—'}</td>
                <td className="p-2">{r.runsCount ?? '—'}</td>
                <td className="p-2">{r.lastRun ? new Date(r.lastRun.createdAt).toLocaleString() : '—'}</td>
                <td className="p-2">
                  {r.lastRun ? (
                    <span className="badge bg-indigo-100 text-indigo-800">{r.lastRun.status}</span>
                  ) : <span className="text-xs text-gray-500">No runs</span>}
                </td>
                <td className="p-2 text-right">
                  <div className="inline-flex gap-2">
                    <button className="btn" onClick={() => startSingle(r.id)}>Start Run</button>
                    <button className="btn" disabled={!r.lastRun} onClick={() => rerunLast(r.id, r.lastRun?.id)}>Rerun Last</button>
                    <Link className="btn" href={`/runs?projectId=${r.id}`}>View Runs</Link>
                  </div>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}