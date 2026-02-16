'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { useAppContext } from '@/context/AppContext';
import { CATEGORIES } from '@/lib/taxonomy';
import LandingHome from './LandingHome';
import ProviderProfileView from './ProviderProfileView';
import FavoriteButton from './FavoriteButton';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

const CATEGORY_STYLE: Record<string, { icon: string, glow: string }> = {
  'Todos': { icon: '🌍', glow: 'rgba(255,255,255,0.3)' },
  'Servicios Generales': { icon: '🛠️', glow: 'rgba(56, 189, 248, 0.5)' },
  'Belleza / Cuidado del Cuerpo': { icon: '💅', glow: 'rgba(236, 72, 153, 0.5)' }
};

const getSafeImage = (categoryName: string) => {
  const category = CATEGORIES.find(c => c.name === categoryName);
  return category?.defaultImage || 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=400&q=80';
};

const generateFreshProviders = (lat: number, lng: number) => [
  { id: 101, name: 'SPS Auto Engine', category: 'Servicios Generales', sub: 'Mecánica (Autos)', rating: 4.8, distance: '1.2 KM', lat: lat + 0.005, lng: lng + 0.005, image: getSafeImage('Servicios Generales'), specialties: ['Frenos', 'Motor', 'Diagnóstico'] },
  { id: 201, name: 'Glow Beauty Studio', category: 'Belleza / Cuidado del Cuerpo', sub: 'Cabello', rating: 4.9, distance: '0.8 KM', lat: lat - 0.005, lng: lng - 0.005, image: getSafeImage('Belleza / Cuidado del Cuerpo'), specialties: ['Corte', 'Balayage'] },
  { id: 301, name: 'El Maestro Zapatero', category: 'Servicios Generales', sub: 'Zapatería', rating: 4.7, distance: '0.5 KM', lat: lat - 0.002, lng: lng + 0.002, image: getSafeImage('Servicios Generales'), specialties: ['Cambio de suela', 'Costura'] },
  { id: 401, name: 'Pinturas Pro', category: 'Servicios Generales', sub: 'Pintura', rating: 4.6, distance: '2.1 KM', lat: lat + 0.008, lng: lng - 0.003, image: getSafeImage('Servicios Generales'), specialties: ['Interiores', 'Exteriores'] },
  { id: 501, name: 'Electricista Express', category: 'Servicios Generales', sub: 'Electricidad', rating: 4.9, distance: '0.3 KM', lat: lat + 0.001, lng: lng + 0.001, image: getSafeImage('Servicios Generales'), specialties: ['Cortocircuitos', 'Instalación de Lámparas'] },
  { id: 601, name: 'Nail Art Studio', category: 'Belleza / Cuidado del Cuerpo', sub: 'Uñas', rating: 4.5, distance: '1.5 KM', lat: lat - 0.007, lng: lng + 0.004, image: getSafeImage('Belleza / Cuidado del Cuerpo'), specialties: ['Gelish', 'Acrílico'] },
];

export default function ClientHome() {
  const { country } = useAppContext();
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [viewingProvider, setViewingProvider] = useState<any | null>(null);

  const centerLat = country?.lat || 37.0902;
  const centerLng = country?.lng || -95.7129;

  const [providers] = useState(generateFreshProviders(centerLat, centerLng));
  const [filteredProviders, setFilteredProviders] = useState<any[]>([]);
  const [mapState, setMapState] = useState({ center: [centerLat, centerLng] as [number, number], zoom: 13, timestamp: Date.now() });

  const markerRefs = useRef<Record<number, any>>({});
  const isIdle = searchQuery.trim() === '' && activeCategory === 'Todos' && !activeSubId;

  useEffect(() => {
    setIsMounted(true);
    const L = require('leaflet');
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  useEffect(() => {
    if (isIdle) {
      setFilteredProviders([]);
      return;
    }

    let result = providers;
    if (activeCategory !== 'Todos') result = result.filter(p => p.category === activeCategory);
    if (activeSubId) {
      const subName = CATEGORIES.flatMap(c => c.subcategories).find(s => s.id === activeSubId)?.name;
      if (subName) result = result.filter(p => p.sub === subName);
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.sub.toLowerCase().includes(q) ||
        p.specialties?.some((s: string) => s.toLowerCase().includes(q))
      );
    }
    setFilteredProviders(result);
  }, [activeCategory, activeSubId, searchQuery, providers, isIdle]);

  const handleProviderSelect = (p: any) => {
    setSelectedProviderId(p.id);
    setMapState({ ...mapState, center: [p.lat, p.lng], zoom: 16 });
    setTimeout(() => markerRefs.current[p.id]?.openPopup(), 100);
  };

  const currentCategoryObj = CATEGORIES.find(c => c.name === activeCategory);

  return (
    <div className={`home-premium ${isIdle ? 'idle' : 'searching'}`}>
      {/* UI Overlay */}
      <div className="ui-overlay app-container">
        <div className="search-section">
          <div className="search-bar-wrap animate-in">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="¿Qué servicio buscas hoy?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="categories-scroll-row animate-in">
          {['Todos', ...CATEGORIES.map(c => c.name)].map(cat => (
            <button
              key={cat}
              className={`cat-chip-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => {
                setActiveCategory(cat);
                setActiveSubId(null);
              }}
            >
              <span className="icon">{CATEGORY_STYLE[cat]?.icon}</span>
              <span className="label">{cat}</span>
            </button>
          ))}
        </div>

        {currentCategoryObj && !isIdle && (
          <div className="sub-explorer animate-in">
            <div className="sub-pills-row">
              {currentCategoryObj.subcategories.map(sub => (
                <button
                  key={sub.id}
                  className={`sub-pill-glass ${activeSubId === sub.id ? 'active' : ''}`}
                  onClick={() => setActiveSubId(activeSubId === sub.id ? null : sub.id)}
                >
                  {sub.icon} {sub.name}
                </button>
              ))}
            </div>

            {activeSubId && (
              <div className="spec-discovery-glass animate-slide-up">
                <div className="discovery-header">
                  <span className="spec-title">Servicios en {CATEGORIES.flatMap(c => c.subcategories).find(s => s.id === activeSubId)?.name}:</span>
                </div>
                <div className="spec-tags-grid">
                  {CATEGORIES.flatMap(c => c.subcategories).find(s => s.id === activeSubId)?.specialties.map(spec => (
                    <div key={spec} className="spec-discovery-tag">
                      <span className="dot"></span> {spec}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="main-content-scrollable">
        {isIdle ? (
          <LandingHome />
        ) : (
          <div className="map-and-tray">
            <div className="map-view-container">
              {isMounted && (
                <MapContainer center={mapState.center} zoom={mapState.zoom} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                  <MapRefresher center={mapState.center} zoom={mapState.zoom} />
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
                    attribution='&copy; OpenStreetMap'
                  />
                  {filteredProviders.map(p => (
                    <Marker
                      key={`${p.id}-${mapState.timestamp}`}
                      position={[p.lat, p.lng]}
                      ref={(el) => { if (el) markerRefs.current[p.id] = el; }}
                      eventHandlers={{ click: () => setSelectedProviderId(p.id) }}
                    >
                      <Popup className="premium-popup">
                        <div className="popup-card">
                          <strong>{p.name}</strong>
                          <span>{p.sub}</span>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              )}
            </div>

            {/* Results Tray */}
            <div className={`tray-premium ${filteredProviders.length > 0 ? 'visible' : ''}`}>
              <div className="handle"></div>
              <div className="tray-header app-container">
                <div className="tray-title-row">
                  <h3>Profesionales</h3>
                  <span className="results-count">{filteredProviders.length}</span>
                </div>
              </div>

              <div className="results-list app-container">
                {filteredProviders.map(p => (
                  <div
                    key={p.id}
                    className={`provider-card-compact ${selectedProviderId === p.id ? 'active' : ''}`}
                    onClick={() => handleProviderSelect(p)}
                  >
                    <div className="p-image">
                      <img src={p.image} alt={p.name} />
                    </div>
                    <div className="p-content">
                      <div className="p-header">
                        <h4>{p.name}</h4>
                        <div className="p-metrics">
                          <FavoriteButton providerId={p.id} providerData={p} size="sm" />
                          <span className="star">⭐ {p.rating}</span>
                          <span className="dist">📍 {p.distance}</span>
                        </div>
                      </div>
                      <p className="p-subtext">{CATEGORY_STYLE[p.category]?.icon} {p.sub}</p>
                      <div className="p-tags">
                        {p.specialties?.slice(0, 3).map((s: string) => <span key={s} className="p-tag">{s}</span>)}
                      </div>
                    </div>
                    <button className="p-action-btn" onClick={(e) => {
                      e.stopPropagation();
                      setViewingProvider(p);
                    }}>Ver</button>
                  </div>
                ))}
              </div>
              <div className="safe-bottom" style={{ height: '20px' }}></div>
            </div>
          </div>
        )}
      </div>

      {viewingProvider && (
        <ProviderProfileView
          provider={viewingProvider}
          onBack={() => setViewingProvider(null)}
        />
      )}

      <style jsx>{`
        .home-premium { 
          position: relative; 
          height: calc(100dvh - 56px); /* Dynamic Viewport Height for mobile */
          background: #050810; 
          overflow-y: ${isIdle ? 'auto' : 'hidden'}; 
          overflow-x: hidden;
          width: 100%;
        }
        
        .ui-overlay { 
          position: sticky; top: 0; z-index: 1000; 
          padding-top: 16px; padding-bottom: 8px;
          display: flex; flex-direction: column; gap: 12px; pointer-events: none;
          background: ${isIdle ? 'transparent' : 'rgba(5, 8, 16, 0.8)'};
          backdrop-filter: ${isIdle ? 'none' : 'blur(10px)'};
          -webkit-backdrop-filter: ${isIdle ? 'none' : 'blur(10px)'};
        }
        
        .search-bar-wrap { 
          background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(25px); 
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;
          padding: 10px 16px; display: flex; align-items: center; gap: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5); pointer-events: auto;
          margin: 0 var(--space-page);
        }
        .search-icon { font-size: 1rem; opacity: 0.6; }
        .search-input { 
          background: transparent; border: none; color: white; flex: 1; 
          font-weight: 600; font-size: 16px; outline: none; 
        } /* 16px prevents iOS auto-zoom */
        
        .categories-scroll-row { 
          display: flex; gap: 8px; overflow-x: auto; padding: 4px var(--space-page); pointer-events: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .categories-scroll-row::-webkit-scrollbar { display: none; }

        .cat-chip-btn { 
          background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px 16px; border-radius: 12px;
          display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s;
          white-space: nowrap; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .cat-chip-btn.active { background: white; border-color: white; }
        .cat-chip-btn.active .label { color: #050810; }
        .cat-chip-btn .label { color: white; font-weight: 700; font-size: 0.8rem; }

        .sub-pills-row { 
          display: flex; gap: 6px; overflow-x: auto; padding: 4px var(--space-page); pointer-events: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .sub-pill-glass { 
          background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1.5px solid rgba(255,255,255,0.06); color: #E2E8F0; padding: 6px 14px; 
          border-radius: 100px; font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: 0.2s;
          white-space: nowrap;
        }
        .sub-pill-glass.active { background: var(--accent-primary, #38BDF8); color: #050810; border-color: transparent; }

        .spec-discovery-glass {
          background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 18px;
          padding: 14px; margin: 8px var(--space-page) 0; pointer-events: auto;
          box-shadow: 0 15px 40px rgba(0,0,0,0.6);
        }
        .spec-title { color: #38BDF8; font-weight: 800; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; }
        .spec-tags-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 6px; margin-top: 8px; }
        .spec-discovery-tag { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #E2E8F0; background: rgba(255,255,255,0.03); padding: 6px 10px; border-radius: 6px; }
        .dot { width: 4px; height: 4px; background: #38BDF8; border-radius: 50%; }

        .main-content-scrollable { height: 100%; overflow-y: auto; overflow-x: hidden; width: 100%; }
        .map-and-tray { height: 100%; width: 100%; position: relative; overflow: hidden; }

        .tray-premium { 
          position: absolute; bottom: -100%; left: 0; right: 0; 
          background: linear-gradient(135deg, #0F172A 0%, #050810 100%);
          backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px);
          border-radius: 28px 28px 0 0; 
          z-index: 1001; max-height: 80%; overflow-y: auto; overflow-x: hidden;
          border-top: 1px solid rgba(255,255,255,0.08);
          transition: bottom 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 -20px 60px rgba(0,0,0,0.8);
          width: 100%;
        }
        .tray-premium.visible { bottom: 0; }
        .handle { width: 40px; height: 4px; background: rgba(255,255,255,0.15); border-radius: 2px; margin: 12px auto; }
        
        .tray-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .results-count { background: rgba(56, 189, 248, 0.1); color: #38BDF8; padding: 2px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 800; }

        .results-list { display: flex; flex-direction: column; gap: 12px; }
        .provider-card-compact { 
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px; padding: 12px; display: flex; gap: 12px; align-items: center;
          transition: 0.2s;
        }
        .provider-card-compact.active { border-color: rgba(56, 189, 248, 0.4); background: rgba(56, 189, 248, 0.05); }
        .p-image { width: 64px; height: 64px; border-radius: 12px; overflow: hidden; background: #1E293B; flex-shrink: 0; }
        .p-image img { width: 100%; height: 100%; object-fit: cover; }
        .p-content { flex: 1; min-width: 0; }
        .p-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px; }
        .p-header h4 { font-size: 0.95rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 8px; }
        .p-metrics { display: flex; gap: 8px; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; }
        .star { color: #FACC15; }
        .dist { color: #94A3B8; }
        .p-subtext { font-size: 0.8rem; color: #94A3B8; font-weight: 500; margin-bottom: 6px; }
        .p-tags { display: flex; gap: 4px; }
        .p-tag { font-size: 0.65rem; background: rgba(56, 189, 248, 0.05); color: #38BDF8; padding: 1px 6px; border-radius: 4px; border: 1px solid rgba(56, 189, 248, 0.1); }
        .p-action-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; font-weight: 700; font-size: 0.75rem; padding: 8px 12px; border-radius: 10px; cursor: pointer; }

        .map-view-container { height: 100%; width: 100%; filter: brightness(0.6) contrast(1.1); }
        
        .animate-in { animation: fadeIn 0.4s ease-out; }
        .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 480px) {
          .ui-overlay { gap: 8px; padding-top: 8px; }
          .spec-tags-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
}

function MapRefresher({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = require('react-leaflet').useMap();
  useEffect(() => { map.flyTo(center, zoom, { duration: 1.5 }); }, [center, zoom, map]);
  return null;
}
