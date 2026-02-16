import React, { useState, useMemo } from 'react';
import { COUNTRIES, Country } from '@/lib/countries';

interface CountrySelectorProps {
    value: string; // Country Code (e.g. 'MX', 'US')
    onChange: (country: Country) => void;
    disabled?: boolean;
}

export function CountrySelector({ value, onChange, disabled }: CountrySelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    const selectedCountry = useMemo(() =>
        COUNTRIES.find(c => c.code === value) || COUNTRIES.find(c => c.code === 'US'),
        [value]);

    const filteredCountries = useMemo(() => {
        const q = search.toLowerCase();
        return COUNTRIES.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q) ||
            c.phoneCode.includes(q)
        );
    }, [search]);

    const handleSelect = (country: Country) => {
        onChange(country);
        setIsOpen(false);
        setSearch('');
    };

    if (isOpen) {
        return (
            <div className="country-modal-overlay" onClick={() => setIsOpen(false)}>
                <div className="country-modal animate-slide-up" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3>Selecciona tu país</h3>
                        <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
                    </div>

                    <div className="search-box">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar país o código..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="country-list">
                        {filteredCountries.map(c => (
                            <button
                                key={c.code}
                                className={`country-item ${c.code === value ? 'selected' : ''}`}
                                onClick={() => handleSelect(c)}
                            >
                                <span className="flag">{c.flag}</span>
                                <span className="name">{c.name}</span>
                                <span className="code">{c.phoneCode}</span>
                                {c.code === value && <span className="check">✓</span>}
                            </button>
                        ))}
                        {filteredCountries.length === 0 && (
                            <div className="no-results">No encontramos ese país</div>
                        )}
                    </div>
                </div>
                <style jsx>{`
                    .country-modal-overlay {
                        position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 9999;
                        display: flex; align-items: flex-end; justify-content: center;
                        backdrop-filter: blur(4px);
                    }
                    .country-modal {
                        background: #0F172A; width: 100%; max-width: 500px;
                        border-top-left-radius: 20px; border-top-right-radius: 20px;
                        height: 80vh; display: flex; flex-direction: column;
                        box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
                        border: 1px solid rgba(255,255,255,0.1);
                    }
                    @media(min-width: 600px) {
                        .country-modal-overlay { align-items: center; }
                        .country-modal { height: 600px; border-radius: 20px; }
                    }

                    .modal-header {
                        padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.1);
                        display: flex; justify-content: space-between; align-items: center;
                    }
                    .modal-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: white; }
                    .close-btn { background: none; border: none; color: #94A3B8; font-size: 1.5rem; cursor: pointer; }

                    .search-box {
                        margin: 16px; padding: 12px; background: rgba(255,255,255,0.05);
                        border-radius: 12px; display: flex; align-items: center; gap: 10px;
                        border: 1px solid rgba(255,255,255,0.1);
                    }
                    .search-box input {
                        background: none; border: none; color: white; font-size: 1rem;
                        width: 100%; outline: none;
                    }

                    .country-list {
                        flex: 1; overflow-y: auto; padding: 0 16px 20px;
                    }
                    .country-item {
                        display: flex; align-items: center; gap: 12px;
                        width: 100%; padding: 14px; background: none; border: none;
                        border-bottom: 1px solid rgba(255,255,255,0.05);
                        cursor: pointer; transition: 0.2s; text-align: left;
                    }
                    .country-item:active { background: rgba(255,255,255,0.05); }
                    .country-item .flag { font-size: 1.5rem; }
                    .country-item .name { flex: 1; font-size: 1rem; color: #F1F5F9; font-weight: 500; }
                    .country-item .code { color: #64748B; font-weight: 600; font-size: 0.9rem; }
                    .country-item .check { color: #38BDF8; font-weight: 900; }
                    .country-item.selected { background: rgba(56, 189, 248, 0.1); border-radius: 10px; border-bottom: none; }

                    .trigger-btn {
                        display: flex; align-items: center; gap: 8px;
                        background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
                        padding: 12px 16px; border-radius: 12px; color: white;
                        cursor: pointer; width: 100%; transition: 0.2s;
                    }
                    .trigger-btn:hover { border-color: #38BDF8; background: rgba(56, 189, 248, 0.05); }
                    .trigger-value { flex: 1; text-align: left; font-weight: 600; display: flex; align-items: center; gap: 8px;}
                `}</style>
            </div>
        );
    }

    return (
        <>
            <button
                className="trigger-btn"
                onClick={() => !disabled && setIsOpen(true)}
                disabled={disabled}
                type="button"
            >
                <div className="trigger-value">
                    <span style={{ fontSize: '1.5rem' }}>{selectedCountry?.flag}</span>
                    <span>{selectedCountry?.name}</span>
                    <span style={{ color: '#94A3B8', marginLeft: 'auto' }}>{selectedCountry?.phoneCode}</span>
                </div>
                <span style={{ color: '#94A3B8' }}>▼</span>
            </button>
            <style jsx>{`
                .trigger-btn {
                    display: flex; align-items: center; gap: 8px;
                    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
                    padding: 12px 16px; border-radius: 12px; color: white;
                    cursor: pointer; width: 100%; transition: 0.2s;
                }
                .trigger-btn:hover { border-color: #38BDF8; background: rgba(56, 189, 248, 0.05); }
                .trigger-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                .trigger-value { flex: 1; text-align: left; font-weight: 600; display: flex; align-items: center; gap: 10px;}
            `}</style>
        </>
    );
}
