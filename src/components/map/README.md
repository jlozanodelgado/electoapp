# Map

## Overview
Componente principal de mapa GIS interactivo usando Leaflet. Muestra capa base (OpenStreetMap), capa coroplética (departamentos/municipios), marcadores de puestos de votación, marcadores de votantes con coordenadas, heatmap y buffer de influencia.

## Interface
- `ElectoralMap` - Componente principal del mapa. Gestiona capas base (dark/light/satellite/lines), capa coroplética, marcadores de puestos, marcadores de votantes, heatmap y buffer de influencia.
- `MapControls` - Panel de controles: buscador de puestos, selector de métricas coropléticas, toggle heatmap, radio de influencia, selector de estilo basemap.
- `PuestoDrawer` - Panel lateral que se abre al seleccionar un puesto. Muestra métricas clave, histórico electoral, cobertura de testigos y acciones (asignar testigo, digitalizar E-14).
- Subdirectories: ninguno (directorio hoja)

## Invariants
- `tipoBasemap` debe ser uno de: `dark`, `light`, `satellite`, `lines`.
- `capaMetrica` debe ser uno de: `partido_dominante`, `participacion`, `abstencionismo`, `margen_victoria`, `potencial_censo`, `cobertura_testigos`.
- Los marcadores de votantes solo se muestran si `mostrarVotantesMapa` es `true`.
- Los puestos se filtran por departamento, municipio y zona seleccionados.

## Side Effects
- Inicializa una instancia de Leaflet `L.map` en el contenedor DOM.
- Crea y elimina capas de Leaflet (tileLayer, geoJSON, layerGroup, circle, circleMarker).
- Llama a `setSelectedPuestoId()` al hacer clic en un puesto.
- Llama a `setDepartamentoId()` / `setMunicipioId()` al hacer clic en una feature GeoJSON.

## Verification
- Run: `tsc --noEmit` y `vite build`