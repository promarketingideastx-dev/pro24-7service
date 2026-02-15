'use client';

import React, { useState } from 'react';
import ProfileEditor from './ProfileEditor';
import { useAuth } from '@/context/AuthContext';

const KANBAN_COLUMNS = [
  { id: 'new', title: 'Nuevos', items: [{ id: 101, client: 'Juan Perez', service: 'Frenos', price: '$40' }] },
  { id: 'progress', title: 'En Progreso', items: [{ id: 102, client: 'Maria L.', service: 'Limpieza Hogar', price: '$25' }] },
  { id: 'done', title: 'Completados', items: [] }
];

export default function ProviderDashboard() {
  const { user } = useAuth();
  const [view, setView] = useState<'board' | 'profile'>('board');
  const [isPublishing, setIsPublishing] = useState(false);

  const handleAction = (type: string, client: string) => {
    alert(`${type} con ${client} - Función en desarrollo.`);
  };

  return (
    <div className="provider-dashboard-v2">
      <header className="dashboard-subnav app-container safe-top">
        <div className="user-pill-mini">
          <div className="avatar">👤</div>
          <div className="text">
            <span className="name">{user?.email?.split('@')[0] || 'Profesional'}</span>
          </div>
        </div>
        <div className="tab-pills">
          <button
            className={`pill-btn ${view === 'board' ? 'active' : ''}`}
            onClick={() => setView('board')}
          >
            Pipeline
          </button>
          <button
            className={`pill-btn ${view === 'profile' ? 'active' : ''}`}
            onClick={() => setView('profile')}
          >
            Perfil
          </button>
        </div>
      </header>

      <div className="app-container">
        {view === 'profile' ? (
          <div className="editor-wrap animate-in">
            <ProfileEditor onSave={() => setIsPublishing(false)} isLoading={isPublishing} />
          </div>
        ) : (
          <div className="dashboard-content animate-in">
            <section className="metrics-section">
              <div className="metric-card-compact">
                <span className="m-label">Leads Hoy</span>
                <span className="m-value">3</span>
              </div>
              <div className="metric-card-compact">
                <span className="m-label">Ingresos</span>
                <span className="m-value gold">$120</span>
              </div>
              <div className="metric-card-compact">
                <span className="m-label">Rating</span>
                <span className="m-value">⭐ 4.9</span>
              </div>
            </section>

            <div className="kanban-section">
              {KANBAN_COLUMNS.map(col => (
                <div key={col.id} className="kanban-col">
                  <div className="col-header">
                    <h4>{col.title}</h4>
                    <span className="badge">{col.items.length}</span>
                  </div>
                  <div className="col-items">
                    {col.items.map(item => (
                      <div key={item.id} className="lead-card-premium">
                        <div className="lead-top">
                          <strong>{item.client}</strong>
                          <span className="l-price">{item.price}</span>
                        </div>
                        <p className="l-service">{item.service}</p>
                        <div className="lead-footer">
                          <button className="l-btn" onClick={() => handleAction('Chat', item.client)}>Chat</button>
                          <button className="l-btn secondary" onClick={() => handleAction('Ver', item.client)}>Ver</button>
                        </div>
                      </div>
                    ))}
                    {col.items.length === 0 && <div className="empty-state">Todo listo</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .provider-dashboard-v2 { background: #050810; min-height: calc(100vh - 56px); padding-bottom: 40px; }
        
        .dashboard-subnav {
          display: flex; justify-content: space-between; align-items: center;
          padding-top: 20px; padding-bottom: 20px;
        }
        
        .user-pill-mini {
          display: flex; align-items: center; gap: 10px;
          background: rgba(255,255,255,0.03); padding: 5px 12px 5px 5px; border-radius: 100px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .user-pill-mini .avatar { width: 32px; height: 32px; background: #1E293B; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; }
        .user-pill-mini .name { font-size: 0.8rem; font-weight: 700; color: white; }

        .tab-pills { background: rgba(255,255,255,0.03); padding: 3px; border-radius: 12px; display: flex; gap: 2px; }
        .pill-btn { border: none; background: transparent; color: #64748B; padding: 8px 16px; border-radius: 10px; font-weight: 700; font-size: 0.75rem; cursor: pointer; transition: 0.2s; }
        .pill-btn.active { background: rgba(255,255,255,0.08); color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }

        .metrics-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 24px; }
        .metric-card-compact { 
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.4) 100%);
          backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.05);
          border-radius: 18px; padding: 15px 10px; text-align: center;
        }
        .m-label { display: block; font-size: 0.65rem; color: #64748B; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px; }
        .m-value { font-size: 1.25rem; font-weight: 900; color: white; }
        .m-value.gold { color: #FACC15; }

        .kanban-section { display: flex; flex-direction: column; gap: 24px; }
        .col-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .col-header h4 { font-size: 0.85rem; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; }
        .badge { background: rgba(56, 189, 248, 0.1); color: #38BDF8; font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 6px; }

        .col-items { display: flex; flex-direction: column; gap: 10px; }
        .lead-card-premium { 
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px; padding: 14px;
        }
        .lead-top { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .lead-top strong { font-size: 0.9rem; color: #F8FAFC; }
        .l-price { font-size: 0.8rem; font-weight: 800; color: #10B981; }
        .l-service { font-size: 0.8rem; color: #64748B; margin-bottom: 12px; font-weight: 500; }
        .lead-footer { display: flex; gap: 8px; }
        .l-btn { flex: 1; border: none; background: #38BDF8; color: #050810; font-weight: 800; font-size: 0.75rem; padding: 8px; border-radius: 8px; cursor: pointer; }
        .l-btn.secondary { background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); }
        
        .empty-state { padding: 40px; text-align: center; color: #334155; font-size: 0.8rem; font-weight: 600; border: 1px dashed rgba(255,255,255,0.05); border-radius: 16px; }

        .animate-in { animation: slideIn 0.4s ease-out; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        @media (min-width: 768px) {
          .kanban-section { flex-direction: row; align-items: flex-start; }
          .kanban-col { flex: 1; }
          .metrics-section { grid-template-columns: repeat(3, 200px); }
        }
      `}</style>
    </div>
  );
}
