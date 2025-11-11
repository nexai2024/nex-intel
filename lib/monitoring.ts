import { prisma } from '@/lib/prisma';
import { hash } from 'crypto';

/**
 * Source change detection and monitoring utilities
 */

interface SourceSnapshot {
  url: string;
  title: string;
  contentHash: string;
  lastChecked: Date;
  changeCount: number;
  lastChanged?: Date;
}

/**
 * Generate content hash for change detection
 */
export function generateContentHash(content: string): string {
  // Create a hash of the first 2000 characters to detect significant changes
  const contentSample = content.slice(0, 2000).replace(/\s+/g, ' ').trim();
  const hashObj = require('crypto').createHash('sha256');
  hashObj.update(Buffer.from(contentSample));
  return hashObj.digest('hex');
}

export async function getSourceSnapshots(runId: string): Promise<SourceSnapshot[]> {
  const sources = await prisma.source.findMany({
    where: { runId },
    select: {
      url: true,
      title: true,
      content: true,
      fetchedAt: true,
      meta: true
    },
    orderBy: { fetchedAt: 'asc' }
  });

  return sources.map(source => ({
    url: source.url,
    title: source.title || '',
    contentHash: generateContentHash(source.content || ''),
    lastChecked: source.fetchedAt,
    changeCount: 0,
    lastChanged: undefined
  }));
}

/**
 * Detect changes between two runs
 */
export async function detectSourceChanges(
  originalRunId: string,
  newRunId: string
): Promise<{
  addedSources: Array<{ url: string; title: string }>;
  removedSources: Array<{ url: string; title: string }>;
  modifiedSources: Array<{ url: string; title: string; changeType: 'content' | 'title' | 'both' }>;
  unchangedSources: Array<{ url: string; title: string }>;
}> {
  const [originalSnapshots, newSnapshots] = await Promise.all([
    getSourceSnapshots(originalRunId),
    getSourceSnapshots(newRunId)
  ]);

  const originalByUrl = new Map(originalSnapshots.map(s => [s.url, s]));
  const newByUrl = new Map(newSnapshots.map(s => [s.url, s]));

  const addedSources: Array<{ url: string; title: string }> = [];
  const removedSources: Array<{ url: string; title: string }> = [];
  const modifiedSources: Array<{ url: string; title: string; changeType: 'content' | 'title' | 'both' }> = [];
  const unchangedSources: Array<{ url: string; title: string }> = [];

  // Check for removed and modified sources
  for (const [url, original] of originalByUrl) {
    const newSource = newByUrl.get(url);
    if (!newSource) {
      removedSources.push({
        url,
        title: original.title
      });
    } else {
      const titleChanged = original.title !== newSource.title;
      const contentChanged = original.contentHash !== newSource.contentHash;

      if (titleChanged || contentChanged) {
        let changeType: 'content' | 'title' | 'both' = 'content';
        if (titleChanged && contentChanged) changeType = 'both';
        else if (titleChanged) changeType = 'title';

        modifiedSources.push({
          url,
          title: newSource.title,
          changeType
        });
      } else {
        unchangedSources.push({
          url,
          title: original.title
        });
      }
    }
  }

  // Check for added sources
  for (const [url, newSource] of newByUrl) {
    if (!originalByUrl.has(url)) {
      addedSources.push({
        url,
        title: newSource.title
      });
    }
  }

  return {
    addedSources,
    removedSources,
    modifiedSources,
    unchangedSources
  };
}

/**
 * Generate change summary for notifications
 */
export function generateChangeSummary(changes: Awaited<ReturnType<typeof detectSourceChanges>>): {
  summary: string;
  severity: 'low' | 'medium' | 'high';
  highlights: string[];
} {
  const { addedSources, removedSources, modifiedSources } = changes;
  const totalChanges = addedSources.length + removedSources.length + modifiedSources.length;

  let summary = '';
  let severity: 'low' | 'medium' | 'high' = 'low';
  const highlights: string[] = [];

  if (totalChanges === 0) {
    summary = 'No changes detected in competitive landscape';
    severity = 'low';
  } else {
    summary = `Detected ${totalChanges} change${totalChanges > 1 ? 's' : ''} in competitive intelligence`;

    if (addedSources.length > 0) {
      highlights.push(`${addedSources.length} new competitor source${addedSources.length > 1 ? 's' : ''} found`);
      severity = 'medium';
    }

    if (removedSources.length > 0) {
      highlights.push(`${removedSources.length} source${removedSources.length > 1 ? 's' : ''} removed`);
      severity = 'medium';
    }

    if (modifiedSources.length > 0) {
      highlights.push(`${modifiedSources.length} source${modifiedSources.length > 1 ? 's' : ''} updated`);
      severity = modifiedSources.length > 5 ? 'high' : 'medium';
    }

    // Set severity based on total changes
    if (totalChanges > 10) {
      severity = 'high';
    } else if (totalChanges > 3) {
      severity = 'medium';
    }
  }

  return { summary, severity, highlights };
}

/**
 * Store change detection results
 */
export async function storeChangeDetection(
  projectId: string,
  originalRunId: string,
  newRunId: string,
  changes: Awaited<ReturnType<typeof detectSourceChanges>>
) {
  const { summary, severity, highlights } = generateChangeSummary(changes);

  // Store change detection result as a finding
  await prisma.finding.create({
    data: {
      runId: newRunId,
      kind: 'RISK',
      text: summary,
      citations: [],
      confidence: 0.8,
      notes: JSON.stringify({
        type: 'change_detection',
        originalRunId,
        severity,
        highlights,
        changes: {
          added: changes.addedSources.length,
          removed: changes.removedSources.length,
          modified: changes.modifiedSources.length,
          unchanged: changes.unchangedSources.length
        }
      }, null, 2)
    }
  });

  console.log(`[Monitoring] Stored change detection for project ${projectId}: ${summary}`);
}

/**
 * Check for significant changes that should trigger alerts
 */
export async function checkForAlerts(
  projectId: string,
  changes: Awaited<ReturnType<typeof detectSourceChanges>>
): Promise<Array<{
  type: 'NEW_COMPETITOR' | 'COMPETITOR_REMOVED' | 'MAJOR_UPDATE' | 'PRICING_CHANGE';
  message: string;
  severity: 'low' | 'medium' | 'high';
  details: any;
}>> {
  const alerts: Array<{
    type: 'NEW_COMPETITOR' | 'COMPETITOR_REMOVED' | 'MAJOR_UPDATE' | 'PRICING_CHANGE';
    message: string;
    severity: 'low' | 'medium' | 'high';
    details: any;
  }> = [];

  // Check for new sources that might indicate new competitors
  if (changes.addedSources.length > 0) {
    alerts.push({
      type: 'NEW_COMPETITOR',
      message: `${changes.addedSources.length} new competitor source${changes.addedSources.length > 1 ? 's' : ''} detected`,
      severity: changes.addedSources.length > 3 ? 'high' : 'medium',
      details: { sources: changes.addedSources.slice(0, 5) }
    });
  }

  // Check for removed sources that might indicate competitors went out of business
  if (changes.removedSources.length > 0) {
    alerts.push({
      type: 'COMPETITOR_REMOVED',
      message: `${changes.removedSources.length} competitor source${changes.removedSources.length > 1 ? 's' : ''} no longer available`,
      severity: 'medium',
      details: { sources: changes.removedSources.slice(0, 5) }
    });
  }

  // Check for major updates (many modified sources)
  if (changes.modifiedSources.length > 5) {
    alerts.push({
      type: 'MAJOR_UPDATE',
      message: `Significant activity detected: ${changes.modifiedSources.length} sources updated`,
      severity: 'high',
      details: {
        totalModified: changes.modifiedSources.length,
        sampleSources: changes.modifiedSources.slice(0, 3)
      }
    });
  }

  // TODO: Add specific pricing change detection
  // This would require more sophisticated content analysis

  return alerts;
}
