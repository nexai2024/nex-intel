'use client';

import { useState, useEffect } from 'react';
import { XIcon, LinkIcon, CopyIcon, CheckIcon, ShieldIcon, CalendarIcon, DownloadIcon } from 'lucide-react';

interface ShareReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  reportHeadline: string;
}

interface ShareOption {
  id: string;
  label: string;
  description: string;
}

interface ExistingShare {
  id: string;
  token: string;
  shareUrl: string;
  expiresAt?: string;
  hasPassword: boolean;
  allowDownload: boolean;
  isExpired: boolean;
  createdAt: string;
}

const shareOptions: ShareOption[] = [
  { id: 'never', label: 'Never', description: 'Link never expires' },
  { id: '7days', label: '7 days', description: 'Link expires in 7 days' },
  { id: '30days', label: '30 days', description: 'Link expires in 30 days' },
  { id: '90days', label: '90 days', description: 'Link expires in 90 days' },
];

export default function ShareReportModal({ isOpen, onClose, reportId, reportHeadline }: ShareReportModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existingShares, setExistingShares] = useState<ExistingShare[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  // Form state
  const [selectedExpiration, setSelectedExpiration] = useState('never');
  const [password, setPassword] = useState('');
  const [enablePassword, setEnablePassword] = useState(false);
  const [allowDownload, setAllowDownload] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchExistingShares();
    }
  }, [isOpen, reportId]);

  const fetchExistingShares = async () => {
    try {
      const response = await fetch(`/api/reports/${reportId}/share`);
      if (!response.ok) throw new Error('Failed to fetch shares');
      const data = await response.json();
      setExistingShares(data.shares);
    } catch (err) {
      console.error('Error fetching shares:', err);
      setError('Failed to fetch existing shares');
    }
  };

  const handleCreateShare = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Calculate expiration date
      let expiresAt = null;
      if (selectedExpiration !== 'never') {
        const days = parseInt(selectedExpiration.replace('days', ''));
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
        expiresAt.toISOString();
      }

      const response = await fetch(`/api/reports/${reportId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expiresAt,
          password: enablePassword ? password : null,
          allowDownload,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create share');
      }

      const data = await response.json();
      setSuccess('Report shared successfully!');
      setExistingShares(prev => [data, ...prev]);

      // Reset form
      setPassword('');
      setEnablePassword(false);
      setSelectedExpiration('never');
      setAllowDownload(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShare = async (shareId: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/share/${shareId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete share');

      setExistingShares(prev => prev.filter(s => s.id !== shareId));
      setSuccess('Share link deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete share');
    }
  };

  const copyToClipboard = async (text: string, shareId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(shareId);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getExpirationDate = (selected: string) => {
    if (selected === 'never') return null;
    const days = parseInt(selected.replace('days', ''));
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50" onClick={onClose} />

        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <LinkIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Share Report</h2>
                <p className="text-sm text-gray-500">{reportHeadline}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {success}
              </div>
            )}

            {/* Create New Share */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Share Link</h3>

              {/* Expiration Options */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CalendarIcon className="w-4 h-4 inline mr-1" />
                  Link Expiration
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {shareOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedExpiration(option.id)}
                      className={`p-3 text-left rounded-lg border-2 transition-colors ${
                        selectedExpiration === option.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Password Protection */}
              <div className="mb-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={enablePassword}
                    onChange={(e) => setEnablePassword(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex items-center">
                    <ShieldIcon className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Password protection</span>
                  </div>
                </label>
                {enablePassword && (
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              {/* Download Permission */}
              <div className="mb-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={allowDownload}
                    onChange={(e) => setAllowDownload(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex items-center">
                    <DownloadIcon className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Allow download</span>
                  </div>
                </label>
              </div>

              <button
                onClick={handleCreateShare}
                disabled={loading || (enablePassword && !password.trim())}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Create Share Link'}
              </button>
            </div>

            {/* Existing Shares */}
            {existingShares.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Existing Share Links</h3>
                <div className="space-y-3">
                  {existingShares.map(share => (
                    <div key={share.id} className={`p-4 border rounded-lg ${share.isExpired ? 'border-gray-200 bg-gray-50' : 'border-gray-300'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {share.hasPassword && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <ShieldIcon className="w-3 h-3 mr-1" />
                                Password
                              </span>
                            )}
                            {share.allowDownload && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <DownloadIcon className="w-3 h-3 mr-1" />
                                Download
                              </span>
                            )}
                            {share.expiresAt && (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                share.isExpired ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                <CalendarIcon className="w-3 h-3 mr-1" />
                                {share.isExpired ? 'Expired' : `Expires ${new Date(share.expiresAt).toLocaleDateString()}`}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={share.shareUrl}
                              readOnly
                              className="flex-1 px-3 py-1 bg-gray-50 border border-gray-200 rounded text-sm"
                            />
                            <button
                              onClick={() => copyToClipboard(share.shareUrl, share.id)}
                              className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded hover:bg-gray-50"
                            >
                              {copied === share.id ? (
                                <CheckIcon className="w-4 h-4 text-green-600" />
                              ) : (
                                <CopyIcon className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Created {new Date(share.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {!share.isExpired && (
                          <button
                            onClick={() => handleDeleteShare(share.id)}
                            className="ml-4 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}