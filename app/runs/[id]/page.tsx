'use client';
import { useEffect, useMemo, useState } from 'react';
import { EvidenceDrawer } from '@/app/components/EvidenceDrawer';
import { MarkdownWithCitations } from '@/components/MarkdownWithCitations';
import { InteractiveReportViewer } from '@/app/components/InteractiveReportViewer';
type Status = { status: string; createdAt: string; completedAt?: string };
type Report = { headline: string; markdown: string; createdAt: string };
type Finding = { id: string; kind: 'COMMON_FEATURE'|'GAP'|'DIFFERENTIATOR'|'RISK'|'RECOMMENDATION'; text: string; citations: string[]; confidence: number };

function kindLabel(k: Finding['kind']) {
  return k === 'COMMON_FEATURE' ? 'Common' : k === 'GAP' ? 'Gap' : k === 'DIFFERENTIATOR' ? 'Differentiator' : k;
}
function kindColor(k: Finding['kind']) {
  return k === 'COMMON_FEATURE' ? 'bg-blue-100 text-blue-700' : k === 'GAP' ? 'bg-amber-100 text-amber-700' : k === 'DIFFERENTIATOR' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700';
}

export default function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const [runId, setRunId] = useState<string | null>(null);
  useEffect(() => {
    async function setRunIdAsync() {
      setRunId((await params).id);
    }
    setRunIdAsync();
  }, [params]);
  const [status, setStatus] = useState<Status | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCites, setDrawerCites] = useState<string[]>([]);
  const [qaSummary, setQaSummary] = useState<string | null>(null);
  const [tab, setTab] = useState('Highlights');
  const [viewMode, setViewMode] = useState<'standard' | 'interactive'>('standard');
  const tabs = ['Highlights','Competitors','Capabilities','Pricing','Integrations','Security','Deployment','GTM','Roadmap'];
  
  // Extract sections from markdown for tab filtering
  const reportSections = useMemo(() => {
    if (!report?.markdown) return {};
    const sections: Record<string, string> = {};
    const lines = report.markdown.split('\n');
    let currentSection = 'Highlights';
    let currentContent: string[] = [];
    
    for (const line of lines) {
      if (line.startsWith('## ')) {
        // Save previous section
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n');
        }
        // Start new section
        const sectionTitle = line.replace('## ', '').trim();
        currentSection = sectionTitle;
        currentContent = [line];
      } else if (line.startsWith('# ')) {
        // Main title
        currentContent.push(line);
      } else {
        currentContent.push(line);
      }
    }
    // Save last section
    if (currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n');
    }
    
    // Map tab names to section titles
    const tabMap: Record<string, string> = {
      'Highlights': 'Executive Summary',
      'Competitors': 'Competitor Landscape',
      'Capabilities': 'Capability Matrix',
      'Pricing': 'Pricing Comparison',
      'Integrations': 'Integrations Ecosystem',
      'Security': 'Security & Compliance',
      'Deployment': 'Deployment & Performance',
      'GTM': 'GTM Motions & ICPs',
      'Roadmap': 'Suggested Roadmap'
    };
    
    const result: Record<string, string> = {};
    for (const [tabName, sectionTitle] of Object.entries(tabMap)) {
      result[tabName] = sections[sectionTitle] || sections[tabName] || '';
    }
    // Highlights gets everything if no specific section
    if (!result['Highlights'] && report.markdown) {
      result['Highlights'] = report.markdown;
    }
    
    return result;
  }, [report?.markdown]);
  
  useEffect(() => {
    if (!runId) return;
    let timer: any;
    async function poll() {
      try {
        const res = await fetch(`/api/runs/${runId}/status`);
        if (!res.ok) {
          const error = await res.json().catch(() => ({ error: 'Failed to fetch status' }));
          console.error('Status fetch error:', error);
          setStatus({ status: 'ERROR', createdAt: new Date().toISOString(), lastNote: error.error || 'Failed to fetch status' });
          return;
        }
        const s = await res.json();
        setStatus(s);
        if (s.status === 'COMPLETE' || s.status === 'QA') {
          try {
            const [rep, fds] = await Promise.all([
              fetch(`/api/runs/${runId}/report`).then(r => r.json()),
              fetch(`/api/runs/${runId}/findings`).then(r => r.json())
            ]);
            setReport(rep);
            setFindings(fds);
          } catch (err) {
            console.error('Error fetching report/findings:', err);
          }
        } else if (s.status !== 'ERROR') {
          timer = setTimeout(poll, 2000);
        }
      } catch (err) {
        console.error('Polling error:', err);
        setStatus({ status: 'ERROR', createdAt: new Date().toISOString(), lastNote: 'Failed to fetch status' });
      }
    }
    poll();
    return () => clearTimeout(timer);
  }, [runId]);

  useEffect(() => {
    async function fetchQaSummary() {
      if (status?.status === 'QA' && runId) {
        try {
          const response = await fetch(`/api/runs/${runId}/report`);
          if (response.ok) {
            const data = await response.json();
            // QA Summary is created after the main report, so it should be the most recent
            if (data.headline === 'QA Summary') {
              setQaSummary(data.markdown);
            } else {
              // If not QA summary, try fetching reports to find it
              setQaSummary('QA summary not found');
            }
          }
        } catch (e) {
          setQaSummary('QA summary unavailable');
        }
      } else {
        setQaSummary(null);
      }
    }
    fetchQaSummary();
  }, [status?.status, runId]);

  const grouped = useMemo(() => {
    const groups: Record<string, Finding[]> = {};
    findings.forEach(f => {
      (groups[f.kind] = groups[f.kind] ?? []).push(f);
    });
    return groups;
  }, [findings]);

  function showCitations(cites: string[]) {
    setDrawerCites(cites);
    setDrawerOpen(true);
  }

  return (
    <main className="p-8">
      <Timeline steps={[{ label: 'Discovery', done: status?.status === 'DISCOVERING' }, { label: 'Extraction', done: status?.status === 'EXTRACTING' }, { label: 'Synthesis', done: status?.status === 'SYNTHESIZING' }, { label: 'QA', done: status?.status === 'QA' }, { label: 'Complete', done: status?.status === 'COMPLETE' }]} />

      <h1 className="text-2xl font-semibold">Run {runId}</h1>
      <p className="mt-2">Status: <strong>{status?.status ?? '—'}</strong></p>
      {status?.status === 'QA' && (
        <details className="mt-3 border rounded p-3">
          <summary className="cursor-pointer">View QA Summary</summary>
          <pre className="mt-2 text-sm whitespace-pre-wrap">
            {qaSummary ?? 'Loading QA summary...'}
          </pre>
          <a className="underline" href={`/runs/${runId}/review`}>Open Review</a>
        </details>
      )}
      {/* Interactive Findings */}
      {Object.keys(grouped).length > 0 && (
        <section className="mt-6 grid md:grid-cols-2 gap-6">
          {Object.entries(grouped).map(([kind, list]) => (
            <div key={kind} className="border rounded p-4">
              <div className={`inline-block px-2 py-1 text-xs rounded ${kindColor(kind as Finding['kind'])}`}>
                {kindLabel(kind as Finding['kind'])}
              </div>
              <ul className="mt-3 space-y-2">
                {list.map(f => (
                  <li key={f.id} className="text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <span>{f.text}</span>
                      <button
                        onClick={() => showCitations(f.citations)}
                        disabled={f.citations.length === 0}
                        className={`text-xs px-2 py-1 rounded border ${f.citations.length ? 'hover:bg-gray-50' : 'opacity-40 cursor-not-allowed'}`}
                        title={f.citations.length ? 'View citations' : 'No citations attached'}
                      >
                        {f.citations.length} cites
                      </button>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">Confidence: {(f.confidence*100).toFixed(0)}%</div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
 
      <Tabs tabs={tabs} active={tab} onTab={setTab} />
      <div className="mt-4">
        {report ? (
          <MarkdownWithCitations markdown={reportSections[tab] || report.markdown} />
        ) : (
          <p className="text-gray-600">Generating report…</p>
        )}
      </div>
      {/* Export actions */}
      {report && (
        <div className="mt-6 flex gap-3 border-t pt-4">
          <a className="btn" href={`/api/runs/${runId}/matrix/features`}>Download Features CSV</a>
          <form method="POST" action={`/api/exports/pdf`}>
            <input type="hidden" name="runId" value={runId ?? ''} />
            <button className="btn" type="submit">Export PDF</button>
          </form>
          <form method="POST" action={`/api/exports/notion`} onSubmit={async (e) => {
            e.preventDefault();
            if (runId) {
              await fetch('/api/exports/notion', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ runId }) });
              alert('Exported to Notion (check your workspace).');
            }
          }}>
            <button className="btn" type="submit">Export to Notion</button>
          </form>
        </div>
      )}

      <EvidenceDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} citationIds={drawerCites} />
    </main>
  );
}
function Timeline({ steps }: { steps: { label: string; done: boolean }[] }) {
    return (
      <ol className="grid md:grid-cols-4 gap-3">
        {steps.map((s, i) => (
          <li key={i} className={`card p-3 ${s.done ? 'border-indigo-300' : ''}`}>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${s.done ? 'bg-indigo-500' : 'bg-gray-300'}`} />
              <div className="text-sm">{s.label}</div>
            </div>
          </li>
        ))}
      </ol>
    );
  }

  function Tabs({ tabs, active, onTab }: { tabs: string[]; active: string; onTab: (t:string)=>void }) {
    return (
      <div className="flex gap-2 border-b">
        {tabs.map(t => (
          <button key={t} onClick={() => onTab(t)} className={`px-3 py-2 ${t===active ? 'border-b-2 border-indigo-500 font-medium' : 'text-gray-500 hover:text-gray-800'}`}>{t}</button>
        ))}
      </div>
    );
  }
  
  // In component:
 