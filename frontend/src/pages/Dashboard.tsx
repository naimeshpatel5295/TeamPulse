import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { teamsApi, tasksApi, incidentsApi } from '../api';

interface Team {
  id: string;
  name: string;
  description?: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
}

interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
}

export function Dashboard() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsRes, tasksRes] = await Promise.all([
          teamsApi.list(),
          tasksApi.getMyTasks(1, 5),
        ]);

        setTeams(teamsRes.data.data || []);
        setMyTasks(tasksRes.data.data || []);

        if (teamsRes.data.data?.length > 0) {
          const firstTeamId = teamsRes.data.data[0].id;
          setSelectedTeam(firstTeamId);
          const incidentsRes = await incidentsApi.getOpen(firstTeamId);
          setActiveIncidents(incidentsRes.data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'priority-urgent';
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      default:
        return 'priority-low';
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'severity-critical';
      case 'high':
        return 'severity-high';
      case 'medium':
        return 'severity-medium';
      default:
        return 'severity-low';
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {user?.name}!</h1>
        <p>Here's what's happening with your teams today.</p>
      </div>

      <div className="dashboard-grid">
        {/* Teams Overview */}
        <div className="card">
          <div className="card-header">
            <h2>Your Teams</h2>
            <span className="badge">{teams.length}</span>
          </div>
          <div className="card-content">
            {teams.length === 0 ? (
              <p className="empty-state">No teams yet. Create one to get started!</p>
            ) : (
              <ul className="team-list">
                {teams.map((team) => (
                  <li
                    key={team.id}
                    className={`team-item ${selectedTeam === team.id ? 'active' : ''}`}
                    onClick={() => setSelectedTeam(team.id)}
                  >
                    <span className="team-avatar">{team.name.charAt(0)}</span>
                    <div className="team-info">
                      <span className="team-name">{team.name}</span>
                      {team.description && (
                        <span className="team-description">{team.description}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* My Tasks */}
        <div className="card">
          <div className="card-header">
            <h2>My Tasks</h2>
            <span className="badge">{myTasks.length}</span>
          </div>
          <div className="card-content">
            {myTasks.length === 0 ? (
              <p className="empty-state">No tasks assigned to you.</p>
            ) : (
              <ul className="task-list">
                {myTasks.map((task) => (
                  <li key={task.id} className="task-item">
                    <div className="task-status">
                      <span className={`status-dot status-${task.status}`}></span>
                    </div>
                    <div className="task-info">
                      <span className="task-title">{task.title}</span>
                      <div className="task-meta">
                        <span className={`priority ${getPriorityClass(task.priority)}`}>
                          {task.priority}
                        </span>
                        {task.dueDate && (
                          <span className="due-date">
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Active Incidents */}
        <div className="card">
          <div className="card-header">
            <h2>Active Incidents</h2>
            <span className="badge badge-warning">{activeIncidents.length}</span>
          </div>
          <div className="card-content">
            {activeIncidents.length === 0 ? (
              <p className="empty-state">No active incidents. All clear! 🎉</p>
            ) : (
              <ul className="incident-list">
                {activeIncidents.map((incident) => (
                  <li key={incident.id} className="incident-item">
                    <span className={`severity-badge ${getSeverityClass(incident.severity)}`}>
                      {incident.severity}
                    </span>
                    <div className="incident-info">
                      <span className="incident-title">{incident.title}</span>
                      <span className="incident-status">{incident.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card stats-card">
          <div className="card-header">
            <h2>Quick Stats</h2>
          </div>
          <div className="stats-grid">
            <div className="stat">
              <span className="stat-value">{teams.length}</span>
              <span className="stat-label">Teams</span>
            </div>
            <div className="stat">
              <span className="stat-value">{myTasks.length}</span>
              <span className="stat-label">Tasks</span>
            </div>
            <div className="stat">
              <span className="stat-value">{activeIncidents.length}</span>
              <span className="stat-label">Incidents</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
