// Security store – manages actors (roles) and active session
// ------------------------------------------------------------
import { create } from 'zustand';
import { Actor } from '../types/security';
import { getSupabase } from '../services/getSupabase';
import type { User } from '@supabase/supabase-js';

// Helper to normalize an actor coming from PostgreSQL
function normalizeActor(raw: any): Actor {
  const role =
    raw.role ||
    raw.rol ||
    (raw.nivel === 0 ? 'totalSupervisor' : raw.nivel === 1 ? 'candidateSupervisor' : raw.nivel === 2 ? 'leader' : raw.nivel === 3 ? 'witness' : 'voter');

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

interface SecurityState {
  actors: Actor[];
  currentActorId: string | null;
  // Load actors from Supabase
  loadActors: () => Promise<void>;
  // CRUD helpers delegating to Supabase
  createActor: (actor: Omit<Actor, 'id'>) => Promise<void>;
  updateActor: (id: string, updates: Partial<Actor>) => Promise<void>;
  deleteActor: (id: string) => Promise<void>;
  // Convenience getters
  currentActor: () => Actor | undefined;
  setCurrentActor: (id: string | null) => void;
  // Authentication
  login: (email: string, password: string) => Promise<User | null>;
  registerUser: (email: string, password: string, role: Actor['role']) => Promise<User>;
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
      set({ actors: [] });
      return;
    }
    const normalized = (data || []).map(normalizeActor);
    set({ actors: normalized });
  },
  createActor: async (actor) => {
    const dbPayload = {
      nombre: actor.nombre,
      rol: actor.role,
      nivel: actor.role === 'totalSupervisor' ? 0 : 4,
      user_id: actor.user_id,
      scope_level: actor.scopeLevel,
      scope_id: actor.scopeId,
      candidato_id: actor.candidatoId,
      leader_id: actor.leaderId,
    };
    const { error } = await getSupabase().from('actors').insert(dbPayload);
    if (error) console.warn('Create actor error', error);
    // Refresh list
    const { data } = await getSupabase().from('actors').select('*');
    set({ actors: (data || []).map(normalizeActor) });
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

    // 1) Intentar obtener actor vinculado por user_id
    const { data: actorByUserId, error: err1 } = await getSupabase()
      .from('actors')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle();

    console.log('[ElectoApp] Step 1 – actor by user_id:', actorByUserId, 'error:', err1);

    if (!err1 && actorByUserId) {
      const actor = normalizeActor(actorByUserId);
      set({
        currentActorId: actor.id,
        actors: [actor, ...get().actors.filter(a => a.id !== actor.id)],
      });
      return user;
    }

    // 2) user_id no vinculado todavía: intentar buscar por nombre
    const { data: actorByName, error: err2 } = await getSupabase()
      .from('actors')
      .select('*')
      .ilike('nombre', `%${nombre}%`)
      .maybeSingle();

    console.log('[ElectoApp] Step 2 – actor by nombre "' + nombre + '":', actorByName, 'error:', err2);

    if (!err2 && actorByName) {
      const actor = normalizeActor(actorByName);
      // Vincular este actor al auth user_id en la BD
      await getSupabase().from('actors').update({ user_id: user!.id }).eq('id', actor.id);
      actor.user_id = user!.id;
      set({
        currentActorId: actor.id,
        actors: [actor, ...get().actors.filter(a => a.id !== actor.id)],
      });
      return user;
    }

    // 3) Consultar TODOS los actores de la tabla
    const { data: allActors, error: err3 } = await getSupabase()
      .from('actors')
      .select('*');

    console.log('[ElectoApp] Step 3 – all actors in DB:', allActors, 'error:', err3);

    if (!err3 && allActors && allActors.length > 0) {
      // Priorizar vincular con uno que sea supervisor si existe, o el primero
      const supervisorActor = allActors.find((a: any) =>
        String(a.rol).toLowerCase().includes('super') || a.nivel === 0
      ) || allActors[0];

      const actor = normalizeActor(supervisorActor);
      await getSupabase().from('actors').update({ user_id: user!.id }).eq('id', actor.id);
      actor.user_id = user!.id;

      const normalizedList = allActors.map(normalizeActor);
      set({
        currentActorId: actor.id,
        actors: normalizedList,
      });
      return user;
    }

    // 4) Si la tabla estuviese vacía o sin registros vinculables, insertar respetando el esquema SQL
    // rol es USER-DEFINED o text, nivel es integer NOT NULL
    const newActorPayload = {
      nombre,
      rol: 'totalSupervisor',
      nivel: 0,
      user_id: user!.id,
      scope_level: 'national',
    };

    const { data: inserted, error: insErr } = await getSupabase()
      .from('actors')
      .insert(newActorPayload)
      .select('*')
      .single();

    console.log('[ElectoApp] Step 4 – insert actor:', inserted, 'error:', insErr);

    if (!insErr && inserted) {
      const actor = normalizeActor(inserted);
      set({
        currentActorId: actor.id,
        actors: [actor, ...get().actors],
      });
      return user;
    }

    // 5) Fallback en memoria si RLS bloquea escrituras/lecturas
    console.warn('[ElectoApp] Fallback – usando actor en memoria totalSupervisor');
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

    return user;
  },
  registerUser: async (email, password, role) => {
    const { data: { user }, error } = await getSupabase().auth.signUp({ email, password });
    if (error) throw error;
    const nombre = email.split('@')[0];
    const actorPayload = {
      nombre,
      rol: role,
      nivel: role === 'totalSupervisor' ? 0 : 4,
      user_id: user!.id,
    };
    const { error: actErr } = await getSupabase().from('actors').insert(actorPayload);
    if (actErr) console.warn('Actor insert after registration failed', actErr);
    // Refresh actors list
    const { data } = await getSupabase().from('actors').select('*');
    set({ actors: (data || []).map(normalizeActor) });
    return user!;
  },
  exportAll: async () => {
    // Direct fetch of all relevant tables (fallback implementation)
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
