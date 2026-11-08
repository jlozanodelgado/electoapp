import { create } from 'zustand';
import { 
  NivelTerritorial, 
  CapaMetrica, 
  PuestoVotacion, 
  TestigoElectoral, 
  VotanteCRM, 
  ActaE14, 
  AlertaFraude 
} from '../types/electoral';
import { Toast, CuadranteTactico, TipoBasemap } from '../types/tactical';
import { isPointInPolygon } from '../utils/geoUtils';
import { supabaseMock } from '../services/supabaseMock';

export type ModuloActivo = 'mapa' | 'campana' | 'dia_d' | 'ejecutivo';

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
  setActorId: (id: string | null) => void;

  // Colecciones de datos
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
  isDigitalizeE14Open: boolean;
  isFraudModalOpen: boolean;
  alertaSeleccionada: AlertaFraude | null;

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
  setIsDigitalizeE14Open: (open: boolean) => void;
  setIsFraudModalOpen: (open: boolean, alerta?: AlertaFraude | null) => void;

  // Notificaciones
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;

  // Mutaciones
  addTestigo: (testigo: Omit<TestigoElectoral, 'id'>) => void;
  updateTestigoEstado: (id: string, estado: TestigoElectoral['estado']) => void;
  addVotante: (votante: Omit<VotanteCRM, 'id'>) => void;
  toggleVotanteYaVoto: (id: string) => void;
  addActaE14: (acta: Omit<ActaE14, 'id'>) => void;
  resolverAlerta: (id: string) => void;

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

  puestos: supabaseMock.getPuestos(),
  testigos: supabaseMock.getTestigos(),
  votantes: supabaseMock.getVotantes(),
  actas: supabaseMock.getActasE14(),
  alertas: supabaseMock.getAlertas(),
  toasts: [],

  isNewWitnessOpen: false,
  isNewVoterOpen: false,
  isDigitalizeE14Open: false,
  isFraudModalOpen: false,
  alertaSeleccionada: null,

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
  setActorId: (id) => set({ actorId: id }),

  setIsNewWitnessOpen: (open) => set({ isNewWitnessOpen: open }),
  setIsNewVoterOpen: (open) => set({ isNewVoterOpen: open }),
  setIsDigitalizeE14Open: (open) => set({ isDigitalizeE14Open: open }),
  setIsFraudModalOpen: (open, alerta = null) => set({ isFraudModalOpen: open, alertaSeleccionada: alerta }),

  addTestigo: (testigoData) => {
    const testigoConActor = {
      ...testigoData,
      actor_id: get().actorId || null,
    };
    const nuevo = supabaseMock.addTestigo(testigoConActor);
    set({ testigos: [nuevo, ...get().testigos] });
  },

  updateTestigoEstado: (id, estado) => {
    const updated = supabaseMock.updateTestigo(id, { estado });
    set({ testigos: updated });
  },

  addVotante: (votanteData) => {
    const votanteConActor = {
      ...votanteData,
      actor_id: get().actorId || null,
    };
    const nuevo = supabaseMock.addVotante(votanteConActor);
    set({ votantes: [nuevo, ...get().votantes] });
  },

  toggleVotanteYaVoto: (id) => {
    const target = get().votantes.find(v => v.id === id);
    if (!target) return;
    const updated = supabaseMock.updateVotante(id, { yaVoto: !target.yaVoto });
    set({ votantes: updated });
  },

  addActaE14: (actaData) => {
    const actaConActor = {
      ...actaData,
      actor_id: get().actorId || null,
    };
    const { acta, nuevaAlerta } = supabaseMock.addActaE14(actaConActor);
    const nuevasAlertas = nuevaAlerta ? [nuevaAlerta, ...get().alertas] : get().alertas;
    set({ 
      actas: [acta, ...get().actas],
      alertas: nuevasAlertas
    });
  },

  resolverAlerta: (id) => {
    const updated = supabaseMock.resolverAlerta(id);
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
      puestos: supabaseMock.getPuestos(),
      testigos: supabaseMock.getTestigos(),
      votantes: supabaseMock.getVotantes(),
      actas: supabaseMock.getActasE14(),
      alertas: supabaseMock.getAlertas(),
      diaDProgresoPct: 42,
      isSimulandoDiaD: false,
    });
  }
}));

