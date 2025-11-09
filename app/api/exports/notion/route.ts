import { prisma } from '@/lib/prisma';
import { createNotionPageFromMarkdown } from '@/lib/notion';
import { json } from '@/lib/http';
import { requireAuth } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    // Require authentication
    const user = await requireAuth();

    const body = await req.json().catch(() => ({}));
    const { runId, parentPageId = process.env.NOTION_PARENT_PAGE_ID } = body as { runId: string; parentPageId?: string };

    if (!runId) return json({ error: 'runId required' }, { status: 400 });

    // Check if Notion is configured
    if (!process.env.NOTION_TOKEN) {
      return json({
        error: 'Notion not configured',
        message: 'Please configure NOTION_TOKEN environment variable'
      }, { status: 400 });
    }

    if (!parentPageId) {
      return json({
        error: 'Notion parent page not configured',
        message: 'Please configure NOTION_PARENT_PAGE_ID environment variable or provide parentPageId'
      }, { status: 400 });
    }

    // Verify user owns the report
    const report = await prisma.report.findFirst({
      where: {
        runId,
        format: 'MARKDOWN',
        run: {
          project: {
            userId: user.id
          }
        }
      },
      include: {
        run: {
          include: {
            project: true
          }
        }
      }
    });

    if (!report) return json({ error: 'Report not found or access denied' }, { status: 404 });

    // Create Notion page with error handling
    let created;
    try {
      created = await createNotionPageFromMarkdown({
        token: process.env.NOTION_TOKEN!,
        parentPageId,
        title: `${report.run.project.name} - Competitive Analysis`,
        markdown: report.mdContent
      });
    } catch (notionError: any) {
      console.error('Notion API error:', notionError);

      // Return specific error messages for common issues
      if (notionError.code === 'unauthorized') {
        return json({
          error: 'Notion authorization failed',
          message: 'The provided NOTION_TOKEN is invalid or expired'
        }, { status: 401 });
      }

      if (notionError.code === 'object_not_found') {
        return json({
          error: 'Notion page not found',
          message: 'The specified parent page ID does not exist or is not accessible'
        }, { status: 404 });
      }

      if (notionError.code === 'rate_limited') {
        return json({
          error: 'Notion API rate limit exceeded',
          message: 'Please try again in a few minutes'
        }, { status: 429 });
      }

      return json({
        error: 'Notion export failed',
        message: notionError.message || 'Unknown error occurred while creating Notion page'
      }, { status: 500 });
    }

    // Log as a new report artifact
    await prisma.report.create({
      data: {
        projectId: report.projectId,
        runId,
        headline: `${report.headline} (Notion)`,
        mdContent: `Exported to Notion page: ${created.url ?? created.id}\n\nCreated: ${new Date().toISOString()}`,
        format: 'NOTION',
        approved: true
      }
    });

    return json({
      ok: true,
      notion: created,
      message: 'Report successfully exported to Notion',
      url: created.url
    });

  } catch (error: any) {
    console.error('Notion export error:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return json({
        error: 'Invalid request body',
        message: 'Please provide valid JSON with runId'
      }, { status: 400 });
    }

    return json({
      error: 'Internal server error',
      message: error.message || 'Unknown error occurred'
    }, { status: 500 });
  }
}