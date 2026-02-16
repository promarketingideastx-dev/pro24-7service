'use client';

import React, { useState } from 'react';

// Placeholder components for tabs
const MetricCard = ({ title, value, trend }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        <div className="mt-2 flex items-baseline">
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            <span className={`ml-2 text-sm font-medium ${trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {trend}
            </span>
        </div>
    </div>
);

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'users' | 'businesses' | 'activity'>('users');

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Admin CRM (Cerebro) 🧠</h1>
                <p className="text-gray-500">Monitoreo en tiempo real de la plataforma 2x1.</p>
            </header>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <MetricCard title="Usuarios Totales" value="1,284" trend="+12%" />
                <MetricCard title="Negocios Activos" value="342" trend="+5%" />
                <MetricCard title="En Borrador (Drafts)" value="56" trend="-2%" />
                <MetricCard title="Ingresos (Proyectado)" value="$4.5k" trend="+8%" />
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    {['users', 'businesses', 'activity'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`
                                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                                ${activeTab === tab
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content Placeholder */}
            <div className="bg-white rounded-xl shadow-sm min-h-[400px] p-6 border border-gray-100">
                {activeTab === 'users' && (
                    <div className="text-center py-20">
                        <h3 className="text-lg font-medium text-gray-900">Gestión de Usuarios (2x1)</h3>
                        <p className="text-gray-500 mt-2">Tabla de usuarios con roles Cliente/Negocio.</p>
                        {/* TODO: Implementar tabla real con paginación */}
                    </div>
                )}
                {activeTab === 'businesses' && (
                    <div className="text-center py-20">
                        <h3 className="text-lg font-medium text-gray-900">Pipeline de Negocios</h3>
                        <p className="text-gray-500 mt-2">Visión de estados: Draft -> Pending -> Active.</p>
                        {/* TODO: Implementar Kanban o Lista filtrable */}
                    </div>
                )}
                {activeTab === 'activity' && (
                    <div className="text-center py-20">
                        <h3 className="text-lg font-medium text-gray-900">Mapa de Actividad en Vivo</h3>
                        <p className="text-gray-500 mt-2">Feed de búsquedas y eventos recientes.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
