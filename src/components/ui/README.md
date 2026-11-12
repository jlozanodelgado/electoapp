# UI Components

## Overview
Componentes de interfaz de usuario reutilizables (shadcn/ui style). Tarjetas, botones, insignias, avatares de candidato y contenedor de toasts.

## Interface
- `Card` - Contenedor con borde sombreado para agrupar contenido.
- `Button` - Botón con variantes (primary, secondary, outline, danger).
- `Badge` - Insignia de estado con variantes de color (emerald, blue, rose, amber, purple).
- `CandidatoAvatar` - Avatar circular de candidato con foto URL o silueta de respaldo (ícono de usuario).
- `ToastContainer` - Contenedor de notificaciones toast flotantes.
- Subdirectories: ninguno (directorio hoja)

## Invariants
- `CandidatoAvatar` muestra la imagen de `fotoUrl` si existe, de lo contrario muestra un ícono de usuario gris.
- Las badges usan colores semánticos: emerald (éxito), blue (información), rose (error/alerta), amber (advertencia), purple (neutro).

## Side Effects
- Ningún efecto de red o base de datos. Componentes puramente de presentación.
- `ToastContainer` muestra notificaciones temporales que se auto-eliminan después de 5 segundos.

## Verification
- Run: `tsc --noEmit` y `vite build`