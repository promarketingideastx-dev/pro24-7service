'use client';

import React, { useState, useEffect } from 'react';
import { COUNTRIES, Country } from '@/lib/countries';
import { useAppContext } from '@/context/AppContext';

export default function Onboarding() {
  const { setCountry } = useAppContext();
  const [step, setStep] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setStep(2);
  };

  const handleGpsPermission = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          completeOnboarding();
        },
        (error) => {
          completeOnboarding();
        }
      );
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = () => {
    if (selectedCountry) {
      setCountry(selectedCountry);
    }
  };

  if (step === 1) {
    return (
      <div className="onboarding-page">
        <div className="onboarding-main card animate-in">
          <header className="onboarding-header">
            <h1>Bienvenido</h1>
            <p>Selecciona tu país para comenzar</p>
          </header>

          <div className="country-grid">
            {COUNTRIES.map((c) => (
              <div
                key={c.code}
                className={`country-box ${selectedCountry?.code === c.code ? 'active' : ''}`}
                onClick={() => handleCountrySelect(c)}
              >
                <div className="flag-wrap">{c.flag}</div>
                <span className="label">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        <style jsx>{`
          .onboarding-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: radial-gradient(circle at top right, #1e293b, #020617);
            padding: 24px;
          }
          .onboarding-main {
            max-width: 900px;
            width: 100%;
            padding: 60px 40px;
            border-radius: var(--radius-xl);
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(30px);
            border: 1.5px solid rgba(255, 255, 255, 0.12);
            box-shadow: 0 40px 100px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.1);
          }
          .btn-primary {
            background: rgba(59, 130, 246, 0.2);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(59, 130, 246, 0.4);
            color: #93C5FD;
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.2);
            padding: 16px 32px;
            font-size: 1.1rem;
            font-weight: 800;
          }
          .btn-primary:hover {
            background: rgba(59, 130, 246, 0.3);
            border-color: rgba(59, 130, 246, 0.6);
            transform: translateY(-2px);
          }
          .onboarding-header h1 {
            font-size: 3.5rem;
            font-weight: 800;
            margin-bottom: 8px;
            background: linear-gradient(135deg, #FFFFFF 0%, #94A3B8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3));
          }
          .onboarding-header p {
            color: var(--text-muted);
            font-size: 1.3rem;
            font-weight: 500;
          }
          .country-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 20px;
            max-height: 500px;
            overflow-y: auto;
            padding: 10px;
          }
          .country-grid::-webkit-scrollbar { width: 6px; }
          .country-grid::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
          
          .country-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 30px 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-lg);
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            background: rgba(255, 255, 255, 0.03);
            text-align: center;
          }
          .country-box:hover {
            border-color: #3B82F6;
            background: rgba(59, 130, 246, 0.1);
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 15px 30px rgba(0,0,0,0.3);
          }
          .country-box.active {
            border-color: #3B82F6;
            background: rgba(59, 130, 246, 0.2);
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
          }
          .flag-wrap {
            font-size: 4rem;
            margin-bottom: 16px;
            line-height: 1;
            filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3));
          }
          .label {
            font-weight: 700;
            font-size: 1.15rem;
            color: white;
          }

          @media (max-width: 600px) {
            .onboarding-header h1 { font-size: 2.5rem; }
            .country-grid { grid-template-columns: repeat(2, 1fr); }
            .onboarding-main { padding: 40px 20px; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-main card animate-in" style={{ maxWidth: '480px' }}>
        <div className="gps-perm">
          <div className="gps-icon">🚀</div>
          <h1>Activar GPS</h1>
          <p>Detectaremos automáticamente los servicios en <strong>{selectedCountry?.name}</strong> cerca de ti.</p>

          <div className="gps-btns">
            <button className="btn btn-primary lg" onClick={handleGpsPermission}>
              Entendido, habilitar
            </button>
            <button className="btn-link" onClick={completeOnboarding}>
              No, buscar manualmente
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .onboarding-page { 
          min-height: 100vh; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          background: radial-gradient(circle at top right, #1e293b, #050810); 
          padding: 24px;
        }
        .onboarding-main { 
          padding: 60px 40px; 
          text-align: center; 
          border-radius: var(--radius-xl);
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(30px);
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 40px 100px rgba(0,0,0,0.6);
          max-width: 500px;
          width: 100%;
        }
        .gps-icon { 
          font-size: 5rem; 
          margin-bottom: 25px; 
          filter: drop-shadow(0 0 15px rgba(56, 189, 248, 0.4));
        }
        .gps-perm h1 { 
          font-size: 2.8rem; 
          font-weight: 800; 
          margin-bottom: 16px; 
          color: white;
          letter-spacing: -0.02em;
        }
        .gps-perm p { 
          color: #94A3B8; 
          line-height: 1.6; 
          margin-bottom: 40px; 
          font-size: 1.2rem; 
        }
        .gps-btns { display: flex; flex-direction: column; gap: 16px; }
        .btn-link { 
          background: none; 
          border: none; 
          color: #64748b; 
          font-weight: 700; 
          cursor: pointer; 
          text-decoration: underline;
          transition: 0.3s;
        }
        .btn-link:hover { color: white; }
        .animate-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
