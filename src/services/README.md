# Services

## Overview
Capa de servicios para acceso a datos. Incluye el cliente de Supabase, el servicio mock (localStorage) y el servicio principal que usa Supabase como fuente de verdad con fallback al mock.

## Interface
- `getSupabase()` - Crea y devuelve el cliente de Supabase configurado con URL y anon key.
- `isSupabaseConfigured()` - Verifica si las variables de entorno de Supabase están configuradas.
- `supabaseMock` - Instancia del servicio mock que usa localStorage.
- `SupabaseService` - Clase estática con métodos CRUD para todas las entidades: partidos, candidatos, actors, puestos, testigos, votantes, actas_e14, alertas_fraude.
- `subscribeToRealtime()` - Suscribe a cambios en tiempo real de actas, alertas y testigos vía WebSockets de Supabase Realtime.
- `exportService` - Servicios de exportación a CSV, Excel y GeoJSON.
- Subdirectories: ninguno (directorio hoja)

## Invariants
- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` deben estar definidas en `.env`.
- El rol `authenticated` debe tener permisos `GRANT ALL` en todas las tablas de Supabase.
- Las políticas RLS deben permitir lectura/escritura a usuarios autenticados.

## Side Effects
- Lee/escribe en Supabase (PostgreSQL + PostGIS).
- Lee/escribe en `localStorage` como fallback cuando Supabase no está disponible.
- Suscribe a canales WebSockets de Supabase Realtime para actualizaciones en tiempo real.
- Dispara triggers de auditoría en `audit_log` al insertar/actualizar/eliminar registros.

## Verification
- Run: `tsc --noEmit` y `vite build`