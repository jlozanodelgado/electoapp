# ElectoApp

## System Overview
ElectoApp es una plataforma web de gestión de campañas electorales estilo VotoMAP, desplegable en un VPS con Supabase Local (self-hosted vía Docker/Coolify). Permite gestionar votantes, líderes, mapas georreferenciados, actas E-14, jornadas del Día D, WhatsApp Bot y finanzas, con arquitectura de seguridad por filas (RLS) y cumplimiento de la Ley 1581 de 2012 (Habeas Data) de Colombia.

## Local Interface & Invariants
- `package.json` - Proyecto `electoapp-votomap-clone` con dependencias: React 18, Supabase JS, Leaflet, Lucide React, Recharts, Zustand, Tailwind CSS, TypeScript, Vite.
- `vite.config.ts` - Configuración de Vite con plugin React.
- `tailwind.config.js` - Configuración de Tailwind CSS con colores electorales (coalición, alianza, unidad, indeciso, blanco).
- `tsconfig.json` - Configuración de TypeScript con modo estricto.
- `supabase/` - Directorio con esquemas SQL y migraciones (postgis, uuid-ossp, tablas, funciones, triggers, RLS, semillas).
- `src/` - Código fuente de la aplicación React.

## Subdirectories & System Boundaries
- `./src/README.md` - Código fuente principal de la aplicación.
- `./supabase/README.md` - Esquema de base de datos PostgreSQL + PostGIS con extensiones, funciones, triggers, RLS y semillas.

## Global Invariants
- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` deben estar definidas en `.env`.
- El rol `authenticated` debe tener `GRANT ALL` en todas las tablas de PostgreSQL.
- Las políticas RLS deben permitir `FOR ALL USING (auth.uid() IS NOT NULL)`.
- La tabla `actors` debe tener columnas `supervisor_id`, `candidato_id`, `leader_id`.
- La tabla `candidatos` debe tener columnas `numero_tarjeton` y `numero_lista`.
- Las tablas `testigos_electorales`, `votantes_crm`, `actas_e14`, `alertas_fraude` deben tener columna `leader_id`.
- La tabla `votantes_crm` debe tener columnas `lat` y `lng`.

## Global Side Effects
- Crea/modifica tablas en PostgreSQL con extensión PostGIS.
- Crea funciones PL/pgSQL (calcular_geom_puesto, buscar_puestos_por_rado, audit_trigger_func).
- Crea triggers de auditoría que insertan en `audit_log`.
- Crea publicaciones de Supabase Realtime para actas, alertas, testigos y votantes.
- Inserta datos semilla (departamentos, municipios, puestos, testigos, votantes, actas, alertas).

## System Verification
- Run: `tsc --noEmit && vite build`