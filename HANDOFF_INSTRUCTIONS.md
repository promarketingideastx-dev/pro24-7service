# Instrucciones de Traspaso (Mac -> Windows)

Este documento contiene todo lo necesario para retomar el proyecto `pro24-7service` en tu nueva PC con Windows.

## 1. Preparación del Entorno (Windows)

Antes de empezar, asegúrate de instalar:
1.  **Node.js (LTS):** [Descargar aquí](https://nodejs.org/)
2.  **Git:** [Descargar aquí](https://git-scm.com/downloads)
3.  **VS Code:** [Descargar aquí](https://code.visualstudio.com/)

## 2. Descarga del Proyecto

Abre una terminal (PowerShell o Git Bash) y ejecuta:

```bash
git clone https://github.com/promarketingideastx-dev/pro24-7service.git
cd pro24-7service
npm install
```

## 3. Configuración de Claves Secretas (.env.local)

⚠️ **IMPORTANTE:** El archivo `.env.local` NO se descarga con `git clone` por seguridad. Debes crearlo manualmente en la carpeta raíz del proyecto y pegar las siguientes claves (las mismas que usaste en Mac):

```env
# Copia aquí el contenido de tu .env.local original
# (Firebase API Keys, etc.)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# ... resto de las variables
```

## 4. Estado Actual del Proyecto

### ✅ Últimos Cambios (Phase 1 & Mobile UI)
- **Responsive Design:** La vista móvil del Home (`/`) ya está optimizada (mapa más pequeño, listas con scroll).
- **Authentication:** Login y Registro funcionan con email/password y Google.
- **Password Toggle:** Se agregó el icono de "ojo" 👁️ para mostrar/ocultar contraseñas.
- **Performance:** Si Firestore tarda más de 2.5s, carga datos de prueba automáticamente.

### 🚧 Lo Siguiente (Phase 2)
- **Roles:** Definir si el usuario es "Cliente" o "Proveedor".
- **Onboarding:** Pantalla de bienvenida tras el primer login.
- **Registro de Negocio:** Formulario para que los proveedores suban sus datos.

## 5. Comandos Útiles

- **Iniciar servidor de desarrollo:**
  ```bash
  npm run dev
  ```
  (Abre `http://localhost:3000` en tu navegador)

- **Verificar errores de código:**
  ```bash
  npm run lint
  ```

¡Listo para continuar! 🚀
