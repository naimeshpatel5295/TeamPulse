import React, { useState, useEffect, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { projectsApi, teamsApi } from '../api';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  teamId: string;
  createdAt: string;
}

interface Team {
  id: string;
  name: string;
}

export function Projects() {
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await teamsApi.list();
        const teamsList = response.data.data || [];
        setTeams(teamsList);
        
        const teamIdFromUrl = searchParams.get('teamId');
        if (teamIdFromUrl) {
          setSelectedTeam(teamIdFromUrl);
        } else if (teamsList.length > 0) {
          setSelectedTeam(teamsList[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch teams:', error);
      }
    };
    fetchTeams();
  }, [searchParams]);

  useEffect(() => {
    if (selectedTeam) {
      fetchProjects();
    } else {
      setIsLoading(false);
    }
  }, [selectedTeam]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const response = await projectsApi.listByTeam(selectedTeam);
      setProjects(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await projectsApi.create({
        name: newProjectName,
        teamId: selectedTeam,
        description: newProjectDescription,
      });
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectDescription('');
      fetchProjects();
    } catch (err) {
      setError('Failed to create project');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await projectsApi.delete(projectId);
      fetchProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'paused':
        return 'status-paused';
      case 'completed':
        return 'status-completed';
      default:
        return 'status-archived';
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-left">
          <h1>Projects</h1>
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
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
          disabled={!selectedTeam}
        >
          + New Project
        </button>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : teams.length === 0 ? (
        <div className="empty-state-container">
          <h2>No teams available</h2>
          <p>Create a team first to start adding projects.</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state-container">
          <h2>No projects yet</h2>
          <p>Create your first project in this team.</p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            Create First Project
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {projects.map((project) => (
            <div key={project.id} className="card project-card">
              <div className="card-header">
                <h3>{project.name}</h3>
                <span className={`status-badge ${getStatusClass(project.status)}`}>
                  {project.status}
                </span>
              </div>
              <div className="card-content">
                <p>{project.description || 'No description'}</p>
              </div>
              <div className="card-actions">
                <button className="btn btn-secondary btn-sm">View Tasks</button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteProject(project.id)}
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
              <h2>Create New Project</h2>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>
                ×
              </button>
            </div>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label htmlFor="projectName">Project Name</label>
                <input
                  type="text"
                  id="projectName"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Q1 Roadmap"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="projectDescription">Description (optional)</label>
                <textarea
                  id="projectDescription"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="What is this project about?"
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
