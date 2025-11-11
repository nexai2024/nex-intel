import 'dotenv/config';

import { prisma } from '@/lib/prisma';
import { ensureProjectFeatures } from '@/lib/features';
import { setSettings } from '@/lib/config';

async function main() {
  console.log('Seeding demo data…');

  const searchProvider =
    process.env.SEARCH_PROVIDER ??
    (process.env.TAVILY_API_KEY ? 'tavily' : process.env.SERPAPI_API_KEY ? 'serpapi' : null);

  if (searchProvider) {
    await setSettings({
      searchProvider: searchProvider as 'tavily' | 'serpapi',
      tavilyKey: process.env.TAVILY_API_KEY,
      serpapiKey: process.env.SERPAPI_API_KEY,
      stalenessDays: Number(process.env.STALENESS_DAYS ?? 180),
    });
    console.log(`Configured search provider: ${searchProvider}`);
  } else {
    console.warn(
      'No SEARCH_PROVIDER/TAVILY_API_KEY/SERPAPI_API_KEY found. Search discovery will rely on any existing DB settings.'
    );
  }

  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
    },
  });
  console.log('Upserted demo user:', user.id);

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: 'DevGuard Authentication Suite',
      category: 'Authentication Platform',
      industry: 'DevTools',
      subIndustry: 'Identity & Access',
      description:
        'Authentication toolkit for SaaS teams that need secure login flows, compliance, and integrations.',
      targetSegments: ['SMB', 'Mid-market', 'Developers'],
      regions: ['US', 'EU'],
      deployment: 'CLOUD',
      pricingModel: 'SUBSCRIPTION',
      salesMotion: 'PRODUCT_LED',
      complianceNeeds: ['SOC 2', 'GDPR'],
      projectInputs: {
        create: {
          problem: 'Engineering teams need authentication without maintaining bespoke auth stacks.',
          solution:
            'Composable auth platform with pre-built UI, policy, compliance tooling, and integrations.',
          platforms: ['Web', 'Mobile'],
          priceTarget: '$99-499/mo',
          keywords: [
            'authentication',
            'mfa',
            'role-based access control',
            'audit logging',
            'sso',
          ],
          competitors: ['Auth0', 'Clerk', 'Supertokens', 'WorkOS'],
          urls: [],
        },
      },
    },
    include: { projectInputs: true },
  });
  console.log('Created demo project:', project.id);

  const declaredFeatures = [
    'Universal login',
    'Multi-factor authentication',
    'Role-based access control',
    'Fine-grained API keys',
    'Session management dashboard',
    'Audit logging',
    'SOC 2 compliance toolkit',
    'Integration marketplace',
  ];

  await ensureProjectFeatures(project.id, declaredFeatures);
  console.log('Seeded project features:', declaredFeatures.length);

  await prisma.creditLedger.upsert({
    where: { userId_month: { userId: user.id, month: new Date().toISOString().slice(0, 7) } },
    update: { limit: 1000, used: 0 },
    create: { userId: user.id, month: new Date().toISOString().slice(0, 7), limit: 1000, used: 0 },
  });
  console.log('Provisioned monthly credits for demo user');

  console.log('Seed complete.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
