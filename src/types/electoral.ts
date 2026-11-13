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

export interface Zona {
  id: string;
  municipio_id: string;
  nombre: string;
  codigo?: string;
  censo?: number;
  lat?: number;
  lng?: number;
  creadoEn?: string;
}

export interface Partido {
  id: string;
  nombre: string;
  siglas: string;
  color?: string;
  logoUrl?: string;
  creadoEn: string;
}

export interface Candidato {
  id: string;
  partidoId: string;
  nombre: string;
  apellido?: string;
  cedula: string;
  cargo: string; // 'presidente', 'alcalde', 'concejal', etc.
  numeroTarjeton?: string;
  numeroLista?: string; // Para cargos de corporación (concejo, asamblea)
  departamentoId?: string;
  municipioId?: string;
  fotoUrl?: string;
  creadoEn: string;
}

export interface Actor {
  id: string;
  nombre: string;
  role: 'totalSupervisor' | 'candidateSupervisor' | 'leader' | 'witness' | 'voter';
  nivel?: number;
  candidatoId?: string; // para candidateSupervisor
  supervisorId?: string; // para leader (a qué supervisor de candidato pertenece)
  leaderId?: string; // para witness/voter (a qué líder pertenece)
  scopeLevel?: 'national' | 'department' | 'municipality';
  scopeId?: string;
  userId?: string;
  territorio?: any;
  creadoEn: string;
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
  leaderId?: string; // amarrado a un líder
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
  leaderId?: string; // amarrado a un líder
  lat?: number; // coordenada de residencia/vivienda
  lng?: number; // coordenada de residencia/vivienda
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
  leaderId?: string; // quién digitalizó
}

export interface ActaVotoPartido {
  id: string;
  actaId: string;
  partidoId: string;
  partidoNombre: string;
  partidoSiglas: string;
  votos: number;
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
  leaderId?: string; // quién reportó
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

