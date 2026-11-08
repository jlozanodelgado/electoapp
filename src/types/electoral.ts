export type NivelTerritorial = 'nacional' | 'departamental' | 'municipal' | 'puesto';

export type IntencionVoto = 'voto_duro' | 'voto_blando' | 'indeciso' | 'opositor';

export type EstadoTestigo = 'confirmado' | 'pendiente' | 'ausente';

export type RolTestigo = 'testigo_mesa' | 'coordinador_puesto' | 'abogado_escrutinio' | 'remanente';

export type CapaMetrica = 
  | 'partido_dominante' 
  | 'participacion' 
  | 'abstencionismo' 
  | 'margen_victoria' 
  | 'potencial_censo' 
  | 'cobertura_testigos';

export interface HistoricoEleccion {
  ano: number;
  eleccion: string;
  participacionPct: number;
  votosPorPartido: {
    coalicion: number;
    alianza: number;
    unidad: number;
    otros: number;
    blanco: number;
    nulos: number;
  };
}

export interface PuestoVotacion {
  id: string;
  nombre: string;
  municipioId: string;
  departamentoId: string;
  zona: string;
  comunaBarrio: string;
  direccion: string;
  lat: number;
  lng: number;
  censoElectoral: number;
  mesasHabilitadas: number;
  metaVotosCampana: number;
  votosProyectados: number;
  estadoPrioridad: 'critico' | 'estrategico' | 'consolidado' | 'normal';
  partidoDominante: 'coalicion' | 'alianza' | 'unidad';
  margenVictoriaPct: number;
  participacionHistoricaPct: number;
  abstencionismoPct: number;
  coberturaTestigosPct: number;
  historico: HistoricoEleccion[];
}

export interface Departamento {
  id: string;
  nombre: string;
  codigo: string;
  censo: number;
  curules: number;
  coordenadas: [number, number]; // [lat, lng]
  zoom: number;
  partidoDominante: 'coalicion' | 'alianza' | 'unidad';
  participacionPct: number;
}

export interface Municipio {
  id: string;
  departamentoId: string;
  nombre: string;
  codigo: string;
  censo: number;
  curules: number;
  coordenadas: [number, number];
  zoom: number;
  zonas: string[];
  partidoDominante: 'coalicion' | 'alianza' | 'unidad';
  participacionPct: number;
}

export interface TestigoElectoral {
  id: string;
  puestoId: string;
  puestoNombre: string;
  mesaNumero: number;
  nombre: string;
  cedula: string;
  telefono: string;
  rol: RolTestigo;
  estado: EstadoTestigo;
  horaLlegada?: string;
  actor_id?: string;
}

export interface VotanteCRM {
  id: string;
  puestoId: string;
  nombre: string;
  cedula: string;
  telefono: string;
  direccion: string;
  barrio: string;
  intencionVoto: IntencionVoto;
  liderAsignado: string;
  contactado: boolean;
  necesitaTransporte: boolean;
  yaVoto: boolean;
  actor_id?: string;
}

export interface ActaE14 {
  id: string;
  puestoId: string;
  mesaNumero: number;
  horaReporte: string;
  digitalizadoPor: string;
  votosCoalicion: number;
  votosAlianza: number;
  votosUnidad: number;
  votosOtros: number;
  votosBlanco: number;
  votosNulos: number;
  votosNoMarcados: number;
  totalVotosUrna: number;
  estadoRevision: 'aprobada' | 'alerta_discrepancia' | 'pendiente_verificacion';
  fotoActaUrl?: string;
  actor_id?: string;
}

export interface AlertaFraude {
  id: string;
  puestoId: string;
  puestoNombre: string;
  mesaNumero: number;
  severidad: 'alta' | 'media' | 'baja';
  tipo: 'nulos_anormales' | 'censo_excedido' | 'discrepancia_urna' | 'testigo_ausente';
  descripcion: string;
  timestamp: string;
  resuelta: boolean;
  actor_id?: string;
}

export interface FiltrosElectorales {
  departamentoId: string | 'todos';
  municipioId: string | 'todos';
  zona: string | 'todas';
  capaMetrica: CapaMetrica;
  partidoFiltro: string | 'todos';
  busquedaTexto: string;
  mostrarHeatmap: boolean;
  radioInfluenciaKm: number | null; // en km para buffer
}

