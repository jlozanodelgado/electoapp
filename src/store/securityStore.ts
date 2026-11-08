// Security store – manages actors (roles) and active session
// ------------------------------------------------------------
import { create } from 'zustand';
import { Actor } from '../types/security';
import type { User } from '@supabase/supabase-js';

interface SecurityState {
  actors: Actor[];
  currentActorId: string | null;
  // Load actors from Supabase (or mock local storage)
  loadActors: () => Promise<void>;
  // CRUD helpers delegating to supabaseMock
  createActor: (actor: Omit<Actor, 'id'>) => Promise<void>;
  updateActor: (id: string, updates: Partial<Actor>) => Promise<void>;
  deleteActor: (id: string) => Promise<void>;
  // Convenience getters
  currentActor: () => Actor | undefined;
  setCurrentActor: (id: string | null) => void;
}

interface SecurityState {
  actors: Actor[];
  currentActorId: string | null;
  // Load actors from Supabase (or mock local storage)
  loadActors: () => Promise<void>;
  // CRUD helpers delegating to supabaseMock
  createActor: (actor: Omit<Actor, 'id'>) => Promise<void>;
  updateActor: (id: string, updates: Partial<Actor>) => Promise<void>;
  deleteActor: (id: string) => Promise<void>;
  // Convenience getters
  currentActor: () => Actor | undefined;
  setCurrentActor: (id: string | null) => void;
  // Authentication
  login: (username: string, password: string) => Promise<User | null>;
  registerUser: (username: string, password: string, role: User['role']) => Promise<User>;
  // Export all data as JSON string
  exportAll: () => string;
}

import { create } from 'zustand';
import { Actor } from '../types/security';
import { supabase } from '../services/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface SecurityState {
  actors: Actor[];
  currentActorId: string | null;
  // Load actors from Supabase (or mock local storage)
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
  // Export all data as JSON string (still using mock for other entities)
  exportAll: () => string;
}

export const useSecurityStore = create<SecurityState>((set, get) => ({
  actors: [],
  currentActorId: null,
  loadActors: async () => {
    const { data, error } = await supabase.from('actors').select('*');
    if (error) {
      console.warn('Failed to load actors', error);
      set({ actors: [] });
      return;
    }
    set({ actors: (data as Actor[]) ?? [] });
  },
  createActor: async (actor) => {
    const { error } = await supabase.from('actors').insert(actor);
    if (error) console.warn('Create actor error', error);
    // Refresh list
    const { data } = await supabase.from('actors').select('*');
    set({ actors: (data as Actor[]) ?? [] });
  },
  updateActor: async (id, updates) => {
    const { error } = await supabase.from('actors').update(updates).eq('id', id);
    if (error) console.warn('Update actor error', error);
    const { data } = await supabase.from('actors').select('*');
    set({ actors: (data as Actor[]) ?? [] });
  },
  deleteActor: async (id) => {
    const { error } = await supabase.from('actors').delete().eq('id', id);
    if (error) console.warn('Delete actor error', error);
    const { data } = await supabase.from('actors').select('*');
    set({ actors: (data as Actor[]) ?? [] });
  },
  currentActor: () => {
    const { actors, currentActorId } = get();
    return actors.find((a) => a.id === currentActorId);
  },
  setCurrentActor: (id) => set({ currentActorId: id }),
  // ---- Authentication helpers ----
  login: async (email, password) => {
    const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.warn('Login failed', error);
      return null;
    }
    // fetch associated actor
    const { data: actorData, error: actorErr } = await supabase
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
    const { data: { user }, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    // Insert a matching actor (nombre as part before @)
    const nombre = email.split('@')[0];
    const actor: Omit<Actor, 'id'> = {
      nombre,
      role,
      user_id: user!.id, // we will add this column to actors table
    } as any;
    // Insert actor record (ignore extra fields not defined)
    const { error: actErr } = await supabase.from('actors').insert(actor);
    if (actErr) console.warn('Actor insert after registration failed', actErr);
    // Refresh actors list
    const { data } = await supabase.from('actors').select('*');
    set({ actors: (data as Actor[]) ?? [] });
    return user!;
  },
  exportAll: async () => {
    // Try to call a Supabase RPC named `export_all` that returns a JSON string with all data.
    // The RPC must be created in Supabase (see instructions below).
    const { data, error } = await supabase.rpc('export_all');
    if (error) {
      console.warn('exportAll RPC failed, falling back to manual fetch', error);
      // Manual fallback: fetch each table and assemble JSON.
      const [{ data: actores }, { data: puestos }, { data: testigos }, { data: votantes }, { data: actas }, { data: alertas }, { data: usuarios }] = await Promise.all([
        supabase.from('actors').select('*'),
        supabase.from('puestos').select('*'),
        supabase.from('testigos').select('*'),
        supabase.from('votantes').select('*'),
        supabase.from('actas').select('*'),
        supabase.from('alertas').select('*'),
        supabase.from('users').select('*'),
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
    }
    // RPC should already return a JSON string.
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  },

    // Using the mock service would require importing it; for simplicity we return an empty string.
    console.warn('exportAll is not implemented for real Supabase yet');
    return '';
  },
}));

  actors: [],
  currentActorId: null,
  loadActors: async () => {
    const data = await supabaseMock.getActors();
    // If the table is empty we seed a few demo actors (total supervisor + a few candidates)
    if (Array.isArray(data) && data.length === 0) {
      const seed: Omit<Actor, 'id'>[] = [
        { nombre: 'Ana Gómez', role: 'totalSupervisor' },
        { nombre: 'Juan Pérez', role: 'candidateSupervisor', candidatoId: 'cand-nat-001', scopeLevel: 'national' },
        { nombre: 'María López', role: 'candidateSupervisor', candidatoId: 'cand-dep-001', scopeLevel: 'department', scopeId: 'valle' },
        { nombre: 'Luis García', role: 'candidateSupervisor', candidatoId: 'cand-mun-001', scopeLevel: 'municipality', scopeId: 'tulua' },
        { nombre: 'Pedro Silva', role: 'leader', candidatoId: 'cand-nat-001', scopeLevel: 'national' },
        { nombre: 'Catalina R.', role: 'witness', candidatoId: 'cand-nat-001', leaderId: 'leader-1' },
        { nombre: 'Andrés M.', role: 'voter', candidatoId: 'cand-nat-001', leaderId: 'leader-1' },
      ];
      for (const a of seed) {
        await supabaseMock.createActor(a);
      }
    }
    const refreshed = await supabaseMock.getActors();
    set({ actors: refreshed as Actor[] });
  },
  createActor: async (actor) => {
    await supabaseMock.createActor(actor);
    const refreshed = await supabaseMock.getActors();
    set({ actors: refreshed as Actor[] });
  },
  updateActor: async (id, updates) => {
    await supabaseMock.updateActor(id, updates);
    const refreshed = await supabaseMock.getActors();
    set({ actors: refreshed as Actor[] });
  },
  deleteActor: async (id) => {
    await supabaseMock.deleteActor(id);
    const refreshed = await supabaseMock.getActors();
    set({ actors: refreshed as Actor[] });
  },
  currentActor: () => {
    const { actors, currentActorId } = get();
    return actors.find((a) => a.id === currentActorId);
  },
  setCurrentActor: (id) => set({ currentActorId: id }),
  // ---- Authentication helpers ----
  login: async (username, password) => {
    const user = await supabaseMock.login(username, password);
    if (user) {
      // Find matching actor (by role) and set as currentActorId if exists
      const actor = get().actors.find((a) => a.role === user.role);
      if (actor) set({ currentActorId: actor.id });
    }
    return user;
  },
  registerUser: async (username, password, role) => {
    const newUser = supabaseMock.registerUser(username, password, role);
    // Automatically create a matching actor for the new user (no extra fields)
    await supabaseMock.createActor({ nombre: username, role } as any);
    // Refresh actors list
    const refreshed = await supabaseMock.getActors();
    set({ actors: refreshed as Actor[] });
    return newUser;
  },
  exportAll: () => supabaseMock.exportAll(),
}));

  actors: [],
  currentActorId: null,
  loadActors: async () => {
    const data = await supabaseMock.getActors();
    // If the table is empty we seed a few demo actors (total supervisor + a few candidates)
    if (Array.isArray(data) && data.length === 0) {
      const seed: Omit<Actor, 'id'>[] = [
        { nombre: 'Ana Gómez', role: 'totalSupervisor' },
        { nombre: 'Juan Pérez', role: 'candidateSupervisor', candidatoId: 'cand-nat-001', scopeLevel: 'national' },
        { nombre: 'María López', role: 'candidateSupervisor', candidatoId: 'cand-dep-001', scopeLevel: 'department', scopeId: 'valle' },
        { nombre: 'Luis García', role: 'candidateSupervisor', candidatoId: 'cand-mun-001', scopeLevel: 'municipality', scopeId: 'tulua' },
        { nombre: 'Pedro Silva', role: 'leader', candidatoId: 'cand-nat-001', scopeLevel: 'national' },
        { nombre: 'Catalina R.', role: 'witness', candidatoId: 'cand-nat-001', leaderId: 'leader-1' },
        { nombre: 'Andrés M.', role: 'voter', candidatoId: 'cand-nat-001', leaderId: 'leader-1' },
      ];
      for (const a of seed) {
        await supabaseMock.createActor(a);
      }
    }
    const refreshed = await supabaseMock.getActors();
    set({ actors: refreshed as Actor[] });
  },
  createActor: async (actor) => {
    await supabaseMock.createActor(actor);
    const refreshed = await supabaseMock.getActors();
    set({ actors: refreshed as Actor[] });
  },
  updateActor: async (id, updates) => {
    await supabaseMock.updateActor(id, updates);
    const refreshed = await supabaseMock.getActors();
    set({ actors: refreshed as Actor[] });
  },
  deleteActor: async (id) => {
    await supabaseMock.deleteActor(id);
    const refreshed = await supabaseMock.getActors();
    set({ actors: refreshed as Actor[] });
  },
  currentActor: () => {
    const { actors, currentActorId } = get();
    return actors.find((a) => a.id === currentActorId);
  },
  setCurrentActor: (id) => set({ currentActorId: id }),
}));

