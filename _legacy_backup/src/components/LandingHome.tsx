'use client';

import React from 'react';

export default function LandingHome() {
    return (
        <div className="landing-container animate-in">
            {/* Hero Branding Section */}
            <section className="hero-landing">
                <div className="hero-content app-container">
                    <h1 className="hero-title">Tu próxima reserva<br />empieza aquí.</h1>
                    <p className="hero-subtitle">Conectamos a profesionales locales con clientes exigentes. Rápido, seguro y premium.</p>
                    <div className="hero-stats">
                        <div className="stat">
                            <span className="num">500+</span>
                            <span className="lab">Profesionales</span>
                        </div>
                        <div className="stat">
                            <span className="num">10k+</span>
                            <span className="lab">Reservas</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Why Us - Business Philosophy */}
            <section className="why-us-section app-container">
                <h2 className="section-title">¿Qué nos hace diferentes?</h2>
                <div className="benefits-grid">
                    <div className="benefit-card">
                        <span className="b-num">01</span>
                        <h3>Transparencia Total</h3>
                        <p>Precios claros, sin letras pequeñas. Créenos, sabemos lo que vale tu tiempo.</p>
                    </div>
                    <div className="benefit-card">
                        <span className="b-num">02</span>
                        <h3>Visibilidad Real</h3>
                        <p>Tu negocio merece estar en el mapa. Te ponemos frente a miles de clientes locales.</p>
                    </div>
                    <div className="benefit-card">
                        <span className="b-num">03</span>
                        <h3>Comunidad Premium</h3>
                        <p>No somos solo un directorio, somos una red de profesionales de alto nivel.</p>
                    </div>
                </div>
            </section>

            {/* Testimonio Booksy-Style */}
            <section className="testimonial-section">
                <div className="testimonial-card app-container">
                    <div className="t-image-box">
                        <img src="https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&w=400&q=80" alt="Professional" />
                    </div>
                    <div className="t-content">
                        <p className="quote">"PRO24-7 cambió mi forma de trabajar. Pasé de buscar clientes a que ellos me busquen a mí. Ahora tengo el control total de mi agenda."</p>
                        <span className="author">— Carlos Reyes, Mecánico Especialista</span>
                    </div>
                </div>
            </section>

            {/* Relaciones & Nurture */}
            <section className="relationship-section app-container">
                <div className="rel-grid">
                    <div className="rel-text">
                        <h2>Construye relaciones,<br />no solo reservas.</h2>
                        <ul className="rel-list">
                            <li>📌 Recordatorios automáticos para tus clientes.</li>
                            <li>📅 Gestión de agenda en tiempo real.</li>
                            <li>💬 Chat directo y seguro.</li>
                            <li>⭐ Reputación basada en trabajos reales.</li>
                        </ul>
                    </div>
                    <div className="rel-image-wrap">
                        <div className="glass-mockup">
                            <div className="dot"></div>
                            <div className="line"></div>
                            <div className="line short"></div>
                        </div>
                    </div>
                </div>
            </section>

            <style jsx>{`
        .landing-container { padding-bottom: 100px; overflow-x: hidden; width: 100%; }
        
        .hero-landing { 
          padding: 80px 0; 
          background: linear-gradient(rgba(5, 8, 16, 0.4), var(--bg-deep)), url('https://images.unsplash.com/photo-1590666012470-35a0929f06be?auto=format&fit=crop&w=1600&q=80');
          background-size: cover;
          background-position: center;
          border-radius: 0 0 32px 32px;
          margin-bottom: 60px;
          width: 100%;
        }
        .hero-title { font-size: 2.5rem; font-weight: 900; line-height: 1.1; margin-bottom: 20px; }
        .hero-subtitle { font-size: 1.1rem; color: var(--text-muted); max-width: 500px; margin-bottom: 40px; }
        
        .hero-stats { display: flex; gap: 40px; }
        .stat .num { display: block; font-size: 1.8rem; font-weight: 900; color: var(--accent-primary); }
        .stat .lab { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; }

        .section-title { text-align: center; font-size: 1.8rem; font-weight: 800; margin-bottom: 40px; padding: 0 var(--space-page); }
        
        .benefits-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 80px; width: 100%; }
        .benefit-card { background: var(--bg-card); padding: 32px; border-radius: 24px; border: 1px solid var(--glass-border); transition: 0.3s; max-width: 100%; }
        .benefit-card:hover { transform: translateY(-8px); border-color: var(--accent-primary); }
        .b-num { font-size: 0.8rem; font-weight: 900; color: var(--accent-primary); background: rgba(56, 189, 248, 0.1); padding: 4px 10px; border-radius: 6px; margin-bottom: 16px; display: inline-block; }
        .benefit-card h3 { margin-bottom: 12px; font-size: 1.1rem; }
        .benefit-card p { color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; }

        .testimonial-section { background: rgba(255,255,255,0.02); padding: 80px 0; margin: 60px 0; border-top: 1px solid var(--glass-border); border-bottom: 1px solid var(--glass-border); width: 100%; }
        .testimonial-card { display: flex; align-items: center; gap: 60px; overflow: hidden; }
        .t-image-box { width: 300px; height: 350px; border-radius: 24px; overflow: hidden; transform: rotate(-3deg); box-shadow: 0 30px 60px rgba(0,0,0,0.5); flex-shrink: 0; max-width: 100%; }
        .t-image-box img { width: 100%; height: 100%; object-fit: cover; }
        .t-content { flex: 1; min-width: 0; }
        .quote { font-size: 1.6rem; font-weight: 600; line-height: 1.4; font-style: italic; margin-bottom: 24px; }
        .author { font-weight: 800; color: var(--accent-primary); }

        .rel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; margin-top: 60px; width: 100%; overflow: hidden; }
        .rel-text h2 { font-size: 2rem; font-weight: 900; margin-bottom: 24px; }
        .rel-list { list-style: none; display: flex; flex-direction: column; gap: 16px; }
        .rel-list li { font-size: 1rem; color: var(--text-muted); font-weight: 600; }

        .rel-image-wrap { display: flex; justify-content: center; position: relative; width: 100%; }
        .glass-mockup { width: 280px; height: 500px; background: rgba(255,255,255,0.02); border: 4px solid #1e293b; border-radius: 40px; box-shadow: 0 40px 100px rgba(0,0,0,0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); padding: 40px; max-width: 100%; }
        .glass-mockup .dot { width: 40px; height: 40px; background: var(--accent-primary); border-radius: 12px; margin-bottom: 20px; }
        .glass-mockup .line { height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; margin-bottom: 12px; }
        .glass-mockup .line.short { width: 60%; }

        @media (max-width: 768px) {
          .hero-landing { padding: 40px 0; margin-bottom: 30px; }
          .hero-title { font-size: 1.8rem; }
          .hero-stats { gap: 20px; }
          .testimonial-card { flex-direction: column; text-align: center; gap: 30px; }
          .t-image-box { width: 200px; height: 250px; transform: rotate(0); }
          .rel-grid { grid-template-columns: 1fr; gap: 20px; }
          .quote { font-size: 1.2rem; }
          .rel-image-wrap { margin-top: 20px; }
          .glass-mockup { height: 400px; width: 240px; }
        }
      `}</style>
        </div>
    );
}
