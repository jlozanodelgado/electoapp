# Modules

## Overview
Módulos principales de la aplicación. Cada módulo representa una vista funcional completa con su propio estado del store electoral.

## Interface
- `MapViewerModule` - Mapa GIS interactivo con controles y drawer de puesto.
- `CampaignCommandModule` - Centro de comando de campaña. Gestión de testigos y votantes CRM con filtros y búsqueda.
- `CandidatosModule` - Listado de candidatos agrupados por municipio y cargo (individuales vs listas de corporación).
- `PreparacionModule` - Planificación Día D. Gestión de líderes, testigos y votantes antes de activar el escrutinio.
- `DayDModule` - Sala de crisis Día D. Escrutinio y transmisión de actas E-14 en vivo. Centro de alertas antifraude.
- `ExecutiveDashboardModule` - Dashboard ejecutivo. KPIs, curules D'Hondt, evolución histórica, exportación de datos.
- `TerritoryDashboard` - Panel de territorio. Muestra mapa con puestos y votantes, acciones rápidas (ver viviendas, personas ubicadas, verificar direcciones) y estadísticas del territorio.
- Subdirectories: ninguno (directorio hoja)

## Invariants
- El módulo `dia_d` solo está disponible si `diaDActivado` es `true` (activado por totalSupervisor).
- Los testigos solo ven actas y alertas donde son el `leaderId` creador.
- Los líderes solo ven testigos y votantes donde son el `leaderId`.
- Los supervisores de candidato ven testigos y votantes de sus líderes amarrados.

## Side Effects
- Lee/escribe `actas_e14`, `alertas_fraude`, `testigos_electorales`, `votantes_crm` en Supabase.
- Dispara triggers de auditoría en `audit_log`.
- Suscribe a canales Realtime de Supabase para actualizaciones en tiempo real.
- Exporta datos a CSV/Excel/GeoJSON.

## Verification
- Run: `tsc --noEmit` y `vite build`