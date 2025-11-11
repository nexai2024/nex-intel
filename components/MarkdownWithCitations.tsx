'use client';
import React from 'react';
import { EvidenceDrawer } from '@/app/components/EvidenceDrawer';
import { marked } from 'marked';

export function MarkdownWithCitations({ markdown }: { markdown: string }) {
  const [open, setOpen] = React.useState(false);
  const [citeIds, setCiteIds] = React.useState<string[]>([]);

  // Convert [c:ID] tokens to superscripts that open the drawer.
  const html = React.useMemo(() => {
    const replaced = markdown.replace(/\[c:([a-z0-9]{10,})\]/gi, (_, id) => {
      return `<sup class="citation" data-id="${id}">[•]</sup>`;
    });
    return marked.parse(replaced);
  }, [markdown]);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (t && t.matches('sup.citation')) {
        const id = t.getAttribute('data-id');
        if (id) {
          setCiteIds([id]);
          setOpen(true);
        }
      }
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <>
      <article
        className="prose dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: typeof html === 'string' ? html : '' }}
      />
      <EvidenceDrawer open={open} onClose={() => setOpen(false)} citationIds={citeIds} />
    </>
  );
}