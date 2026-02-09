import React, { useState, useEffect, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tasksApi, projectsApi, teamsApi } from '../api';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  projectId: string;
  assigneeId?: string;
  dueDate?: string;
}

interface Project {
  id: string;
  name: string;
  teamId: string;
}

interface Team {
  id: string;
  name: string;
}

const STATUS_OPTIONS = ['todo', 'in_progress', 'in_review', 'done', 'cancelled'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

export function Tasks() {
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' });
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
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (selectedProject) {
      fetchTasks();
    } else {
      setTasks([]);
      setIsLoading(false);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const response = await projectsApi.listByTeam(selectedTeam);
      const projectsList = response.data.data || [];
      setProjects(projectsList);
      
      const projectIdFromUrl = searchParams.get('projectId');
      if (projectIdFromUrl) {
        setSelectedProject(projectIdFromUrl);
      } else if (projectsList.length > 0) {
        setSelectedProject(projectsList[0].id);
      } else {
        setSelectedProject('');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setIsLoading(false);
    }
  };

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const response = await tasksApi.listByProject(selectedProject);
      setTasks(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await tasksApi.create({
        title: newTask.title,
        projectId: selectedProject,
        description: newTask.description,
        priority: newTask.priority,
      });
      setShowCreateModal(false);
      setNewTask({ title: '', description: '', priority: 'medium' });
      fetchTasks();
    } catch (err) {
      setError('Failed to create task');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await tasksApi.update(taskId, { status: newStatus });
      fetchTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await tasksApi.delete(taskId);
      fetchTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const getPriorityClass = (priority: string) => `priority-${priority}`;

  const groupedTasks = STATUS_OPTIONS.reduce((acc, status) => {
    acc[status] = tasks.filter((t) => t.status === status);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-left">
          <h1>Tasks</h1>
          <div className="filter-selects">
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
            <select
              className="project-select"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
          disabled={!selectedProject}
        >
          + New Task
        </button>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state-container">
          <h2>No projects available</h2>
          <p>Create a project first to start adding tasks.</p>
        </div>
      ) : (
        <div className="kanban-board">
          {STATUS_OPTIONS.map((status) => (
            <div key={status} className="kanban-column">
              <div className="column-header">
                <h3>{status.replace('_', ' ').toUpperCase()}</h3>
                <span className="task-count">{groupedTasks[status]?.length || 0}</span>
              </div>
              <div className="column-content">
                {groupedTasks[status]?.map((task) => (
                  <div key={task.id} className="task-card">
                    <div className="task-card-header">
                      <span className={`priority-dot ${getPriorityClass(task.priority)}`}></span>
                      <span className="task-priority">{task.priority}</span>
                    </div>
                    <h4>{task.title}</h4>
                    {task.description && <p className="task-description">{task.description}</p>}
                    {task.dueDate && (
                      <span className="due-date">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    <div className="task-card-actions">
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        className="status-select"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Task</h2>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>
                ×
              </button>
            </div>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label htmlFor="taskTitle">Task Title</label>
                <input
                  type="text"
                  id="taskTitle"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Implement feature X"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="taskDescription">Description (optional)</label>
                <textarea
                  id="taskDescription"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Add details..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label htmlFor="taskPriority">Priority</label>
                <select
                  id="taskPriority"
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
