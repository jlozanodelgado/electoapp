import {
  PuestoVotacion,
  TestigoElectoral,
  VotanteCRM,
  ActaE14,
  AlertaFraude,
  Partido,
  Candidato,
  Actor,
  Departamento,
  Municipio,
  Zona,
} from '../types/electoral';
import {
  PUESTOS_VOTACION,
  TESTIGOS_INICIALES,
  VOTANTES_INICIALES,
  ACTAS_E14_INICIALES,
  ALERTAS_FRAUDE_INICIALES,
  DEPARTAMENTOS,
  MUNICIPIOS,
} from '../data/mockElectoralData';
import { generateUuid } from '../utils/uuid';

const STORAGE_KEYS = {
  PUESTOS: 'electoapp_tulua_puestos_v1',
  TESTIGOS: 'electoapp_tulua_testigos_v1',
  VOTANTES: 'electoapp_tulua_votantes_v1',
  ACTAS: 'electoapp_tulua_actas_v1',
  ALERTAS: 'electoapp_tulua_alertas_v1',
  PARTIDOS: 'electoapp_tulua_partidos_v1',
  CANDIDATOS: 'electoapp_tulua_candidatos_v1',
};

const ACTORS_KEY = 'electoapp_actors_v1';

const USERS_KEY = 'electoapp_users_v1';

export interface User {
  id: string;
  username: string;
  password: string;
  role: 'totalSupervisor' | 'candidateSupervisor' | 'leader' | 'witness' | 'voter';
}

// Helper to fetch all users from localStorage
function getStoredUsers(): User[] {
  try {
    const saved = localStorage.getItem(USERS_KEY);
    if (saved) return JSON.parse(saved) as User[];
  } catch (e) {
    console.warn('LocalStorage read error for users', e);
  }
  return [];
}

// Simple auth check – returns the user object if credentials match
async function findUser(username: string): Promise<User | null> {
  const list = getStoredUsers();
  const user = list.find(u => u.username === username);
  return user ?? null;
}

class SupabasePostGISMockService {
  // Generic localStorage helpers
  private getStorage<T>(key: string, defaultData: T): T {
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved) as T;
    } catch (e) {
      console.warn('LocalStorage read error for', key, e);
    }
    return defaultData;
  }

  private setStorage<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage write error for', key, e);
    }
  }

  /**
   * Descarta registros antiguos cuyos IDs no son UUID (por ejemplo
   * `partido-123...`), ya que PostgreSQL los rechaza en columnas UUID.
   */
  private isUuid(value: unknown): boolean {
    return (
      typeof value === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    );
  }

  // Users – authentication mock
  getUsers(): User[] {
    return getStoredUsers();
  }

  registerUser(username: string, password: string, role: User['role']): User {
    const list = getStoredUsers();
    if (list.some(u => u.username === username)) {
      throw new Error('Username already exists');
    }
    const newUser: User = { id: `user-${Date.now()}`, username, password, role };
    const updated = [newUser, ...list];
    localStorage.setItem(USERS_KEY, JSON.stringify(updated));
    return newUser;
  }

  async login(username: string, password: string): Promise<User | null> {
    const user = await findUser(username);
    if (user && user.password === password) {
      return user;
    }
    return null;
  }

  // ---------------------------------------------------------------------
  // Puestos (voting places)
  // ---------------------------------------------------------------------
  getPuestos(): PuestoVotacion[] {
    return this.getStorage(STORAGE_KEYS.PUESTOS, PUESTOS_VOTACION);
  }

  updatePuesto(id: string, updates: Partial<PuestoVotacion>): PuestoVotacion[] {
    const updated = this.getPuestos().map(p => (p.id === id ? { ...p, ...updates } : p));
    this.setStorage(STORAGE_KEYS.PUESTOS, updated);
    return updated;
  }

  // ---------------------------------------------------------------------
  // Testigos (electoral witnesses)
  // ---------------------------------------------------------------------
  getTestigos(): TestigoElectoral[] {
    return this.getStorage(STORAGE_KEYS.TESTIGOS, TESTIGOS_INICIALES);
  }

  addTestigo(testigo: Omit<TestigoElectoral, 'id'>): TestigoElectoral {
    const list = this.getTestigos();
    const nuevo: TestigoElectoral = { ...testigo, id: `testigo-${Date.now()}` };
    list.unshift(nuevo);
    this.setStorage(STORAGE_KEYS.TESTIGOS, list);
    return nuevo;
  }

  updateTestigo(id: string, updates: Partial<TestigoElectoral>): TestigoElectoral[] {
    const updated = this.getTestigos().map(t => (t.id === id ? { ...t, ...updates } : t));
    this.setStorage(STORAGE_KEYS.TESTIGOS, updated);
    return updated;
  }

  // ---------------------------------------------------------------------
  // Votantes (CRM voters)
  // ---------------------------------------------------------------------
  getVotantes(): VotanteCRM[] {
    return this.getStorage(STORAGE_KEYS.VOTANTES, VOTANTES_INICIALES);
  }

  addVotante(votante: Omit<VotanteCRM, 'id'>): VotanteCRM {
    const list = this.getVotantes();
    const nuevo: VotanteCRM = { ...votante, id: `votante-${Date.now()}` };
    list.unshift(nuevo);
    this.setStorage(STORAGE_KEYS.VOTANTES, list);
    return nuevo;
  }

  updateVotante(id: string, updates: Partial<VotanteCRM>): VotanteCRM[] {
    const updated = this.getVotantes().map(v => (v.id === id ? { ...v, ...updates } : v));
    this.setStorage(STORAGE_KEYS.VOTANTES, updated);
    return updated;
  }

  // ---------------------------------------------------------------------
  // Actas E14 (electoral act records)
  // ---------------------------------------------------------------------
  getActasE14(): ActaE14[] {
    return this.getStorage(STORAGE_KEYS.ACTAS, ACTAS_E14_INICIALES);
  }

  addActaE14(acta: Omit<ActaE14, 'id'>): ActaE14 {
    const list = this.getActasE14();
    const nuevo: ActaE14 = { ...acta, id: `acta-e14-${Date.now()}` };
    list.unshift(nuevo);
    this.setStorage(STORAGE_KEYS.ACTAS, list);
    return nuevo;
  }

  updateActaE14(id: string, updates: Partial<ActaE14>): ActaE14[] {
    const updated = this.getActasE14().map(a => (a.id === id ? { ...a, ...updates } : a));
    this.setStorage(STORAGE_KEYS.ACTAS, updated);
    return updated;
  }

  // ---------------------------------------------------------------------
  // Alertas de fraude
  // ---------------------------------------------------------------------
  getAlertas(): AlertaFraude[] {
    return this.getStorage(STORAGE_KEYS.ALERTAS, ALERTAS_FRAUDE_INICIALES);
  }

  addAlertaFraude(alerta: Omit<AlertaFraude, 'id'>): AlertaFraude {
    const list = this.getAlertas();
    const nuevo: AlertaFraude = { ...alerta, id: `alerta-${Date.now()}` };
    list.unshift(nuevo);
    this.setStorage(STORAGE_KEYS.ALERTAS, list);
    return nuevo;
  }

  resolverAlerta(id: string, metadata?: { leaderId?: string }): AlertaFraude[] {
    const updated = this.getAlertas().map(a => (a.id === id ? { ...a, resuelta: true } : a));
    this.setStorage(STORAGE_KEYS.ALERTAS, updated);
    return updated;
  }

  // ---------------------------------------------------------------------
  // Seguridad: actores (supervisores, líderes, etc.)
  // ---------------------------------------------------------------------
  getActors(): any[] {
    try {
      const saved = localStorage.getItem(ACTORS_KEY);
      if (saved) {
        const list = JSON.parse(saved) as any[];
        return list.filter(a => this.isUuid(a?.id));
      }
    } catch (e) {
      console.warn('LocalStorage error for actors', e);
    }
    return [];
  }

  createActor(actor: any): any[] {
    const list = this.getActors();
    const nuevo = { ...actor, id: actor.id ?? generateUuid() };
    list.unshift(nuevo);
    this.setStorage(ACTORS_KEY, list);
    return list;
  }

  updateActor(id: string, updates: any): any[] {
    const updated = this.getActors().map(a => (a.id === id ? { ...a, ...updates } : a));
    this.setStorage(ACTORS_KEY, updated);
    return updated;
  }

  deleteActor(id: string): any[] {
    const filtered = this.getActors().filter(a => a.id !== id);
    this.setStorage(ACTORS_KEY, filtered);
    return filtered;
  }

  addActor(actor: Actor): Actor {
    const list = this.getActors();
    const nuevo = { ...actor, id: actor.id ?? generateUuid() };
    list.unshift(nuevo);
    this.setStorage(ACTORS_KEY, list);
    return nuevo;
  }

  updateActorRole(id: string, updates: Partial<Actor>): Actor[] {
    const updated = this.getActors().map(a => (a.id === id ? { ...a, ...updates } : a));
    this.setStorage(ACTORS_KEY, updated);
    return updated;
  }

  // Departamentos y Municipios
  getDepartamentos(): Departamento[] {
    return DEPARTAMENTOS;
  }

  getMunicipios(): Municipio[] {
    return MUNICIPIOS;
  }

  getZonas(): Zona[] {
    return [];
  }

  // Partidos
  getPartidos(): Partido[] {
    return this.getStorage<Partido[]>(STORAGE_KEYS.PARTIDOS, []).filter(p => this.isUuid(p.id));
  }

  addPartido(partido: Partido): Partido {
    const list = this.getPartidos();
    const nuevo = { ...partido, id: partido.id ?? generateUuid() };
    list.unshift(nuevo);
    this.setStorage(STORAGE_KEYS.PARTIDOS, list);
    return nuevo;
  }

  updatePartido(id: string, updates: Partial<Partido>): Partido | null {
    const list = this.getPartidos();
    const actual = list.find(p => p.id === id);
    if (!actual) return null;
    const actualizado = { ...actual, ...updates, id };
    this.setStorage(STORAGE_KEYS.PARTIDOS, list.map(p => (p.id === id ? actualizado : p)));
    return actualizado;
  }

  // Candidatos
  getCandidatos(): Candidato[] {
    return this.getStorage<Candidato[]>(STORAGE_KEYS.CANDIDATOS, []).filter(c => this.isUuid(c.id));
  }

  addCandidato(candidato: Candidato): Candidato {
    const list = this.getCandidatos();
    const nuevo = { ...candidato, id: candidato.id ?? generateUuid() };
    list.unshift(nuevo);
    this.setStorage(STORAGE_KEYS.CANDIDATOS, list);
    return nuevo;
  }

  updateCandidato(id: string, updates: Partial<Candidato>): Candidato | null {
    const list = this.getCandidatos();
    const actual = list.find(c => c.id === id);
    if (!actual) return null;
    const actualizado = { ...actual, ...updates, id };
    this.setStorage(STORAGE_KEYS.CANDIDATOS, list.map(c => (c.id === id ? actualizado : c)));
    return actualizado;
  }

  // ---------------------------------------------------------------------
  // PostGIS simulation (ST_DWithin)
  // ---------------------------------------------------------------------
  postgisST_DWithin(centerLat: number, centerLng: number, radiusKm: number): PuestoVotacion[] {
    const puestos = this.getPuestos();
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    return puestos.filter(p => {
      const dLat = toRad(p.lat - centerLat);
      const dLng = toRad(p.lng - centerLng);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(centerLat)) *
          Math.cos(toRad(p.lat)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      return distance <= radiusKm;
    });
  }

  // ---------------------------------------------------------------------
  // Reset helpers
  // ---------------------------------------------------------------------
  resetToDefaults(): void {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    localStorage.removeItem(ACTORS_KEY);
  }

  // ---------------------------------------------------------------------
  // Export all data – returns a pretty‑printed JSON string
  // ---------------------------------------------------------------------
  exportAll(): string {
    const data = {
      puestos: this.getPuestos(),
      testigos: this.getTestigos(),
      votantes: this.getVotantes(),
      actas: this.getActasE14(),
      alertas: this.getAlertas(),
      partidos: this.getPartidos(),
      candidatos: this.getCandidatos(),
      actors: this.getActors(),
      users: this.getUsers(),
    };
    return JSON.stringify(data, null, 2);
  }
}

// Export singleton
export const supabaseMock = new SupabasePostGISMockService();
