import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="logo">TeamPulse</h1>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <span className="nav-icon">📊</span>
            Dashboard
          </NavLink>
          <NavLink
            to="/teams"
            className={({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <span className="nav-icon">👥</span>
            Teams
          </NavLink>
          <NavLink
            to="/projects"
            className={({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <span className="nav-icon">📁</span>
            Projects
          </NavLink>
          <NavLink
            to="/tasks"
            className={({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <span className="nav-icon">✅</span>
            Tasks
          </NavLink>
          <NavLink
            to="/habits"
            className={({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <span className="nav-icon">🎯</span>
            Habits
          </NavLink>
          <NavLink
            to="/incidents"
            className={({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <span className="nav-icon">🚨</span>
            Incidents
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.name?.charAt(0) || 'U'}</div>
            <div className="user-details">
              <span className="user-name">{user?.name}</span>
              <span className="user-email">{user?.email}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
