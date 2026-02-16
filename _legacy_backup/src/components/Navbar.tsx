'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import AuthModal from './AuthModal';

interface NavbarProps {
  onAccountClick?: () => void;
}

export default function Navbar({ onAccountClick }: NavbarProps) {
  const { role, setRole, country } = useAppContext();
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleAction = () => {
    if (user) {
      if (onAccountClick) onAccountClick();
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <nav className="navbar safe-top">
      <div className="nav-container app-container">
        <div className="logo-section">
          <span className="logo-text">Service<span className="highlight">Market</span></span>
          {country && (
            <div
              className="country-pill"
              onClick={() => {
                localStorage.removeItem('app_country');
                window.location.reload();
              }}
            >
              {country.flag} {country.code}
            </div>
          )}
        </div>

        <div className="nav-right">
          <div className="mode-selector">
            <button
              className={`mode-btn ${role === 'client' ? 'active' : ''}`}
              onClick={() => setRole('client')}
            >
              Cliente
            </button>
            <button
              className={`mode-btn ${role === 'provider' ? 'active' : ''}`}
              onClick={() => setRole('provider')}
            >
              Negocio
            </button>
          </div>

          <button className="user-action-btn" onClick={handleAction}>
            {user ? 'Cuenta' : 'Entrar'}
          </button>
        </div>
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      <style jsx>{`
        .navbar {
          background: rgba(5, 8, 16, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          height: 56px; /* Compact height for better mobile real estate */
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          position: sticky;
          top: 0;
          z-index: 2000;
          display: flex;
          align-items: center;
        }
        .nav-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .logo-text {
          font-size: 1.2rem;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: white;
        }
        .highlight {
          color: var(--accent-warm, #FACC15);
        }
        .country-pill {
          background: rgba(255,255,255,0.05);
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
        }
        
        .nav-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .mode-selector {
          background: rgba(255,255,255,0.04);
          padding: 3px;
          border-radius: 12px;
          display: flex;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .mode-btn {
          padding: 6px 14px;
          border-radius: 9px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          font-weight: 700;
          font-size: 0.75rem;
          transition: 0.2s;
        }
        .mode-btn.active {
          background: rgba(255,255,255,0.1);
          color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        
        .user-action-btn {
          background: var(--accent-primary, #38BDF8);
          color: #050810;
          border: none;
          padding: 8px 16px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.8rem;
          cursor: pointer;
          transition: 0.2s;
        }
        .user-action-btn:active { transform: scale(0.95); }

        @media (max-width: 480px) {
          .logo-text { font-size: 1rem; }
          .mode-btn { padding: 6px 10px; font-size: 0.7rem; }
        }
      `}</style>
    </nav>
  );
}
