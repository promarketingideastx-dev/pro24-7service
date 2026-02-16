# Reporte de Arquitectura de Autenticación & Cuentas

**Objetivo:** Eliminar error 404 en login/registro e implementar sistema de cuentas robusto (Cliente/Negocio/Admin) con soporte de país y CRM.

---

## 1. Diagnóstico del Error 404

**Causa Raíz:**
La carpeta `src/app/auth` **no existe**.
El modal de "Preview" intenta navegar a `/auth/login` y `/auth/register`, pero estas rutas no han sido creadas en el `App Router` de Next.js.

**Solución Mínima (Sin Ejecutar):**
Crear la estructura de carpetas y archivos base:
- `src/app/auth/login/page.tsx` (Página de Login)
- `src/app/auth/register/page.tsx` (Página de Registro)
- `src/app/auth/layout.tsx` (Layout compartido para centrar formularios, evitar navbar completa si se desea)

---

## 2. Mapa del Flujo de Auth/Onboarding

### A. Usuario Nuevo (Desde Preview)
1. **Entrada:** Usuario ve "Preview" de negocio -> Click "Crear Cuenta".
2. **Navegación:** Va a `/auth/register?returnTo=/negocio/123`.
3. **Acción:** Se registra con Google u Email/Password.
4. **Onboarding (Intermedio):**
   - Si es su primera vez, el sistema detecta que no tiene `country` en su perfil.
   - Redirige a `/onboarding/country` (o modal forzado).
   - Usuario selecciona "Honduras". Se guarda en perfil.
5. **Redirección Final:** Regresa a `returnTo` (/negocio/123).
6. **Resultado:** Ahora ve el perfil completo (desbloqueado).

### B. Login Recurrente
1. **Entrada:** Click "Iniciar Sesión" en navbar o modal.
2. **Navegación:** Va a `/auth/login`.
3. **Acción:** Login exitoso.
4. **Validación:** ¿Tiene `country`? Sí -> Redirigir a `returnTo` o `/`.
5. **Resultado:** Home o Perfil con sesión activa.

---

## 3. Modelo de Datos Propuesto (Mínimo Viable)

Estrictamente separado para seguridad y consistencia con CRM.

### Colección: `users` (Perfil de Usuario/Cuenta)
Documento central para autenticación y roles.
```typescript
interface UserProfile {
  uid: string;           // Match con Auth UID
  email: string;
  displayName: string;   // Nombre completo
  photoURL?: string;     // Avatar 
  role: 'customer' | 'business' | 'admin';
  country: string;       // CRUCIAL para filtros (ej: "HN", "MX")
  phone?: string;        // Obligatorio para crear cuenta
  createdAt: Timestamp;
  lastLogin: Timestamp;
  // Metadata para CRM
  status: 'active' | 'suspended';
  isVerified: boolean;
}
```

### Colección: `businesses_public` (Ya existe - Lectura pública)
Datos visibles para el catálogo.
- `country` (Indexado para filtro principal)
- `category`, `subcategory`
- `services` (Array de strings para búsqueda)
- `priceRange` (e.g. `"$"` | `$$` | `$$$`) - *Nuevo requerimiento*
- `location` (GeoPoint + ciudad/zona texto)

### Colección: `businesses_private` (Ya existe - Datos sensibles)
Datos de contacto, documentos legales, métricas privadas.

---

## 4. Google Sign-In & Configuración

**Configuración requerida:**
1. **Firebase Console:** Activar proveedor "Google".
2. **Código (Frontend):**
   - Usar `signInWithPopup(auth, googleProvider)` en los botones de "Continuar con Google".
   - Manejar el error `auth/popup-closed-by-user` (común).
   - Post-login: Verificar si el documento en `users` existe. Si no, crearlo con datos básicos del proveedor (nombre, email, foto).

**Riesgos:**
- **Redirect URIs:** En producción (vercel), hay que agregar el dominio a "Authorized Domains" en Firebase Auth. En localhost suele funcionar automático.
- **Navegadores In-App (Instagram/Facebook):** A veces bloquean popups. Considerar `signInWithRedirect` como fallback si es crítico.

---

## 5. Archivos Impactados

| Archivo | Cambio Conceptual |
| :--- | :--- |
| `src/app/auth/login/page.tsx` | **NUEVO**. Formulario de login + botón Google. Maneja `returnTo`. |
| `src/app/auth/register/page.tsx` | **NUEVO**. Formulario registro + botón Google. Crea doc en `users`. |
| `src/context/AuthContext.tsx` | Añadir lógica para leer el doc de Firestore (`users`) y exponer el `role` y `country` en el contexto, no solo el `User` de Auth. |
| `src/services/auth.service.ts` | **NUEVO/REFACTOR**. Centralizar lógica de login, registro, logout y creación de perfil `users`. |
| `firestore.rules` | Asegurar que `users` solo sea escribible por el propio usuario (create) y legible por admin/mismo usuario. |

---

## 6. Riesgos / No Tocar

- **NO TOCAR:** `src/components/ui/MapWidget.tsx`. El mapa funciona bien.
- **NO TOCAR:** `businesses_public` logic existente (salvo para agregar campos nuevos si se decide).
- **RIESGO:** Al introducir roles, asegurar que el "Home" siga funcionando para invitados (sin role). El filtrado por país por defecto debe ser "detectado" o "global" si no hay usuario.

---

## 7. Plan de Implementación (Checklist)

1.  [ ] **Estructura Auth:** Crear carpetas `src/app/auth/login` y `src/app/auth/register`.
2.  [ ] **Servicio Auth:** Crear `src/services/auth.service.ts` con métodos `loginWithGoogle`, `loginWithEmail`, `registerWithEmail`, `logout`.
3.  [ ] **Páginas UI:** Implementar las vistas de Login/Register con el diseño "Glassmorphism" existente (reciclar estilos de `AuthGateModal` si es posible).
4.  [ ] **Lógica Post-Registro:** En el `auth.service`, al registrarse, crear inmediatamente el documento en `users` con role `customer` por defecto.
5.  [ ] **Onboarding País:** Crear componente/modal que, si `user.country` es undefined, fuerce a seleccionarlo.
6.  [ ] **Integración Contexto:** Actualizar `AuthContext` para escuchar cambios en el documento `users/{uid}` y proveer el perfil completo a la app.
7.  [ ] **Test 404:** Verificar que click en "Crear cuenta" desde Preview lleve al registro y luego regrese al negocio.
