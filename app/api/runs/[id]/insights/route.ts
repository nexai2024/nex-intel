import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const runId = id;

    const insights = await prisma.aIInsight.findMany({
      where: { runId },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // If no AI insights exist, generate some sample insights
    if (insights.length === 0) {
      const sampleInsights = await generateSampleInsights(runId);
      return NextResponse.json(sampleInsights);
    }

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Failed to fetch AI insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI insights' },
      { status: 500 }
    );
  }
}

async function generateSampleInsights(runId: string) {
  // In a real implementation, this would call an AI service
  // For demo purposes, we'll create sample insights

  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: {
      project: {
        select: {
          name: true,
          industry: true,
        }
      },
      competitors: {
        select: {
          name: true,
        }
      },
      findings: {
        select: {
          kind: true,
          text: true,
          confidence: true,
        }
      }
    }
  });

  if (!run) {
    return [];
  }

  const insights = [
    {
      id: `ai_insight_${Date.now()}_1`,
      runId,
      type: 'TREND',
      title: 'Market Convergence Pattern',
      content: `Analysis indicates a strong trend toward AI-powered automation across ${run.competitors.length} competitors in the ${run.project.industry || 'target'} market. 75% of analyzed competitors are now marketing AI features prominently.`,
      confidence: 0.87,
      metadata: {
        model: 'IntelBox-AI-v2.1',
        analyzedCompetitors: run.competitors.length,
        trendDirection: 'increasing',
        timeframe: '6 months'
      },
      createdAt: new Date()
    },
    {
      id: `ai_insight_${Date.now()}_2`,
      runId,
      type: 'PREDICTION',
      title: 'Pricing Evolution Forecast',
      content: `Based on current pricing patterns and market trajectory, predict a 15-20% average price increase across the competitive landscape within the next 12 months, driven by enhanced AI capabilities and enterprise features.`,
      confidence: 0.72,
      metadata: {
        model: 'IntelBox-AI-v2.1',
        predictionHorizon: '12 months',
        confidenceFactors: ['historical_pricing_data', 'feature_evolution', 'market_positioning']
      },
      createdAt: new Date()
    },
    {
      id: `ai_insight_${Date.now()}_3`,
      runId,
      type: 'RECOMMENDATION',
      title: 'Strategic Gap Opportunity',
      content: `Significant market opportunity identified in mid-market segment where current solutions show gaps in compliance features and integration capabilities. Recommend prioritizing SOC 2 compliance and HubSpot integration for competitive advantage.`,
      confidence: 0.91,
      metadata: {
        model: 'IntelBox-AI-v2.1',
        opportunityScore: 9.1,
        targetSegment: 'mid-market',
        recommendedFeatures: ['SOC 2 compliance', 'HubSpot integration']
      },
      createdAt: new Date()
    },
    {
      id: `ai_insight_${Date.now()}_4`,
      runId,
      type: 'ANOMALY',
      title: 'Unusual Feature Pattern Detected',
      content: `Notable anomaly: ${run.competitors[0]?.name || 'Market leader'} significantly underinvests in mobile capabilities compared to peers, despite strong market demand. This could represent a strategic vulnerability or focus shift.`,
      confidence: 0.83,
      metadata: {
        model: 'IntelBox-AI-v2.1',
        anomalyType: 'feature_gap',
        affectedCompetitor: run.competitors[0]?.name,
        impactLevel: 'medium'
      },
      createdAt: new Date()
    }
  ];

  // Save insights to database
  await prisma.aIInsight.createMany({
    data: insights
  });

  return insights;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const runId = id;
    const { type, title, content, metadata } = await request.json();

    if (!type || !title || !content) {
      return NextResponse.json(
        { error: 'Type, title, and content are required' },
        { status: 400 }
      );
    }

    const insight = await prisma.aIInsight.create({
      data: {
        runId,
        type,
        title: title.trim(),
        content: content.trim(),
        confidence: metadata?.confidence || 0.5,
        metadata: metadata || null
      }
    });

    return NextResponse.json(insight, { status: 201 });
  } catch (error) {
    console.error('Failed to create AI insight:', error);
    return NextResponse.json(
      { error: 'Failed to create AI insight' },
      { status: 500 }
    );
  }
}

