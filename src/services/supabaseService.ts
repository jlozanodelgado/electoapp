import { supabase, isSupabaseConfigured } from './supabaseClient';
import { supabaseMock } from './supabaseMock';
import { generateUuid, isUuid } from '../utils/uuid';
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

/**
 * Convierte los valores del enum `actor_role` de PostgreSQL a los roles
 * canónicos que usa la aplicación.
 */
function normalizeActorRole(rawRole: unknown, nivel?: number | null): Actor['role'] {
  const value = String(rawRole ?? '').toLowerCase();

  if (value.includes('supervisor_total') || value.includes('totalsupervisor') || nivel === 0) {
    return 'totalSupervisor';
  }
  if (value.includes('supervisor_candidato') || value.includes('candidatesupervisor') || nivel === 1) {
    return 'candidateSupervisor';
  }
  if (value.includes('lider') || value.includes('leader') || nivel === 2) {
    return 'leader';
  }
  if (value.includes('testigo') || value.includes('witness') || nivel === 3) {
    return 'witness';
  }
  return 'voter';
}

/** Traduce los errores técnicos de PostgreSQL a mensajes entendibles. */
function describeSupabaseError(
  error: { message?: string | null; details?: string | null; hint?: string | null; code?: string },
  tabla: string,
): string {
  const message = error.message ?? '';
  const details = error.details ?? '';
  const hint = error.hint ?? '';
  const full = `${message} ${details} ${hint}`;
  const lower = full.toLowerCase();

  // Violación de unicidad (cédula, siglas, etc.).
  const duplicate = /Key \(([^)]+)\)=\(([^)]*)\) already exists/i.exec(details);
  if (error.code === '23505' || lower.includes('duplicate key') || lower.includes('unique constraint')) {
    if (duplicate) {
      return `Ya existe un registro en ${tabla} con ${duplicate[1]} = "${duplicate[2]}". Usa otro valor.`;
    }
    return `Ya existe un registro con esos datos en ${tabla}. Verifica que las siglas o la cédula no estén repetidas.`;
  }

  // Columna obligatoria (NOT NULL) que la aplicación no envía: esquema viejo.
  const notNull = /null value in column "([^"]+)" of relation/i.exec(message);
  if (error.code === '23502' || notNull) {
    const columna = notNull ? ` "${notNull[1]}"` : '';
    if (tabla === 'candidatos') {
      return `La tabla candidatos exige el campo${columna} y la aplicación no lo envía. Ejecuta supabase/fix_candidatos_partido.sql para quitar la obligatoriedad de la columna antigua "partido".`;
    }
    return `La tabla ${tabla} exige el campo${columna} y la aplicación no lo envía. Actualiza el esquema de la base de datos.`;
  }

  // Violación de llave foránea: Postgres indica el campo, el valor y la tabla faltante.
  const fk = /Key \(([^)]+)\)=\(([^)]*)\) is not present in table "([^"]+)"/i.exec(details);
  if (error.code === '23503' || lower.includes('foreign key')) {
    if (fk) {
      return `El valor "${fk[2]}" del campo ${fk[1]} no existe en la tabla ${fk[3]}. Verifica la selección o crea ese registro primero.`;
    }
    return 'El registro hace referencia a un partido, departamento o municipio que no existe en la base de datos.';
  }

  if (error.code === '42501' || lower.includes('row-level security') || lower.includes('permission denied')) {
    return `Tu usuario no tiene permisos para escribir en ${tabla}. Pide al administrador que ejecute supabase/fix_rls_permissions.sql en el SQL Editor de Supabase.`;
  }

  if (error.code === '22P02' || lower.includes('invalid input syntax for type uuid')) {
    return 'Se generó un identificador inválido. Recarga la página e inténtalo de nuevo.';
  }

  // La tabla no tiene una columna que la app espera (esquema desactualizado).
  const missingColumn =
    /Could not find the '([^']+)' column/i.exec(message) ?? /column "([^"]+)" of relation/i.exec(message);
  if (error.code === 'PGRST204' || missingColumn) {
    return `La tabla ${tabla} no tiene la columna${missingColumn ? ` "${missingColumn[1]}"` : ''} que espera la aplicación. Actualiza el esquema de la base de datos.`;
  }

  return message || `No se pudo guardar el registro en ${tabla}.`;
}

export class SupabaseService {
  // ---------------------------------------------------------------------
  // Puestos (voting places)
  // ---------------------------------------------------------------------
  static async getPuestos(): Promise<PuestoVotacion[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return supabaseMock.getPuestos();
    }

    try {
      const { data, error } = await supabase
        .from('puestos_votacion')
        .select(`
          *,
          historico:historico_electoral(*)
        `)
        .order('nombre');

      if (error || !data || data.length === 0) {
        console.warn('Fallo al obtener puestos de Supabase, usando fallback local', error);
        return supabaseMock.getPuestos();
      }

      return data.map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        municipioId: p.municipio_id || p.municipioId,
        departamentoId: p.departamento_id || p.departamentoId,
        zona: p.zona,
        comunaBarrio: p.comuna_barrio || p.comunaBarrio,
        direccion: p.direccion,
        lat: p.lat,
        lng: p.lng,
        censoElectoral: p.censo_electoral || p.censoElectoral,
        mesasHabilitadas: p.mesas_habilitadas || p.mesasHabilitadas,
        metaVotosCampana: p.meta_votos_campana || p.metaVotosCampana,
        votosProyectados: p.votos_proyectados || p.votosProyectados,
        estadoPrioridad: p.estado_prioridad || p.estadoPrioridad,
        partidoDominante: p.partido_dominante || p.partidoDominante,
        margenVictoriaPct: p.margen_victoria_pct || p.margenVictoriaPct || 15,
        participacionHistoricaPct: p.participacion_historica_pct || p.participacionHistoricaPct || 60,
        abstencionismoPct: p.abstencionismo_pct || p.abstencionismoPct || 40,
        coberturaTestigosPct: p.cobertura_testigos_pct || p.coberturaTestigosPct || 90,
        historico: (p.historico || []).map((h: any) => ({
          ano: h.ano,
          eleccion: h.eleccion,
          participacionPct: h.participacion_pct,
          votosPorPartido: {
            coalicion: h.votos_coalicion || 0,
            alianza: h.votos_alianza || 0,
            unidad: h.votos_unidad || 0,
            otros: h.votos_otros || 0,
            blanco: h.votos_blanco || 0,
            nulos: h.votos_nulos || 0,
          }
        }))
      }));
    } catch (err) {
      console.warn('Error conectando a Supabase:', err);
      return supabaseMock.getPuestos();
    }
  }

  static async savePuesto(puesto: Omit<PuestoVotacion, 'id'>): Promise<PuestoVotacion> {
    const id = `puesto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('puestos_votacion').insert({
          id,
          nombre: puesto.nombre,
          municipio_id: puesto.municipioId,
          departamento_id: puesto.departamentoId,
          zona: puesto.zona,
          comuna_barrio: puesto.comunaBarrio,
          direccion: puesto.direccion,
          lat: puesto.lat,
          lng: puesto.lng,
          censo_electoral: puesto.censoElectoral,
          mesas_habilitadas: puesto.mesasHabilitadas,
          meta_votos_campana: puesto.metaVotosCampana,
          votos_proyectados: puesto.votosProyectados,
          estado_prioridad: puesto.estadoPrioridad,
          partido_dominante: puesto.partidoDominante,
          margen_victoria_pct: puesto.margenVictoriaPct,
          participacion_historica_pct: puesto.participacionHistoricaPct,
          abstencionismo_pct: puesto.abstencionismoPct,
          cobertura_testigos_pct: puesto.coberturaTestigosPct,
        });

        if (error) {
          console.error('[Supabase] Error guardando puesto:', error.message);
          throw new Error(describeSupabaseError(error, 'puestos_votacion'));
        }

        const nuevo: PuestoVotacion = {
          id,
          nombre: puesto.nombre,
          municipioId: puesto.municipioId,
          departamentoId: puesto.departamentoId,
          zona: puesto.zona,
          comunaBarrio: puesto.comunaBarrio,
          direccion: puesto.direccion,
          lat: puesto.lat,
          lng: puesto.lng,
          censoElectoral: puesto.censoElectoral,
          mesasHabilitadas: puesto.mesasHabilitadas,
          metaVotosCampana: puesto.metaVotosCampana,
          votosProyectados: puesto.votosProyectados,
          estadoPrioridad: puesto.estadoPrioridad,
          partidoDominante: puesto.partidoDominante,
          margenVictoriaPct: puesto.margenVictoriaPct,
          participacionHistoricaPct: puesto.participacionHistoricaPct,
          abstencionismoPct: puesto.abstencionismoPct,
          coberturaTestigosPct: puesto.coberturaTestigosPct,
          historico: [],
        };

        supabaseMock.updatePuesto(id, nuevo);
        return nuevo;
      } catch (e) {
        console.error('[Supabase] Error guardando puesto:', e);
        throw e;
      }
    }

    const nuevoMockData = { ...puesto, id } as PuestoVotacion;
    supabaseMock.updatePuesto(id, nuevoMockData);
    return nuevoMockData;
  }

  static async updatePuesto(id: string, updates: Partial<PuestoVotacion>): Promise<PuestoVotacion[]> {
    const updatedMock = supabaseMock.updatePuesto(id, updates);

    if (isSupabaseConfigured() && supabase) {
      try {
        const updatesDb: any = {};
        if (updates.nombre !== undefined) updatesDb.nombre = updates.nombre;
        if (updates.municipioId !== undefined) updatesDb.municipio_id = updates.municipioId;
        if (updates.departamentoId !== undefined) updatesDb.departamento_id = updates.departamentoId;
        if (updates.zona !== undefined) updatesDb.zona = updates.zona;
        if (updates.comunaBarrio !== undefined) updatesDb.comuna_barrio = updates.comunaBarrio;
        if (updates.direccion !== undefined) updatesDb.direccion = updates.direccion;
        if (updates.lat !== undefined) updatesDb.lat = updates.lat;
        if (updates.lng !== undefined) updatesDb.lng = updates.lng;
        if (updates.censoElectoral !== undefined) updatesDb.censo_electoral = updates.censoElectoral;
        if (updates.mesasHabilitadas !== undefined) updatesDb.mesas_habilitadas = updates.mesasHabilitadas;
        if (updates.metaVotosCampana !== undefined) updatesDb.meta_votos_campana = updates.metaVotosCampana;
        if (updates.votosProyectados !== undefined) updatesDb.votos_proyectados = updates.votosProyectados;
        if (updates.estadoPrioridad !== undefined) updatesDb.estado_prioridad = updates.estadoPrioridad;
        if (updates.partidoDominante !== undefined) updatesDb.partido_dominante = updates.partidoDominante;
        if (updates.margenVictoriaPct !== undefined) updatesDb.margen_victoria_pct = updates.margenVictoriaPct;
        if (updates.participacionHistoricaPct !== undefined) updatesDb.participacion_historica_pct = updates.participacionHistoricaPct;
        if (updates.abstencionismoPct !== undefined) updatesDb.abstencionismo_pct = updates.abstencionismoPct;
        if (updates.coberturaTestigosPct !== undefined) updatesDb.cobertura_testigos_pct = updates.coberturaTestigosPct;

        const { error } = await supabase.from('puestos_votacion').update(updatesDb).eq('id', id);
        if (error) {
          console.error('[Supabase] Error actualizando puesto:', error.message);
          throw new Error(describeSupabaseError(error, 'puestos_votacion'));
        }
      } catch (e) {
        console.error('[Supabase] Error actualizando puesto:', e);
        throw e;
      }
    }

    return updatedMock;
  }

  static async deletePuesto(id: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('puestos_votacion').delete().eq('id', id);
        if (error) {
          console.error('[Supabase] Error eliminando puesto:', error.message);
          throw new Error(describeSupabaseError(error, 'puestos_votacion'));
        }
      } catch (e) {
        console.error('[Supabase] Error eliminando puesto:', e);
        throw e;
      }
    }
    if (typeof (supabaseMock as any).deletePuesto === 'function') {
      (supabaseMock as any).deletePuesto(id);
    }
  }

  // ---------------------------------------------------------------------
  // Zonas (tabla separada, escalable)
  // ---------------------------------------------------------------------
  static async saveZona(zona: Omit<Zona, 'creadoEn'>): Promise<Zona> {
    const id = `zona-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('zonas').insert({
          id,
          municipio_id: zona.municipio_id,
          nombre: zona.nombre,
          codigo: zona.codigo ?? null,
          censo: zona.censo ?? null,
          lat: zona.lat ?? null,
          lng: zona.lng ?? null,
        });

        if (error) {
          console.error('[Supabase] Error guardando zona:', error.message);
          throw new Error(describeSupabaseError(error, 'zonas'));
        }

        const nuevo: Zona = {
          id,
          municipio_id: zona.municipio_id,
          nombre: zona.nombre,
          codigo: zona.codigo,
          censo: zona.censo,
          lat: zona.lat,
          lng: zona.lng,
          creadoEn: new Date().toISOString(),
        };

        return nuevo;
      } catch (e) {
        console.error('[Supabase] Error guardando zona:', e);
        throw e;
      }
    }

    return {
      id,
      municipio_id: zona.municipio_id,
      nombre: zona.nombre,
      codigo: zona.codigo,
      censo: zona.censo,
      lat: zona.lat,
      lng: zona.lng,
      creadoEn: new Date().toISOString(),
    };
  }

  static async updateZona(id: string, updates: Partial<Zona>): Promise<Zona | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const updatesDb: any = {};
        if (updates.nombre !== undefined) updatesDb.nombre = updates.nombre;
        if (updates.codigo !== undefined) updatesDb.codigo = updates.codigo;
        if (updates.censo !== undefined) updatesDb.censo = updates.censo;
        if (updates.lat !== undefined) updatesDb.lat = updates.lat;
        if (updates.lng !== undefined) updatesDb.lng = updates.lng;

        const { error } = await supabase.from('zonas').update(updatesDb).eq('id', id);
        if (error) {
          console.error('[Supabase] Error actualizando zona:', error.message);
          throw new Error(describeSupabaseError(error, 'zonas'));
        }
      } catch (e) {
        console.error('[Supabase] Error actualizando zona:', e);
        throw e;
      }
    }
    return null;
  }

  static async deleteZona(id: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('zonas').delete().eq('id', id);
        if (error) {
          console.error('[Supabase] Error eliminando zona:', error.message);
          throw new Error(describeSupabaseError(error, 'zonas'));
        }
      } catch (e) {
        console.error('[Supabase] Error eliminando zona:', e);
        throw e;
      }
    }
  }
  static async getTestigos(): Promise<TestigoElectoral[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return supabaseMock.getTestigos();
    }

    try {
      const { data, error } = await supabase
        .from('testigos_electorales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return supabaseMock.getTestigos();
      }

      return data.map((t: any) => ({
        id: t.id,
        puestoId: t.puesto_id || t.puestoId,
        puestoNombre: t.puesto_nombre || t.puestoNombre,
        mesaNumero: t.mesa_numero || t.mesaNumero,
        nombre: t.nombre,
        cedula: t.cedula,
        telefono: t.telefono,
        rol: t.rol,
        estado: t.estado,
        horaLlegada: t.hora_llegada || t.horaLlegada,
        leaderId: t.leader_id || t.leaderId,
      }));
    } catch (err) {
      return supabaseMock.getTestigos();
    }
  }

  static async saveTestigo(testigo: Omit<TestigoElectoral, 'id'>): Promise<TestigoElectoral> {
    // Generar ID de texto compatible con el esquema de Supabase (actas/testigos usan text PK)
    const id = `testigo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('testigos_electorales').insert({
          id,
          puesto_id: testigo.puestoId,
          puesto_nombre: testigo.puestoNombre,
          mesa_numero: testigo.mesaNumero,
          nombre: testigo.nombre,
          cedula: testigo.cedula,
          telefono: testigo.telefono || '+57 300 000 0000',
          rol: testigo.rol,
          estado: testigo.estado,
          hora_llegada: testigo.horaLlegada,
          leader_id: testigo.leaderId ?? null,
          actor_id: null,
        });

        if (error) {
          console.error('[Supabase] Error guardando testigo:', error.message);
          throw new Error(describeSupabaseError(error, 'testigos_electorales'));
        }

        const nuevo: TestigoElectoral = {
          id,
          puestoId: testigo.puestoId,
          puestoNombre: testigo.puestoNombre,
          mesaNumero: testigo.mesaNumero,
          nombre: testigo.nombre,
          cedula: testigo.cedula,
          telefono: testigo.telefono || '+57 300 000 0000',
          rol: testigo.rol,
          estado: testigo.estado,
          horaLlegada: testigo.horaLlegada,
          leaderId: testigo.leaderId,
        };

        // Guardar en mock solo como caché local de respaldo
        supabaseMock.addTestigo(nuevo);
        return nuevo;
      } catch (e) {
        console.error('[Supabase] Error guardando testigo:', e);
        throw e;
      }
    }

    // Fallback solo si Supabase no está configurado
    const nuevoMock = supabaseMock.addTestigo(testigo);
    return nuevoMock;
  }

  static async updateTestigo(id: string, updates: Partial<TestigoElectoral>): Promise<TestigoElectoral[]> {
    const updatedMock = supabaseMock.updateTestigo(id, updates);

    if (isSupabaseConfigured() && supabase) {
      try {
        const updatesDb: any = {};
        if (updates.estado !== undefined) updatesDb.estado = updates.estado;
        if (updates.horaLlegada !== undefined) updatesDb.hora_llegada = updates.horaLlegada;
        if (updates.nombre !== undefined) updatesDb.nombre = updates.nombre;
        if (updates.cedula !== undefined) updatesDb.cedula = updates.cedula;
        if (updates.telefono !== undefined) updatesDb.telefono = updates.telefono;
        if (updates.rol !== undefined) updatesDb.rol = updates.rol;
        if (updates.leaderId !== undefined) updatesDb.leader_id = updates.leaderId;

        const { error } = await supabase.from('testigos_electorales').update(updatesDb).eq('id', id);
        if (error) {
          console.error('[Supabase] Error actualizando testigo:', error.message);
          throw new Error(describeSupabaseError(error, 'testigos_electorales'));
        }
      } catch (e) {
        console.error('[Supabase] Error actualizando testigo:', e);
        throw e;
      }
    }

    return updatedMock;
  }

  // ---------------------------------------------------------------------
  // Votantes (CRM voters)
  // ---------------------------------------------------------------------
  static async getVotantes(): Promise<VotanteCRM[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return supabaseMock.getVotantes();
    }

    try {
      const { data, error } = await supabase
        .from('votantes_crm')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return supabaseMock.getVotantes();
      }

      return data.map((v: any) => ({
        id: v.id,
        puestoId: v.puesto_id || v.puestoId,
        nombre: v.nombre,
        cedula: v.cedula,
        telefono: v.telefono,
        direccion: v.direccion,
        barrio: v.barrio,
        intencionVoto: v.intencion_voto || v.intencionVoto,
        liderAsignado: v.lider_asignado || v.liderAsignado,
        contactado: v.contactado,
        necesitaTransporte: v.necesita_transporte || v.necesitaTransporte,
        yaVoto: v.ya_voto || v.yaVoto,
        leaderId: v.leader_id || v.leaderId,
        lat: v.lat,
        lng: v.lng,
      }));
    } catch (err) {
      return supabaseMock.getVotantes();
    }
  }

  static async saveVotante(votante: Omit<VotanteCRM, 'id'>): Promise<VotanteCRM> {
    const id = `votante-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('votantes_crm').insert({
          id,
          puesto_id: votante.puestoId,
          nombre: votante.nombre,
          cedula: votante.cedula,
          telefono: votante.telefono || '+57 300 000 0000',
          direccion: votante.direccion || 'Calle principal',
          barrio: votante.barrio || 'Barrio Central',
          intencion_voto: votante.intencionVoto,
          lider_asignado: votante.liderAsignado || 'Coordinador Barrial',
          contactado: votante.contactado ?? true,
          necesita_transporte: votante.necesitaTransporte ?? false,
          ya_voto: votante.yaVoto ?? false,
          leader_id: votante.leaderId ?? null,
          actor_id: null,
          lat: votante.lat ?? null,
          lng: votante.lng ?? null,
        });

        if (error) {
          console.error('[Supabase] Error guardando votante:', error.message);
          throw new Error(describeSupabaseError(error, 'votantes_crm'));
        }

        const nuevo: VotanteCRM = {
          id,
          puestoId: votante.puestoId,
          nombre: votante.nombre,
          cedula: votante.cedula,
          telefono: votante.telefono || '+57 300 000 0000',
          direccion: votante.direccion || 'Calle principal',
          barrio: votante.barrio || 'Barrio Central',
          intencionVoto: votante.intencionVoto,
          liderAsignado: votante.liderAsignado || 'Coordinador Barrial',
          contactado: votante.contactado ?? true,
          necesitaTransporte: votante.necesitaTransporte ?? false,
          yaVoto: votante.yaVoto ?? false,
          leaderId: votante.leaderId,
          lat: votante.lat,
          lng: votante.lng,
        };

        supabaseMock.addVotante(nuevo);
        return nuevo;
      } catch (e) {
        console.error('[Supabase] Error guardando votante:', e);
        throw e;
      }
    }

    const nuevoMock = supabaseMock.addVotante(votante);
    return nuevoMock;
  }

  static async updateVotante(id: string, updates: Partial<VotanteCRM>): Promise<VotanteCRM[]> {
    const updatedMock = supabaseMock.updateVotante(id, updates);

    if (isSupabaseConfigured() && supabase) {
      try {
        const updatesDb: any = {};
        if (updates.nombre !== undefined) updatesDb.nombre = updates.nombre;
        if (updates.cedula !== undefined) updatesDb.cedula = updates.cedula;
        if (updates.telefono !== undefined) updatesDb.telefono = updates.telefono;
        if (updates.direccion !== undefined) updatesDb.direccion = updates.direccion;
        if (updates.barrio !== undefined) updatesDb.barrio = updates.barrio;
        if (updates.intencionVoto !== undefined) updatesDb.intencion_voto = updates.intencionVoto;
        if (updates.liderAsignado !== undefined) updatesDb.lider_asignado = updates.liderAsignado;
        if (updates.contactado !== undefined) updatesDb.contactado = updates.contactado;
        if (updates.necesitaTransporte !== undefined) updatesDb.necesita_transporte = updates.necesitaTransporte;
        if (updates.yaVoto !== undefined) updatesDb.ya_voto = updates.yaVoto;
        if (updates.leaderId !== undefined) updatesDb.leader_id = updates.leaderId;
        if (updates.lat !== undefined) updatesDb.lat = updates.lat;
        if (updates.lng !== undefined) updatesDb.lng = updates.lng;

        const { error } = await supabase.from('votantes_crm').update(updatesDb).eq('id', id);
        if (error) {
          console.error('[Supabase] Error actualizando votante:', error.message);
          throw new Error(describeSupabaseError(error, 'votantes_crm'));
        }
      } catch (e) {
        console.error('[Supabase] Error actualizando votante:', e);
        throw e;
      }
    }

    return updatedMock;
  }

  // ---------------------------------------------------------------------
  // Actas E14 (electoral act records)
  // ---------------------------------------------------------------------
  static async getActasE14(): Promise<ActaE14[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return supabaseMock.getActasE14();
    }

    try {
      const { data, error } = await supabase
        .from('actas_e14')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return supabaseMock.getActasE14();
      }

      return data.map((a: any) => ({
        id: a.id,
        puestoId: a.puesto_id || a.puestoId,
        mesaNumero: a.mesa_numero || a.mesaNumero,
        horaReporte: a.hora_reporte || a.horaReporte,
        digitalizadoPor: a.digitalizado_por || a.digitalizadoPor,
        votosCoalicion: a.votos_coalicion || a.votosCoalicion,
        votosAlianza: a.votos_alianza || a.votosAlianza,
        votosUnidad: a.votos_unidad || a.votosUnidad,
        votosOtros: a.votos_otros || a.votosOtros,
        votosBlanco: a.votos_blanco || a.votosBlanco,
        votosNulos: a.votos_nulos || a.votosNulos,
        votosNoMarcados: a.votos_no_marcados || a.votosNoMarcados,
        totalVotosUrna: a.total_votos_urna || a.totalVotosUrna,
        estadoRevision: a.estado_revision || a.estadoRevision,
        fotoActaUrl: a.foto_acta_url || a.fotoActaUrl,
        leaderId: a.leader_id || a.leaderId,
      }));
    } catch (err) {
      return supabaseMock.getActasE14();
    }
  }

  static async saveActaE14(acta: Omit<ActaE14, 'id'>): Promise<ActaE14> {
    const id = `acta-e14-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('actas_e14').insert({
          id,
          puesto_id: acta.puestoId,
          mesa_numero: acta.mesaNumero,
          hora_reporte: acta.horaReporte,
          digitalizado_por: acta.digitalizadoPor ?? null,
          votos_coalicion: acta.votosCoalicion,
          votos_alianza: acta.votosAlianza,
          votos_unidad: acta.votosUnidad,
          votos_otros: acta.votosOtros,
          votos_blanco: acta.votosBlanco,
          votos_nulos: acta.votosNulos,
          votos_no_marcados: acta.votosNoMarcados ?? 0,
          total_votos_urna: acta.totalVotosUrna,
          estado_revision: acta.estadoRevision,
          foto_acta_url: acta.fotoActaUrl ?? null,
          leader_id: acta.leaderId ?? null,
          actor_id: null,
        });

        if (error) {
          console.error('[Supabase] Error guardando acta E14:', error.message);
          throw new Error(describeSupabaseError(error, 'actas_e14'));
        }

        const nuevo: ActaE14 = {
          id,
          puestoId: acta.puestoId,
          mesaNumero: acta.mesaNumero,
          horaReporte: acta.horaReporte,
          digitalizadoPor: acta.digitalizadoPor ?? '',
          votosCoalicion: acta.votosCoalicion,
          votosAlianza: acta.votosAlianza,
          votosUnidad: acta.votosUnidad,
          votosOtros: acta.votosOtros,
          votosBlanco: acta.votosBlanco,
          votosNulos: acta.votosNulos,
          votosNoMarcados: acta.votosNoMarcados ?? 0,
          totalVotosUrna: acta.totalVotosUrna,
          estadoRevision: acta.estadoRevision,
          fotoActaUrl: acta.fotoActaUrl,
          leaderId: acta.leaderId,
        };

        supabaseMock.addActaE14(nuevo);
        return nuevo;
      } catch (e) {
        console.error('[Supabase] Error guardando acta E14:', e);
        throw e;
      }
    }

    const nuevoMock = supabaseMock.addActaE14(acta);
    return nuevoMock;
  }

  static async updateActaE14(id: string, updates: Partial<ActaE14>): Promise<ActaE14[]> {
    const updatedMock = supabaseMock.updateActaE14(id, updates);

    if (isSupabaseConfigured() && supabase) {
      try {
        const updatesDb: any = {};
        if (updates.estadoRevision !== undefined) updatesDb.estado_revision = updates.estadoRevision;
        if (updates.votosCoalicion !== undefined) updatesDb.votos_coalicion = updates.votosCoalicion;
        if (updates.votosAlianza !== undefined) updatesDb.votos_alianza = updates.votosAlianza;
        if (updates.votosUnidad !== undefined) updatesDb.votos_unidad = updates.votosUnidad;
        if (updates.votosOtros !== undefined) updatesDb.votos_otros = updates.votosOtros;
        if (updates.votosBlanco !== undefined) updatesDb.votos_blanco = updates.votosBlanco;
        if (updates.votosNulos !== undefined) updatesDb.votos_nulos = updates.votosNulos;
        if (updates.votosNoMarcados !== undefined) updatesDb.votos_no_marcados = updates.votosNoMarcados;
        if (updates.totalVotosUrna !== undefined) updatesDb.total_votos_urna = updates.totalVotosUrna;
        if (updates.fotoActaUrl !== undefined) updatesDb.foto_acta_url = updates.fotoActaUrl;
        if (updates.leaderId !== undefined) updatesDb.leader_id = updates.leaderId;

        const { error } = await supabase.from('actas_e14').update(updatesDb).eq('id', id);
        if (error) {
          console.error('[Supabase] Error actualizando acta:', error.message);
          throw new Error(describeSupabaseError(error, 'actas_e14'));
        }
      } catch (e) {
        console.error('[Supabase] Error actualizando acta:', e);
        throw e;
      }
    }

    return updatedMock;
  }

  // ---------------------------------------------------------------------
  // Alertas de Fraude
  // ---------------------------------------------------------------------
  static async getAlertas(): Promise<AlertaFraude[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return supabaseMock.getAlertas();
    }

    try {
      const { data, error } = await supabase
        .from('alertas_fraude')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return supabaseMock.getAlertas();
      }

      return data.map((a: any) => ({
        id: a.id,
        puestoId: a.puesto_id || a.puestoId,
        puestoNombre: a.puesto_nombre || a.puestoNombre,
        mesaNumero: a.mesa_numero || a.mesaNumero,
        severidad: a.severidad,
        tipo: a.tipo,
        descripcion: a.descripcion,
        timestamp: a.timestamp,
        resuelta: a.resuelta,
        leaderId: a.leader_id || a.leaderId,
      }));
    } catch (err) {
      return supabaseMock.getAlertas();
    }
  }

  static async saveAlertaFraude(alerta: Omit<AlertaFraude, 'id'>): Promise<AlertaFraude> {
    const id = `alerta-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('alertas_fraude').insert({
          id,
          puesto_id: alerta.puestoId,
          puesto_nombre: alerta.puestoNombre,
          mesa_numero: alerta.mesaNumero,
          severidad: alerta.severidad,
          tipo: alerta.tipo,
          descripcion: alerta.descripcion,
          timestamp: alerta.timestamp,
          resuelta: alerta.resuelta ?? false,
          leader_id: alerta.leaderId ?? null,
          actor_id: null,
        });

        if (error) {
          console.error('[Supabase] Error guardando alerta:', error.message);
          throw new Error(describeSupabaseError(error, 'alertas_fraude'));
        }

        const nuevo: AlertaFraude = {
          id,
          puestoId: alerta.puestoId,
          puestoNombre: alerta.puestoNombre,
          mesaNumero: alerta.mesaNumero,
          severidad: alerta.severidad,
          tipo: alerta.tipo,
          descripcion: alerta.descripcion,
          timestamp: alerta.timestamp,
          resuelta: alerta.resuelta ?? false,
          leaderId: alerta.leaderId,
        };

        supabaseMock.addAlertaFraude(nuevo);
        return nuevo;
      } catch (e) {
        console.error('[Supabase] Error guardando alerta:', e);
        throw e;
      }
    }

    const nuevoMock = supabaseMock.addAlertaFraude(alerta);
    return nuevoMock;
  }

  static async resolverAlerta(id: string, metadata?: { leaderId?: string }): Promise<AlertaFraude[]> {
    const updatedMock = supabaseMock.resolverAlerta(id, metadata);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('alertas_fraude')
          .update({ resuelta: true })
          .eq('id', id);
        if (error) {
          console.error('[Supabase] Error resolviendo alerta:', error.message);
          throw new Error(describeSupabaseError(error, 'alertas_fraude'));
        }
      } catch (e) {
        console.error('[Supabase] Error resolviendo alerta:', e);
        throw e;
      }
    }

    return updatedMock;
  }

  // ---------------------------------------------------------------------
  // Partidos
  // ---------------------------------------------------------------------
  static async getPartidos(): Promise<Partido[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return supabaseMock.getPartidos();
    }

    try {
      const { data, error } = await supabase
        .from('partidos')
        .select('*')
        .order('nombre');

      if (error || !data || data.length === 0) {
        return supabaseMock.getPartidos();
      }

      return data.map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        siglas: p.siglas,
        color: p.color,
        logoUrl: p.logo_url,
        creadoEn: p.creado_en,
      }));
    } catch (err) {
      return supabaseMock.getPartidos();
    }
  }

  // ---------------------------------------------------------------------
  // Departamentos y Municipios (lectura desde Supabase)
  // ---------------------------------------------------------------------
  static async getDepartamentos(): Promise<Departamento[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return supabaseMock.getDepartamentos();
    }

    try {
      const { data, error } = await supabase
        .from('departamentos')
        .select('*')
        .order('nombre');

      if (error || !data || data.length === 0) {
        return supabaseMock.getDepartamentos();
      }

      return data.map((d: any) => ({
        id: d.id,
        nombre: d.nombre,
        codigo: d.codigo,
        censo: d.censo,
        curules: d.curules,
        coordenadas: [d.lat, d.lng],
        zoom: d.zoom,
        partidoDominante: d.partido_dominante,
        participacionPct: d.participacion_pct,
      }));
    } catch (err) {
      return supabaseMock.getDepartamentos();
    }
  }

  static async getMunicipios(): Promise<Municipio[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return supabaseMock.getMunicipios();
    }

    try {
      const { data, error } = await supabase
        .from('municipios')
        .select('*')
        .order('nombre');

      if (error || !data || data.length === 0) {
        return supabaseMock.getMunicipios();
      }

      return data.map((m: any) => ({
        id: m.id,
        departamentoId: m.departamento_id,
        nombre: m.nombre,
        codigo: m.codigo,
        censo: m.censo,
        curules: m.curules,
        coordenadas: [m.lat, m.lng],
        zoom: m.zoom,
        zonas: m.zonas || [],
        partidoDominante: m.partido_dominante,
        participacionPct: m.participacion_pct,
      }));
    } catch (err) {
      return supabaseMock.getMunicipios();
    }
  }

  // ---------------------------------------------------------------------
  // Zonas (tabla separada, escalable)
  // ---------------------------------------------------------------------
  static async getZonas(): Promise<Zona[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return supabaseMock.getZonas();
    }

    try {
      const { data, error } = await supabase
        .from('zonas')
        .select('*')
        .order('municipio_id, nombre');

      if (error || !data || data.length === 0) {
        return supabaseMock.getZonas();
      }

      return data.map((z: any) => ({
        id: z.id,
        municipio_id: z.municipio_id,
        nombre: z.nombre,
        codigo: z.codigo,
        censo: z.censo,
        lat: z.lat,
        lng: z.lng,
        creadoEn: z.creado_en,
      }));
    } catch (err) {
      return supabaseMock.getZonas();
    }
  }

  static async savePartido(partido: Omit<Partido, 'id' | 'creadoEn'>): Promise<Partido> {
    const id = generateUuid();
    const creadoEn = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('partidos').insert({
          id,
          nombre: partido.nombre,
          siglas: partido.siglas,
          color: partido.color ?? null,
          logo_url: partido.logoUrl ?? null,
          creado_en: creadoEn,
        });

        if (error) {
          console.error('[Supabase] Error guardando partido:', error.message);
          throw new Error(describeSupabaseError(error, 'partidos'));
        }

        const nuevo: Partido = {
          id,
          nombre: partido.nombre,
          siglas: partido.siglas,
          color: partido.color,
          logoUrl: partido.logoUrl,
          creadoEn,
        };

        supabaseMock.addPartido(nuevo);
        return nuevo;
      } catch (e) {
        console.error('[Supabase] Error guardando partido:', e);
        throw e;
      }
    }

    const nuevoMock = supabaseMock.addPartido({ ...partido, id, creadoEn } as Partido);
    return nuevoMock;
  }

  static async updatePartido(
    id: string,
    partido: Omit<Partido, 'id' | 'creadoEn'>,
  ): Promise<Partido> {
    if (!isUuid(id)) {
      throw new Error('El partido no tiene un identificador válido. Recarga la página e inténtalo de nuevo.');
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('partidos')
          .update({
            nombre: partido.nombre,
            siglas: partido.siglas.toUpperCase(),
            color: partido.color || null,
            logo_url: partido.logoUrl || null,
          })
          .eq('id', id)
          .select('*')
          .single();

        if (error) {
          console.error('[Supabase] Error actualizando partido:', error.message);
          throw new Error(describeSupabaseError(error, 'partidos'));
        }

        const actualizado: Partido = {
          id: data.id,
          nombre: data.nombre,
          siglas: data.siglas,
          color: data.color ?? undefined,
          logoUrl: data.logo_url ?? undefined,
          creadoEn: data.creado_en,
        };

        supabaseMock.updatePartido(id, actualizado);
        return actualizado;
      } catch (e) {
        console.error('[Supabase] Error actualizando partido:', e);
        throw e;
      }
    }

    const actualizado = supabaseMock.updatePartido(id, partido);
    if (!actualizado) {
      throw new Error('No se encontró el partido que intentas editar.');
    }
    return actualizado;
  }

  // ---------------------------------------------------------------------
  // Candidatos
  // ---------------------------------------------------------------------
  static async getCandidatos(): Promise<Candidato[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return supabaseMock.getCandidatos();
    }

    try {
      const { data, error } = await supabase
        .from('candidatos')
        .select('*')
        .order('nombre');

      if (error || !data || data.length === 0) {
        return supabaseMock.getCandidatos();
      }

      return data.map((c: any) => ({
        id: c.id,
        partidoId: c.partido_id,
        nombre: c.nombre,
        apellido: c.apellido,
        cedula: c.cedula,
        cargo: c.cargo,
        numeroTarjeton: c.numero_tarjeton,
        numeroLista: c.numero_lista,
        departamentoId: c.departamento_id,
        municipioId: c.municipio_id,
        fotoUrl: c.foto_url,
        creadoEn: c.creado_en,
      }));
    } catch (err) {
      return supabaseMock.getCandidatos();
    }
  }

  static async saveCandidato(candidato: Omit<Candidato, 'id' | 'creadoEn'>): Promise<Candidato> {
    const cedula = String(candidato.cedula ?? '').replace(/\D/g, '');
    const id = generateUuid();
    const creadoEn = new Date().toISOString();

    if (!isUuid(candidato.partidoId)) {
      throw new Error('Selecciona un partido válido antes de guardar el candidato.');
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('candidatos').insert({
          id,
          partido_id: candidato.partidoId,
          nombre: candidato.nombre,
          apellido: candidato.apellido ?? null,
          cedula: cedula || String(candidato.cedula ?? ''),
          cargo: candidato.cargo,
          numero_tarjeton: candidato.numeroTarjeton ?? null,
          numero_lista: candidato.numeroLista ?? null,
          departamento_id: candidato.departamentoId ?? null,
          municipio_id: candidato.municipioId ?? null,
          foto_url: candidato.fotoUrl ?? null,
          creado_en: creadoEn,
        });

        if (error) {
          console.error('[Supabase] Error guardando candidato:', error.message);
          throw new Error(describeSupabaseError(error, 'candidatos'));
        }

        const nuevo: Candidato = {
          id,
          partidoId: candidato.partidoId,
          nombre: candidato.nombre,
          apellido: candidato.apellido ?? undefined,
          cedula: cedula || String(candidato.cedula ?? ''),
          cargo: candidato.cargo,
          numeroTarjeton: candidato.numeroTarjeton ?? undefined,
          numeroLista: candidato.numeroLista ?? undefined,
          departamentoId: candidato.departamentoId ?? undefined,
          municipioId: candidato.municipioId ?? undefined,
          fotoUrl: candidato.fotoUrl ?? undefined,
          creadoEn,
        };

        supabaseMock.addCandidato(nuevo);
        return nuevo;
      } catch (e) {
        console.error('[Supabase] Error guardando candidato:', e);
        throw e;
      }
    }

    const nuevoMock = supabaseMock.addCandidato({
      ...candidato,
      id,
      creadoEn,
      cedula: cedula || String(candidato.cedula ?? ''),
    } as Candidato);
    return nuevoMock;
  }

  static async updateCandidato(
    id: string,
    candidato: Omit<Candidato, 'id' | 'creadoEn'>,
  ): Promise<Candidato> {
    if (!isUuid(id)) {
      throw new Error('El candidato no tiene un identificador válido. Recarga la página e inténtalo de nuevo.');
    }
    if (!isUuid(candidato.partidoId)) {
      throw new Error('Selecciona un partido válido antes de guardar el candidato.');
    }

    const cedula = String(candidato.cedula ?? '').replace(/\D/g, '') || String(candidato.cedula ?? '');

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('candidatos')
          .update({
            partido_id: candidato.partidoId,
            nombre: candidato.nombre,
            apellido: candidato.apellido ?? null,
            cedula,
            cargo: candidato.cargo,
            numero_tarjeton: candidato.numeroTarjeton ?? null,
            numero_lista: candidato.numeroLista ?? null,
            departamento_id: candidato.departamentoId ?? null,
            municipio_id: candidato.municipioId ?? null,
            foto_url: candidato.fotoUrl ?? null,
          })
          .eq('id', id)
          .select('*')
          .single();

        if (error) {
          console.error('[Supabase] Error actualizando candidato:', error.message);
          throw new Error(describeSupabaseError(error, 'candidatos'));
        }

        const actualizado: Candidato = {
          id: data.id,
          partidoId: data.partido_id,
          nombre: data.nombre,
          apellido: data.apellido ?? undefined,
          cedula: data.cedula,
          cargo: data.cargo,
          numeroTarjeton: data.numero_tarjeton ?? undefined,
          numeroLista: data.numero_lista ?? undefined,
          departamentoId: data.departamento_id ?? undefined,
          municipioId: data.municipio_id ?? undefined,
          fotoUrl: data.foto_url ?? undefined,
          creadoEn: data.creado_en,
        };

        supabaseMock.updateCandidato(id, actualizado);
        return actualizado;
      } catch (e) {
        console.error('[Supabase] Error actualizando candidato:', e);
        throw e;
      }
    }

    const actualizado = supabaseMock.updateCandidato(id, { ...candidato, cedula });
    if (!actualizado) {
      throw new Error('No se encontró el candidato que intentas editar.');
    }
    return actualizado;
  }

  // ---------------------------------------------------------------------
  // Actores (security actors)
  // ---------------------------------------------------------------------
  static async getActors(): Promise<Actor[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return supabaseMock.getActors();
    }

    try {
      const { data, error } = await supabase
        .from('actors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return supabaseMock.getActors();
      }

      return data.map((a: any) => ({
        id: a.id,
        nombre: a.nombre,
        role: normalizeActorRole(a.role ?? a.rol, a.nivel),
        nivel: a.nivel,
        candidatoId: a.candidato_id,
        supervisorId: a.supervisor_id,
        leaderId: a.leader_id,
        scopeLevel: a.scope_level,
        scopeId: a.scope_id,
        userId: a.user_id,
        territorio: a.territorio,
        creadoEn: a.created_at ?? a.creado_en,
      }));
    } catch (err) {
      return supabaseMock.getActors();
    }
  }

  static async saveActor(actor: Omit<Actor, 'id' | 'creadoEn'>): Promise<Actor> {
    const id = generateUuid();
    const creadoEn = new Date().toISOString();

    const nuevo: Actor = {
      ...actor,
      id,
      creadoEn,
    };

    // El enum actor_role de PostgreSQL usa estos valores en la BD real.
    const roleDb =
      nuevo.role === 'totalSupervisor'
        ? 'supervisor_total'
        : nuevo.role === 'candidateSupervisor'
        ? 'supervisor_candidato'
        : nuevo.role === 'leader'
        ? 'lider'
        : nuevo.role === 'witness'
        ? 'testigo'
        : 'votante';

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('actors').insert({
          id: nuevo.id,
          nombre: nuevo.nombre,
          rol: roleDb,
          role: roleDb,
          nivel: nuevo.nivel ?? 0,
          candidato_id: nuevo.candidatoId ?? null,
          supervisor_id: nuevo.supervisorId ?? null,
          leader_id: nuevo.leaderId ?? null,
          scope_level: nuevo.scopeLevel ?? null,
          scope_id: nuevo.scopeId ?? null,
          user_id: nuevo.userId ?? null,
          territorio: nuevo.territorio ?? null,
          created_at: nuevo.creadoEn,
          updated_at: new Date().toISOString(),
        });

        if (error) {
          console.error('[Supabase] Error guardando actor:', error.message);
          throw new Error(describeSupabaseError(error, 'actors'));
        }

        supabaseMock.addActor(nuevo);
        return nuevo;
      } catch (e) {
        console.error('[Supabase] Error guardando actor:', e);
        throw e;
      }
    }

    supabaseMock.addActor(nuevo);
    return nuevo;
  }

  static async updateActorRole(id: string, updates: Partial<Actor>): Promise<void> {
    supabaseMock.updateActorRole(id, updates);

    if (isSupabaseConfigured() && supabase) {
      try {
        const updatesDb: any = {};
        if (updates.role !== undefined) updatesDb.role = updates.role;
        if (updates.candidatoId !== undefined) updatesDb.candidato_id = updates.candidatoId;
        if (updates.supervisorId !== undefined) updatesDb.supervisor_id = updates.supervisorId;
        if (updates.leaderId !== undefined) updatesDb.leader_id = updates.leaderId;
        if (updates.scopeLevel !== undefined) updatesDb.scope_level = updates.scopeLevel;
        if (updates.scopeId !== undefined) updatesDb.scope_id = updates.scopeId;

        await supabase.from('actors').update(updatesDb).eq('id', id);
      } catch (e) {
        console.warn('Error actualizando actor en Supabase:', e);
      }
    }
  }

  // ---------------------------------------------------------------------
  // Suscripción en Tiempo Real (Supabase Realtime WebSockets)
  // ---------------------------------------------------------------------
  static subscribeToRealtime(
    onNewActa: (acta: ActaE14) => void,
    onNewAlerta: (alerta: AlertaFraude) => void,
    onUpdateTestigo: (testigo: TestigoElectoral) => void
  ) {
    if (!isSupabaseConfigured() || !supabase) return () => {};

    const channel = supabase
      .channel('dia-d-live-broadcast')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'actas_e14' },
        (payload) => {
          const a = payload.new as any;
          onNewActa({
            id: a.id,
            puestoId: a.puesto_id,
            mesaNumero: a.mesa_numero,
            horaReporte: a.hora_reporte,
            digitalizadoPor: a.digitalizado_por,
            votosCoalicion: a.votos_coalicion,
            votosAlianza: a.votos_alianza,
            votosUnidad: a.votos_unidad,
            votosOtros: a.votos_otros,
            votosBlanco: a.votos_blanco,
            votosNulos: a.votos_nulos,
            votosNoMarcados: a.votos_no_marcados,
            totalVotosUrna: a.total_votos_urna,
            estadoRevision: a.estado_revision,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alertas_fraude' },
        (payload) => {
          const al = payload.new as any;
          onNewAlerta({
            id: al.id,
            puestoId: al.puesto_id,
            puestoNombre: al.puesto_nombre,
            mesaNumero: al.mesa_numero,
            severidad: al.severidad,
            tipo: al.tipo,
            descripcion: al.descripcion,
            timestamp: al.timestamp,
            resuelta: al.resuelta,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'testigos_electorales' },
        (payload) => {
          const t = payload.new as any;
          onUpdateTestigo({
            id: t.id,
            puestoId: t.puesto_id,
            puestoNombre: t.puesto_nombre,
            mesaNumero: t.mesa_numero,
            nombre: t.nombre,
            cedula: t.cedula,
            telefono: t.telefono,
            rol: t.rol,
            estado: t.estado,
            horaLlegada: t.hora_llegada,
          });
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }

  // ---------------------------------------------------------------------
  // Migración de datos del mock (localStorage) a Supabase
  // ---------------------------------------------------------------------
  static async migrateMockToSupabase(): Promise<{
    partidos: { insertados: number; errores: string[] };
    candidatos: { insertados: number; errores: string[] };
    puestos: { insertados: number; errores: string[] };
    actores: { insertados: number; errores: string[] };
    testigos: { insertados: number; errores: string[] };
    votantes: { insertados: number; errores: string[] };
    actas: { insertados: number; errores: string[] };
    alertas: { insertados: number; errores: string[] };
  }> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase no está configurado.');
    }

    const resumen = {
      partidos: { insertados: 0, errores: [] as string[] },
      candidatos: { insertados: 0, errores: [] as string[] },
      puestos: { insertados: 0, errores: [] as string[] },
      actores: { insertados: 0, errores: [] as string[] },
      testigos: { insertados: 0, errores: [] as string[] },
      votantes: { insertados: 0, errores: [] as string[] },
      actas: { insertados: 0, errores: [] as string[] },
      alertas: { insertados: 0, errores: [] as string[] },
    };

    // Helper para mapear rol de app a rol de BD
    const rolADB = (role: string): string => {
      switch (role) {
        case 'totalSupervisor': return 'supervisor_total';
        case 'candidateSupervisor': return 'supervisor_candidato';
        case 'leader': return 'lider';
        case 'witness': return 'testigo';
        case 'voter': return 'votante';
        default: return 'votante';
      }
    };

    // -----------------------------------------------------------------
    // 1. Partidos
    // -----------------------------------------------------------------
    const partidos = supabaseMock.getPartidos();
    for (const p of partidos) {
      try {
        const { error } = await supabase.from('partidos').upsert({
          id: p.id,
          nombre: p.nombre,
          siglas: p.siglas,
          color: p.color ?? null,
          logo_url: p.logoUrl ?? null,
          creado_en: p.creadoEn ?? new Date().toISOString(),
        }, { onConflict: 'id' });
        if (error) throw error;
        resumen.partidos.insertados++;
      } catch (e: any) {
        resumen.partidos.errores.push(`Partido ${p.nombre}: ${e.message}`);
      }
    }

    // -----------------------------------------------------------------
    // 2. Candidatos
    // -----------------------------------------------------------------
    const candidatos = supabaseMock.getCandidatos();
    for (const c of candidatos) {
      try {
        const { error } = await supabase.from('candidatos').upsert({
          id: c.id,
          partido_id: c.partidoId,
          nombre: c.nombre,
          apellido: c.apellido ?? null,
          cedula: c.cedula,
          cargo: c.cargo,
          departamento_id: c.departamentoId ?? null,
          municipio_id: c.municipioId ?? null,
          foto_url: c.fotoUrl ?? null,
          partido: c.partidoId ?? null, // columna legacy
          numero_tarjeton: c.numeroTarjeton ?? null,
          numero_lista: c.numeroLista ?? null,
          creado_en: c.creadoEn ?? new Date().toISOString(),
        }, { onConflict: 'id' });
        if (error) throw error;
        resumen.candidatos.insertados++;
      } catch (e: any) {
        resumen.candidatos.errores.push(`Candidato ${c.cedula}: ${e.message}`);
      }
    }

    // -----------------------------------------------------------------
    // 3. Puestos de votación
    // -----------------------------------------------------------------
    const puestos = supabaseMock.getPuestos();
    for (const p of puestos) {
      try {
        const { error } = await supabase.from('puestos_votacion').upsert({
          id: p.id,
          nombre: p.nombre,
          municipio_id: p.municipioId,
          departamento_id: p.departamentoId,
          zona: p.zona,
          comuna_barrio: p.comunaBarrio,
          direccion: p.direccion,
          lat: p.lat,
          lng: p.lng,
          censo_electoral: p.censoElectoral,
          mesas_habilitadas: p.mesasHabilitadas,
          meta_votos_campana: p.metaVotosCampana,
          votos_proyectados: p.votosProyectados,
          estado_prioridad: p.estadoPrioridad,
          partido_dominante: p.partidoDominante,
          margen_victoria_pct: p.margenVictoriaPct,
          participacion_historica_pct: p.participacionHistoricaPct,
          abstencionismo_pct: p.abstencionismoPct,
          cobertura_testigos_pct: p.coberturaTestigosPct,
        }, { onConflict: 'id' });
        if (error) throw error;
        resumen.puestos.insertados++;
      } catch (e: any) {
        resumen.puestos.errores.push(`Puesto ${p.nombre}: ${e.message}`);
      }
    }

    // -----------------------------------------------------------------
    // 4. Actores
    // -----------------------------------------------------------------
    const actores = supabaseMock.getActors();
    for (const a of actores) {
      try {
        const { error } = await supabase.from('actors').upsert({
          id: a.id,
          nombre: a.nombre,
          rol: rolADB(a.role),
          role: rolADB(a.role),
          nivel: a.nivel ?? 0,
          candidato_id: a.candidatoId ?? null,
          supervisor_id: a.supervisorId ?? null,
          leader_id: a.leaderId ?? null,
          scope_level: a.scopeLevel ?? null,
          scope_id: a.scopeId ?? null,
          user_id: a.userId ?? null,
          territorio: a.territorio ?? null,
          created_at: a.creadoEn ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
        if (error) throw error;
        resumen.actores.insertados++;
      } catch (e: any) {
        resumen.actores.errores.push(`Actor ${a.nombre}: ${e.message}`);
      }
    }

    // -----------------------------------------------------------------
    // 5. Testigos electorales
    // -----------------------------------------------------------------
    const testigos = supabaseMock.getTestigos();
    for (const t of testigos) {
      try {
        const { error } = await supabase.from('testigos_electorales').upsert({
          id: t.id,
          puesto_id: t.puestoId,
          puesto_nombre: t.puestoNombre,
          mesa_numero: t.mesaNumero,
          nombre: t.nombre,
          cedula: t.cedula,
          telefono: t.telefono,
          rol: t.rol,
          estado: t.estado,
          hora_llegada: t.horaLlegada ?? null,
          leader_id: t.leaderId ?? null,
          actor_id: null,
        }, { onConflict: 'id' });
        if (error) throw error;
        resumen.testigos.insertados++;
      } catch (e: any) {
        resumen.testigos.errores.push(`Testigo ${t.cedula}: ${e.message}`);
      }
    }

    // -----------------------------------------------------------------
    // 6. Votantes CRM
    // -----------------------------------------------------------------
    const votantes = supabaseMock.getVotantes();
    for (const v of votantes) {
      try {
        const { error } = await supabase.from('votantes_crm').upsert({
          id: v.id,
          puesto_id: v.puestoId,
          nombre: v.nombre,
          cedula: v.cedula,
          telefono: v.telefono,
          direccion: v.direccion,
          barrio: v.barrio,
          intencion_voto: v.intencionVoto,
          lider_asignado: v.liderAsignado,
          contactado: v.contactado,
          necesita_transporte: v.necesitaTransporte,
          ya_voto: v.yaVoto,
          leader_id: v.leaderId ?? null,
          actor_id: null,
          lat: v.lat ?? null,
          lng: v.lng ?? null,
        }, { onConflict: 'id' });
        if (error) throw error;
        resumen.votantes.insertados++;
      } catch (e: any) {
        resumen.votantes.errores.push(`Votante ${v.cedula}: ${e.message}`);
      }
    }

    // -----------------------------------------------------------------
    // 7. Actas E-14
    // -----------------------------------------------------------------
    const actas = supabaseMock.getActasE14();
    for (const a of actas) {
      try {
        const { error } = await supabase.from('actas_e14').upsert({
          id: a.id,
          puesto_id: a.puestoId,
          mesa_numero: a.mesaNumero,
          hora_reporte: a.horaReporte,
          digitalizado_por: a.digitalizadoPor ?? null,
          votos_coalicion: a.votosCoalicion,
          votos_alianza: a.votosAlianza,
          votos_unidad: a.votosUnidad,
          votos_otros: a.votosOtros,
          votos_blanco: a.votosBlanco,
          votos_nulos: a.votosNulos,
          votos_no_marcados: a.votosNoMarcados ?? 0,
          total_votos_urna: a.totalVotosUrna,
          estado_revision: a.estadoRevision,
          foto_acta_url: a.fotoActaUrl ?? null,
          leader_id: a.leaderId ?? null,
          actor_id: null,
        }, { onConflict: 'id' });
        if (error) throw error;
        resumen.actas.insertados++;
      } catch (e: any) {
        resumen.actas.errores.push(`Acta ${a.id}: ${e.message}`);
      }
    }

    // -----------------------------------------------------------------
    // 8. Alertas de fraude
    // -----------------------------------------------------------------
    const alertas = supabaseMock.getAlertas();
    for (const al of alertas) {
      try {
        const { error } = await supabase.from('alertas_fraude').upsert({
          id: al.id,
          puesto_id: al.puestoId,
          puesto_nombre: al.puestoNombre,
          mesa_numero: al.mesaNumero,
          severidad: al.severidad,
          tipo: al.tipo,
          descripcion: al.descripcion,
          timestamp: al.timestamp,
          resuelta: al.resuelta,
          leader_id: al.leaderId ?? null,
          actor_id: null,
        }, { onConflict: 'id' });
        if (error) throw error;
        resumen.alertas.insertados++;
      } catch (e: any) {
        resumen.alertas.errores.push(`Alerta ${al.id}: ${e.message}`);
      }
    }

    return resumen;
  }
}
