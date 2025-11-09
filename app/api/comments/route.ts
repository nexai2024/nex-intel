import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const runId = searchParams.get('runId');
    const reportId = searchParams.get('reportId');

    if (!projectId && !runId && !reportId) {
      return NextResponse.json(
        { error: 'Must specify projectId, runId, or reportId' },
        { status: 400 }
      );
    }

    const comments = await prisma.comment.findMany({
      where: {
        OR: [
          projectId ? { projectId } : {},
          runId ? { runId } : {},
          reportId ? { reportId } : {},
        ].filter(Boolean)
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Failed to fetch comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, projectId, runId, reportId, parentId } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    if (!projectId && !runId && !reportId) {
      return NextResponse.json(
        { error: 'Must specify projectId, runId, or reportId' },
        { status: 400 }
      );
    }

    // For demo, use demo user as author
    const demoUser = await prisma.user.findFirst({
      where: { email: 'demo-user@example.com' }
    });

    if (!demoUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If this is a reply, validate the parent comment
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId }
      });

      if (!parentComment) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        );
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        authorId: demoUser.id,
        projectId: projectId || null,
        runId: runId || null,
        reportId: reportId || null,
        parentId: parentId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: parentId ? 'COMMENT_REPLY' : 'COMMENT_ADDED',
        message: parentId ? 'Replied to a comment' : 'Added a comment',
        userId: demoUser.id,
        projectId: projectId || null,
        runId: runId || null,
        reportId: reportId || null,
        metadata: {
          commentId: comment.id,
          isReply: !!parentId,
          parentId
        }
      }
    });

    // Notify mentioned users (simple implementation)
    const mentions = content.match(/@(\w+)/g);
    if (mentions) {
      for (const mention of mentions) {
        const mentionedEmail = mention.slice(1) + '@example.com'; // Simple implementation
        const mentionedUser = await prisma.user.findUnique({
          where: { email: mentionedEmail }
        });

        if (mentionedUser && mentionedUser.id !== demoUser.id) {
          await prisma.notification.create({
            data: {
              userId: mentionedUser.id,
              type: 'MENTION',
              title: 'You were mentioned',
              message: `${demoUser.name || demoUser.email} mentioned you in a comment`,
              metadata: {
                commentId: comment.id,
                projectId,
                runId,
                reportId
              }
            }
          });
        }
      }
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Failed to create comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}