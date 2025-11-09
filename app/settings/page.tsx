'use client';
import { useEffect, useState } from 'react';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';

type Settings = {
  searchProvider?: 'tavily'|'serpapi'|''; tavilyKey?: string; serpapiKey?: string;
  notionToken?: string; notionParentPageId?: string; stalenessDays?: number;
};

export default function SettingsPage() {
  const [s, setS] = useState<Settings>({ searchProvider: '' });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<{search?: boolean; notion?: boolean}>({});

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setS);
    // theme persistence on load
    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.classList.toggle('dark', saved === 'dark');
  }, []);

  async function save() {
    setSaving(true);
    await fetch('/api/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(s) });
    setSaving(false);
    alert('Settings saved.');
  }

  async function testSearch() {
    setTesting(x => ({ ...x, search: true }));
    const res = await fetch('/api/settings/test-search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(s) });
    setTesting(x => ({ ...x, search: false }));
    const json = await res.json();
    alert(json.ok ? `Search connected: ${json.sample?.source ?? 'ok'}` : `Failed: ${json.error}`);
  }

  async function testNotion() {
    setTesting(x => ({ ...x, notion: true }));
    const res = await fetch('/api/settings/test-notion', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(s) });
    setTesting(x => ({ ...x, notion: false }));
    const json = await res.json();
    alert(json.ok ? `Notion connected` : `Failed: ${json.error ?? json.status}`);
  }

  return (
    <main className="max-w-3xl space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', current: true }
        ]}
      />

      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-gray-600">Manage integrations and QA guardrails. All changes affect new runs.</p>
      </header>

      <section className="card p-4 space-y-3">
        <h2 className="font-medium">Search Provider</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <div className="text-sm text-gray-600">Provider</div>
            <select value={s.searchProvider ?? ''} onChange={e => setS({ ...s, searchProvider: e.target.value as any })}>
              <option value="">None</option>
              <option value="tavily">Tavily</option>
              <option value="serpapi">SerpAPI</option>
            </select>
          </label>
          {s.searchProvider === 'tavily' && (
            <label className="block">
              <div className="text-sm text-gray-600">Tavily API Key</div>
              <input type="password" value={s.tavilyKey ?? ''} onChange={e => setS({ ...s, tavilyKey: e.target.value })} placeholder="tvly-..." />
            </label>
          )}
          {s.searchProvider === 'serpapi' && (
            <label className="block">
              <div className="text-sm text-gray-600">SerpAPI Key</div>
              <input type="password" value={s.serpapiKey ?? ''} onChange={e => setS({ ...s, serpapiKey: e.target.value })} placeholder="..." />
            </label>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={testSearch} disabled={!!testing.search}>{testing.search ? 'Testing…' : 'Test Connection'}</button>
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-medium">Notion</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <div className="text-sm text-gray-600">Integration Token</div>
            <input type="password" value={s.notionToken ?? ''} onChange={e => setS({ ...s, notionToken: e.target.value })} />
          </label>
          <label className="block">
            <div className="text-sm text-gray-600">Parent Page ID</div>
            <input value={s.notionParentPageId ?? ''} onChange={e => setS({ ...s, notionParentPageId: e.target.value })} />
          </label>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={testNotion} disabled={!!testing.notion}>{testing.notion ? 'Testing…' : 'Test Connection'}</button>
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-medium">Guardrails</h2>
        <label className="block">
          <div className="text-sm text-gray-600">Staleness Days</div>
          <input type="number" min={30} value={s.stalenessDays ?? 180} onChange={e => setS({ ...s, stalenessDays: +e.target.value })} />
        </label>
      </section>

      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</button>
      </div>
    </main>
  );
}