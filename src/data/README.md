# Data

## Overview
Datos mock estáticos para desarrollo y prueba. Incluye límites geográficos GeoJSON y datos iniciales de puestos, testigos, votantes, actas y alertas.

## Interface
- `DEPARTAMENTOS_GEOJSON` - GeoJSON de departamentos colombianos para capa coroplética.
- `MUNICIPIOS_GEOJSON` - GeoJSON de municipios para capa coroplética.
- `DEPARTAMENTOS` - Lista de departamentos con coordenadas y zoom.
- `MUNICIPIOS` - Lista de municipios con coordenadas, zoom y zonas.
- `PUESTOS_VOTACION` - Lista de puestos de votación con censo, mesas, meta, votos proyectados, estado de prioridad, partido dominante y histórico electoral.
- `TESTIGOS_INICIALES` - Lista de testigos electorales iniciales.
- `VOTANTES_INICIALES` - Lista de votantes CRM iniciales.
- `ACTAS_E14_INICIALES` - Lista de actas E-14 iniciales.
- `ALERTAS_FRAUDE_INICIALES` - Lista de alertas de fraude iniciales.
- Subdirectories: ninguno (directorio hoja)

## Invariants
- Los puestos de votación deben tener `departamentoId` y `municipioId` válidos.
- Los testigos deben tener `puestoId`, `mesaNumero`, `nombre`, `cedula`, `telefono`, `rol` y `estado`.
- Los votantes deben tener `puestoId`, `nombre`, `cedula`, `telefono`, `intencionVoto` y `liderAsignado`.
- Las actas E-14 deben tener `puestoId`, `mesaNumero`, `horaReporte`, `digitalizadoPor` y votos por partido.
- Las alertas de fraude deben tener `tipo` válido y `severidad` válida.

## Side Effects
- Ningún efecto de red. Datos estáticos en memoria.
- Se usan como datos por defecto cuando Supabase no está configurado o no hay datos en la nube.

## Verification
- Run: `tsc --noEmit` y `vite build`