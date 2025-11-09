'use client';
import { useState } from 'react';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';
import { useLoading } from '@/app/hooks/useGlobalLoading';

export default function NewProject() {
  const [form, setForm] = useState({
    name: '',
    description: '',
    industry: '',
    subIndustry: '',
    targetSegments: [] as string[],
    regions: [] as string[],
    deployment: '',
    pricingModel: '',
    salesMotion: '',
    complianceNeeds: '' as any,
    keywords: '',
    competitorSeeds: '',
  });
  const { withLoading } = useLoading();

  function toggleMulti(key: 'targetSegments'|'regions', val: string) {
    setForm(prev => {
      const set = new Set(prev[key]);
      if (set.has(val)) set.delete(val); else set.add(val);
      return { ...prev, [key]: Array.from(set) };
    });
  }

  async function submit() {
    if (!form.name.trim()) {
      alert('Please enter a project name');
      return;
    }

    try {
      const res = await withLoading(
        fetch('/api/projects/create', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            industry: form.industry,
            subIndustry: form.subIndustry,
            targetSegments: form.targetSegments,
            regions: form.regions,
            deployment: form.deployment || null,
            pricingModel: form.pricingModel || null,
            salesMotion: form.salesMotion || null,
            complianceNeeds: (form.complianceNeeds || '').split(',').map((s: string) => s.trim()).filter(Boolean),
            inputs: {
              keywords: form.keywords.split(',').map((s: string) => s.trim()).filter(Boolean),
              competitors: form.competitorSeeds.split(',').map((s: string) => s.trim()).filter(Boolean),
            }
          })
        }),
        'Creating new project'
      );

      if (!res.ok) {
        alert('Failed to create project');
        return;
      }
      const { id } = await res.json();
      window.location.href = `/projects/${id}`;
    } catch (error) {
      alert('Failed to create project. Please try again.');
    }
  }

  return (
    <main className="max-w-3xl space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: 'New Project', current: true }
        ]}
      />

      <header>
        <h1 className="text-2xl font-semibold">New Project</h1>
        <p className="text-sm text-gray-600">Create a new competitive intelligence project</p>
      </header>

      <section className="card p-4 grid sm:grid-cols-2 gap-3">
        <label> Name <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /> </label>
        <label> Description <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /> </label>
        <label> Industry
          <select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}>
            <option value="">Select</option>
            {['B2B SaaS','API Platform','DevTools','Fintech','Healthcare','Ecommerce','Consumer App'].map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </label>
        <label> Sub-Industry <input value={form.subIndustry} onChange={e => setForm({ ...form, subIndustry: e.target.value })} placeholder="e.g., Payments, Observability" /> </label>
        <div>
          <div className="text-sm text-gray-600">Target Segments</div>
          {['SMB','Mid-market','Enterprise','Developers','Consumers'].map(s =>
            <label key={s} className="mr-3"><input type="checkbox" checked={form.targetSegments.includes(s)} onChange={() => toggleMulti('targetSegments', s)} /> {s}</label>
          )}
        </div>
        <div>
          <div className="text-sm text-gray-600">Regions</div>
          {['US','EU','UK','APAC','LATAM'].map(r =>
            <label key={r} className="mr-3"><input type="checkbox" checked={form.regions.includes(r)} onChange={() => toggleMulti('regions', r)} /> {r}</label>
          )}
        </div>
        <label> Deployment
          <select value={form.deployment} onChange={e => setForm({ ...form, deployment: e.target.value })}>
            <option value="">Select</option>
            {['CLOUD','SELF_HOSTED','HYBRID'].map(x => <option key={x} value={x}>{x.replace('_',' ')}</option>)}
          </select>
        </label>
        <label> Pricing Model
          <select value={form.pricingModel} onChange={e => setForm({ ...form, pricingModel: e.target.value })}>
            <option value="">Select</option>
            {['SUBSCRIPTION','USAGE_BASED','FREEMIUM','ONE_TIME','TIERED'].map(x => <option key={x} value={x}>{x.replace('_',' ')}</option>)}
          </select>
        </label>
        <label> Sales Motion
          <select value={form.salesMotion} onChange={e => setForm({ ...form, salesMotion: e.target.value })}>
            <option value="">Select</option>
            {['PRODUCT_LED','SELF_SERVE','SALES_LED','ENTERPRISE','MIXED'].map(x => <option key={x} value={x}>{x.replace('_',' ')}</option>)}
          </select>
        </label>
        <label> Compliance Needs (comma-separated) <input value={form.complianceNeeds} onChange={e => setForm({ ...form, complianceNeeds: e.target.value })} placeholder="e.g., SOC 2, HIPAA" /> </label>
      </section>

      <section className="card p-4 grid sm:grid-cols-2 gap-3">
        <label> Keywords (comma-separated) <input value={form.keywords} onChange={e => setForm({ ...form, keywords: e.target.value })} placeholder="billing, webhooks, observability" /> </label>
        <label> Known Competitors (comma-separated) <input value={form.competitorSeeds} onChange={e => setForm({ ...form, competitorSeeds: e.target.value })} placeholder="Stripe, Adyen, Paddle" /> </label>
      </section>

      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={submit}>Create Project</button>
      </div>
    </main>
  );
}