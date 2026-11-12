# Components

## Overview
Componentes de interfaz de usuario organizados por dominio: autenticación, layout, mapa, modales, módulos y UI base. Cada subdirectorio es un paquete de componentes con responsabilidad específica.

## Subdirectories & Boundaries
- `./auth/README.md` - Formularios de autenticación (login, registro de usuarios).
- `./layout/README.md` - Barra superior, barra lateral y selector territorial.
- `./map/README.md` - Mapa GIS con Leaflet, marcadores, controles y drawer de puesto.
- `./modals/README.md` - Modales para crear/editar actores, actas E-14, alertas, partidos y candidatos.
- `./modules/README.md` - Módulos funcionales: mapa, campaña, candidatos, preparación Día D, día D, ejecutivo y territorio.
- `./ui/README.md` - Componentes base de UI: tarjetas, botones, insignias, avatares y toasts.

## Invariants
- `ActorSwitcher` (en la raíz de este directorio) muestra botones de creación según el rol del actor activo.
- Los componentes de layout leen del `electoralStore` para estado global (moduloActivo, actorRole, etc.).
- Los componentes de mapas leen del `electoralStore` para filtros territoriales y estilo basemap.
- Los modales escriben en Supabase a través de `SupabaseService`.

## Side Effects
- Lectura/escritura en Supabase a través de `SupabaseService` y `supabaseMock`.
- Suscripción a canales Realtime para actas, alertas y testigos.
- Persistencia de preferencias en `localStorage` (tema, actorId).

## Verification
- Run: `tsc --noEmit` y `vite build`