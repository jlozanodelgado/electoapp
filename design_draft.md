# ElectoApp — Diseño de corrección de permisos Supabase (RLS)

## Overview

ElectoApp es una aplicación web de gestión electoral y campañas estilo VotoMAP, desplegada en un VPS con Supabase Local (PostgreSQL + PostGIS). La aplicación permite gestionar departamentos, municipios, puestos de votación, candidatos, líderes, testigos, votantes, actas E-14 y alertas de fraude, con visualización geoespacial y operación en tiempo real durante el Día D.

El problema actual es que los usuarios autenticados (rol `authenticated` de Supabase Auth) no pueden leer ni escribir en las tablas de la base de datos. El frontend emite errores `42501 permission denied` y `401 Unauthorized` al consultar tablas como `partidos`, `candidatos`, `actors`, `actas_e14`, `alertas_fraude`, `testigos_electorales`, `votantes_crm` y `puestos_votacion`. Un script de corrección existente (`supabase/migracion_jerarquia_roles.sql`) intenta resolverlo con `GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated` y políticas `FOR ALL USING (auth.uid() IS NOT NULL)`, pero este enfoque sobre-permissiona a todo usuario autenticado, expone datos personales de votantes, permite borrar actas y alertas, y anula el modelo de roles jerárquico ya diseñado.

El objetivo de este documento es definir una corrección mínima, segura y versionable que restaure el acceso de lectura/escritura a los usuarios autenticados sin comprometer la seguridad ni la integridad electoral.

## Goals

1. **Restaurar el acceso de lectura y escritura** para usuarios autenticados en las tablas `partidos`, `candidatos`, `actors`, `puestos_votacion`, `testigos_electorales`, `votantes_crm`, `actas_e14` y `alertas_fraude` desde el frontend de Supabase.
2. **Aplicar el principio de mínimo privilegio:** cada tabla y cada operación (SELECT, INSERT, UPDATE, DELETE) debe tener el permiso mínimo necesario; evitar `GRANT ALL` y evitar `auth.uid() IS NOT NULL` como política de fila única.
3. **Mantener el modelo de jerarquía de roles** (`totalSupervisor`, `candidateSupervisor`, `leader`, `witness`, `voter`) con su respectivo `candidato_id`, `supervisor_id` y `leader_id`, de modo que un líder solo vea sus propios testigos y votantes, y un supervisor de candidato vea solo su ámbito territorial y de candidato.
4. **Habilitar RLS por tabla** con políticas separadas por operación (`USING` para lecturas, `WITH CHECK` para escrituras) y excluir `audit_log` de escritura pública.
5. **Corregir el error 401 (sesión/auth)** por separado, separado de la corrección de permisos de tabla (42501), ya que provienen de capas distintas.
6. **Versionar todos los cambios** en un archivo de migración idempotente con `DOWN` para reversión, aplicado por entorno (staging luego producción), con snapshot previo de `pg_policies` y `role_table_grants` para rollback.
7. **Añadir observabilidad:** propagar códigos de error de Supabase de forma estructurada, añadir un indicador `dataSource: 'supabase' | 'mock'` en el frontend para que no se confunda un fallo de permisos con datos de mock local, y alertar ante picos de errores 42501.

## Non-Goals

- No se introduce `service_role` en el bundle del navegador (evitaría saltarse RLS por completo).
- No se construye una capa backend (Edge Function/API) para suplir permisos; se considera fuera de alcance por ahora.
- No se reescribe la aplicación ni se migra a Next.js App Router; se mantiene el stack actual (Vite + React + Zustand + Supabase JS).
- No se implementan módulos nuevos (finanzas, WhatsApp, OCR, IA de estrategos) como parte de esta corrección.
- No se modifica el esquema de datos existente más allá de lo necesario para aplicar los permisos y políticas RLS.

## Technical Plan

### Arquitectura de solución

El sistema de permisos se implementa en dos capas independientes:

1. **Capa de privilegios de tabla (GRANT):** otorga al rol `authenticated` permisos de lectura y escritura en tablas específicas de PostgreSQL. `GRANT ALL` no se usa; solo `SELECT`, `INSERT`, `UPDATE`, `DELETE` en las tablas necesarias, y `USAGE` en el esquema `public` y secuencias.

2. **Capa de seguridad a nivel de fila (RLS):** cada tabla habilita `ROW LEVEL SECURITY` con políticas separadas por operación:
   - `SELECT`: `USING (condición de visibilidad por rol)`
   - `INSERT`: `WITH CHECK (condición de autorización para insertar)`
   - `UPDATE`/`DELETE`: `USING (condición de propiedad)` + `WITH CHECK (condición de autorización)`

El modelo de jerarquía de actores (`actors`) se usa como punto de referencia para el `user_id` de Supabase Auth, de modo que cada usuario solo ve y escribe las filas que le corresponden según su rol y territorio.

### Diagrama de flujo de acceso a datos

```
┌─────────────────┐
│  Frontend       │
│  (React/Zustand)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ SupabaseService │
│ (capa de servicios)│
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐  ┌──────────────┐
│ Supabase│  │ supabaseMock │
│  (PG)   │  │ (localStorage)│
└─────────┘  └──────────────┘
         │
         ▼
┌─────────────────────┐
│ PostgreSQL + PostGIS│
│  - RLS activada     │
│  - Políticas USING/ │
│    WITH CHECK       │
└─────────────────────┘
```

### Archivos nuevos

| Archivo | Razón del cambio |
|---------|------------------|
| `supabase/migrations/001_rls_permissions.sql` | Migración idempotente que otorga `GRANT USAGE` + `GRANT SELECT/INSERT/UPDATE/DELETE` específicos al rol `authenticated`, habilita RLS por tabla y crea políticas por operación con `USING` y `WITH CHECK`. Incluye `ALTER DEFAULT PRIVILEGES` para tablas nuevas futuras. Incluye `DOWN` para reversión completa. |

### Archivos modificados

| Archivo | Razón del cambio |
|---------|------------------|
| `supabase/fix_rls_permissions.sql` | Se reemplaza por el nuevo archivo de migración idempotente (`001_rls_permissions.sql`). El archivo anterior contenía políticas ambiguas y `GRANT ALL` que sobre-permissionaban. |
| `src/store/electoralStore.ts` | Se ajusta `addActor`, `addTestigo`, `addVotante`, `addActaE14` y `resolverAlerta` para pasar `leader_id`, `scope_level`, `scope_id` y otros campos necesarios por las políticas RLS basadas en `actors.user_id = auth.uid()`. No se cambia la lógica de negocio, solo se asegura que los campos necesarios se envíen a Supabase. |
| `src/services/supabaseService.ts` | No se requiere cambio funcional, ya usa `SupabaseService` como fuente de verdad con fallback a mock. Se agrega comentario documentando que las políticas RLS deben estar aplicadas en la base de datos antes de conectar. |

### Archivos sin cambios (se mantienen igual)

- `src/components/` — componentes de interfaz, no requieren cambios de permisos.
- `src/components/map/ElectoralMap.tsx` — ya lee de `electoralStore`, no toca Supabase directamente.
- `src/types/electoral.ts` — tipos ya incluyen `leaderId`, `scopeLevel`, `scopeId`, `lat`, `lng` en los actores y entidades relevantes.

### Verificación de consistencia con el conceptos_brief.md

- El `GRANT ALL` propuesto inicialmente se reemplaza por `GRANT USAGE` + `GRANT SELECT/INSERT/UPDATE/DELETE` específicos por tabla.
- La política `auth.uid() IS NOT NULL` se reemplaza por políticas separadas por operación con `USING` y `WITH CHECK`, joinando `actors.user_id = auth.uid()`.
- `audit_log` se excluye de escritura pública.
- El script es idempotente y tiene `DOWN` para reversión.
- Se agrega observabilidad mediante propagación de códigos de error de Supabase (pendiente de implementar en `supabaseService.ts` como mejora posterior).
