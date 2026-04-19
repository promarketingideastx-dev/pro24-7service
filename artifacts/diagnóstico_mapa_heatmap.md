# Diagnóstico del Mapa (Filtros VIP y Trial Expired)

> [!NOTE]
> Este análisis se hizo mediante un script ejecutado directamente en el contexto del proyecto conectado con Firebase Admin SDK, replicando idénticamente el pipeline de estado en `page.tsx`. No se utilizaron mocks, todo es data real extraída de las colecciones `businesses_public` y `users`.

## 1. Identificación de los 3 Casos Reales

### Casos VIP (2 negocios confirmados)
1. **Negocio ID:** `LtmEbB7ga0Vu4iEZEVDrrXpYjuj1`
   - **Nombre:** Pro Marketing Ideas
   - **País:** HN
   - **Geolocalización:** Válida (Lat: 15.505, Lng: -88.02)
   - **Campos:** `planData.plan === 'vip'` y `planData.planSource === 'collaborator_beta'`

2. **Negocio ID:** `PRyuyfXzLAMjLhhaPSbI7vZWAwt1`
   - **Nombre:** MJ RIOS
   - **País:** US
   - **Geolocalización:** Válida (Lat: 29.8906, Lng: -95.420)
   - **Campos:** `planData.plan === 'vip'` y `planData.planSource === 'collaborator_beta'`

*(Nota: el perfil de User de MJ Rios también se etiqueta internamente como VIP individual, cumpliendo el conteo de la lógica).*

### Caso Trial Expirado (1 usuario)
1. **User ID:** `SVHpyWI0YPahtFhFhRBc8maCQyy2`
   - **Nombre:** Javi Rios
   - **País:** US
   - **Geolocalización:** Válida (Lat: 29.8905, Lng: -95.420)
   - **Campos:** `subscription.status === 'requires_payment_method'` y `trialEndAt` en el pasado. Su `isBusinessActive` es `false`, por lo que entra como provider al mapa sin ser deduped. Ningún negocio en `businesses_public` tiene el estado expirado.

---

## 2. Logs de Carga (DB Pipeline Simulation)

El flujo arrojó los siguientes números antes de tocar la interfaz:

- Total `businesses` procesados: **3**
- Total `users` procesados: **4** (1 droppeado en el map por deduplicación, quedan 3)
- Total con geo válida (directa o fallback): **100% (todos sobrevivieron)**
- Total **VIP** detectados por el parser: **2 Negocios, 1 User**
- Total **Expired** detectados por el parser: **0 Negocios, 1 User**

Ningún registro causa *crashes* en el script de carga. Todos entran correctamente al estado general (los "All Points" del `BusinessMap`).

---

## 3. ¿Dónde desaparecen y Cuál es la Causa Raíz?

### A. Filtro de Trial Expirado ("No muestra datos")
- **Dónde desaparece:** En la línea de filtros por Tipos de Entidad (`showClients` y `showProviders`).
- **Causa Raíz Exacta:** Dado que el único caso real expirado (`Javi Rios`) está en la colección de de Usuarios, su `MapPoint.type` es `'user'`. En la interfaz, los clientes y proveedores están ocultos por defecto. Al activar únicamente el switch de "Trial Expirado", el array sobre el cual busca el atributo está compuesto **solo por negocios**, así que arroja un total de 0 resultados.

### B. Filtro VIP ("No muestra datos" percibido)
- **Dónde desaparece:** Paradójicamente, **los negocios VIP sí pasan todos los filtros** de React (ya que `showBusinesses = true` y `isVip = true`), y son entregados a `Leaflet` para renderizarse exitosamente.
- **Causas Raíz Exactas (Multifactorial):**
  1. **Efecto de Exclusión Geográfica:** Un VIP está en "HN" y otro en "US". Si el admin tiene por defecto `selectedCountry === 'HN'`, perderá automáticamente el registro de US por el filtro número 1 (Aislamiento Geográfico).
  2. **Intersección Fatal de Filtros:** Si se activan ambos filtros al mismo tiempo (Trial Expired Y VIP), el pipeline hace un chequeo *secuencial* estricto (buscar alguien que sea ambas cosas simultáneamente). Resultado: 0.
  3. **Ilusión Visual / Bugs UI:** Al renderizarse el VIP en el mapa, la función `getColor(p, colorBy)` tiene configurado el `colorBy` usando `'status'` como default. Por lo tanto, Leaflet dibuja marcadores color verde vibrante (`STATUS_COLOR.active`) en vez los marcadores dorados  (`PLAN_COLOR.vip`). El administrador activa el filtro agrupando silenciosamente los 2 negocios visualmente idénticos a los normales, dando la apariencia de que "el filtro no funcionó".

---

> [!IMPORTANT]
> El error no está en la Base de Datos, ni en la recolección de las coordenadas. El mapeo inicial (sources of truth) es 100% correcto en `page.tsx`. La caída de registros se produce íntegramente por los choques del árbol de renderizado secuencial y defaults de UI conflictivos.

**Listos para la siguiente fase.** Por favor indique si procedemos a elaborar el `fix` o un plan de corrección arquitectónica de los filtros.
