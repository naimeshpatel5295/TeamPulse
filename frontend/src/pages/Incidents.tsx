import React, { useState, useEffect, FormEvent } from 'react';
import { incidentsApi, teamsApi } from '../api';

interface Incident {
  id: string;
  title: string;
  description?: string;
  severity: string;
  status: string;
  teamId: string;
  reportedBy: string;
  assignedTo?: string;
  resolvedAt?: string;
  createdAt: string;
}

interface Team {
  id: string;
  name: string;
}

const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical'];
const STATUS_OPTIONS = ['open', 'investigating', 'identified', 'monitoring', 'resolved'];

export function Incidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'open'>('open');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'medium',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await teamsApi.list();
        const teamsList = response.data.data || [];
        setTeams(teamsList);
        if (teamsList.length > 0) {
          setSelectedTeam(teamsList[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch teams:', error);
      }
    };
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      fetchIncidents();
    } else {
      setIsLoading(false);
    }
  }, [selectedTeam, filter]);

  const fetchIncidents = async () => {
    setIsLoading(true);
    try {
      const response =
        filter === 'open'
          ? await incidentsApi.getOpen(selectedTeam)
          : await incidentsApi.listByTeam(selectedTeam);
      setIncidents(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateIncident = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await incidentsApi.create({
        title: newIncident.title,
        teamId: selectedTeam,
        description: newIncident.description,
        severity: newIncident.severity,
      });
      setShowCreateModal(false);
      setNewIncident({ title: '', description: '', severity: 'medium' });
      fetchIncidents();
    } catch (err) {
      setError('Failed to create incident');
    }
  };

  const handleStatusChange = async (incidentId: string, newStatus: string) => {
    try {
      await incidentsApi.update(incidentId, { status: newStatus });
      fetchIncidents();
    } catch (error) {
      console.error('Failed to update incident:', error);
    }
  };

  const handleDeleteIncident = async (incidentId: string) => {
    if (!confirm('Are you sure you want to delete this incident?')) return;

    try {
      await incidentsApi.delete(incidentId);
      fetchIncidents();
    } catch (error) {
      console.error('Failed to delete incident:', error);
    }
  };

  const getSeverityClass = (severity: string) => `severity-${severity}`;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-left">
          <h1>Incidents</h1>
          <select
            className="team-select"
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <div className="filter-tabs">
            <button
              className={`tab ${filter === 'open' ? 'active' : ''}`}
              onClick={() => setFilter('open')}
            >
              Open
            </button>
            <button
              className={`tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
          </div>
        </div>
        <button
          className="btn btn-danger"
          onClick={() => setShowCreateModal(true)}
          disabled={!selectedTeam}
        >
          🚨 Report Incident
        </button>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : teams.length === 0 ? (
        <div className="empty-state-container">
          <h2>No teams available</h2>
          <p>Create a team first to manage incidents.</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="empty-state-container success">
          <h2>🎉 All Clear!</h2>
          <p>No {filter === 'open' ? 'open' : ''} incidents to report.</p>
        </div>
      ) : (
        <div className="incidents-list">
          {incidents.map((incident) => (
            <div key={incident.id} className={`incident-card ${getSeverityClass(incident.severity)}`}>
              <div className="incident-header">
                <span className={`severity-badge ${getSeverityClass(incident.severity)}`}>
                  {incident.severity.toUpperCase()}
                </span>
                <span className="incident-status">{incident.status}</span>
              </div>
              <h3>{incident.title}</h3>
              {incident.description && <p>{incident.description}</p>}
              <div className="incident-meta">
                <span>Created: {new Date(incident.createdAt).toLocaleString()}</span>
                {incident.resolvedAt && (
                  <span>Resolved: {new Date(incident.resolvedAt).toLocaleString()}</span>
                )}
              </div>
              <div className="incident-actions">
                <select
                  value={incident.status}
                  onChange={(e) => handleStatusChange(incident.id, e.target.value)}
                  className="status-select"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteIncident(incident.id)}
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
              <h2>Report Incident</h2>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>
                ×
              </button>
            </div>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleCreateIncident}>
              <div className="form-group">
                <label htmlFor="incidentTitle">Incident Title</label>
                <input
                  type="text"
                  id="incidentTitle"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  placeholder="Database connection issues"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="incidentDescription">Description</label>
                <textarea
                  id="incidentDescription"
                  value={newIncident.description}
                  onChange={(e) =>
                    setNewIncident({ ...newIncident, description: e.target.value })
                  }
                  placeholder="Describe what's happening..."
                  rows={4}
                />
              </div>
              <div className="form-group">
                <label htmlFor="incidentSeverity">Severity</label>
                <select
                  id="incidentSeverity"
                  value={newIncident.severity}
                  onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
                >
                  {SEVERITY_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger">
                  Report Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
