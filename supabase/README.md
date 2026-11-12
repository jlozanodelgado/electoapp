# Supabase

## Overview>
Archivos SQL de esquema y migración para la base de datos PostgreSQL + PostGIS en Supabase. Incluye creación de tablas, extensiones, funciones de auditoría, triggers, políticas RLS y semillas de datos iniciales.

## Interface
- `schema.sql` - Esquema principal con extensiones (postgis, uuid-ossp), tablas (departamentos, municipios, puestos_votacion, historico_electoral, testigos_electorales, votantes_crm, actas_e14, alertas_fraude, testigos, partidos, candidatos, actors), funciones PostGIS (calcular_geom_puesto, buscar_puestos_por_radio), publicación Realtime, políticas RLS y semillas de datos.
- `migracion_jerarquia_roles.sql` - Migración para agregar jerarquía de roles: tabla partidos, tabla candidatos, columnas supervisor_id/candidato_id/leader_id en actors, columnas leader_id en tablas de datos, tabla audit_log, triggers de auditoría.
- `fix_rls_permissions.sql` - Script para otorgar permisos al rol `authenticated` y crear políticas RLS simples en todas las tablas.
- Subdirectories: ninguno (directorio hoja)

## Invariants
- El rol `authenticated` debe tener `GRANT ALL` en todas las tablas.
- Las políticas RLS deben permitir `FOR ALL USING (auth.uid() IS NOT NULL)`.
- La tabla `actors` debe tener columnas `supervisor_id`, `candidato_id`, `leader_id`.
- La tabla `candidatos` debe tener columnas `numero_tarjeton` y `numero_lista`.
- Las tablas `testigos_electorales`, `votantes_crm`, `actas_e14`, `alertas_fraude` deben tener columna `leader_id`.
- La tabla `votantes_crm` debe tener columnas `lat` y `lng`.

## Side Effects
- Crea/modifica tablas en PostgreSQL con extensión PostGIS.
- Crea funciones PL/pgSQL (calcular_geom_puesto, buscar_puestos_por_radio, audit_trigger_func).
- Crea triggers de auditoría que insertan en `audit_log`.
- Crea publicaciones de Supabase Realtime para actas, alertas, testigos y votantes.
- Inserta datos semilla (departamentos, municipios, puestos, testigos, votantes, actas, alertas).

## Verification
- Run: Ejecutar en Supabase SQL Editor y verificar que no hay errores de permisos (42501) ni de sintaxis (42601, 42883).