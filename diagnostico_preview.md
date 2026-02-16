# Reporte de Diagnóstico: "Modo Curioso" No Visible

**Estado:** 🛑 El componente existe pero **NO está conectado**.

---

### A) ESTADO REAL DEL CÓDIGO (EVIDENCIA)

**1. Archivo: `src/app/page.tsx`**
El Home sigue importando y usando el modal viejo (`AuthGateModal`). No hay rastro de `PublicBusinessPreviewModal`.

*Lines 10 & 101-103:*
```tsx
import AuthGateModal from '@/components/ui/AuthGateModal'; // <--- IMPORTA EL VIEJO

// ... inside handleBusinessClick ...
if (!user) {
    setPendingBusiness(biz);
    setShowAuthModal(true); // <--- ACTIVA EL VIEJO
}
```

*Lines 181-190 (Render):*
```tsx
{/* Auth Gate Modal */}
<AuthGateModal
    isOpen={showAuthModal} // <--- RENDERIZA EL VIEJO
    onClose={() => setShowAuthModal(false)}
    // ...
/>
```

**2. Archivo: `src/components/ui/MapWidget.tsx`**
El mapa funciona bien. Llama correctamente al callback que le pasa el padre.
```tsx
eventHandlers={{
    click: () => {
        if (onBusinessSelect) {
            onBusinessSelect(biz); // <--- FUNCIONA CORRECTO
        }
    }
}}
```

**3. Archivo: `src/components/ui/PublicBusinessPreviewModal.tsx`**
El componente nuevo existe y es válido, pero es "código huérfano" (nadie lo usa).

---

### B) HALLAZGO PRINCIPAL (ROOT CAUSE)

**Causa:** "El Modal Viejo sigue hardcodeado en el Home."

En `src/app/page.tsx`, la lógica `if (!user)` activa un estado `showAuthModal` que renderiza `<AuthGateModal />`. Nunca se importó ni se implementó el switch para mostrar `<PublicBusinessPreviewModal />`.

---

### C) PLAN DE ACCIÓN MÍNIMO (SUGERIDO)

Para que se vea el "Modo Curioso", se deben realizar estos cambios (CODE-MINIMAL) en `src/app/page.tsx`:

1.  **Importar** el nuevo modal:
    `import PublicBusinessPreviewModal from '@/components/ui/PublicBusinessPreviewModal';`
2.  **Reemplazar** el renderizado en el JSX:
    Cambiar `<AuthGateModal ... />` por `<PublicBusinessPreviewModal ... />` (o tener ambos y elegir cual mostrar).
3.  **Ajustar** props:
    Pasar `business={pendingBusiness}` al nuevo modal en lugar de las props sueltas del viejo.

---

### E) CONFIRMACIÓN

**No implementé nada nuevo. No cambié lógica ni arquitectura. Solo audité.**
