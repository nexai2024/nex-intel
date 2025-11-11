import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { query, context } = await request.json();

    if (!query?.trim()) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // For demo, use demo user
    const demoUser = await prisma.user.findFirst({
      where: { email: 'demo-user@example.com' }
    });

    if (!demoUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Save the query
    const queryRecord = await prisma.naturalLanguageQuery.create({
      data: {
        userId: demoUser.id,
        query: query.trim(),
        intent: extractIntent(query),
        context: context === undefined ? undefined : context,
        result: undefined // Will be filled after processing
      }
    });

    // Process the query and generate results
    const result = await processQuery(query, context);

    // Update the query with results
    await prisma.naturalLanguageQuery.update({
      where: { id: queryRecord.id },
      data: {
        result: result as any
      }
    });

    return NextResponse.json({
      id: queryRecord.id,
      query: queryRecord.query,
      intent: queryRecord.intent,
      result,
      processedAt: new Date()
    });
  } catch (error) {
    console.error('Failed to process natural language query:', error);
    return NextResponse.json(
      { error: 'Failed to process query' },
      { status: 500 }
    );
  }
}

function extractIntent(query: string): string {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('compare') || lowerQuery.includes('vs') || lowerQuery.includes('versus')) {
    return 'COMPARE';
  } else if (lowerQuery.includes('search') || lowerQuery.includes('find') || lowerQuery.includes('look for')) {
    return 'SEARCH';
  } else if (lowerQuery.includes('analyze') || lowerQuery.includes('analysis') || lowerQuery.includes('tell me about')) {
    return 'ANALYZE';
  } else if (lowerQuery.includes('trend') || lowerQuery.includes('pattern') || lowerQuery.includes('changing')) {
    return 'TREND_ANALYSIS';
  } else if (lowerQuery.includes('recommend') || lowerQuery.includes('suggest') || lowerQuery.includes('should')) {
    return 'RECOMMEND';
  } else {
    return 'GENERAL';
  }
}

async function processQuery(query: string, context: any = {}) {
  const lowerQuery = query.toLowerCase();
  const intent = extractIntent(query);

  // In a real implementation, this would use AI to process the query
  // For demo purposes, we'll provide sample responses based on intent

  switch (intent) {
    case 'COMPARE':
      return await handleCompareQuery(query, context);
    case 'SEARCH':
      return await handleSearchQuery(query, context);
    case 'ANALYZE':
      return await handleAnalyzeQuery(query, context);
    case 'TREND_ANALYSIS':
      return await handleTrendQuery(query, context);
    case 'RECOMMEND':
      return await handleRecommendQuery(query, context);
    default:
      return await handleGeneralQuery(query, context);
  }
}

async function handleCompareQuery(query: string, context: any) {
  // Extract competitor names from query (simplified)
  const competitorMatch = query.match(/(\w+)\s+(?:vs|versus)\s+(\w+)/i);

  if (competitorMatch) {
    const [, comp1, comp2] = competitorMatch;

    // Get recent runs for comparison data
    const runs = await prisma.run.findMany({
      where: {
        status: 'COMPLETE'
      },
      include: {
        project: {
          select: { name: true }
        },
        competitors: true,
        findings: true,
        pricing: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return {
      type: 'comparison',
      competitors: [comp1, comp2],
      summary: `Comparative analysis between ${comp1} and ${comp2} across key dimensions:`,
      dimensions: [
        {
          name: 'Pricing',
          winner: comp1,
          reasoning: `${comp1} offers more competitive pricing with better value proposition for mid-market customers.`
        },
        {
          name: 'Feature Set',
          winner: comp2,
          reasoning: `${comp2} demonstrates more comprehensive feature coverage in automation and integration capabilities.`
        },
        {
          name: 'Market Position',
          winner: comp1,
          reasoning: `${comp1} shows stronger market traction and customer satisfaction indicators.`
        }
      ],
      recommendation: `Consider ${comp2}'s feature approach combined with ${comp1}'s pricing strategy for optimal market positioning.`,
      confidence: 0.78
    };
  }

  return {
    type: 'comparison',
    message: 'Please specify which competitors you would like to compare',
    example: "Compare Stripe vs Adyen"
  };
}

async function handleSearchQuery(query: string, context: any) {
  // Extract search terms
  const searchTerms = query.toLowerCase().match(/\b(support|integration|pricing|feature|api|compliance)\b/g) || [];

  const results = await prisma.run.findMany({
    where: {
      status: 'COMPLETE'
    },
    include: {
      project: {
        select: { name: true, industry: true }
      },
      competitors: {
        select: { name: true, category: true }
      },
      findings: {
        where: {
          OR: searchTerms.map(term => ({
            text: {
              contains: term
            }
          }))
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return {
    type: 'search',
    query: searchTerms.join(', '),
    results: results.map(run => ({
      project: run.project.name,
      industry: run.project.industry,
      relevantFindings: run.findings.length,
      summary: `Found ${run.findings.length} relevant insights related to ${searchTerms.join(', ')}`
    })),
    totalCount: results.length
  };
}

async function handleAnalyzeQuery(query: string, context: any) {
  // Get comprehensive analysis data
  const runs = await prisma.run.findMany({
    where: {
      status: 'COMPLETE'
    },
    include: {
      project: true,
      competitors: true,
      findings: true,
      sources: true
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  const totalCompetitors = runs.reduce((acc, run) => acc + run.competitors.length, 0);
  const totalFindings = runs.reduce((acc, run) => acc + run.findings.length, 0);
  const avgSources = runs.reduce((acc, run) => acc + run.sources.length, 0) / runs.length;

  return {
    type: 'analysis',
    summary: 'Comprehensive competitive intelligence analysis',
    metrics: {
      totalRuns: runs.length,
      totalCompetitorsAnalyzed: totalCompetitors,
      totalInsightsGenerated: totalFindings,
      averageSourcesPerAnalysis: Math.round(avgSources)
    },
    keyInsights: [
      'Market shows strong convergence toward AI-powered features',
      'Pricing models are evolving toward usage-based structures',
      'Integration capabilities are becoming key differentiators',
      'Compliance requirements are driving feature development'
    ],
    recommendations: [
      'Focus on AI feature differentiation',
      'Consider flexible pricing models',
      'Invest in integration ecosystem',
      'Prioritize compliance and security features'
    ]
  };
}

async function handleTrendQuery(query: string, context: any) {
  return {
    type: 'trend_analysis',
    trends: [
      {
        name: 'AI Integration',
        direction: 'increasing',
        confidence: 0.89,
        description: 'Rapid adoption of AI features across competitive landscape',
        timeframe: '6 months'
      },
      {
        name: 'API-First Approach',
        direction: 'increasing',
        confidence: 0.76,
        description: 'Shift toward comprehensive API ecosystems and developer experience',
        timeframe: '12 months'
      },
      {
        name: 'Traditional UI Focus',
        direction: 'decreasing',
        confidence: 0.67,
        description: 'Reduced emphasis on traditional UI in favor of programmatic access',
        timeframe: '9 months'
      }
    ],
    overallSentiment: 'Market shows strong innovation velocity with clear trend toward AI and API capabilities'
  };
}

async function handleRecommendQuery(query: string, context: any) {
  return {
    type: 'recommendations',
    strategic: [
      {
        priority: 'high',
        recommendation: 'Accelerate AI feature development',
        reasoning: 'Market analysis shows significant competitive advantage in AI capabilities',
        effort: 'medium',
        impact: 'high'
      },
      {
        priority: 'medium',
        recommendation: 'Expand integration ecosystem',
        reasoning: 'Customers increasingly value seamless integrations with existing tools',
        effort: 'high',
        impact: 'medium'
      }
    ],
    tactical: [
      {
        recommendation: 'Implement SOC 2 compliance',
        timeframe: '3-6 months',
        reasoning: 'Enterprise customers increasingly require security certifications'
      },
      {
        recommendation: 'Develop mobile SDK',
        timeframe: '6-9 months',
        reasoning: 'Mobile usage patterns show 45% YoY growth in target segment'
      }
    ]
  };
}

async function handleGeneralQuery(query: string, context: any) {
  return {
    type: 'general',
    message: 'I can help you with competitive intelligence analysis. Try asking me to:',
    examples: [
      'Compare Stripe vs Adyen',
      'Search for integration capabilities',
      'Analyze market trends',
      'Recommend strategic priorities'
    ],
    capabilities: [
      'Competitor comparisons',
      'Feature analysis',
      'Trend identification',
      'Strategic recommendations'
    ]
  };
}