'use client';

import React, { useEffect, useState } from 'react';
import { TAXONOMY } from '@/lib/taxonomy';
import { sanitizeData } from '@/lib/firestoreUtils';
import { UserProfileService } from '@/services/userProfile.service';
import { PERMISSIONS } from '@/lib/permissions';

export default function VerifyPhase1() {
    const [results, setResults] = useState<any[]>([]);

    useEffect(() => {
        const tests = [];

        // 1. Verificar Taxonomía
        try {
            const artDesign = TAXONOMY['art_design'];
            tests.push({
                name: 'Taxonomía: Arte y Diseño',
                status: artDesign ? '✅ OK' : '❌ Falta',
                details: artDesign ? `${artDesign.subcategories.length} Subcategorías encontradas` : 'No encontrada'
            });
        } catch (e: any) {
            tests.push({ name: 'Taxonomía', status: '❌ Error', details: e.message });
        }

        // 2. Verificar Sanitizer (CRÍTICO)
        try {
            const dirty = { name: 'Test', bad: undefined, nested: { good: 1, bad: undefined } };
            const clean = sanitizeData(dirty);
            const isClean = !('bad' in clean) && !('bad' in clean.nested);
            tests.push({
                name: 'Sanitizer (Anti-Undefined)',
                status: isClean ? '✅ OK' : '❌ Falló',
                details: JSON.stringify(clean)
            });
        } catch (e: any) {
            tests.push({ name: 'Sanitizer', status: '❌ Error', details: e.message });
        }

        // 3. Verificar Servicio de Perfil
        try {
            const hasMethod = typeof UserProfileService.updateClientProfile === 'function';
            tests.push({
                name: 'UserProfileService',
                status: hasMethod ? '✅ OK' : '❌ Método perdido',
                details: hasMethod ? 'updateClientProfile disponible' : 'Revisar export'
            });
        } catch (e: any) {
            tests.push({ name: 'Service', status: '❌ Error', details: e.message });
        }

        // 4. Verificar Permisos
        try {
            const canView = PERMISSIONS.canViewContactInfo(null); // Should be false
            tests.push({
                name: 'Permisos (Candado)',
                status: canView === false ? '✅ OK' : '❌ Lógica Inversa',
                details: 'Usuario null no ve contacto'
            });
        } catch (e: any) {
            tests.push({ name: 'Permisos', status: '❌ Error', details: e.message });
        }

        setResults(tests);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-mono">
            <h1 className="text-2xl font-bold mb-6">Diagnóstico Fase 1: Arquitectura</h1>

            <div className="space-y-4">
                {results.map((test, i) => (
                    <div key={i} className="bg-white p-4 rounded shadow border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold">{test.name}</h3>
                            <span className={test.status.includes('OK') ? 'text-green-600' : 'text-red-600'}>
                                {test.status}
                            </span>
                        </div>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                            {test.details}
                        </pre>
                    </div>
                ))}
            </div>

            <div className="mt-8">
                <p className="text-sm text-gray-500">
                    Siguiente paso: Visitar <a href="/admin/dashboard" className="text-blue-600 underline">/admin/dashboard</a>
                </p>
            </div>
        </div>
    );
}
