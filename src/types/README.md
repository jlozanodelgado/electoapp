# Types

## Overview
Definiciones de tipos TypeScript para el dominio electoral. Incluye tipos para actores, puestos, testigos, votantes, actas, alertas, partidos, candidatos y scope territorial.

## Interface
- `Actor` - Actor del sistema con rol, nivel, supervisorId, candidatoId, leaderId, scopeLevel, scopeId, userId, territorio.
- `PuestoVotacion` - Puesto de votación con métricas electorales y histórico.
- `TestigoElectoral` - Testigo electoral con puesto, mesa, rol, estado y leaderId.
- `VotanteCRM` - Votante CRM con intención de voto, líder, transporte y coordenadas.
- `ActaE14` - Acta E-14 con votos, estado de revisión y líder digitalizador.
- `AlertaFraude` - Alerta de fraude con severidad, tipo y líder reportante.
- `Partido` - Partido político con nombre, siglas, color y logo.
- `Candidato` - Candidato con partido, cédula, cargo, tarjetón, lista, departamento, municipio y foto.
- `TipoBasemap` - Tipo de mapa base: `dark`, `light`, `satellite`, `lines`.
- `CapaMetrica` - Métrica de capa coroplética: `partido_dominante`, `participacion`, `abstencionismo`, `margen_victoria`, `potencial_censo`, `cobertura_testigos`.
- `NivelTerritorial` - Nivel territorial: `nacional`, `departamental`, `municipal`, `puesto`.
- `ModoActivo` - Módulo activo de la aplicación.
- `IntencionVoto` - Intención de voto: `voto_duro`, `voto_blando`, `indeciso`, `opositor`.
- `EstadoTestigo` - Estado de testigo: `confirmado`, `pendiente`, `ausente`.
- `RolTestigo` - Rol de testigo: `testigo_mesa`, `coordinador_puesto`, `abogado_escrutinio`, `remanente`.
- `HistoricoEleccion` - Histórico electoral con votos por partido.
- Subdirectories: ninguno (directorio hoja)

## Invariants
- `rol` debe ser uno de los valores del ENUM `actor_role` en PostgreSQL.
- `cargo` debe ser uno de: `presidente`, `gobernacion`, `alcalde`, `concejal`, `asamblea_departamental`, `diputado`, `senador`, `representante`.
- `numeroTarjeton` es obligatorio para `concejal` y `asamblea_departamental`.
- `numeroLista` es obligatorio para `concejal` y `asamblea_departamental`.
- `tipo` de alerta debe ser uno de: `nulos_anormales`, `censo_excedido`, `discrepancia_urna`, `testigo_ausente`.
- `severidad` de alerta debe ser uno de: `alta`, `media`, `baja`.

## Side Effects
- Ningún efecto de runtime. Tipos solo para tiempo de compilación TypeScript.

## Verification
- Run: `tsc --noEmit`