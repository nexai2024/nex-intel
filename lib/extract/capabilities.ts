import { canonicalFeatureName, normalizeFeature } from '../normalize';

export type CapabilityHit = {
  category: string;
  name: string;
  normalized: string;
  mention: string;
};

type CanonicalCapability = {
  normalized: string;
  display: string;
};

const RAW_SYNONYM_GROUPS: { display: string; variants: string[] }[] = [
  {
    display: 'Single Sign On',
    variants: ['Single Sign On', 'Single Sign-On', 'SSO', 'Enterprise SSO', 'SSO Support'],
  },
  {
    display: 'Multi Factor Authentication',
    variants: [
      'Multi Factor Authentication',
      'Multi-Factor Authentication',
      'MFA',
      'Two Factor Authentication',
      'Two-Factor Authentication',
      '2FA',
      'Two Step Verification',
      'Two-Step Verification',
    ],
  },
  {
    display: 'Role Based Access Control',
    variants: [
      'Role Based Access Control',
      'Role-Based Access Control',
      'RBAC',
      'Role Management',
      'Role & Permission Management',
    ],
  },
  {
    display: 'Audit Logs',
    variants: ['Audit Logs', 'Audit Log', 'Audit Trails', 'Audit Trail', 'Activity Logs', 'Security Logs'],
  },
  {
    display: 'User Provisioning',
    variants: ['User Provisioning', 'Automated Provisioning', 'Directory Sync', 'SCIM', 'SCIM Provisioning'],
  },
  {
    display: 'API Access',
    variants: [
      'API',
      'APIs',
      'REST API',
      'RESTful API',
      'GraphQL API',
      'GraphQL',
      'Public API',
      'Open API',
      'OpenAPI',
      'Developer API',
      'API Access',
    ],
  },
  {
    display: 'Workflow Automation',
    variants: [
      'Workflow Automation',
      'Workflow Automations',
      'Workflows',
      'Automation',
      'Automations',
      'Automation Builder',
      'Automated Workflows',
    ],
  },
  {
    display: 'Reporting & Analytics',
    variants: [
      'Reporting',
      'Analytics',
      'Analytics Dashboard',
      'Reporting Dashboard',
      'Insights',
      'Analytics & Reporting',
      'Reporting & Analytics',
      'Data Visualization',
    ],
  },
  {
    display: 'Integration Marketplace',
    variants: [
      'Integration Marketplace',
      'App Marketplace',
      'Marketplace',
      'Integration Directory',
      'Partner Integrations',
    ],
  },
  {
    display: 'User Management',
    variants: ['User Management', 'User Administration', 'User Admin', 'User Manager'],
  },
  {
    display: 'Team Management',
    variants: ['Team Management', 'Team Permissions', 'Team Roles', 'Team Administration'],
  },
  {
    display: 'Access Controls',
    variants: ['Access Controls', 'Access Control', 'Permission Management', 'Permissions Management', 'Permissions'],
  },
];

const SINGULAR_EXCEPTIONS = new Set(['analytics', 'news', 'access']);
const STOP_WORDS = new Set(['and', 'or', 'the', 'a', 'an', '&', 'with', 'for']);

function singularize(token: string) {
  if (token.length <= 3 || SINGULAR_EXCEPTIONS.has(token)) return token;
  if (token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (/(xes|ses|ches|shes)$/.test(token)) return token.slice(0, -2);
  if (token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

function normalizeCapabilityTerm(term: string) {
  const base = normalizeFeature(term);
  if (!base) return '';
  const tokens = base
    .split(' ')
    .filter((token) => token && !STOP_WORDS.has(token))
    .map((token) => singularize(token));
  return tokens.join(' ');
}

const CAPABILITY_SYNONYM_MAP: Map<string, CanonicalCapability> = (() => {
  const map = new Map<string, CanonicalCapability>();
  for (const group of RAW_SYNONYM_GROUPS) {
    const normalized = normalizeCapabilityTerm(group.display);
    if (!normalized) continue;
    const canonical: CanonicalCapability = {
      normalized,
      display: group.display,
    };
    map.set(normalized, canonical);
    for (const variant of group.variants) {
      const variantNorm = normalizeCapabilityTerm(variant);
      if (!variantNorm) continue;
      map.set(variantNorm, canonical);
    }
  }
  return map;
})();

function canonicalizeCapability(norm: string, mention: string): CanonicalCapability {
  const mapped = CAPABILITY_SYNONYM_MAP.get(norm);
  if (mapped) return mapped;

  if (!norm) {
    return { normalized: norm, display: mention };
  }

  if (!norm.includes(' ')) {
    const upper = norm.toUpperCase();
    if (mention && mention.length <= 6 && mention === mention.toUpperCase()) {
      return { normalized: norm, display: mention };
    }
    if (norm.length <= 5) {
      return { normalized: norm, display: upper };
    }
  }

  const display = canonicalFeatureName(norm) || mention;
  return { normalized: norm, display };
}

const CAT_PATTERNS: {
  category: string;
  patterns: RegExp[];
  normalize?: (s: string) => string;
}[] = [
  {
    category: 'Integrations',
    patterns: [
      /integrat(e|ion|ions) with ([A-Z][\w \-+\.]{2,40})/gi,
      /\b(Shopify|Salesforce|HubSpot|Zapier|Stripe|Segment|Snowflake|Slack|Google Analytics)\b/gi,
    ],
  },
  {
    category: 'Security',
    patterns: [
      /\b(SSO|SAML|SCIM|RBAC|encryption at rest|encryption in transit|audit logs|MFA|2FA)\b/gi,
    ],
  },
  {
    category: 'Compliance',
    patterns: [/\b(SOC\s*2|HIPAA|GDPR|PCI[-\s]?DSS|ISO\s*27001|BAA)\b/gi],
  },
  {
    category: 'API',
    patterns: [/\b(OpenAPI|Swagger|REST|GraphQL|webhooks?|SDKs?)\b/gi],
  },
  {
    category: 'Performance',
    patterns: [/\b(latency|throughput|99\.9+%|SLA|RPS|QPS|cold start)\b/gi],
  },
  {
    category: 'Automation',
    patterns: [/\b(workflows?|automations?|triggers?|rules engine|playbooks?)\b/gi],
  },
  {
    category: 'Analytics',
    patterns: [/\b(dashboards?|reporting|attribution|cohort|funnel)\b/gi],
  },
  {
    category: 'Permissions',
    patterns: [/\b(RBAC|ABAC|roles?|permissions?|orgs?|teams?)\b/gi],
  },
  {
    category: 'Growth',
    patterns: [/\b(referral|invite|waitlist|viral|A\/B|experiments?)\b/gi],
  },
];

export function extractCapabilities(text: string): CapabilityHit[] {
  const hits: CapabilityHit[] = [];
  for (const cat of CAT_PATTERNS) {
    for (const re of cat.patterns) {
      let m: RegExpExecArray | null;
      const local = new RegExp(re.source, re.flags.replace('g', '') + 'g');
      while ((m = local.exec(text)) !== null) {
        const full = m[0];
        const mention = (m[2] ?? m[1] ?? full).toString().trim();
        const norm = normalizeCapabilityTerm(mention);
        if (norm.length < 2) continue;
        const canonical = canonicalizeCapability(norm, mention);
        hits.push({ category: cat.category, name: canonical.display, normalized: canonical.normalized, mention });
      }
    }
  }
  // Deduplicate
  const seen = new Set<string>();
  return hits.filter((h) => {
    const key = `${h.category}|${h.normalized}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}