'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';
import { LoadingTable } from '@/app/components/LoadingStates';
import { useLoading } from '@/app/hooks/useGlobalLoading';
import { useError } from '@/app/hooks/useGlobalError';

interface Team {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  createdAt: string;
  members: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      name?: string;
      email: string;
    };
  }>;
  projects: Array<{
    id: string;
    name: string;
    createdAt: string;
  }>;
  _count: {
    members: number;
    projects: number;
  };
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', description: '' });
  const { withLoading } = useLoading();
  const { showError } = useError();

  useEffect(() => {
    loadTeams();
  }, []);

  async function loadTeams() {
    try {
      setLoading(true);
      const response = await fetch('/api/teams');
      if (!response.ok) throw new Error('Failed to load teams');
      const data = await response.json();
      setTeams(data);
    } catch (error) {
      showError('Failed to load teams');
      console.error('Failed to load teams:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createTeam() {
    if (!newTeam.name.trim()) {
      showError('Team name is required');
      return;
    }

    try {
      const response = await withLoading(
        fetch('/api/teams', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(newTeam)
        }),
        'Creating new team'
      );

      if (!response?.ok) {
        showError('Failed to create team');
        return;
      }

      await loadTeams();
      setShowCreateModal(false);
      setNewTeam({ name: '', description: '' });
    } catch (error) {
      showError('Failed to create team');
    }
  }

  if (loading) {
    return (
      <main className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Teams', current: true }
          ]}
        />
        <LoadingTable rows={5} columns={4} />
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Teams', current: true }
        ]}
      />

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Teams</h1>
          <p className="text-sm text-gray-600">Collaborate with your team on competitive intelligence</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          Create Team
        </button>
      </header>

      {teams.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No teams yet</h3>
          <p className="text-gray-600 mb-6">Create your first team to start collaborating</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            Create Your First Team
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/teams/${team.id}`}
              className="card p-6 hover:shadow-lg transition-shadow block"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{team.name}</h3>
                    <p className="text-sm text-gray-600">
                      {team._count.members} members • {team._count.projects} projects
                    </p>
                  </div>
                </div>
              </div>
              {team.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {team.description}
                </p>
              )}
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {team.members.slice(0, 3).map((member, index) => (
                    <div
                      key={member.id}
                      className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium"
                      title={member.user.name || member.user.email}
                    >
                      {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {team.members.length > 3 && (
                    <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-600">
                      +{team.members.length - 3}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  Created {new Date(team.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">Create New Team</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Marketing Team"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Team focused on competitive analysis for marketing campaigns"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={createTeam}
                className="btn btn-primary flex-1"
              >
                Create Team
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}