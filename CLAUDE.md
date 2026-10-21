# CLAUDE.md

Guía para Claude Code (claude.ai/code) en este repositorio.

## Qué es

Frontend Angular de **Jimaco Remisiones** (venta directa de un conjunto cerrado de herramientas, con remisión + cobro por datáfono + control de stock propio). Habla con la API .NET del repo hermano **`Jimaco.Remisiones`** (`../Jimaco.Remisiones`), cuyo `CLAUDE.md` tiene el dominio, el alcance (**sin integración con World Office**) y las reglas de negocio — leerlo primero. El `docker-compose.yml` de ese repo construye este frontend desde `../Jimaco.Remisiones.Web`, así que ambos deben estar lado a lado.

## Arquitectura

Angular 22, componentes standalone (sin NgModules), Angular Material (tema M3) + servicios RxJS/signals, sin NgRx.

- `src/app/core/` — `models/` (espejo de los DTO del backend), `services/` (un wrapper fino de `HttpClient` por recurso), `guards/`, `interceptors/` (JWT + 401), `dialogs/` (confirmación, mensaje, texto), `utils/calculos-remision.ts` (total en vivo; el oficial lo calcula el backend).
- `src/app/features/`:
  - `remisiones`: lista con filtros (Por cobrar / Pagadas / Envíos pendientes / Anuladas), `remision-form` (crear **y** editar) y `remision-detalle` (pagar / PDF / correo / entregar / anular).
  - `productos`: lista con **Stock**, diálogo crear/editar (solo Admin; el stock inicial solo al crear), **historial (kardex)** por producto (`kardex-dialog`) y **entrada/ajuste de stock** (`ajuste-stock-dialog`, solo Admin; el ajuste se hace contra "stock real contado" y exige motivo).
  - `compradores`, `usuarios`, `login`.
- `src/app/layout/` — shell post-login; solo aquí se lee `authService.esAdmin` para mostrar "Usuarios".

**Stock en la remisión**: las opciones de producto sin stock salen deshabilitadas ("sin stock"); si una línea pide más de lo que hay se muestra "Solo hay N en stock" y el botón de crear se deshabilita. El servidor valida igual (409).

**Tema Jimaco**: `src/theme-colors.scss` (verde `#1c6521`) copiado de Jimaco Aprobaciones; logo y favicon en `public/`. **Móvil primero** (la app se usa sobre todo en celulares): toda `<table mat-table>` lleva `tabla-responsiva` y cada `<td>` un `data-label`; el apilado genérico está en `styles.scss`, y las listas de remisiones/productos/compradores lo reemplazan por **tarjetas compactas** con `grid-template-areas` en su propio `.scss` (ojo: el `<tbody>` lo crea Material sin el atributo de encapsulación, así que su regla `display:block` va en `styles.scss`). El formulario de remisión usa una **barra de acción fija al pie** (`.barra-accion`: total + botón) y el detalle pone la acción principal a ancho completo. Paginador en español (`core/utils/paginador-es.ts`). PWA instalable (`public/manifest.webmanifest`, `icon-192/512.png`, `theme-color`). Verificar siempre a 390 px con Playwright (ver memoria `feedback_visual_verification_playwright`).

**nginx**: `index.html` va con `Cache-Control: no-cache` (si no, tras una actualización el navegador puede seguir con el `index.html` viejo y cargar JavaScript de la versión anterior); los `.js/.css` con hash se guardan 30 días.

## Comandos

Requiere **Node ≥ 22.22.3** (con el Node 20 global de este equipo `ng` ni arranca). Hay uno portable en `C:\tmp\node22b\node-v22.22.3-win-x64`: anteponerlo al `PATH`.

```bash
npm ci
npx ng build --configuration development   # detecta errores de plantilla/tipos
npx ng serve                               # lee apiUrl de src/environments/environment.ts (http://localhost:8100/api)
```

## Versionado
En cada cambio de frontend, subir la versión en `package.json` **y** en los dos `src/environments/environment*.ts` (hoy `0.10.0`).

**WhatsApp en celular**: el token del enlace público se pide al cargar el detalle (no al pulsar) para poder abrir WhatsApp en el mismo gesto: en móvil `window.location.href = whatsapp://send?...` con respaldo `wa.me` a los 1,5 s que se cancela si la página pasa a segundo plano (`visibilitychange`); en computador `window.open(wa.me)`. Antes se abría una pestaña en blanco por adelantado que quedaba abierta al volver desde la app.

**Ciudad del comprador**: desplegable con búsqueda predictiva (`core/utils/municipios.ts`: sin tildes/mayúsculas, palabras en cualquier orden, primero los que empiezan por lo escrito) sobre `GET /api/municipios` (`MunicipioService`, cacheado por sesión). Solo se puede elegir de la lista: al cerrarla, lo escrito sin elegir se borra y el botón Guardar exige una opción elegida.

**Cobro**: `PagoDialogComponent` (medio Datáfono/QR/Efectivo + recibo Redeban cuando aplica). **Cierre de caja**: `features/cierre-caja` (selector de día, tarjetas por medio, cobros/devoluciones en tarjetas, CSV con `;` y BOM).
