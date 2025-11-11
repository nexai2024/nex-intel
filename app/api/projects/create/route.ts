import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ensureProjectFeatures } from '@/lib/features';

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { inputs, ...projectData } = body;
    const featuresList: string[] = Array.isArray(body.features)
      ? body.features
          .map((f: unknown) => (typeof f === 'string' ? f.trim() : ''))
          .filter((f: string) => f.length > 0)
      : [];
    
    // Prepare projectInputs data - ensure all required array fields are present
    const projectInputsData = inputs ? {
      keywords: inputs.keywords || [],
      competitors: inputs.competitors || [],
      platforms: inputs.platforms || [],
      urls: inputs.urls || [],
      problem: inputs.problem || null,
      solution: inputs.solution || null,
      priceTarget: inputs.priceTarget || null,
    } : null;
    
    const p = await prisma.project.create({
      data: {
        ...projectData,
        userId: user.id,
        ...(projectInputsData && {
          projectInputs: {
            create: projectInputsData
          }
        })
      },
      include: {
        projectInputs: true
      }
    });

    if (featuresList.length > 0) {
      await ensureProjectFeatures(p.id, featuresList);
    }
    
    return NextResponse.json({ id: p.id });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create project' },
      { status: 500 }
    );
  }
}