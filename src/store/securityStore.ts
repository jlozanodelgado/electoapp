// Security store – manages actors (roles) and active session
// ------------------------------------------------------------
import { create } from 'zustand';
import { Actor } from '../types/security';
import { supabaseMock } from '../services/supabaseMock';

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

export const useSecurityStore = create<SecurityState>((set, get) => ({
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

