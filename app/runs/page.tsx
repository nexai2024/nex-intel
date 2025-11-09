'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';

type Row = { id: string; status: string; createdAt: string; completedAt?: string | null; project: { id: string; name: string } };
type Resp = { rows: Row[]; total: number; page: number; pageSize: number };

export default function RunsIndex({ searchParams }: any) {
  const [data, setData] = useState<Resp>({ rows: [], total: 0, page: 1, pageSize: 25 });
  const [filters, setFilters] = useState({ projectId: '', status: '', q: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);

  async function load(page = 1) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(data.pageSize) });
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    const res = await fetch(`/api/runs?${params.toString()}`).then(r => r.json());
    setData(res);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function rerun(id: string) {
    await fetch(`/api/runs/${id}/rerun`, { method: 'POST' });
    alert('Rerun started.');
  }
  async function cancel(id: string) {
    const res = await fetch(`/api/runs/${id}/cancel`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) alert(json.error || 'Failed'); else alert('Run cancelled.');
    await load(data.page);
  }

  return (
    <main className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Runs', current: true }
        ]}
      />

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Runs</h1>
          <p className="text-sm text-gray-600">Monitor and manage all your competitive intelligence runs.</p>
        </div>
        <div className="flex gap-2">
          <Link className="btn" href="/projects">Projects</Link>
        </div>
      </header>

      <div className="card p-3 grid md:grid-cols-5 gap-3">
        <input placeholder="Search by Run ID" value={filters.q} onChange={e => setFilters({ ...filters, q: e.target.value })} />
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          {['NEW','DISCOVERING','EXTRACTING','SYNTHESIZING','QA','COMPLETE','ERROR','SKIPPED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} />
        <input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} />
        <button className="btn btn-primary" onClick={() => load(1)}>Filter</button>
      </div>

      <div className="card overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="p-2 text-left">Run</th>
              <th className="p-2 text-left">Project</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Created</th>
              <th className="p-2 text-left">Completed</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-4 text-center text-gray-500">Loading…</td></tr>
            ) : data.rows.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-center text-gray-500">No runs found.</td></tr>
            ) : data.rows.map(r => (
              <tr key={r.id} className="border-b">
                <td className="p-2"><Link className="underline" href={`/runs/${r.id}`}>{r.id}</Link></td>
                <td className="p-2"><Link className="underline" href={`/projects/${r.project.id}`}>{r.project.name}</Link></td>
                <td className="p-2"><span className="badge bg-indigo-100 text-indigo-800">{r.status}</span></td>
                <td className="p-2">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="p-2">{r.completedAt ? new Date(r.completedAt).toLocaleString() : '—'}</td>
                <td className="p-2 text-right">
                  <div className="inline-flex gap-2">
                    <button className="btn" onClick={() => rerun(r.id)}>Rerun</button>
                    <button className="btn" onClick={() => cancel(r.id)} disabled={!['NEW','DISCOVERING','EXTRACTING','SYNTHESIZING','RUNNING','PENDING'].includes(r.status)}>Cancel</button>
                    <Link className="btn" href={`/runs/${r.id}`}>Open</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.total > data.pageSize && (
        <div className="flex items-center justify-center gap-2">
          <button className="btn" onClick={() => load(Math.max(1, data.page - 1))} disabled={data.page <= 1}>Prev</button>
          <span className="text-sm">Page {data.page} of {Math.ceil(data.total / data.pageSize)}</span>
          <button className="btn" onClick={() => load(Math.min(Math.ceil(data.total / data.pageSize), data.page + 1))} disabled={data.page >= Math.ceil(data.total / data.pageSize)}>Next</button>
        </div>
      )}
    </main>
  );
}