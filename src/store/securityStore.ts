// Security store – manages actors (roles) and active session
// ------------------------------------------------------------
import { create } from 'zustand';
import { Actor, ScopeLevel } from '../types/security';
import { getSupabase } from '../services/getSupabase';
import type { User } from '@supabase/supabase-js';

// Helper to normalize an actor coming from PostgreSQL
function normalizeActor(raw: any): Actor {
  const rawRol = String(raw.rol || raw.role || '').toLowerCase();
  
  let role: Actor['role'] = 'voter';
  if (rawRol.includes('supervisor_total') || rawRol.includes('totalsupervisor') || raw.nivel === 0) {
    role = 'totalSupervisor';
  } else if (rawRol.includes('supervisor_candidato') || rawRol.includes('candidatesupervisor') || raw.nivel === 1) {
    role = 'candidateSupervisor';
  } else if (rawRol.includes('lider') || rawRol.includes('leader') || raw.nivel === 2) {
    role = 'leader';
  } else if (rawRol.includes('testigo') || rawRol.includes('witness') || raw.nivel === 3) {
    role = 'witness';
  } else {
    role = 'voter';
  }

  return {
    ...raw,
    role,
    candidatoId: raw.candidatoId ?? raw.candidato_id,
    scopeLevel: raw.scopeLevel ?? raw.scope_level,
    scopeId: raw.scopeId ?? raw.scope_id,
    leaderId: raw.leaderId ?? raw.leader_id,
    user_id: raw.user_id,
  } as Actor;
}

export interface RegisterUserData {
  email: string;
  password?: string;
  nombre: string;
  role: Actor['role'];
  scopeLevel?: ScopeLevel;
  scopeId?: string;
  candidatoId?: string;
  leaderId?: string;
}

interface SecurityState {
  actors: Actor[];
  currentActorId: string | null;
  // Load actors from Supabase
  loadActors: () => Promise<void>;
  // CRUD helpers delegating to Supabase
  createActor: (actor: Omit<Actor, 'id'>) => Promise<Actor>;
  updateActor: (id: string, updates: Partial<Actor>) => Promise<void>;
  deleteActor: (id: string) => Promise<void>;
  // Convenience getters
  currentActor: () => Actor | undefined;
  setCurrentActor: (id: string | null) => void;
  // Authentication & Actor creation
  login: (email: string, password: string) => Promise<User | null>;
  registerUser: (data: RegisterUserData) => Promise<{ user?: User; actor: Actor }>;
  // Export all data as JSON string (async)
  exportAll: () => Promise<string>;
}

export const useSecurityStore = create<SecurityState>((set, get) => ({
  actors: [],
  currentActorId: null,
  loadActors: async () => {
    const { data, error } = await getSupabase().from('actors').select('*');
    if (error) {
      console.warn('Failed to load actors', error);
      return;
    }
    const normalized = (data || []).map(normalizeActor);
    set({ actors: normalized });
  },
  createActor: async (actor) => {
    const nivel =
      actor.role === 'totalSupervisor'
        ? 0
        : actor.role === 'candidateSupervisor'
        ? 1
        : actor.role === 'leader'
        ? 2
        : actor.role === 'witness'
        ? 3
        : 4;

    // En la base de datos se almacena en el formato que espera el enum
    const rolDb =
      actor.role === 'totalSupervisor'
        ? 'supervisor_total'
        : actor.role === 'candidateSupervisor'
        ? 'supervisor_candidato'
        : actor.role === 'leader'
        ? 'lider'
        : actor.role === 'witness'
        ? 'testigo'
        : 'votante';

    const dbPayload = {
      nombre: actor.nombre,
      rol: rolDb,
      nivel,
      user_id: actor.user_id || null,
      scope_level: actor.scopeLevel || null,
      scope_id: actor.scopeId || null,
      candidato_id: actor.candidatoId || null,
      leader_id: actor.leaderId || null,
      territorio: actor.scopeId ? { scopeLevel: actor.scopeLevel, scopeId: actor.scopeId } : null,
    };

    const { data, error } = await getSupabase()
      .from('actors')
      .insert(dbPayload)
      .select('*')
      .single();

    if (error) {
      console.error('Error insertando actor en Supabase:', error);
      throw error;
    }

    const newActor = normalizeActor(data);
    set({ actors: [newActor, ...get().actors.filter(a => a.id !== newActor.id)] });
    return newActor;
  },
  updateActor: async (id, updates) => {
    const { error } = await getSupabase().from('actors').update(updates).eq('id', id);
    if (error) console.warn('Update actor error', error);
    const { data } = await getSupabase().from('actors').select('*');
    set({ actors: (data || []).map(normalizeActor) });
  },
  deleteActor: async (id) => {
    const { error } = await getSupabase().from('actors').delete().eq('id', id);
    if (error) console.warn('Delete actor error', error);
    const { data } = await getSupabase().from('actors').select('*');
    set({ actors: (data || []).map(normalizeActor) });
  },
  currentActor: () => {
    const { actors, currentActorId } = get();
    return actors.find((a) => a.id === currentActorId);
  },
  setCurrentActor: (id) => set({ currentActorId: id }),
  login: async (email, password) => {
    const { data: { user }, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) {
      console.warn('[ElectoApp] Login failed', error);
      return null;
    }

    console.log('[ElectoApp] Auth OK – user id:', user!.id, 'email:', user!.email);
    const nombre = (user!.user_metadata?.full_name as string) || email.split('@')[0];

    // 1) Buscar actor vinculado por user_id
    const { data: actorByUserId, error: err1 } = await getSupabase()
      .from('actors')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (!err1 && actorByUserId) {
      const actor = normalizeActor(actorByUserId);
      set({
        currentActorId: actor.id,
        actors: [actor, ...get().actors.filter(a => a.id !== actor.id)],
      });
      return user;
    }

    // 2) Buscar por nombre si no tiene user_id asignado aún
    const { data: actorByName, error: err2 } = await getSupabase()
      .from('actors')
      .select('*')
      .ilike('nombre', `%${nombre}%`)
      .maybeSingle();

    if (!err2 && actorByName) {
      const actor = normalizeActor(actorByName);
      await getSupabase().from('actors').update({ user_id: user!.id }).eq('id', actor.id);
      actor.user_id = user!.id;
      set({
        currentActorId: actor.id,
        actors: [actor, ...get().actors.filter(a => a.id !== actor.id)],
      });
      return user;
    }

    // 3) Si hay actores, tomar el de mayor jerarquía disponible para el primer admin
    const { data: allActors, error: err3 } = await getSupabase()
      .from('actors')
      .select('*');

    if (!err3 && allActors && allActors.length > 0) {
      const supervisorActor =
        allActors.find((a: any) => String(a.rol).toLowerCase().includes('super') || a.nivel === 0) ||
        allActors[0];

      const actor = normalizeActor(supervisorActor);
      await getSupabase().from('actors').update({ user_id: user!.id }).eq('id', actor.id);
      actor.user_id = user!.id;

      set({
        currentActorId: actor.id,
        actors: allActors.map(normalizeActor),
      });
      return user;
    }

    // 4) Si no existe ninguno, crear el primer totalSupervisor en la BD
    try {
      const created = await get().createActor({
        nombre,
        role: 'totalSupervisor',
        scopeLevel: 'national',
        user_id: user!.id,
      });
      set({ currentActorId: created.id });
    } catch {
      // Fallback local en memoria
      const tempActor: Actor = {
        id: `temp-${user!.id}`,
        nombre,
        role: 'totalSupervisor',
        user_id: user!.id,
        scopeLevel: 'national',
      } as Actor;
      set({
        currentActorId: tempActor.id,
        actors: [tempActor, ...get().actors],
      });
    }

    return user;
  },
  registerUser: async (data: RegisterUserData) => {
    let createdAuthUser: User | undefined = undefined;

    // 1. Crear el usuario en auth.users si se provee contraseña
    if (data.password) {
      const { data: authData, error: authError } = await getSupabase().auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.nombre,
            role: data.role,
          },
        },
      });

      if (authError) {
        console.error('Error creando usuario en auth.users:', authError);
        throw authError;
      }

      if (authData?.user) {
        createdAuthUser = authData.user;
      }
    }

    // 2. Insertar en la tabla public.actors asegurando user_id = auth.users.id
    const actorToInsert: Omit<Actor, 'id'> = {
      nombre: data.nombre,
      role: data.role,
      scopeLevel: data.scopeLevel,
      scopeId: data.scopeId,
      candidatoId: data.candidatoId,
      leaderId: data.leaderId,
      user_id: createdAuthUser?.id,
    };

    const createdActor = await get().createActor(actorToInsert);

    return {
      user: createdAuthUser,
      actor: createdActor,
    };
  },
  exportAll: async () => {
    const [{ data: actores }, { data: puestos }, { data: testigos }, { data: votantes }, { data: actas }, { data: alertas }] = await Promise.all([
      getSupabase().from('actors').select('*'),
      getSupabase().from('puestos_votacion').select('*'),
      getSupabase().from('testigos_electorales').select('*'),
      getSupabase().from('votantes_crm').select('*'),
      getSupabase().from('actas_e14').select('*'),
      getSupabase().from('alertas_fraude').select('*'),
    ]);
    const full = {
      actors: actores,
      puestos_votacion: puestos,
      testigos_electorales: testigos,
      votantes_crm: votantes,
      actas_e14: actas,
      alertas_fraude: alertas,
    };
    return JSON.stringify(full, null, 2);
  },
}));
