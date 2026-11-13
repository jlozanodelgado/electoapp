import { create } from 'zustand';
import { 
  NivelTerritorial, 
  CapaMetrica, 
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
import { Toast, CuadranteTactico, TipoBasemap } from '../types/tactical';
import { isPointInPolygon } from '../utils/geoUtils';
import { SupabaseService } from '../services/supabaseService';
import { supabaseMock } from '../services/supabaseMock';

export type ModuloActivo = 'mapa' | 'campana' | 'candidatos' | 'preparacion' | 'dia_d' | 'ejecutivo' | 'territorio' | 'admin' | 'testigo_mobile' | 'coordinador_puesto';

interface ElectoralState {
  moduloActivo: ModuloActivo;
  nivelTerritorial: NivelTerritorial;
  departamentoId: string;
  municipioId: string;
  zona: string;
  
  // Capas y filtros del mapa
  tipoBasemap: TipoBasemap;
  capaMetrica: CapaMetrica;
  partidoFiltro: string;
  busquedaTexto: string;
  mostrarHeatmap: boolean;
  radioInfluenciaKm: number | null;
  centroRadio: [number, number] | null;

  // Cuadrantes y Dibujo de Polígonos
  cuadrantes: CuadranteTactico[];
  isDrawingPolygon: boolean;
  drawingPoints: [number, number][];

  // Selección
  selectedPuestoId: string | null;
  drawerAbierto: boolean;

  // Actor autenticado (para auditoría y RLS por filas propias)
  actorId: string | null;
  actorRole: string | null;
  setActorId: (id: string | null, role?: string | null) => void;

  // Control de visibilidad de votantes en el mapa
  mostrarVotantesMapa: boolean;
  setMostrarVotantesMapa: (visible: boolean) => void;

  // Estado de activación del Día D (solo totalSupervisor puede activarlo)
  diaDActivado: boolean;
  setDiaDActivado: (activado: boolean) => void;
  loadHierarchicalData: () => Promise<void>;

  // Colecciones de datos jerárquicos
  partidos: Partido[];
  candidatos: Candidato[];
  departamentos: Departamento[];
  municipios: Municipio[];
  zonas: Zona[];
  actors: Actor[];
  puestos: PuestoVotacion[];
  testigos: TestigoElectoral[];
  votantes: VotanteCRM[];
  actas: ActaE14[];
  alertas: AlertaFraude[];

  // Notificaciones Toast
  toasts: Toast[];

  // Modales
  isNewWitnessOpen: boolean;
  isNewVoterOpen: boolean;
  isNewPartidoOpen: boolean;
  isNewCandidatoOpen: boolean;
  isDigitalizeE14Open: boolean;
  isFraudModalOpen: boolean;
  alertaSeleccionada: AlertaFraude | null;

  // Edición de partidos y candidatos
  editingPartido: Partido | null;
  editingCandidato: Candidato | null;

  // Simulación en vivo Día D
  isSimulandoDiaD: boolean;
  diaDProgresoPct: number;

  // Acciones
  setModuloActivo: (modulo: ModuloActivo) => void;
  setNivelTerritorial: (nivel: NivelTerritorial) => void;
  setDepartamentoId: (depId: string) => void;
  setMunicipioId: (munId: string) => void;
  setZona: (zona: string) => void;
  setCapaMetrica: (capa: CapaMetrica) => void;
  setPartidoFiltro: (partido: string) => void;
  setBusquedaTexto: (busqueda: string) => void;
  setMostrarHeatmap: (mostrar: boolean) => void;
  setTipoBasemap: (tipo: TipoBasemap) => void;
  setRadioInfluencia: (km: number | null, centro?: [number, number] | null) => void;

  setSelectedPuestoId: (id: string | null) => void;
  setDrawerAbierto: (abierto: boolean) => void;

  // Modales
  setIsNewWitnessOpen: (open: boolean) => void;
  setIsNewVoterOpen: (open: boolean) => void;
  setIsNewPartidoOpen: (open: boolean) => void;
  setIsNewCandidatoOpen: (open: boolean) => void;
  setIsDigitalizeE14Open: (open: boolean) => void;
  setIsFraudModalOpen: (open: boolean, alerta?: AlertaFraude | null) => void;

  // Notificaciones
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;

  // Edición de partidos y candidatos
  addPartido: (partido: Omit<Partido, 'id' | 'creadoEn'>) => void;
  addCandidato: (candidato: Omit<Candidato, 'id' | 'creadoEn'>) => void;
  openEditPartido: (partido: Partido) => void;
  openEditCandidato: (candidato: Candidato) => void;
  updatePartido: (id: string, partido: Omit<Partido, 'id' | 'creadoEn'>) => Promise<Partido>;
  updateCandidato: (id: string, candidato: Omit<Candidato, 'id' | 'creadoEn'>) => Promise<Candidato>;

  // Edición de actores (desde securityStore)
  editingActor: Actor | null;
  setEditingActor: (actor: Actor | null) => void;

  // Edición de testigos y votantes
  editingTestigo: TestigoElectoral | null;
  editingVoter: VotanteCRM | null;
  setEditingTestigo: (testigo: TestigoElectoral | null) => void;
  setEditingVoter: (votante: VotanteCRM | null) => void;
  openEditTestigo: (testigo: TestigoElectoral) => void;
  openEditVoter: (votante: VotanteCRM) => void;
  updateTestigo: (id: string, updates: Partial<TestigoElectoral>) => Promise<TestigoElectoral[]>;
  updateVotante: (id: string, updates: Partial<VotanteCRM>) => Promise<VotanteCRM[]>;

  // Actores jerárquicos
  addActor: (actor: Omit<Actor, 'id' | 'creadoEn'>) => void;
  updateActorRole: (id: string, role: Actor['role'], supervisorId?: string, candidatoId?: string, leaderId?: string) => void;

  // Mutaciones
  addTestigo: (testigo: Omit<TestigoElectoral, 'id'>) => void;
  updateTestigoEstado: (id: string, estado: TestigoElectoral['estado']) => void;
  addVotante: (votante: Omit<VotanteCRM, 'id'>) => void;
  toggleVotanteYaVoto: (id: string) => void;
  addActaE14: (acta: Omit<ActaE14, 'id'>) => void;
  resolverAlerta: (id: string) => void;

  // Migración de mock a Supabase
  migrateMockToSupabase: () => Promise<{
    partidos: { insertados: number; errores: string[] };
    candidatos: { insertados: number; errores: string[] };
    puestos: { insertados: number; errores: string[] };
    actores: { insertados: number; errores: string[] };
    testigos: { insertados: number; errores: string[] };
    votantes: { insertados: number; errores: string[] };
    actas: { insertados: number; errores: string[] };
    alertas: { insertados: number; errores: string[] };
  }>;
  // Simulación
  toggleSimulacionDiaD: () => void;
  tickSimulacion: () => void;
  reiniciarDatos: () => void;
}

export const useElectoralStore = create<ElectoralState>((set, get) => ({
  moduloActivo: 'mapa',
  nivelTerritorial: 'municipal',
  departamentoId: 'valle',
  municipioId: 'tulua',
  zona: 'todas',
  tipoBasemap: 'dark',
  cuadrantes: [],
  isDrawingPolygon: false,
  drawingPoints: [],

  capaMetrica: 'partido_dominante',
  partidoFiltro: 'todos',
  busquedaTexto: '',
  mostrarHeatmap: false,
  radioInfluenciaKm: null,
  centroRadio: null,

  selectedPuestoId: null,
  drawerAbierto: false,
  actorId: null,
  actorRole: null,
  diaDActivado: false,
  mostrarVotantesMapa: true,

  partidos: [],
  candidatos: [],
  departamentos: [],
  municipios: [],
  zonas: [],
  actors: [],
  puestos: supabaseMock.getPuestos(),
  testigos: supabaseMock.getTestigos(),
  votantes: supabaseMock.getVotantes(),
  actas: supabaseMock.getActasE14(),
  alertas: supabaseMock.getAlertas(),
  toasts: [],

  isNewWitnessOpen: false,
  isNewVoterOpen: false,
  isNewPartidoOpen: false,
  isNewCandidatoOpen: false,
  isDigitalizeE14Open: false,
  isFraudModalOpen: false,
  alertaSeleccionada: null,
  editingPartido: null,
  editingCandidato: null,
  editingActor: null,
  editingTestigo: null,
  editingVoter: null,

  isSimulandoDiaD: false,
  diaDProgresoPct: 42,

  addToast: (toast) => {
    const nuevo: Toast = {
      ...toast,
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    };
    set({ toasts: [nuevo, ...get().toasts.slice(0, 4)] });
    setTimeout(() => {
      get().removeToast(nuevo.id);
    }, 5000);
  },

  removeToast: (id) => {
    set({ toasts: get().toasts.filter(t => t.id !== id) });
  },

  setModuloActivo: (modulo) => set({ moduloActivo: modulo }),
  setNivelTerritorial: (nivel) => set({ nivelTerritorial: nivel }),

  setDepartamentoId: (depId) => {
    if (depId === 'todos') {
      set({ 
        departamentoId: 'todos', 
        municipioId: 'todos', 
        zona: 'todas',
        nivelTerritorial: 'nacional',
        selectedPuestoId: null 
      });
    } else {
      set({ 
        departamentoId: depId, 
        municipioId: 'todos', 
        zona: 'todas',
        nivelTerritorial: 'departamental',
        selectedPuestoId: null 
      });
    }
  },

  setMunicipioId: (munId) => {
    if (munId === 'todos') {
      set({ 
        municipioId: 'todos', 
        zona: 'todas',
        nivelTerritorial: get().departamentoId === 'todos' ? 'nacional' : 'departamental',
        selectedPuestoId: null 
      });
    } else {
      set({ 
        municipioId: munId, 
        zona: 'todas',
        nivelTerritorial: 'municipal',
        selectedPuestoId: null 
      });
    }
  },

  setZona: (zona) => set({ zona }),
  setCapaMetrica: (capa) => set({ capaMetrica: capa }),
  setPartidoFiltro: (partido) => set({ partidoFiltro: partido }),
  setBusquedaTexto: (busquedaTexto) => set({ busquedaTexto }),
  setMostrarHeatmap: (mostrarHeatmap) => set({ mostrarHeatmap }),
  setTipoBasemap: (tipo) => set({ tipoBasemap: tipo }),
  
  setRadioInfluencia: (km, centro = null) => {
    set({ radioInfluenciaKm: km, centroRadio: centro });
  },

  setSelectedPuestoId: (id) => {
    set({ 
      selectedPuestoId: id, 
      drawerAbierto: !!id,
      nivelTerritorial: id ? 'puesto' : get().nivelTerritorial 
    });
  },

  setDrawerAbierto: (abierto) => set({ drawerAbierto: abierto }),
  setActorId: (id, role = null) => set({ actorId: id, actorRole: role }),

  setMostrarVotantesMapa: (visible) => set({ mostrarVotantesMapa: visible }),

  setDiaDActivado: (activado) => set({ diaDActivado: activado }),

  // Partidos y Candidatos
  addPartido: async (partidoData) => {
    const nuevo = await SupabaseService.savePartido(partidoData as Partido);
    set({ partidos: [nuevo, ...get().partidos] });
    get().addToast({
      type: 'success',
      title: 'Partido registrado',
      message: `${nuevo.nombre} (${nuevo.siglas}) fue creado exitosamente`,
    });
    return nuevo;
  },

  addCandidato: async (candidatoData) => {
    const nuevo = await SupabaseService.saveCandidato(candidatoData as Candidato);
    set({ candidatos: [nuevo, ...get().candidatos] });
    get().addToast({
      type: 'success',
      title: 'Candidato registrado',
      message: `${nuevo.nombre} ${nuevo.apellido ?? ''} fue inscrito exitosamente`,
    });
    console.log('[Candidato] Guardado:', nuevo);
    return nuevo;
  },

  openEditPartido: (partido) =>
    set({ editingPartido: partido, isNewPartidoOpen: true }),

  openEditCandidato: (candidato) =>
    set({ editingCandidato: candidato, isNewCandidatoOpen: true }),

  updatePartido: async (id, partidoData) => {
    const actualizado = await SupabaseService.updatePartido(id, partidoData);
    set(state => ({
      partidos: state.partidos.map(p => (p.id === id ? actualizado : p)),
      editingPartido: null,
    }));
    get().addToast({
      type: 'success',
      title: 'Partido actualizado',
      message: `${actualizado.nombre} (${actualizado.siglas}) fue actualizado exitosamente`,
    });
    return actualizado;
  },

  updateCandidato: async (id, candidatoData) => {
    const actualizado = await SupabaseService.updateCandidato(id, candidatoData);
    set(state => ({
      candidatos: state.candidatos.map(c => (c.id === id ? actualizado : c)),
      editingCandidato: null,
    }));
    get().addToast({
      type: 'success',
      title: 'Candidato actualizado',
      message: `${actualizado.nombre} ${actualizado.apellido ?? ''} fue actualizado exitosamente`,
    });
    return actualizado;
  },

  setEditingActor: (actor) => set({ editingActor: actor }),

  openEditTestigo: (testigo) =>
    set({ editingTestigo: testigo, isNewWitnessOpen: true }),

  openEditVoter: (votante) =>
    set({ editingVoter: votante, isNewVoterOpen: true }),

  setEditingTestigo: (testigo) => set({ editingTestigo: testigo }),
  setEditingVoter: (votante) => set({ editingVoter: votante }),

  updateTestigo: async (id, updates) => {
    const actualizados = await SupabaseService.updateTestigo(id, updates);
    const actualizado = actualizados.find(t => t.id === id) ?? actualizados[0];
    set(state => ({
      testigos: state.testigos.map(t => (t.id === id ? actualizado : t)),
      editingTestigo: null,
    }));
    get().addToast({
      type: 'success',
      title: 'Testigo actualizado',
      message: `${actualizado.nombre} fue actualizado exitosamente`,
    });
    return actualizados;
  },

  updateVotante: async (id, updates) => {
    const actualizados = await SupabaseService.updateVotante(id, updates);
    const actualizado = actualizados.find(v => v.id === id) ?? actualizados[0];
    set(state => ({
      votantes: state.votantes.map(v => (v.id === id ? actualizado : v)),
      editingVoter: null,
    }));
    get().addToast({
      type: 'success',
      title: 'Votante actualizado',
      message: `${actualizado.nombre} fue actualizado exitosamente`,
    });
    return actualizados;
  },

  // Actores jerárquicos
  addActor: async (actorData) => {
    const { actorRole: creadorRole, actorId: creadorId } = get();
    let supervisorId = actorData.supervisorId;
    let candidatoId = actorData.candidatoId;
    let leaderId = actorData.leaderId;

    // Reglas de jerarquía automática según el rol del creador
    if (creadorRole === 'totalSupervisor') {
      // totalSupervisor puede crear líderes y asignarles supervisor_id y candidato_id
      // Si no se especifican, quedan sin amarrar (se puede editar después)
      supervisorId = actorData.supervisorId ?? undefined;
      candidatoId = actorData.candidatoId ?? undefined;
    } else if (creadorRole === 'candidateSupervisor') {
      // candidateSupervisor crea líderes amarrados a sí mismo y a su candidato
      supervisorId = creadorId ?? undefined;
      candidatoId = actorData.candidatoId ?? get().candidatos.find(c => 
        get().actors.some(a => a.id === creadorId && a.candidatoId === c.id)
      )?.id;
    } else if (creadorRole === 'leader') {
      // leader crea testigos y votantes amarrados a sí mismo como líder
      leaderId = creadorId ?? undefined;
      supervisorId = undefined;
      candidatoId = undefined;
    }

    const nuevo = await SupabaseService.saveActor({
      ...actorData,
      supervisorId,
      candidatoId,
      leaderId,
      nivel: actorData.nivel ?? 0,
    } as Actor);
    set({ actors: [nuevo, ...get().actors] });
    return nuevo;
  },

  updateActorRole: async (id, role, supervisorId, candidatoId, leaderId) => {
    await SupabaseService.updateActorRole(id, { role, supervisorId, candidatoId, leaderId } as Partial<Actor>);
    set({
      actors: get().actors.map(a => 
        a.id === id 
          ? { ...a, role, supervisorId, candidatoId, leaderId } 
          : a
      ),
    });
  },

  // Carga inicial de datos jerárquicos
  loadHierarchicalData: async () => {
    const [partidos, candidatos, departamentos, municipios, zonas, actors, puestos, testigos, votantes, actas, alertas] = await Promise.all([
      SupabaseService.getPartidos(),
      SupabaseService.getCandidatos(),
      SupabaseService.getDepartamentos(),
      SupabaseService.getMunicipios(),
      SupabaseService.getZonas(),
      SupabaseService.getActors(),
      SupabaseService.getPuestos(),
      SupabaseService.getTestigos(),
      SupabaseService.getVotantes(),
      SupabaseService.getActasE14(),
      SupabaseService.getAlertas(),
    ]);
    set({ partidos, candidatos, departamentos, municipios, zonas, actors, puestos, testigos, votantes, actas, alertas });
  },

  setIsNewWitnessOpen: (open) => set({ isNewWitnessOpen: open, editingTestigo: null }),
  setIsNewVoterOpen: (open) => set({ isNewVoterOpen: open, editingVoter: null }),
  setIsNewPartidoOpen: (open: boolean) => set({ isNewPartidoOpen: open, editingPartido: null }),
  setIsNewCandidatoOpen: (open: boolean) => set({ isNewCandidatoOpen: open, editingCandidato: null }),
  setIsDigitalizeE14Open: (open) => set({ isDigitalizeE14Open: open }),
  setIsFraudModalOpen: (open, alerta = null) => set({ isFraudModalOpen: open, alertaSeleccionada: alerta }),

  addTestigo: async (testigoData) => {
    const { actorId, actorRole } = get();
    // Un testigo debe estar amarrado a un líder
    const leaderId = actorRole === 'leader' ? actorId : testigoData.leaderId;
    const testigoConLider = {
      ...testigoData,
      leaderId: leaderId ?? undefined,
    };
    const nuevo = await SupabaseService.saveTestigo(testigoConLider);
    set({ testigos: [nuevo, ...get().testigos] });
    return nuevo;
  },

  updateTestigoEstado: async (id, estado) => {
    const updated = await SupabaseService.updateTestigo(id, { estado });
    set({ testigos: updated });
  },

  addVotante: async (votanteData) => {
    const { actorId, actorRole } = get();
    // Un votante debe estar amarrado a un líder
    const leaderId = actorRole === 'leader' ? actorId : votanteData.leaderId;
    const votanteConLider = {
      ...votanteData,
      leaderId: leaderId ?? undefined,
    };
    const nuevo = await SupabaseService.saveVotante(votanteConLider);
    set({ votantes: [nuevo, ...get().votantes] });
    return nuevo;
  },

  toggleVotanteYaVoto: async (id) => {
    const target = get().votantes.find(v => v.id === id);
    if (!target) return;
    const updated = await SupabaseService.updateVotante(id, { yaVoto: !target.yaVoto });
    set({ votantes: updated });
  },

  addActaE14: async (actaData) => {
    const { actorId, actorRole } = get();
    // Un acta es digitalizada por un líder o testigo (quien tiene actor_id)
    const leaderId = (actorRole === 'leader' || actorRole === 'witness') ? actorId : actaData.leaderId;
    const actaConLider = {
      ...actaData,
      leaderId: leaderId ?? undefined,
    };
    const acta = await SupabaseService.saveActaE14(actaConLider);
    set({ 
      actas: [acta, ...get().actas],
    });
    return acta;
  },

  resolverAlerta: async (id) => {
    const { actorId, actorRole } = get();
    const updated = await SupabaseService.resolverAlerta(id, {
      leaderId: (actorRole === 'leader' || actorRole === 'witness') ? actorId ?? undefined : undefined,
    });
    set({ alertas: updated });
  },

  toggleSimulacionDiaD: () => {
    const actual = get().isSimulandoDiaD;
    set({ isSimulandoDiaD: !actual });
  },

  tickSimulacion: () => {
    const actual = get().diaDProgresoPct;
    if (actual >= 100) {
      set({ isSimulandoDiaD: false });
      return;
    }
    const nuevo = Math.min(100, actual + 2);
    set({ diaDProgresoPct: nuevo });
  },

  reiniciarDatos: () => {
    supabaseMock.resetToDefaults();
    set({
      partidos: [],
      candidatos: [],
      actors: [],
      puestos: supabaseMock.getPuestos(),
      testigos: supabaseMock.getTestigos(),
      votantes: supabaseMock.getVotantes(),
      actas: supabaseMock.getActasE14(),
      alertas: supabaseMock.getAlertas(),
      diaDProgresoPct: 42,
      isSimulandoDiaD: false,
    });
  },

  migrateMockToSupabase: async () => {
    return SupabaseService.migrateMockToSupabase();
  },
}));;

