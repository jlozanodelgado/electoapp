// Security store – manages actors (roles) and active session
// ------------------------------------------------------------
import { create } from 'zustand';
import { Actor } from '../types/security';
import { getSupabase } from '../services/getSupabase';
import type { User } from '@supabase/supabase-js';

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
    set({ actors: (data as Actor[]) ?? [] });
  },
  createActor: async (actor) => {
    const { error } = await getSupabase().from('actors').insert(actor);
    if (error) console.warn('Create actor error', error);
    // Refresh list
    const { data } = await getSupabase().from('actors').select('*');
    set({ actors: (data as Actor[]) ?? [] });
  },
  updateActor: async (id, updates) => {
    const { error } = await getSupabase().from('actors').update(updates).eq('id', id);
    if (error) console.warn('Update actor error', error);
    const { data } = await getSupabase().from('actors').select('*');
    set({ actors: (data as Actor[]) ?? [] });
  },
  deleteActor: async (id) => {
    const { error } = await getSupabase().from('actors').delete().eq('id', id);
    if (error) console.warn('Delete actor error', error);
    const { data } = await getSupabase().from('actors').select('*');
    set({ actors: (data as Actor[]) ?? [] });
  },
  currentActor: () => {
    const { actors, currentActorId } = get();
    return actors.find((a) => a.id === currentActorId);
  },
  setCurrentActor: (id) => set({ currentActorId: id }),
  login: async (email, password) => {
    const { data: { user }, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) {
      console.warn('Login failed', error);
      return null;
    }
    // fetch associated actor
    const { data: actorData, error: actorErr } = await getSupabase()
      .from('actors')
      .select('*')
      .eq('user_id', user!.id)
      .single();
    if (!actorErr && actorData) {
      set({ currentActorId: (actorData as Actor).id });
    }
    return user;
  },
  registerUser: async (email, password, role) => {
    const { data: { user }, error } = await getSupabase().auth.signUp({ email, password });
    if (error) throw error;
    const nombre = email.split('@')[0];
    const actor: Omit<Actor, 'id'> = { nombre, role, user_id: user!.id } as any;
    const { error: actErr } = await getSupabase().from('actors').insert(actor);
    if (actErr) console.warn('Actor insert after registration failed', actErr);
    // Refresh actors list
    const { data } = await getSupabase().from('actors').select('*');
    set({ actors: (data as Actor[]) ?? [] });
    return user!;
  },
  exportAll: async () => {
    // Direct fetch of all relevant tables (fallback implementation)
    const [{ data: actores }, { data: puestos }, { data: testigos }, { data: votantes }, { data: actas }, { data: alertas }, { data: usuarios }] = await Promise.all([
      getSupabase().from('actors').select('*'),
      getSupabase().from('puestos').select('*'),
      getSupabase().from('testigos').select('*'),
      getSupabase().from('votantes').select('*'),
      getSupabase().from('actas').select('*'),
      getSupabase().from('alertas').select('*'),
      getSupabase().from('users').select('*'),
    ]);
    const full = {
      actors: actores,
      puestos,
      testigos,
      votantes,
      actas,
      alertas,
      users: usuarios,
    };
    return JSON.stringify(full, null, 2);
  },
}));
