import React, { useState, useEffect, FormEvent } from 'react';
import { habitsApi, teamsApi } from '../api';

interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: string;
  targetCount: number;
  teamId: string;
}

interface HabitProgress {
  habit: Habit;
  completedToday: number;
  target: number;
  isComplete: boolean;
}

interface Team {
  id: string;
  name: string;
}

const FREQUENCY_OPTIONS = ['daily', 'weekly', 'monthly'];

export function Habits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [progress, setProgress] = useState<Record<string, HabitProgress>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    frequency: 'daily',
    targetCount: 1,
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
      fetchHabits();
    } else {
      setIsLoading(false);
    }
  }, [selectedTeam]);

  const fetchHabits = async () => {
    setIsLoading(true);
    try {
      const response = await habitsApi.listByTeam(selectedTeam);
      const habitsList = response.data.data || [];
      setHabits(habitsList);

      // Fetch progress for each habit
      const progressMap: Record<string, HabitProgress> = {};
      await Promise.all(
        habitsList.map(async (habit: Habit) => {
          try {
            const progRes = await habitsApi.getMyProgress(habit.id);
            progressMap[habit.id] = progRes.data.data;
          } catch {
            progressMap[habit.id] = {
              habit,
              completedToday: 0,
              target: habit.targetCount,
              isComplete: false,
            };
          }
        })
      );
      setProgress(progressMap);
    } catch (error) {
      console.error('Failed to fetch habits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateHabit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await habitsApi.create({
        name: newHabit.name,
        teamId: selectedTeam,
        description: newHabit.description,
        frequency: newHabit.frequency,
        targetCount: newHabit.targetCount,
      });
      setShowCreateModal(false);
      setNewHabit({ name: '', description: '', frequency: 'daily', targetCount: 1 });
      fetchHabits();
    } catch (err) {
      setError('Failed to create habit');
    }
  };

  const handleLogCompletion = async (habitId: string) => {
    try {
      await habitsApi.logCompletion(habitId);
      fetchHabits();
    } catch (error) {
      console.error('Failed to log completion:', error);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (!confirm('Are you sure you want to delete this habit?')) return;

    try {
      await habitsApi.delete(habitId);
      fetchHabits();
    } catch (error) {
      console.error('Failed to delete habit:', error);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-left">
          <h1>Habits Tracker</h1>
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
          + New Habit
        </button>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : teams.length === 0 ? (
        <div className="empty-state-container">
          <h2>No teams available</h2>
          <p>Create a team first to start tracking habits.</p>
        </div>
      ) : habits.length === 0 ? (
        <div className="empty-state-container">
          <h2>No habits yet</h2>
          <p>Create habits to track your team's daily routines and build better practices.</p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            Create First Habit
          </button>
        </div>
      ) : (
        <div className="habits-grid">
          {habits.map((habit) => {
            const prog = progress[habit.id];
            const percentage = prog ? (prog.completedToday / prog.target) * 100 : 0;

            return (
              <div key={habit.id} className={`habit-card ${prog?.isComplete ? 'completed' : ''}`}>
                <div className="habit-header">
                  <h3>{habit.name}</h3>
                  <span className="frequency-badge">{habit.frequency}</span>
                </div>
                {habit.description && <p className="habit-description">{habit.description}</p>}

                <div className="progress-section">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">
                    {prog?.completedToday || 0} / {habit.targetCount}
                  </span>
                </div>

                <div className="habit-actions">
                  {!prog?.isComplete && (
                    <button
                      className="btn btn-success"
                      onClick={() => handleLogCompletion(habit.id)}
                    >
                      ✓ Log Completion
                    </button>
                  )}
                  {prog?.isComplete && (
                    <span className="completed-badge">🎉 Complete!</span>
                  )}
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteHabit(habit.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Habit</h2>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>
                ×
              </button>
            </div>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleCreateHabit}>
              <div className="form-group">
                <label htmlFor="habitName">Habit Name</label>
                <input
                  type="text"
                  id="habitName"
                  value={newHabit.name}
                  onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                  placeholder="Daily standup"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="habitDescription">Description (optional)</label>
                <textarea
                  id="habitDescription"
                  value={newHabit.description}
                  onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                  placeholder="Brief check-in with the team"
                  rows={2}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="habitFrequency">Frequency</label>
                  <select
                    id="habitFrequency"
                    value={newHabit.frequency}
                    onChange={(e) => setNewHabit({ ...newHabit, frequency: e.target.value })}
                  >
                    {FREQUENCY_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="habitTarget">Target Count</label>
                  <input
                    type="number"
                    id="habitTarget"
                    value={newHabit.targetCount}
                    onChange={(e) =>
                      setNewHabit({ ...newHabit, targetCount: parseInt(e.target.value) || 1 })
                    }
                    min={1}
                    max={100}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
