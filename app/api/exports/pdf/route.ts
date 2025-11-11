import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import puppeteer from 'puppeteer';
import { marked } from 'marked';

function mdToHtml(md: string) {
  // Convert markdown to HTML using marked
  const html = marked(md, { breaks: true });
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CompeteIQ Competitive Analysis Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, Helvetica, sans-serif;
      padding: 40px;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      color: #333;
    }
    h1, h2, h3 { margin-top: 1.5em; color: #333; font-weight: 600; }
    h1 { border-bottom: 2px solid #eee; padding-bottom: 0.3em; font-size: 28px; }
    h2 { font-size: 22px; }
    h3 { font-size: 18px; }
    ul, ol { margin: 1em 0; padding-left: 2em; }
    li { margin: 0.5em 0; }
    code { background: #f6f8fa; padding: 2px 6px; border-radius: 3px; font-family: 'SF Mono', Monaco, monospace; font-size: 0.9em; }
    pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 0.85em; }
    blockquote { border-left: 4px solid #ddd; padding-left: 1em; margin: 1em 0; color: #666; font-style: italic; }
    a { color: #0366d6; text-decoration: none; }
    a:hover { text-decoration: underline; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f6f8fa; font-weight: 600; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 0.8em;
      font-weight: 600;
      border-radius: 12px;
      background: #f1f8ff;
      color: #0366d6;
    }
    .header { text-align: center; margin-bottom: 40px; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.8em; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>CompeteIQ Competitive Analysis Report</h1>
    <p>Generated on ${new Date().toLocaleDateString()}</p>
  </div>
  ${html}
  <div class="footer">
    <p>© 2025 CompeteIQ - Evidence-first competitive intelligence. This report was automatically generated with source citations.</p>
  </div>
</body>
</html>`;
}

export async function POST(req: Request) {
  let browser;
  try {
    await requireAuth(); // Ensure user is authenticated
    const form = await req.formData();
    const runId = String(form.get('runId') ?? '');

    if (!runId) {
      return new Response('Missing runId parameter', { status: 400 });
    }

    // Verify user owns the report
    const user = await requireAuth();
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

    if (!report) {
      return new Response('Report not found or access denied', { status: 404 });
    }

    const html = mdToHtml(report.mdContent);

    // Generate PDF using Puppeteer with serverless-compatible configuration
    const puppeteerOptions = {
      headless: 'new' as const,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    };

    // Fix: 'headless' option should be boolean or 'shell', not 'new'
    const fixedPuppeteerOptions = {
      ...puppeteerOptions,
      headless: true, // or false if you want a headed browser
    };

    browser = await puppeteer.launch(fixedPuppeteerOptions);
    const page = await browser.newPage();

    // Set content and wait for it to render
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    // Generate PDF with better formatting
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size:10px; color:#666; text-align:center; width:100%;">
          CompeteIQ Competitive Analysis - Page <span class="pageNumber"></span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size:10px; color:#666; text-align:center; width:100%;">
          Generated on ${new Date().toLocaleDateString()} | Confidential
        </div>
      `
    });

    return new Response(
      new Blob([pdf as unknown as ArrayBuffer], { type: 'application/pdf' }),
      {
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': `attachment; filename="CompeteIQ-report-${report.run.project.name}-${runId}.pdf"`,
          'cache-control': 'no-cache, no-store, must-revalidate',
        'pragma': 'no-cache',
        'expires': '0'
      }
    });
  } catch (error: any) {
    console.error('PDF generation error:', error);

    // Return more specific error messages
    if (error.message.includes('ENOENT')) {
      return new Response('PDF generation service unavailable. Please try again later.', { status: 503 });
    }

    if (error.message.includes('timeout')) {
      return new Response('PDF generation timed out. The report may be too large.', { status: 408 });
    }

    return new Response(`Error generating PDF: ${error.message}`, {
      status: 500,
      headers: {
        'content-type': 'text/plain'
      }
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
}