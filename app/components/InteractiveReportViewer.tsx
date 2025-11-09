'use client';
import { useState, useEffect } from 'react';

interface InteractiveReportViewerProps {
  markdown: string;
  runId: string;
  className?: string;
}

export function InteractiveReportViewer({ markdown, runId, className }: InteractiveReportViewerProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'raw' | 'print'>('preview');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [highlightedText, setHighlightedText] = useState<string | null>(null);

  // Extract sections from markdown
  const sections = markdown.split(/^## /m).slice(1);

  // Parse section data
  const parsedSections = sections.map((section, index) => {
    const lines = section.split('\n');
    const title = lines[0]?.trim() || `Section ${index + 1}`;
    const content = lines.slice(1).join('\n').trim();
    const sectionId = `section-${index}`;

    return {
      id: sectionId,
      title,
      content,
      wordCount: content.split(/\s+/).length
    };
  });

  // Filter content based on search
  const filteredSections = parsedSections.filter(section =>
    !searchTerm ||
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Expand/collapse all sections
  const toggleAllSections = () => {
    if (expandedSections.size === parsedSections.length) {
      setExpandedSections(new Set());
    } else {
      setExpandedSections(new Set(parsedSections.map(s => s.id)));
    }
  };

  // Highlight text
  const highlightText = (text: string) => {
    if (!searchTerm) return text;

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  // Copy section to clipboard
  const copySection = async (section: typeof parsedSections[0]) => {
    const textToCopy = `## ${section.title}\n\n${section.content}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setHighlightedText(section.id);
      setTimeout(() => setHighlightedText(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (viewMode === 'raw') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Raw Markdown</h3>
          <button
            onClick={() => setViewMode('preview')}
            className="btn btn-ghost"
          >
            Back to Preview
          </button>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg overflow-auto">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
            {markdown}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Toolbar */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'raw'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Raw
              </button>
              <button
                onClick={() => setViewMode('print')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'print'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Print
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search report..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="btn btn-ghost text-sm"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {viewMode === 'preview' && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-gray-600">
              {filteredSections.length} of {parsedSections.length} sections
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAllSections}
                className="btn btn-ghost text-sm"
              >
                {expandedSections.size === parsedSections.length ? 'Collapse All' : 'Expand All'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {viewMode === 'preview' && (
        <div className="space-y-4">
          {filteredSections.map((section) => {
            const isExpanded = expandedSections.has(section.id) || searchTerm;
            const isHighlighted = highlightedText === section.id;

            return (
              <div
                key={section.id}
                className={`bg-white border rounded-lg overflow-hidden transition-all duration-200 ${
                  isHighlighted ? 'ring-2 ring-green-500' : ''
                }`}
              >
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="flex items-center gap-2 text-left hover:text-gray-900"
                      >
                        <div className={`transform transition-transform duration-200 ${
                          isExpanded ? 'rotate-90' : ''
                        }`}>
                          ▶
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {highlightText(section.title)}
                        </h3>
                      </button>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {section.wordCount} words
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isHighlighted && (
                        <span className="text-xs text-green-600 font-medium">
                          ✓ Copied!
                        </span>
                      )}
                      <button
                        onClick={() => copySection(section)}
                        className="btn btn-ghost text-sm"
                        title="Copy section"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                </div>

                {(isExpanded || searchTerm) && (
                  <div className="p-6">
                    <div className="prose max-w-none">
                      {section.content.split('\n').map((paragraph, index) => {
                        if (paragraph.trim() === '') {
                          return <br key={index} />;
                        }

                        if (paragraph.startsWith('- ')) {
                          return (
                            <li key={index} className="ml-4">
                              {highlightText(paragraph.slice(2))}
                            </li>
                          );
                        }

                        if (paragraph.match(/^\d+\. /)) {
                          return (
                            <li key={index} className="ml-4 list-decimal">
                              {highlightText(paragraph.replace(/^\d+\. /, ''))}
                            </li>
                          );
                        }

                        if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                          return (
                            <h4 key={index} className="font-semibold text-lg mt-4 mb-2">
                              {highlightText(paragraph.slice(2, -2))}
                            </h4>
                          );
                        }

                        return (
                          <p key={index} className="mb-3 last:mb-0">
                            {highlightText(paragraph)}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredSections.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No sections found</p>
              <p className="text-sm mt-2">Try adjusting your search terms</p>
            </div>
          )}
        </div>
      )}

      {viewMode === 'print' && (
        <div className="bg-white p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Competitive Analysis Report</h1>
            <div className="prose max-w-none">
              {parsedSections.map((section) => (
                <div key={section.id} className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 border-b pb-2">
                    {section.title}
                  </h2>
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}