# CLAUDE.md

Guía para Claude Code (claude.ai/code) en este repositorio.

## Qué es

Frontend Angular de **Jimaco Remisiones** (venta directa en el punto de venta con remisión + cobro por datáfono). Habla con la API .NET del repo hermano **`Jimaco.Remisiones`** (`../Jimaco.Remisiones`), cuyo `CLAUDE.md` tiene el dominio y las reglas de negocio — leerlo primero. El `docker-compose.yml` de ese repo construye este frontend desde `../Jimaco.Remisiones.Web`, así que ambos deben estar lado a lado.

## Arquitectura

Angular 22, componentes standalone (sin NgModules), Angular Material (tema M3) + servicios RxJS/signals, sin NgRx.

- `src/app/core/` — `models/` (espejo de los DTO del backend), `services/` (un wrapper fino de `HttpClient` por recurso), `guards/`, `interceptors/` (JWT + 401), `dialogs/` (confirmación, mensaje, texto), `utils/calculos-remision.ts` (total en vivo; el oficial lo calcula el backend).
- `src/app/features/` — `remisiones` (lista con filtros Por cobrar/Pagadas/Envíos pendientes/Anuladas, `remision-form` para crear **y** editar, `remision-detalle` con las acciones pagar / PDF / correo / entregar / anular), `productos`, `compradores`, `usuarios`, `login`.
- `src/app/layout/` — shell post-login; solo aquí se lee `authService.esAdmin` para mostrar "Usuarios".

**Tema Jimaco**: `src/theme-colors.scss` (verde `#1c6521`) copiado de Jimaco Aprobaciones; logo y favicon en `public/`. **Tablas responsivas**: toda `<table mat-table>` lleva la clase `tabla-responsiva` y cada `<td>` un `data-label` (el apilado móvil está en `styles.scss`).

## Comandos

Requiere **Node ≥ 22.22.3** (con el Node 20 global de este equipo `ng` ni arranca). Hay uno portable en `C:\tmp\node22b\node-v22.22.3-win-x64`: anteponerlo al `PATH`.

```bash
npm ci
npx ng build --configuration development   # detecta errores de plantilla/tipos
npx ng serve                               # lee apiUrl de src/environments/environment.ts (http://localhost:8100/api)
```

## Versionado
En cada cambio de frontend, subir la versión en `package.json` **y** en los dos `src/environments/environment*.ts` (hoy `0.1.0`).
