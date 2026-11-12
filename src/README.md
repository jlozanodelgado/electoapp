# ElectoApp

## Overview
Aplicación web de gestión electoral y campañas estilo VotoMAP. Construida con React 18, TypeScript, Vite, Tailwind CSS, Zustand y Supabase (PostgreSQL + PostGIS). Permite gestionar departamentos, municipios, puestos de votación, candidatos, líderes, testigos, votantes, actas E-14 y alertas de fraude, con visualización geoespacial y operación en tiempo real durante el Día D.

## Local Interface & Invariants
- `App.tsx` - Componente raíz. Gestiona la autenticación, el actor activo, la carga de datos jerárquicos y el renderizado condicional de módulos según el rol.
- `main.tsx` - Punto de entrada de la aplicación React.
- `index.css` - Estilos globales de Tailwind CSS y sobreescrituras para Leaflet y temas claro/oscuro.
- `vite-env.d.ts` - Declaraciones de tipos para Vite.
- `ActorSwitcher.tsx` - Componente de la barra superior que muestra el actor activo y botones de creación jerárquica según el rol.

## Subdirectories & System Boundaries
- `./components/README.md` - Componentes de UI organizados por dominio (auth, layout, map, modals, modules, ui).
- `./data/README.md` - Datos mock estáticos (GeoJSON, puestos, testigos, votantes, actas, alertas).
- `./services/README.md` - Servicios de acceso a datos (Supabase client, servicio principal, mock local).
- `./store/README.md` - Stores de Zustand (electoral, security, theme).
- `./types/README.md` - Tipos TypeScript del dominio electoral.
- `./utils/README.md` - Utilidades geoespaciales.

## Global Invariants
- El `actorRole` debe ser uno de: `totalSupervisor`, `candidateSupervisor`, `leader`, `witness`, `voter`.
- El `moduloActivo` debe ser uno de: `mapa`, `campana`, `candidatos`, `preparacion`, `dia_d`, `ejecutivo`, `territorio`.
- Los testigos solo ven módulos `mapa` y `dia_d`.
- Los líderes no ven el módulo `ejecutivo`.
- El `diaDActivado` solo puede ser activado por `totalSupervisor`.
- Las claves `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` deben estar definidas en `.env`.

## Global Side Effects
- Lee/escribe en Supabase (PostgreSQL + PostGIS) a través de `SupabaseService`.
- Lee/escribe en `localStorage` como fallback cuando Supabase no está disponible.
- Suscribe a canales WebSockets de Supabase Realtime para actas, alertas y testigos en tiempo real.
- Dispara triggers de auditoría en `audit_log` al insertar/actualizar/eliminar registros.
- Persiste el tema (oscuro/claro) y el `actorId` en `localStorage`.

## System Verification
- Run: `tsc --noEmit && vite build`