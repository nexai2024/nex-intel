'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';
import { MonitoringToggle } from '@/app/components/MonitoringToggle';

type RunRow = { id: string; status: string; createdAt: string; completedAt?: string | null };

export default function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const [projectId, setProjectId] = useState<string>('');
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    (async () => {
      const { id } = await params;
      setProjectId(id);
    })();
  }, [params]);
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/runs`);
        if (!res.ok) {
          console.error('Failed to fetch runs', await res.text());
          setRuns([]);
          return;
        }
        const data = await res.json();
        setRuns(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error loading runs', err);
        setRuns([]);
      }
    })();
  }, [projectId]);

  const allChecked = useMemo(() => runs.length > 0 && selected.size === runs.length, [runs, selected]);

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(runs.map(r => r.id)));
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function startNew() {
    setBusy(true);
    await fetch('/api/runs/start', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId })
    });
    setBusy(false);
    alert('Run started.');
  }

  async function rerunSelected() {
    if (selected.size === 0) return;
    setBusy(true);
    // Create a fresh run for the project for each selected previous run
    // (equivalent to rerun: create new run referencing same project)
    const ids = Array.from(selected);
    for (const _ of ids) {
      await fetch('/api/runs/start', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
    }
    setBusy(false);
    alert(`Started ${ids.length} reruns.`);
  }

  return (
    <main className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: 'Project Details', current: true }
        ]}
      />

      <header className="flex flex-col sm:flex sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Project Details</h1>
          <p className="text-sm text-gray-600">Monitor runs, configure settings, and manage your competitive intelligence analysis.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={startNew} disabled={busy}>{busy ? 'Working…' : 'Start New Run'}</button>
          <Link className="btn" href="/projects">Back to Projects</Link>
        </div>
      </header>

      <MonitoringToggle projectId={projectId} />

      <div className="card overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="p-2">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              </th>
              <th className="p-2 text-left">Run</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Created</th>
              <th className="p-2 text-left">Completed</th>
              <th className="p-2 text-right">Open</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-center text-gray-500">No runs yet.</td></tr>
            ) : runs.map(r => (
              <tr key={r.id} className="border-b">
                <td className="p-2">
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} />
                </td>
                <td className="p-2">{r.id}</td>
                <td className="p-2">
                  <span className="badge bg-indigo-100 text-indigo-800">{r.status}</span>
                </td>
                <td className="p-2">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="p-2">{r.completedAt ? new Date(r.completedAt).toLocaleString() : '—'}</td>
                <td className="p-2 text-right">
                  <Link className="btn" href={`/runs/${r.id}`}>Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button className="btn" disabled={selected.size === 0 || busy} onClick={rerunSelected}>
          {busy ? 'Working…' : `Rerun ${selected.size} Selected`}
        </button>
      </div>
    </main>
  );
}