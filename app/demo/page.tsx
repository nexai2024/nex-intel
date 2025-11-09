'use client';
import { useState } from 'react';

const demoReport = `# IntelBox Competitive Analysis Demo

## Executive Summary

This demo showcases the evidence-first competitive intelligence that IntelBox provides. Every claim in our reports is backed by verifiable sources, making your competitive analysis credible and ready for board presentations.

## Competitor Landscape

### Key Players Identified

**Stripe** - Leading payment processing platform
- Revenue: ~$14B annually
- Market share: ~20% of online payments
- Strengths: Developer experience, extensive API coverage
- Weaknesses: Higher transaction fees, complex pricing tiers

**Adyen** - Global payment provider
- Revenue: ~€1.2B annually
- Coverage: 150+ countries
- Strengths: Global reach, single platform solution
- Weaknesses: Less developer-friendly documentation

**Paddle** - Merchant of record for SaaS
- Revenue: ~$100M annually
- Focus: B2B SaaS companies
- Strengths: Tax handling, subscription management
- Weaknesses: Limited payment method variety

## Capability Matrix

| Feature | Stripe | Adyen | Paddle | IntelBox Finding |
|---------|--------|-------|--------|------------------|
| API Documentation | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | Market Standard |
| Subscription Management | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **Differentiator** |
| Tax Compliance | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **Differentiator** |
| Developer Tools | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | Market Leader |
| Global Coverage | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | **Gap Opportunity** |

## Pricing Comparison

### Monthly Transaction Volume: 100,000 transactions

| Provider | Base Fee | Transaction Fee | Monthly Cost |
|----------|-----------|------------------|--------------|
| Stripe | $0 | 2.9% + 30¢ | $2,900 |
| Adyen | $0 | 2.3% + €0.10 | $2,300 |
| Paddle | $0 | 5% + 50¢ | $5,050 |

**IntelBox Insight:** Adyen offers the most competitive pricing for high-volume transactions, while Paddle's merchant of record services justify their higher fees for SaaS companies.

## Integration Ecosystem

### Payment Methods Supported
- **Credit Cards**: All providers
- **Digital Wallets**: Stripe (PayPal, Apple Pay, Google Pay)
- **Bank Transfers**: Adyen (SEPA, ACH)
- **Buy Now, Pay Later**: Stripe (Afterpay, Klarna)
- **Cryptocurrency**: Limited across all providers

### API Integration Complexity
- **Stripe**: RESTful API, comprehensive SDKs
- **Adyen**: XML/JSON API, limited SDK options
- **Paddle**: Simple REST API, webhook-based

## Security & Compliance

### Certifications Found
- **SOC 2 Type II**: Stripe, Adyen
- **PCI DSS Level 1**: All providers
- **GDPR Compliance**: All providers
- **HIPAA**: Limited coverage across providers

## Deployment & Performance

### Uptime SLA
- **Stripe**: 99.95% uptime SLA
- **Adyen**: 99.9% uptime SLA
- **Paddle**: 99.5% uptime SLA

### API Response Times
- **Stripe**: 100-200ms average
- **Adyen**: 200-400ms average
- **Paddle**: 150-300ms average

## GTM Motions & ICPs

### Ideal Customer Profiles
1. **B2B SaaS Companies** ($1M-$50M ARR)
2. **Marketplace Platforms** (high transaction volume)
3. **Subscription Businesses** (recurring billing needs)
4. **Global Companies** (multi-currency requirements)

### Sales Motion Analysis
- **Product-Led**: Stripe, Paddle
- **Sales-Led**: Adyen
- **Hybrid**: Mix of self-service and enterprise sales

## Suggested Roadmap

### Immediate Opportunities (0-3 months)
1. **Enhanced Subscription Management** - Paddle's strength can be replicated
2. **Improved Global Payment Options** - Adyen's coverage is market-leading
3. **Better Developer Documentation** - Stripe's approach sets the standard

### Medium-term Initiatives (3-6 months)
1. **Unified Payment Dashboard** - Single view of all payment providers
2. **Advanced Analytics** - Real-time insights and reporting
3. **Fraud Detection Integration** - ML-based fraud prevention

### Long-term Vision (6-12 months)
1. **Cross-platform Payment Orchestration** - Intelligent routing
2. **Embedded Finance Features** - Banking as a service
3. **Market Expansion Tools** - Automated compliance for new regions

## Key Differentiators Identified

### Market Standards (Must Have)
- API Documentation ⭐⭐⭐⭐⭐
- Credit Card Processing ⭐⭐⭐⭐⭐
- Basic Subscription Management ⭐⭐⭐⭐

### Competitive Advantages (Nice to Have)
- Tax Compliance (Paddle, Adyen)
- Global Coverage (Adyen)
- Developer Experience (Stripe)

### Gaps & Opportunities (IntelBox Insights)
- **Unified Analytics** - No provider offers comprehensive cross-platform analytics
- **Intelligent Payment Routing** - Opportunity to optimize costs automatically
- **Compliance Automation** - Complex regulatory landscape creates value`;

export default function DemoPage() {
  const [viewMode, setViewMode] = useState<'preview' | 'interactive'>('preview');
  const [activeSection, setActiveSection] = useState('executive-summary');

  const sections = [
    { id: 'executive-summary', title: 'Executive Summary', icon: '📊' },
    { id: 'competitors', title: 'Competitor Landscape', icon: '🏢' },
    { id: 'capabilities', title: 'Capability Matrix', icon: '📋' },
    { id: 'pricing', title: 'Pricing Comparison', icon: '💰' },
    { id: 'integrations', title: 'Integration Ecosystem', icon: '🔗' },
    { id: 'security', title: 'Security & Compliance', icon: '🔒' },
    { id: 'performance', title: 'Deployment & Performance', icon: '⚡' },
    { id: 'gtm', title: 'GTM Motions & ICPs', icon: '🎯' },
    { id: 'roadmap', title: 'Suggested Roadmap', icon: '🗺️' }
  ];

  function renderInteractiveMarkdown(content: string) {
    const lines = content.split('\n');
    let inTable = false;
    let tableRows: string[][] = [];
    let currentRow: string[] = [];

    return (
      <div className="prose max-w-none">
        {lines.map((line, index) => {
          // Headers
          if (line.startsWith('## ')) {
            const title = line.replace('## ', '');
            const section = sections.find(s => title.includes(s.title));
            return (
              <h2
                key={index}
                id={title.toLowerCase().replace(/\s+/g, '-')}
                className="text-2xl font-bold mt-8 mb-4 pb-2 border-b border-gray-200 flex items-center gap-2"
              >
                {section?.icon && <span>{section.icon}</span>}
                {title}
              </h2>
            );
          }

          // Tables
          if (line.startsWith('|')) {
            const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);

            if (!inTable) {
              inTable = true;
              return (
                <table key={index} className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {cells.map((cell, cellIndex) => (
                        <th
                          key={cellIndex}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {cell}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                </tbody>
              );
            }

            return (
              <tr key={index} className="hover:bg-gray-50">
                {cells.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cell}
                  </td>
                ))}
              </tr>
            );
          }

          if (inTable && line.trim() === '') {
            inTable = false;
            return (
              <div key={index} className="mt-4"></div>
            );
          }

          // Lists
          if (line.startsWith('- ')) {
            return (
              <li key={index} className="mt-2">
                {line.replace('- ', '')}
              </li>
            );
          }

          // Regular paragraphs
          if (line.trim() && !line.startsWith('#') && !line.startsWith('|')) {
            return (
              <p key={index} className="mt-2 text-gray-700">
                {line
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')}
              </p>
            );
          }

          return null;
        })}
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <header className="text-center py-8">
        <h1 className="text-3xl font-bold mb-4">
          🚀 IntelBox Demo: Evidence-First Competitive Intelligence
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
          Experience how IntelBox transforms competitive research with verifiable sources,
          automated analysis, and actionable insights.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a
            href="/projects/new"
            className="btn btn-primary"
          >
            Try It Yourself
          </a>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('preview')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'preview'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setViewMode('interactive')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'interactive'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Interactive
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table of Contents */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="card p-4">
              <h3 className="font-semibold mb-3">Table of Contents</h3>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.title.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`block px-3 py-2 rounded-md text-sm transition-colors hover:bg-gray-100 ${
                      activeSection === section.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveSection(section.id);
                      document.getElementById(section.title.toLowerCase().replace(/\s+/g, '-'))?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <span className="mr-2">{section.icon}</span>
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>

            <div className="card p-4 mt-4">
              <h3 className="font-semibold mb-3">Key Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Source citations for every claim</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Automated competitive analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Industry-specific insights</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Strategic recommendations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Change detection & monitoring</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="card p-8">
            {viewMode === 'preview' ? (
              <div className="prose max-w-none">
                {renderInteractiveMarkdown(demoReport)}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    <strong>Interactive Mode:</strong> Click on any claim to see potential sources,
                    use the search function to find specific information, and explore the full
                    capabilities of our interactive report viewer.
                  </p>
                </div>
                <InteractiveReportViewer
                  markdown={demoReport}
                  runId="demo-report"
                  className="border-0 p-0 shadow-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="mt-12 text-center">
        <div className="card p-8 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <h2 className="text-2xl font-bold mb-4">
            Ready to Get Your Own Competitive Intelligence?
          </h2>
          <p className="text-lg mb-6 opacity-90">
            Start your first project and see how IntelBox can transform your competitive research.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="/projects/new"
              className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Create Your First Project
            </a>
            <a
              href="/projects"
              className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-indigo-600 transition-colors"
            >
              View Projects
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

// InteractiveReportViewer component (simplified version for demo)
function InteractiveReportViewer({ markdown, className }: { markdown: string; className?: string }) {
  const [searchTerm, setSearchTerm] = useState('');

  const highlightText = (text: string) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <div className="bg-white border rounded-lg p-4">
        <input
          type="text"
          placeholder="Search demo report..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-white border rounded-lg overflow-auto max-h-96">
        <div className="p-6 prose max-w-none">
          {markdown.split('\n').map((line, index) => {
            if (line.startsWith('## ')) {
              const title = line.replace('## ', '');
              return (
                <h2 key={index} className="text-xl font-bold mt-4 mb-2">
                  {highlightText(title)}
                </h2>
              );
            }
            if (line.startsWith('- ')) {
              return (
                <li key={index} className="ml-4">
                  {highlightText(line.replace('- ', ''))}
                </li>
              );
            }
            if (line.trim()) {
              return (
                <p key={index} className="mb-2">
                  {highlightText(line)}
                </p>
              );
            }
            return <br key={index} />;
          })}
        </div>
      </div>
    </div>
  );
}