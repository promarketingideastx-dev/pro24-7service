'use client';

import React from 'react';
import FavoriteButton from './FavoriteButton';

interface ProviderProfileProps {
    provider: any;
    onBack: () => void;
}

export default function ProviderProfileView({ provider, onBack }: ProviderProfileProps) {
    return (
        <div className="profile-view-fullscreen animate-slide-up">
            {/* Decorative Header */}
            <div className="profile-hero">
                <button className="back-btn-glass" onClick={onBack}>← Volver</button>
                <div className="fav-overlay-pos">
                    <FavoriteButton providerId={provider.id} providerData={provider} size="lg" />
                </div>
                <div className="hero-overlay"></div>
                <img src={provider.image} alt={provider.name} className="hero-bg" />
            </div>

            <div className="profile-content-wrap app-container">
                <div className="profile-main-card card-premium">
                    <div className="profile-header">
                        <div className="avatar-box">
                            <img src={provider.image} alt={provider.name} />
                            <div className="status-dot"></div>
                        </div>
                        <div className="header-info">
                            <h1>{provider.name}</h1>
                            <p className="category-label">🛠️ {provider.category} • {provider.sub}</p>
                            <div className="quick-metrics">
                                <span className="metric">⭐ <strong>{provider.rating}</strong> (48 reviews)</span>
                                <span className="metric">📍 <strong>{provider.distance}</strong> cerca</span>
                            </div>
                        </div>
                    </div>

                    <div className="profile-tabs">
                        <button className="tab active">Información</button>
                        <button className="tab">Servicios</button>
                        <button className="tab">Reseñas</button>
                    </div>

                    <div className="profile-body">
                        <section className="profile-section">
                            <h3>Sobre el Profesional</h3>
                            <p className="bio-text">
                                {provider.bio || `Especialista en ${provider.sub} con amplia experiencia brindando servicios de alta calidad. Comprometido con la satisfacción del cliente y la excelencia técnica.`}
                            </p>
                            <div className="badges-row">
                                <div className="badge"><span className="icon">🛡️</span> Verificado</div>
                                <div className="badge"><span className="icon">⚡</span> Respuesta rápida</div>
                                <div className="badge"><span className="icon">🏅</span> 5+ años exp.</div>
                            </div>
                        </section>

                        <section className="profile-section">
                            <h3>Especialidades y Servicios</h3>
                            <div className="services-list">
                                {provider.specialties?.map((spec: string) => (
                                    <div key={spec} className="service-item">
                                        <div className="s-info">
                                            <span className="s-name">{spec}</span>
                                            <span className="s-desc">Servicio profesional garantizado</span>
                                        </div>
                                        <span className="s-price">desde $25</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {/* Floating Action Bar */}
            <div className="floating-action-bar safe-bottom">
                <div className="app-container action-inner">
                    <div className="price-hint">
                        <span className="label">Presupuesto estimado</span>
                        <span className="value">Gratis</span>
                    </div>
                    <button className="btn-reserva">Solicitar Cotización</button>
                </div>
            </div>

            <style jsx>{`
        .profile-view-fullscreen {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: #050810; z-index: 3000; overflow-y: auto;
          display: flex; flex-direction: column;
        }

        .profile-hero { width: 100%; height: 280px; position: relative; overflow: hidden; }
        .hero-bg { width: 100%; height: 100%; object-fit: cover; filter: brightness(0.5) blur(10px); scale: 1.1; }
        .hero-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent, #050810); z-index: 1; }
        
        .back-btn-glass { 
          position: absolute; top: 20px; left: 20px; z-index: 10;
          background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1); color: white;
          padding: 10px 18px; border-radius: 12px; font-weight: 700; cursor: pointer;
        }

        .fav-overlay-pos {
          position: absolute; top: 20px; right: 20px; z-index: 10;
          background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 50%;
          width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;
        }

        .profile-content-wrap { margin-top: -120px; position: relative; z-index: 2; padding-bottom: 120px; }
        .profile-main-card { padding: 32px; margin-bottom: 30px; }

        .profile-header { display: flex; gap: 24px; align-items: center; margin-bottom: 32px; }
        .avatar-box { position: relative; flex-shrink: 0; }
        .avatar-box img { width: 100px; height: 100px; border-radius: 28px; border: 4px solid var(--bg-surface); object-fit: cover; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
        .status-dot { width: 16px; height: 16px; background: #10B981; border: 3px solid var(--bg-surface); border-radius: 50%; position: absolute; bottom: 5px; right: 5px; }

        .header-info h1 { font-size: 1.8rem; font-weight: 900; line-height: 1.2; margin-bottom: 4px; }
        .category-label { color: var(--accent-primary); font-weight: 800; font-size: 0.9rem; }
        .quick-metrics { display: flex; gap: 16px; margin-top: 12px; font-size: 0.85rem; color: var(--text-muted); }
        .quick-metrics strong { color: white; }

        .profile-tabs { display: flex; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 32px; }
        .tab { background: transparent; border: none; color: var(--text-dim); padding: 12px 16px; font-weight: 700; cursor: pointer; font-size: 0.9rem; position: relative; }
        .tab.active { color: white; }
        .tab.active::after { content: ''; position: absolute; bottom: -1px; left: 16px; right: 16px; height: 3px; background: var(--accent-primary); border-radius: 2px; }

        .profile-section { margin-bottom: 40px; }
        .profile-section h3 { font-size: 1.1rem; font-weight: 800; margin-bottom: 16px; color: #F1F5F9; }
        .bio-text { color: var(--text-muted); line-height: 1.7; font-size: 0.95rem; }

        .badges-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
        .badge { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 6px 14px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; color: #94A3B8; }
        .badge .icon { margin-right: 6px; }

        .services-list { display: flex; flex-direction: column; gap: 12px; }
        .service-item { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.03); }
        .s-name { display: block; font-weight: 700; font-size: 0.95rem; color: white; }
        .s-desc { font-size: 0.75rem; color: #64748B; }
        .s-price { color: #10B981; font-weight: 800; font-size: 0.9rem; }

        .floating-action-bar { 
          position: fixed; bottom: 0; left: 0; right: 0; 
          background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255,255,255,0.08); padding: 20px 0; z-index: 3100;
        }
        .action-inner { display: flex; justify-content: space-between; align-items: center; }
        .price-hint { display: flex; flex-direction: column; }
        .price-hint .label { font-size: 0.7rem; color: #64748B; font-weight: 700; text-transform: uppercase; }
        .price-hint .value { font-size: 1.2rem; font-weight: 900; color: var(--accent-warm); }
        
        .btn-reserva { background: var(--accent-primary); color: #050810; border: none; padding: 16px 32px; border-radius: 16px; font-weight: 900; font-size: 1rem; cursor: pointer; box-shadow: 0 10px 25px rgba(56, 189, 248, 0.3); }

        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

        @media (max-width: 600px) {
          .profile-header { flex-direction: column; text-align: center; gap: 15px; }
          .quick-metrics { justify-content: center; }
          .action-inner { gap: 20px; }
        }
      `}</style>
        </div>
    );
}
