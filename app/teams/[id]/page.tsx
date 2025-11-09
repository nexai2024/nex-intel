'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';
import { LoadingSpinner } from '@/app/components/LoadingStates';
import { useLoading } from '@/app/hooks/useGlobalLoading';
import { useError } from '@/app/hooks/useGlobalError';

interface TeamMember {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name?: string;
    email: string;
  };
}

interface Activity {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  user: {
    id: string;
    name?: string;
    email: string;
  };
}

interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  members: TeamMember[];
  activities: Activity[];
}

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = params.id as string;
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('VIEWER');
  const { withLoading } = useLoading();
  const { showError } = useError();

  useEffect(() => {
    if (teamId) {
      loadTeam();
    }
  }, [teamId]);

  async function loadTeam() {
    try {
      setLoading(true);
      const response = await fetch(`/api/teams/${teamId}`);
      if (!response.ok) throw new Error('Failed to load team');
      const data = await response.json();
      setTeam(data);
    } catch (error) {
      showError('Failed to load team');
      console.error('Failed to load team:', error);
    } finally {
      setLoading(false);
    }
  }

  async function inviteMember() {
    if (!inviteEmail.trim()) {
      showError('Email is required');
      return;
    }

    try {
      const response = await withLoading(
        fetch(`/api/teams/${teamId}/members`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            email: inviteEmail.trim(),
            role: inviteRole
          })
        }),
        'Inviting team member'
      );

      if (!response?.ok) {
        showError('Failed to invite team member');
        return;
      }

      await loadTeam();
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('VIEWER');
    } catch (error) {
      showError('Failed to invite team member');
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER': return 'bg-purple-100 text-purple-800';
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'EDITOR': return 'bg-blue-100 text-blue-800';
      case 'VIEWER': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'TEAM_CREATED': return '🏢';
      case 'MEMBER_ADDED': return '👥';
      case 'PROJECT_CREATED': return '📁';
      case 'RUN_STARTED': return '🚀';
      case 'REPORT_APPROVED': return '✅';
      case 'COMMENT_ADDED': return '💬';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <main className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Teams', href: '/teams' },
            { label: 'Team Details', current: true }
          ]}
        />
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" text="Loading team details..." />
        </div>
      </main>
    );
  }

  if (!team) {
    return (
      <main className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Teams', href: '/teams' },
            { label: 'Team Details', current: true }
          ]}
        />
        <div className="card p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Team not found</h3>
          <p className="text-gray-600 mb-6">The team you're looking for doesn't exist or you don't have access to it.</p>
          <Link href="/teams" className="btn btn-primary">Back to Teams</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Teams', href: '/teams' },
          { label: team.name, current: true }
        ]}
      />

      {/* Team Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {team.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{team.name}</h1>
              {team.description && (
                <p className="text-gray-600 mt-1">{team.description}</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                Created {new Date(team.createdAt).toLocaleDateString()} • {team.members.length} members
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn btn-primary"
          >
            Invite Member
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'members'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Members ({team.members.length})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'activity'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Activity
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Team Statistics</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Members</span>
                <span className="font-medium">{team.members.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Projects</span>
                <span className="font-medium">3</span> {/* Placeholder */}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reports Generated</span>
                <span className="font-medium">12</span> {/* Placeholder */}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Activity</span>
                <span className="font-medium">2 hours ago</span> {/* Placeholder */}
              </div>
            </div>
          </div>
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {team.activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 text-sm">
                  <span className="text-lg">{getActivityIcon(activity.type)}</span>
                  <div className="flex-1">
                    <p className="text-gray-900">{activity.message}</p>
                    <p className="text-gray-500 text-xs">
                      {activity.user.name || activity.user.email} • {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="card">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Team Members</h3>
            <div className="space-y-4">
              {team.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center font-medium">
                      {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.user.name || member.user.email}
                      </p>
                      <p className="text-sm text-gray-600">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(member.role)}`}>
                      {member.role}
                    </span>
                    <p className="text-sm text-gray-500">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="card">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Team Activity</h3>
            <div className="space-y-4">
              {team.activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
                  <span className="text-lg mt-1">{getActivityIcon(activity.type)}</span>
                  <div className="flex-1">
                    <p className="text-gray-900">{activity.message}</p>
                    <p className="text-sm text-gray-500">
                      {activity.user.name || activity.user.email} • {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">Invite Team Member</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="colleague@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="EDITOR">Editor</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="btn btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={inviteMember}
                className="btn btn-primary flex-1"
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}