# Utils

## Overview>
Utilidades geoespaciales y funciones de ayuda para el sistema electoral.

## Interface
- `isPointInPolygon` - Función para determinar si un punto está dentro de un polígono (usado para consultas geoespaciales).
- Subdirectories: ninguno (directorio hoja)

## Invariants
- Las coordenadas deben estar en formato [lat, lng] (WGS 84).
- Los polígonos deben estar cerrados (primer y último punto iguales).

## Side Effects
- Ningún efecto de red. Funciones puras de cálculo geométrico.

## Verification
- Run: `tsc --noEmit` y `vite build`