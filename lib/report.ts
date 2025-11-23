import { Competitor, Evidence, Feature, Finding, PricingPoint, Source } from '@/app/generated/prisma/client';
import { VerticalProfile } from './verticals';
type Ctx = {
  competitors: Competitor[];
  features: Feature[];
  pricing: (PricingPoint & { competitor: Competitor })[];
  findings: Finding[];
  evidences: (Evidence & { source: Source })[];
  headline: string;
};

function cite(ids: string[], evidences: (Evidence & { source: Source })[]) {
  const links = ids
    .map(id => evidences.find(e => e.sourceId === id || e.id === id))
    .filter(Boolean)
    .map(e => `- [${e!.source.title ?? e!.source.url}](${e!.source.url})`);
  return links.length ? `\nCitations:\n${links.join('\n')}\n` : '\n';
}

export function generateMarkdown({
    headline, profile, competitors, pricing, findings, capabilities, compliance, integrations, executiveSummary
  }: {
    headline: string;
    profile: VerticalProfile;
    competitors: any[]; pricing: any[]; findings: any[];
    capabilities: { category: string; normalized: string }[];
    compliance: { framework: string; status?: string | null }[];
    integrations: { name: string; category?: string | null }[];
    executiveSummary?: string | null;
  }) {
    const lines: string[] = [`# ${headline}`, ``];
  
    // Helper to format text with citations
    const formatWithCitations = (text: string, citations: string[]): string => {
      if (!citations || citations.length === 0) return text;
      const citeTokens = citations.map(id => `[c:${id}]`).join('');
      return `${text}${citeTokens}`;
    };
  
    // Helper functions
    function groupBy<T, K extends string>(arr: T[], fn: (t:T)=>K): Record<K, T[]> {
      return arr.reduce((acc:any, x:T) => { const k = fn(x); (acc[k] = acc[k] || []).push(x); return acc; }, {});
    }
    function fmtMoney(n?: number | null, suffix = '') {
      return n != null ? `$${n}${suffix}` : '';
    }
  
    // Executive Summary - Enhanced
    if (profile.sections.find(s => s.id === 'exec')?.enabled) {
      lines.push('## Executive Summary', '');
      
      // Use AI-generated executive summary if available, otherwise generate one
      if (executiveSummary) {
        lines.push(executiveSummary, '');
      } else {
        // Market overview
        const competitorCount = competitors?.length || 0;
        const capabilityCount = capabilities?.length || 0;
        lines.push(`This analysis identified **${competitorCount} competitors** and **${capabilityCount} distinct capabilities** across the competitive landscape.`, '');
      
      // Key findings summary
      const gaps = findings.filter((f:any) => f.kind === 'GAP');
      const diffs = findings.filter((f:any) => f.kind === 'DIFFERENTIATOR');
      const common = findings.filter((f:any) => f.kind === 'COMMON_FEATURE');
      
      if (gaps.length > 0) {
        lines.push('### Key Gaps Identified', '');
        gaps.slice(0, 5).forEach((f:any) => {
          lines.push(`- ${formatWithCitations(f.text, f.citations || [])}`);
        });
        lines.push('');
      }
      
      if (diffs.length > 0) {
        lines.push('### Potential Differentiators', '');
        diffs.slice(0, 5).forEach((f:any) => {
          lines.push(`- ${formatWithCitations(f.text, f.citations || [])}`);
        });
        lines.push('');
      }
      
      if (common.length > 0) {
        lines.push('### Common Features Across Market', '');
        lines.push(`The analysis found ${common.length} capabilities that appear across multiple competitors, indicating market standards.`, '');
      }
      }
    }
  
    // Competitor Landscape - Enhanced with details
    if (profile.sections.find(s => s.id === 'competitors')?.enabled) {
      lines.push('## Competitor Landscape', '');
      
      if (!competitors || competitors.length === 0) {
        lines.push('_No competitors identified in this analysis._', '');
      } else {
        lines.push(`### Identified Competitors (${competitors.length})`, '');
        
        // Group by domain/website for better organization
        const byDomain = groupBy(competitors, (c: any) => {
          try {
            if (c.website) {
              const url = new URL(c.website);
              return url.hostname.replace(/^www\./, '');
            }
          } catch {}
          return 'Unknown';
        });
        
        for (const [domain, comps] of Object.entries(byDomain)) {
          if (domain !== 'Unknown') {
            lines.push(`#### ${domain}`);
            comps.forEach((c: any) => {
              lines.push(`- **${c.name}**${c.website ? ` - ${c.website}` : ''}`);
            });
            lines.push('');
          } else {
            comps.forEach((c: any) => {
              lines.push(`- **${c.name}**${c.website ? ` - ${c.website}` : ''}`);
            });
          }
        }
        
        // Competitor comparison matrix
        if (competitors.length > 1) {
          lines.push('### Competitive Positioning', '');
          lines.push('Based on the analysis, here are the key competitors and their positioning:', '');
          lines.push('| Competitor | Key Characteristics |');
          lines.push('|------------|-------------------|');
          competitors.slice(0, 10).forEach((c: any) => {
            const pricingForComp = pricing.filter((p: any) => p.competitor?.id === c.id);
            const hasPricing = pricingForComp.length > 0;
            const compIntegrations = integrations.filter((i: any) => 
              i.name.toLowerCase().includes(c.name.toLowerCase().split(' ')[0])
            );
            const characteristics: string[] = [];
            if (hasPricing) characteristics.push('Pricing available');
            if (compIntegrations.length > 0) characteristics.push(`${compIntegrations.length} integrations`);
            lines.push(`| ${c.name} | ${characteristics.join(', ') || 'Under analysis'} |`);
          });
          lines.push('');
        }
      }
    }
  
    // Capability Matrix - Enhanced with analysis
    if (profile.sections.find(s => s.id === 'capabilities')?.enabled) {
      lines.push('## Capability Matrix', '');
      
      if (!capabilities || capabilities.length === 0) {
        lines.push('_No capabilities identified in this analysis._', '');
      } else {
        const byCat = groupBy(capabilities ?? [], c => c.category);
        const categories = Object.keys(byCat).sort((a, b) => byCat[b].length - byCat[a].length);
        
        lines.push(`### Overview`, '');
        lines.push(`Found **${capabilities.length} capabilities** across **${categories.length} categories**:`, '');
        categories.forEach(cat => {
          lines.push(`- **${cat}**: ${byCat[cat].length} capabilities`);
        });
        lines.push('');
        
        // Detailed breakdown by category
        for (const cat of categories) {
          lines.push(`### ${cat}`, '');
          const uniqueCaps = Array.from(new Set(byCat[cat].map((c: any) => c.normalized)));
          uniqueCaps.slice(0, 30).forEach((cap: any) => {
            lines.push(`- ${cap}`);
          });
          if (uniqueCaps.length > 30) {
            lines.push(`_... and ${uniqueCaps.length - 30} more_`);
          }
          lines.push('');
        }
        
        // Highlight must-have capabilities for this vertical
        if (profile.emphasize.mustHave && profile.emphasize.mustHave.length > 0) {
          lines.push('### Critical Capabilities for This Vertical', '');
          profile.emphasize.mustHave.forEach(mustHave => {
            const found = capabilities.some((c: any) => 
              c.normalized.toLowerCase().includes(mustHave.toLowerCase()) ||
              c.category.toLowerCase().includes(mustHave.toLowerCase())
            );
            lines.push(`- ${mustHave}: ${found ? '✅ Found' : '⚠️ Not prominently featured'}`);
          });
          lines.push('');
        }
      }
    }
  
    // Pricing Comparison - Enhanced with analysis
    if (profile.sections.find(s => s.id === 'pricing')?.enabled) {
      lines.push('## Pricing Comparison', '');
      
      if (!pricing || pricing.length === 0) {
        lines.push('_No pricing information found in the analyzed sources._', '');
        lines.push('_Consider reviewing competitor websites directly for up-to-date pricing._', '');
      } else {
        // Group by competitor
        const byCompetitor = groupBy(pricing, (p: any) => p.competitor?.name || 'Unknown');
        
        lines.push(`### Pricing Overview`, '');
        lines.push(`Found pricing information for **${Object.keys(byCompetitor).length} competitors** across **${pricing.length} pricing plans**.`, '');
        lines.push('');
        
        for (const [compName, plans] of Object.entries(byCompetitor)) {
          lines.push(`#### ${compName}`, '');
          (plans as any[]).slice(0, 5).forEach((p: any) => {
            const parts: string[] = [];
            if (p.planName) parts.push(`**${p.planName}**`);
            if (p.priceMonthly) parts.push(`$${p.priceMonthly}/mo`);
            if (p.priceAnnual) parts.push(`($${p.priceAnnual}/yr)`);
            if (p.transactionFee) parts.push(`+ ${p.transactionFee}% transaction fee`);
            lines.push(`- ${parts.join(' ') || 'Pricing details'}`);
          });
          lines.push('');
        }
        
        // Pricing analysis
        const monthlyPrices = pricing
          .map((p: any) => p.priceMonthly)
          .filter((p: any): p is number => typeof p === 'number' && p > 0);
        
        if (monthlyPrices.length > 0) {
          const avgPrice = monthlyPrices.reduce((a, b) => a + b, 0) / monthlyPrices.length;
          const minPrice = Math.min(...monthlyPrices);
          const maxPrice = Math.max(...monthlyPrices);
          lines.push('### Pricing Analysis', '');
          lines.push(`- **Average monthly price**: $${avgPrice.toFixed(2)}`);
          lines.push(`- **Price range**: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`);
          lines.push('');
        }
      }
    }
  
    // Integrations Ecosystem - Enhanced
    if (profile.sections.find(s => s.id === 'integrations')?.enabled) {
      lines.push('## Integrations Ecosystem', '');
      
      if (!integrations || integrations.length === 0) {
        lines.push('_No integrations detected in the analyzed sources._', '');
      } else {
        const uniqueIntegrations = Array.from(new Set(integrations.map((i: any) => i.name)));
        lines.push(`### Integration Overview`, '');
        lines.push(`Found **${uniqueIntegrations.length} unique integrations** mentioned across sources.`, '');
        lines.push('');
        
        // Group by category
        const byCategory = groupBy(integrations, (i: any) => i.category || 'Uncategorized');
        const categories = Object.keys(byCategory).sort((a, b) => byCategory[b].length - byCategory[a].length);
        
        for (const cat of categories) {
          if (cat !== 'Uncategorized') {
            lines.push(`#### ${cat}`, '');
            const ints = Array.from(new Set(byCategory[cat].map((i: any) => i.name)));
            ints.slice(0, 20).forEach((name: string) => {
              lines.push(`- ${name}`);
            });
            if (ints.length > 20) {
              lines.push(`_... and ${ints.length - 20} more_`);
            }
            lines.push('');
          }
        }
        
        // Uncategorized
        if (byCategory['Uncategorized']) {
          lines.push(`#### Other Integrations`, '');
          const ints = Array.from(new Set(byCategory['Uncategorized'].map((i: any) => i.name)));
          ints.slice(0, 20).forEach((name: string) => {
            lines.push(`- ${name}`);
          });
          if (ints.length > 20) {
            lines.push(`_... and ${ints.length - 20} more_`);
          }
          lines.push('');
        }
      }
    }
  
    // Security & Compliance - Enhanced
    if (profile.sections.find(s => s.id === 'security')?.enabled) {
      lines.push('## Security & Compliance', '');
      
      if (!compliance || compliance.length === 0) {
        lines.push('_No compliance frameworks or security claims detected in the analyzed sources._', '');
      } else {
        const uniqueCompliance = Array.from(new Set(compliance.map((c: any) => c.framework)));
        lines.push(`### Compliance Overview`, '');
        lines.push(`Found mentions of **${uniqueCompliance.length} compliance frameworks** across the competitive landscape.`, '');
        lines.push('');
        
        // Group by framework
        const byFramework = groupBy(compliance, (c: any) => c.framework);
        for (const [framework, items] of Object.entries(byFramework)) {
          const statuses = Array.from(new Set(items.map((i: any) => i.status || 'Mentioned')));
          lines.push(`#### ${framework}`, '');
          statuses.forEach(status => {
            lines.push(`- **Status**: ${status}`);
          });
          const notes = items.map((i: any) => i.notes).filter(Boolean);
          if (notes.length > 0) {
            lines.push(`- **Notes**: ${notes[0]}`); // Show first note
          }
          lines.push('');
        }
        
        // Highlight required compliance for this vertical
        if (profile.emphasize.compliance && profile.emphasize.compliance.length > 0) {
          lines.push('### Required Compliance for This Vertical', '');
          profile.emphasize.compliance.forEach(req => {
            const found = compliance.some((c: any) => 
              c.framework.toLowerCase().includes(req.toLowerCase())
            );
            lines.push(`- ${req}: ${found ? '✅ Mentioned' : '⚠️ Not found'}`);
          });
          lines.push('');
        }
      }
    }
  
    // Deployment & Performance - Enhanced
    if (profile.sections.find(s => s.id === 'deployment')?.enabled) {
      lines.push('## Deployment & Performance', '');
      
      // Extract deployment info from capabilities
      const deploymentCaps = capabilities.filter((c: any) => 
        c.category === 'Performance' || 
        c.normalized.toLowerCase().includes('deployment') ||
        c.normalized.toLowerCase().includes('self-hosted') ||
        c.normalized.toLowerCase().includes('cloud')
      );
      
      if (deploymentCaps.length > 0) {
        lines.push('### Deployment Options', '');
        const deploymentTypes = Array.from(new Set(deploymentCaps.map((c: any) => c.normalized)));
        deploymentTypes.forEach(type => {
          lines.push(`- ${type}`);
        });
        lines.push('');
      } else {
        lines.push('_Deployment information not prominently featured in analyzed sources._', '');
      }
      
      lines.push('### Performance & SLAs', '');
      const perfCaps = capabilities.filter((c: any) => 
        c.category === 'Performance' && 
        (c.normalized.includes('sla') || c.normalized.includes('latency') || c.normalized.includes('uptime'))
      );
      if (perfCaps.length > 0) {
        perfCaps.forEach((c: any) => {
          lines.push(`- ${c.normalized}`);
        });
      } else {
        lines.push('_Performance metrics and SLAs not explicitly mentioned in sources._', '');
      }
      lines.push('');
    }
  
    // GTM Motions & ICPs - Enhanced
    if (profile.sections.find(s => s.id === 'gtm')?.enabled) {
      lines.push('## GTM Motions & ICPs', '');
      
      // Extract GTM-related capabilities
      const gtmCaps = capabilities.filter((c: any) => 
        c.category === 'Growth' || 
        c.normalized.toLowerCase().includes('self-serve') ||
        c.normalized.toLowerCase().includes('enterprise')
      );
      
      if (gtmCaps.length > 0) {
        lines.push('### Go-to-Market Indicators', '');
        lines.push('Based on capabilities and features found:', '');
        gtmCaps.slice(0, 10).forEach((c: any) => {
          lines.push(`- ${c.normalized}`);
        });
        lines.push('');
      }
      
      lines.push('### Target Customer Segments', '');
      lines.push('Analysis of competitor positioning suggests focus on:', '');
      lines.push('- Market segments identified through feature analysis', '');
      lines.push('- Customer size indicators (SMB, Mid-market, Enterprise) inferred from capabilities', '');
      lines.push('');
    }
  
    // Roadmap - Enhanced with actionable insights
    if (profile.sections.find(s => s.id === 'roadmap')?.enabled) {
      lines.push('## Suggested Roadmap', '');
      
      const gaps = findings.filter((f: any) => f.kind === 'GAP');
      const diffs = findings.filter((f: any) => f.kind === 'DIFFERENTIATOR');
      
      if (gaps.length > 0) {
        lines.push('### Priority: Address Market Gaps', '');
        lines.push('Based on competitor analysis, consider prioritizing:', '');
        gaps.slice(0, 5).forEach((f: any) => {
          lines.push(`1. ${f.text.replace(/^Potential gap: /, '')}`);
        });
        lines.push('');
      }
      
      if (diffs.length > 0) {
        lines.push('### Opportunity: Leverage Differentiators', '');
        lines.push('These capabilities appear unique in the market:', '');
        diffs.slice(0, 5).forEach((f: any) => {
          lines.push(`- ${f.text.replace(/^Potential differentiator: /, '')}`);
        });
        lines.push('');
      }
      
      // Compliance roadmap
      if (profile.emphasize.compliance && profile.emphasize.compliance.length > 0) {
        const missingCompliance = profile.emphasize.compliance.filter(req => 
          !compliance.some((c: any) => c.framework.toLowerCase().includes(req.toLowerCase()))
        );
        if (missingCompliance.length > 0) {
          lines.push('### Compliance Requirements', '');
          lines.push('For this vertical, ensure compliance with:', '');
          missingCompliance.forEach(req => {
            lines.push(`- ${req}`);
          });
          lines.push('');
        }
      }
      
      lines.push('### General Recommendations', '');
      lines.push('1. **Monitor competitor pricing** - Regularly review competitor pricing pages for updates', '');
      lines.push('2. **Track integration announcements** - New integrations can signal market direction', '');
      lines.push('3. **Analyze feature gaps** - Focus on capabilities that matter most to your target customers', '');
      lines.push('4. **Benchmark compliance** - Ensure you meet or exceed industry compliance standards', '');
      lines.push('');
    }
  
    return lines.join('\n');
  }
