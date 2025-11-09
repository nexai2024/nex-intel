'use client';
import { useEffect, useState } from 'react';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';
import { LoadingSpinner } from '@/app/components/LoadingStates';
import { useLoading } from '@/app/hooks/useGlobalLoading';
import { useError } from '@/app/hooks/useGlobalError';

interface AIInsight {
  id: string;
  runId: string;
  type: string;
  title: string;
  content: string;
  confidence: number;
  metadata?: any;
  createdAt: string;
}

interface QueryResult {
  id: string;
  query: string;
  intent: string;
  result: any;
  processedAt: string;
}

export default function AIInsightsPage() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [queryHistory, setQueryHistory] = useState<QueryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('insights');
  const [query, setQuery] = useState('');
  const [processingQuery, setProcessingQuery] = useState(false);
  const { withLoading } = useLoading();
  const { showError } = useError();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      // Load insights from recent runs
      const runsResponse = await fetch('/api/runs?limit=5');
      if (runsResponse.ok) {
        const runs = await runsResponse.json();

        // Get insights for each run
        const allInsights: AIInsight[] = [];
        for (const run of runs.rows) {
          try {
            const insightsResponse = await fetch(`/api/runs/${run.id}/insights`);
            if (insightsResponse.ok) {
              const runInsights = await insightsResponse.json();
              allInsights.push(...runInsights);
            }
          } catch (error) {
            console.error(`Failed to load insights for run ${run.id}:`, error);
          }
        }
        setInsights(allInsights);
      }
    } catch (error) {
      showError('Failed to load AI insights');
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function processQuery() {
    if (!query.trim()) {
      showError('Please enter a query');
      return;
    }

    try {
      setProcessingQuery(true);
      const response = await withLoading(
        fetch('/api/ai/query', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            query: query.trim(),
            context: {}
          })
        }),
        'Processing your query'
      );

      if (!response?.ok) {
        showError('Failed to process query');
        return;
      }

      const result = await response.json();
      setQueryHistory(prev => [result, ...prev]);
      setQuery('');
    } catch (error) {
      showError('Failed to process query');
    } finally {
      setProcessingQuery(false);
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'TREND': return '📈';
      case 'PREDICTION': return '🔮';
      case 'RECOMMENDATION': return '💡';
      case 'ANOMALY': return '⚠️';
      default: return '🤖';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'TREND': return 'bg-blue-100 text-blue-800';
      case 'PREDICTION': return 'bg-purple-100 text-purple-800';
      case 'RECOMMENDATION': return 'bg-green-100 text-green-800';
      case 'ANOMALY': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <main className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'AI Insights', current: true }
          ]}
        />
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" text="Loading AI insights..." />
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'AI Insights', current: true }
        ]}
      />

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">AI Insights</h1>
          <p className="text-sm text-gray-600">Leverage AI-powered competitive intelligence and natural language queries</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('insights')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'insights'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            AI Insights ({insights.length})
          </button>
          <button
            onClick={() => setActiveTab('query')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'query'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Natural Language Query
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Query History ({queryHistory.length})
          </button>
        </nav>
      </div>

      {/* AI Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          {insights.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">🤖</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No AI insights yet</h3>
              <p className="text-gray-600 mb-6">Run some competitive analyses to generate AI-powered insights</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {insights.map((insight) => (
                <div key={insight.id} className="card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getInsightIcon(insight.type)}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getInsightColor(insight.type)}`}>
                            {insight.type}
                          </span>
                          <span className={`text-xs font-medium ${getConfidenceColor(insight.confidence)}`}>
                            {Math.round(insight.confidence * 100)}% confidence
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(insight.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{insight.content}</p>
                  {insight.metadata && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <details className="text-sm">
                        <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                          View metadata
                        </summary>
                        <pre className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded overflow-auto">
                          {JSON.stringify(insight.metadata, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Natural Language Query Tab */}
      {activeTab === 'query' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ask AI About Your Competitive Intelligence</h3>
            <div className="space-y-4">
              <div>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={4}
                  placeholder="Ask me anything about your competitive intelligence...&#10;&#10;Examples:&#10;• Compare Stripe vs Adyen&#10;• What are the market trends?&#10;• Search for integration capabilities&#10;• Analyze pricing strategies"
                />
              </div>
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Try: <button
                    onClick={() => setQuery('Compare pricing strategies across competitors')}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    Compare pricing strategies
                  </button>
                </div>
                <button
                  onClick={processQuery}
                  disabled={processingQuery || !query.trim()}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {processingQuery ? 'Processing...' : 'Ask AI'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-4">
              <h4 className="font-medium text-gray-900 mb-2">Query Examples</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Compare Stripe vs Adyen pricing</li>
                <li>• What are the market trends?</li>
                <li>• Search for AI capabilities</li>
                <li>• Analyze competitor features</li>
                <li>• Recommend strategic priorities</li>
              </ul>
            </div>
            <div className="card p-4">
              <h4 className="font-medium text-gray-900 mb-2">AI Capabilities</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Competitor comparisons</li>
                <li>• Trend analysis</li>
                <li>• Strategic recommendations</li>
                <li>• Market predictions</li>
                <li>• Pattern recognition</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Query History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {queryHistory.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No query history yet</h3>
              <p className="text-gray-600">Start asking questions to build your query history</p>
            </div>
          ) : (
            <div className="space-y-4">
              {queryHistory.map((queryResult) => (
                <div key={queryResult.id} className="card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900">{queryResult.query}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          {queryResult.intent}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(queryResult.processedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {queryResult.result?.type === 'comparison' && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Comparison Results</h5>
                        <div className="space-y-2">
                          {queryResult.result?.dimensions?.map((dim: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                              <span className="font-medium">{dim.name}</span>
                              <span className="text-sm text-indigo-600">{dim.winner}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {queryResult.result?.type === 'analysis' && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Analysis Results</h5>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h6 className="text-sm font-medium text-gray-700 mb-1">Key Metrics</h6>
                            <div className="space-y-1 text-sm">
                              {Object.entries(queryResult.result?.metrics || {}).map(([key, value]: [string, any]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="text-gray-600">{key}:</span>
                                  <span className="font-medium">{value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h6 className="text-sm font-medium text-gray-700 mb-1">Key Insights</h6>
                            <ul className="text-sm space-y-1">
                              {queryResult.result?.keyInsights?.map((insight: string, index: number) => (
                                <li key={index} className="text-gray-600">• {insight}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                    {queryResult.result?.message && (
                      <p className="text-gray-700">{queryResult.result.message}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}