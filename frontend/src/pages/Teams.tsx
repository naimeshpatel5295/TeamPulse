import React, { useState, useEffect, FormEvent } from 'react';
import { teamsApi } from '../api';

interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
}

export function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await teamsApi.list();
      setTeams(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await teamsApi.create({ name: newTeamName, description: newTeamDescription });
      setShowCreateModal(false);
      setNewTeamName('');
      setNewTeamDescription('');
      fetchTeams();
    } catch (err) {
      setError('Failed to create team');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      await teamsApi.delete(teamId);
      fetchTeams();
    } catch (error) {
      console.error('Failed to delete team:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Teams</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Create Team
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="empty-state-container">
          <h2>No teams yet</h2>
          <p>Create your first team to get started with collaboration.</p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            Create Your First Team
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {teams.map((team) => (
            <div key={team.id} className="card team-card">
              <div className="card-header">
                <span className="team-avatar large">{team.name.charAt(0)}</span>
                <h3>{team.name}</h3>
              </div>
              <div className="card-content">
                <p>{team.description || 'No description'}</p>
                <span className="text-muted">
                  Created {new Date(team.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="card-actions">
                <button className="btn btn-secondary btn-sm">View</button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteTeam(team.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Team</h2>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>
                ×
              </button>
            </div>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleCreateTeam}>
              <div className="form-group">
                <label htmlFor="teamName">Team Name</label>
                <input
                  type="text"
                  id="teamName"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Engineering Team"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="teamDescription">Description (optional)</label>
                <textarea
                  id="teamDescription"
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  placeholder="What does this team do?"
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
