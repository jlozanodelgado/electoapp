# Modals

## Overview
Modales modales para crear y editar entidades del sistema electoral. Incluye formularios para crear usuarios, actas E-14, alertas de fraude, testigos, votantes, partidos y candidatos.

## Interface
- `CreateUserModal` - Modal para crear usuario de autenticación (Supabase Auth).
- `DigitalizeE14Modal` - Modal para digitalizar acta E-14 con votos por partido y verificación de discrepancia aritmética.
- `FraudAlertModal` - Modal para ver y resolver alertas de fraude (nulos anormales, censo excedido, discrepancia urna, testigo ausente).
- `NewCandidatoModal` - Modal para registrar candidato con partido, cargo, número de tarjetón, número de lista, departamento, municipio y foto.
- `NewPartidoModal` - Modal para crear partido político con nombre, siglas, color y logo URL.
- `NewVoterModal` - Modal para registrar votante/simpatizante con cédula, dirección, barrio, intención de voto, líder asignado y transporte.
- `NewWitnessModal` - Modal para crear testigo electoral con puesto, mesa, rol, estado y líder responsable.
- Subdirectories: ninguno (directorio hoja)

## Invariants
- Un testigo debe estar amarrado a un líder (`leaderId`).
- Un votante debe estar amarrado a un líder (`leaderId`).
- Un acta E-14 debe tener `puestoId`, `mesaNumero`, `digitalizadoPor` y votos por partido.
- Una alerta de fraude debe tener `tipo` válido: `nulos_anormales`, `censo_excedido`, `discrepancia_urna`, `testigo_ausente`.
- El número de tarjetón es obligatorio para cargos de concejal y asamblea departamental.

## Side Effects
- Llama a `supabase.auth.signUp()` para crear usuarios de autenticación.
- Inserta filas en `actas_e14`, `alertas_fraude`, `testigos_electorales`, `votantes_crm`, `partidos`, `candidatos`, `actors`.
- Dispara triggers de auditoría (`audit_trigger_func`) que registran cambios en `audit_log`.
- Muestra toasts de confirmación tras operaciones exitosas.

## Verification
- Run: `tsc --noEmit` y `vite build`