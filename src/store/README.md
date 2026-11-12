# Store

## Overview
Store global de Zustand para gestión del estado electoral. Contiene actores, puestos, testigos, votantes, actas, alertas, partidos y candidatos. Controla el estado de la aplicación (módulo activo, nivel territorial, filtros, actor autenticado).

## Interface
- `useElectoralStore` - Store principal con estado y acciones para todas las entidades electorales.
- `useSecurityStore` - Store de seguridad con autenticación, registro de usuarios y obtención del actor vinculado a auth.
- `useThemeStore` - Store de tema (oscuro/claro) con persistencia en localStorage.
- `Actor` - Tipo de actor con rol, nivel, supervisorId, candidatoId, leaderId, scopeLevel, scopeId, userId.
- `PuestoVotacion` - Puesto de votación con censo, mesas, meta, votos proyectados, estado de prioridad, partido dominante.
- `TestigoElectoral` - Testigo electoral con puesto, mesa, rol, estado, hora llegada y leaderId.
- `VotanteCRM` - Votante/simpatizante con intención de voto, líder asignado, contacto, transporte, yaVoto, lat/lng y leaderId.
- `ActaE14` - Acta de escrutinio E-14 con votos por partido, estado de revisión, líder digitalizador y foto.
- `AlertaFraude` - Alerta de fraude con severidad, tipo, descripción, líder reportante y timestamp.
- `Partido` - Partido político con nombre, siglas, color y logo URL.
- `Candidato` - Candidato con partido, nombre, cédula, cargo, número de tarjetón, número de lista, departamento, municipio y foto URL.
- Subdirectories: ninguno (directorio hoja)

## Invariants
- Un testigo debe tener `leaderId` asignado.
- Un votante debe tener `leaderId` asignado.
- Un líder debe tener `supervisorId` y/o `candidatoId` asignados.
- El `actorRole` debe ser uno de: `totalSupervisor`, `candidateSupervisor`, `leader`, `witness`, `voter`.
- `diaDActivado` solo puede ser `true` si es activado por `totalSupervisor`.

## Side Effects
- Guarda/lee datos en Supabase (todos las tablas electorales).
- Guarda/lee en `localStorage` como fallback.
- Suscribe a canales Realtime de Supabase para actas, alertas y testigos.
- Persiste el tema (oscuro/claro) en `localStorage`.
- Persiste el `actorId` vinculado al usuario de Supabase Auth.

## Verification
- Run: `tsc --noEmit` y `vite build`