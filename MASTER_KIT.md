# 📦 PRO24-7 MASTER KIT (Guía Completa)

Este es el documento maestro que contiene toda la información técnica, funcional y de despliegue de la aplicación `pro24-7service`. Úsalo como referencia al configurar tu nuevo entorno (PC Windows).

---

## 1. VISIÓN GENERAL

**Nombre del Proyecto:** PRO24-7 v2 (Next.js App)
**Objetivo:** Plataforma de conexión entre Clientes y Proveedores de Servicios.
**Estado Actual:** Fase 1 Completada (Auth, Home, UI Móvil) -> Fase 2 Iniciada (Roles).

---

## 2. REQUISITOS DEL SISTEMA (WINDOWS)

Para trabajar en este proyecto, necesitas instalar estas herramientas **ANTES** de empezar:

1.  **Node.js (LTS):** [Descargar aquí](https://nodejs.org/).
    *   *Verificar instalación:* Abre CMD y escribe `node -v` (debe decir v18 o superior).
2.  **Git:** [Descargar aquí](https://git-scm.com/downloads).
    *   *Verificar instalación:* Abre CMD y escribe `git --version`.
3.  **VS Code:** [Descargar aquí](https://code.visualstudio.com/).

---

## 3. INSTALACIÓN DESDE CERO

1.  **Clonar el repositorio:**
    Abre una terminal (PowerShell o Git Bash) y ejecuta:
    ```bash
    git clone https://github.com/promarketingideastx-dev/pro24-7service.git
    cd pro24-7service
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno:**
    Crea un archivo llamado `.env.local` en la carpeta raíz y pega esto (reemplaza con tus claves reales):

    ```env
    # Firebase Client SDK
    NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=pro24-7-service.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=pro24-7-service
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=pro24-7-service.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
    NEXT_PUBLIC_FIREBASE_APP_ID=1:...

    # Firebase Admin SDK (Solo si se usa en API Routes)
    FIREBASE_PROJECT_ID=pro24-7-service
    FIREBASE_CLIENT_EMAIL=...
    FIREBASE_PRIVATE_KEY=...
    ```

4.  **Iniciar Servidor de Desarrollo:**
    ```bash
    npm run dev
    ```
    Visita `http://localhost:3000`.

---

## 4. ESTRUCTURA CLAVE DEL PROYECTO

- **`/src/app`**: Rutas y páginas (App Router).
  - `/page.tsx`: Home Page (Búsqueda, Mapa, Lista).
  - `/auth/login`: Página de inicio de sesión.
  - `/auth/register`: Página de registro.
- **`/src/components/ui`**: Componentes reutilizables (Botones, Inputs, MapWidget).
- **`/src/services`**: Lógica de negocio (Llamadas a Firebase).
  - `auth.service.ts`: Login, Registro, Logout.
  - `businessProfile.service.ts`: Obtener datos de negocios (con fallback si falla).

---

## 5. FUNCIONALIDADES CLAVE (YA IMPLEMENTADAS)

### 🔐 Autenticación (Auth)
- **Login/Registro:** Email y Password + Google Sign-In.
- **Password Toggle:** Icono de "ojo" 👁️ para ver la contraseña al escribir.
- **Redirección Inteligente:** Si intentas ver un perfil y no estás logueado, te pide login y luego te devuelve al perfil (`returnTo`).

### 📱 Diseño Responsivo (Mobile First)
- **Home Page:**
  - En móviles, el mapa ocupa el 35% de la altura y la lista el resto.
  - Scroll independiente en la lista de resultados.
  - Header fijo y limpio.

### ⚡ Rendimiento
- **Carga de Perfiles:** Si Firebase tarda más de 2.5 segundos, la app usa datos de prueba automáticamente para no hacer esperar al usuario.

---

## 6. PRÓXIMOS PASOS (FASE 2)

Cuando retomes el trabajo, esto es lo que sigue:

1.  **Definir Roles:**
    - Crear campo `role: 'client' | 'provider'` en la colección `users` de Firebase.
2.  **Onboarding:**
    - Crear pantalla de bienvenida tras el registro para elegir rol.
3.  **Perfil de Negocio:**
    - Formulario para que los proveedores suban sus fotos y servicios.

---

## 7. SOLUCIÓN DE PROBLEMAS COMUNES

- **Error: "Firebase: Error (auth/invalid-api-key)"**
  - *Causa:* Tu archivo `.env.local` está vacío o tiene claves incorrectas.
  - *Solución:* Revisa el paso 3 de esta guía.

- **Error: "Module not found"**
  - *Causa:* Faltan dependencias.
  - *Solución:* Ejecuta `npm install` de nuevo.

- **La app se ve mal en móvil:**
  - *Solución:* Asegúrate de estar en la rama `main` (`git checkout main`) y haber hecho `git pull`.

---
*Este documento fue generado automáticamente por tu asistente AI (Antigravity) el 16 Feb 2026.*
