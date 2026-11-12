# Layout

## Overview
Componentes de maquetación y navegación de la aplicación. Incluye la barra de navegación superior (Navbar), la barra lateral (Sidebar) con navegación por módulos y el selector territorial (TerritorialSelector) para filtrar por departamento, municipio y zona.

## Interface
- `Navbar` - Barra superior con logo, selector territorial, KPIs de cobertura, indicador Día D y botón de alertas de fraude.
- `Sidebar` - Barra lateral colapsable con navegación por módulos (mapa, campaña, candidatos, preparación, día_d, ejecutivo). Filtra módulos según el rol del actor (testigo, líder, supervisor).
- `TerritorialSelector` - Selector jerárquico de departamento → municipio → zona → puesto de votación.
- Subdirectories: ninguno (directorio hoja)

## Invariants
- El `moduloActivo` debe ser uno de: `mapa`, `campana`, `candidatos`, `preparacion`, `dia_d`, `ejecutivo`, `territorio`.
- Los testigos solo ven módulos `mapa` y `dia_d`.
- Los líderes no ven el módulo `ejecutivo`.
- Los supervisores totales y de candidato ven todos los módulos.

## Side Effects
- Lee/escribe `moduloActivo`, `departamentoId`, `municipioId`, `zona` del electoral store.
- Llama a `reiniciarDatos()` para restablecer datos de prueba.
- Llama a `toggleSimulacionDiaD()` para activar/desactivar simulación en vivo.

## Verification
- Run: `tsc --noEmit` y `vite build`