// src/app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { AdminDashboard } from '@/components/AdminDashboard';

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'timikeys2024';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated
    const auth = sessionStorage.getItem('admin_auth');
    if (auth === 'authenticated') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'authenticated');
      setError('');
    } else {
      setError('Invalid password');
      setPassword('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_auth');
    setPassword('');
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '1.5rem' }}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '40px',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h1 style={{
            textAlign: 'center',
            marginBottom: '30px',
            color: '#2c3e50',
            fontSize: '2rem',
            fontWeight: '700'
          }}>
            🎵 Timi Admin
          </h1>
          
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#2c3e50',
                fontWeight: '600'
              }}>
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.2s'
                }}
                placeholder="Enter password"
                autoFocus
              />
            </div>
            
            {error && (
              <div style={{
                color: '#dc3545',
                marginBottom: '20px',
                textAlign: 'center',
                padding: '10px',
                background: '#f8d7da',
                borderRadius: '6px'
              }}>
                {error}
              </div>
            )}
            
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#5a6fd8'}
              onMouseOut={(e) => e.currentTarget.style.background = '#667eea'}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <AdminDashboard onLogout={handleLogout} />;
}