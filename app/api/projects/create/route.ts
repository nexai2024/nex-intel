import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ensureProjectFeatures } from '@/lib/features';
import { validateProjectInput, type CreateProjectInput } from '@/lib/validation';
import { ZodError } from 'zod';

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    
    // Validate and sanitize input
    let validatedData: CreateProjectInput;
    try {
      validatedData = validateProjectInput(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { 
            error: 'Validation failed', 
            details: error.issues.map((e) => ({
              path: e.path.join('.'),
              message: e.message
            }))
          },
          { status: 400 }
        );
      }
      throw error;
    }
    
    const { inputs, features: featuresList, ...projectData } = validatedData;
    
    // Prepare projectInputs data - already validated and sanitized
    const projectInputsData = inputs ? {
      keywords: inputs.keywords,
      competitors: inputs.competitors,
      platforms: inputs.platforms,
      urls: inputs.urls,
      problem: inputs.problem,
      solution: inputs.solution,
      priceTarget: inputs.priceTarget,
    } : null;
    
    // Use Prisma transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create project with inputs
      const project = await tx.project.create({
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

      // Create project features within the same transaction
      if (featuresList.length > 0) {
        await ensureProjectFeatures(project.id, featuresList, tx);
      }

      return project;
    }, {
      timeout: 30000, // 30 second timeout for transaction
    });
    
    return NextResponse.json({ id: result.id });
  } catch (error: any) {
    console.error('Error creating project:', error);
    
    // Handle Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A project with this information already exists' },
        { status: 409 }
      );
    }
    
    if (error.code === 'P2034') {
      return NextResponse.json(
        { error: 'Transaction conflict. Please try again.' },
        { status: 409 }
      );
    }
    
    // Handle validation errors (should be caught above, but just in case)
    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create project' },
      { status: 500 }
    );
  }
}