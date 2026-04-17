# Definición del Sistema de Correos de Expiración (Borrador Arquitectónico)

Este documento centraliza las reglas formales de producto para el envío de notificaciones y correos transaccionales orientados al ciclo de vida del Trial/Suscripción, a integrarse cuando se active el Módulo de Notificaciones y Emails (*próxima fase*).

## Fuentes de Verdad

La única fuente de verdad para emitir notificaciones de vencimiento reside en el documento del negocio en Firestore (colección `businesses` / `businesses_public`). Específicamente, en el sub-mapa `planData`:

```typescript
planData: {
  planStatus: 'trial' | 'active' | 'expired' | 'inactive';
  trialEndDate?: string;  // ISO String (ej. 2026-04-18T10:00:00Z)
}
```

---

## 1. Recordatorios Previos al Vencimiento (Pre-Expiration Triggers)

Estos correos están enfocados en la persuasión y conversión. Advierten al negocio del cierre inminente de sus funciones operativas en el marketplace.

**Requisitos Previos del CRON:**
Un CronJob diario (o gatillos de Firebase Functions programados) evaluará la diferencia entre la fecha actual `now()` y `planData.trialEndDate`.

### Trigger A: 3 Días Antes
- **Condición:** `diferencia en días == 3` && `planStatus == 'trial'`
- **Mensaje Principal:** "Tu periodo de prueba está por terminar. Aprovecha estos últimos 3 días para consolidar tu perfil."
- **Objetivo:** Informar sin alarmar.

### Trigger B: 2 Días Antes
- **Condición:** `diferencia en días == 2` && `planStatus == 'trial'`
- **Mensaje Principal:** "Quedan 2 días de tu prueba gratuita. No pierdas los beneficios de estar listado en nuestro Marketplace."

### Trigger C: 1 Día Antes
- **Condición:** `diferencia en días == 1` && `planStatus == 'trial'`
- **Mensaje Principal:** "¡Último día! Mañana tu negocio dejará de ser público. Tus clientes ya no podrán encontrarte."
- **Objetivo:** Generar FOMO (Fear of missing out) y urgencia operativa.

### Trigger D: El Mismo Día (Opcional)
- **Condición:** `diferencia en horas < 12`
- **Mensaje Principal:** "Tu negocio será ocultado hoy. Actualiza tu plan inmediatamente."

---

## 2. Evento Post-Vencimiento (Unpublished Trigger)

Se dispara en el momento exacto en el que el sistema cambia automáticamente el `planStatus` de `'trial'` a `'expired'` (o inactivo), o si la evaluación de fechas indica que ya venció en tiempo de ejecución. Este correo confirma la **despublicación**.

**Evento / Condición:**
- Función detecta mutación en el documento de negocio: `planStatus` cambia de `'active'/'trial'` a `'expired'`.
- O `ahora > trialEndDate` sin un upgrade.

**Estructura Crítica del Correo:**
1. **Punto Claro y Directo:** "Tu perfil de negocio ha sido retirado del Marketplace."
2. **Lo que se pierde (Consecuencias):** Los clientes ya no pueden buscarte, no pueden ver tu galería de trabajos y los botones de reserva están cerrados.
3. **Tranquilidad Operativa (Lo que NO se pierde):**
   - *"Tus datos están a salvo: Ninguno de tus historiales, reservas previas, ni configuraciones de CRM han sido borrados."*
   - *"Tu cuenta base sigue activa: Aún puedes utilizar nuestra plataforma en tu modo regular de 'Busco Servicios'."*
4. **Call to Action (Enlace a Pasarela de Pagos / Dashboard):** Un botón gigantesco para "Activar mi Plan y Volver al Marketplace", apuntando (en el dashboard) a la vista de planes.

---

## 3. Consideraciones Técnicas Posteriores
- **Localización (i18n):** Todo correo debe respetar el idioma en el que el dueño registró su cuenta o consultó, es decir, el sistema mantendrá las variables para `ES`, `EN`, y `PT`.
- **Idempotencia:** Evitar envíos duplicados de un recordatorio inyectando registros de correos enviados en una subcolección `_mailLogs` dentro del usuario/negocio.
