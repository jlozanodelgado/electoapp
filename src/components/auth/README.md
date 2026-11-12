# Auth

## Overview
Módulo de autenticación y registro de usuarios. Provee formularios para iniciar sesión y crear nuevos actores (usuarios) vinculados a Supabase Auth. Los roles soportados son: `totalSupervisor`, `candidateSupervisor`, `leader`, `witness`, `voter`.

## Interface
- `LoginForm` - Componente de formulario de inicio de sesión. Llama a `login()` del security store.
- `RegisterForm` - Componente de formulario de registro de nuevo actor. Llama a `registerUser()` del security store.
- Subdirectories: ninguno (directorio hoja)

## Invariants
- El campo `rol` debe ser uno de: `totalSupervisor`, `candidateSupervisor`, `leader`, `witness`, `voter`.
- El campo `email` debe ser un correo electrónico válido.
- El formulario de registro requiere nombre, email, contraseña y rol.

## Side Effects
- Llama a `supabase.auth.signInWithPassword()` para autenticación.
- Llama a `supabase.auth.signUp()` para creación de usuarios.
- Guarda `user_id` en la tabla `actors` vinculando el actor con Supabase Auth.
- Muestra toasts de error/sucesso en la UI.

## Verification
- Run: `tsc --noEmit` y `vite build`