import { supabase, isSupabaseConfigured } from './supabaseClient';
import { supabaseMock } from './supabaseMock';
import { generateUuid } from '../utils/uuid';
import { 
  PuestoVotacion, 
  TestigoElectoral, 
  VotanteCRM, 
  ActaE14, 
  AlertaFraude,
  Partido,
  Candidato,
  Actor
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
function describeSupabaseError(message: string, tabla: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('duplicate key') || lower.includes('unique constraint')) {
    return `Ya existe un registro con esos datos en ${tabla}. Verifica que las siglas o la cédula no estén repetidas.`;
  }
  if (lower.includes('foreign key')) {
    return 'El registro hace referencia a un partido, departamento o municipio que no existe en la base de datos.';
  }
  if (lower.includes('row-level security')) {
    return `La base de datos rechazó la operación por permisos (RLS) en ${tabla}.`;
  }
  if (lower.includes('invalid input syntax for type uuid')) {
    return 'Se generó un identificador inválido. Recarga la página e inténtalo de nuevo.';
  }
  return message;
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

  // ---------------------------------------------------------------------
  // Testigos (electoral witnesses)
  // ---------------------------------------------------------------------
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
    const nuevoMock = supabaseMock.addTestigo(testigo);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('testigos_electorales')
          .insert({
            id: nuevoMock.id,
            puesto_id: testigo.puestoId,
            puesto_nombre: testigo.puestoNombre,
            mesa_numero: testigo.mesaNumero,
            nombre: testigo.nombre,
            cedula: testigo.cedula,
            telefono: testigo.telefono,
            rol: testigo.rol,
            estado: testigo.estado,
            hora_llegada: testigo.horaLlegada,
            leader_id: testigo.leaderId,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          return {
            id: data.id,
            puestoId: data.puesto_id,
            puestoNombre: data.puesto_nombre,
            mesaNumero: data.mesa_numero,
            nombre: data.nombre,
            cedula: data.cedula,
            telefono: data.telefono,
            rol: data.rol,
            estado: data.estado,
            horaLlegada: data.hora_llegada,
            leaderId: data.leader_id,
          };
        }
      } catch (e) {
        console.warn('Error guardando testigo en Supabase:', e);
      }
    }

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

        await supabase.from('testigos_electorales').update(updatesDb).eq('id', id);
      } catch (e) {
        console.warn('Error actualizando testigo en Supabase:', e);
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
    const nuevoMock = supabaseMock.addVotante(votante);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('votantes_crm')
          .insert({
            id: nuevoMock.id,
            puesto_id: votante.puestoId,
            nombre: votante.nombre,
            cedula: votante.cedula,
            telefono: votante.telefono,
            direccion: votante.direccion,
            barrio: votante.barrio,
            intencion_voto: votante.intencionVoto,
            lider_asignado: votante.liderAsignado,
            contactado: votante.contactado,
            necesita_transporte: votante.necesitaTransporte,
            ya_voto: votante.yaVoto,
            leader_id: votante.leaderId,
            lat: votante.lat,
            lng: votante.lng,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          return {
            id: data.id,
            puestoId: data.puesto_id,
            nombre: data.nombre,
            cedula: data.cedula,
            telefono: data.telefono,
            direccion: data.direccion,
            barrio: data.barrio,
            intencionVoto: data.intencion_voto,
            liderAsignado: data.lider_asignado,
            contactado: data.contactado,
            necesitaTransporte: data.necesita_transporte,
            yaVoto: data.ya_voto,
            leaderId: data.leader_id,
            lat: data.lat,
            lng: data.lng,
          };
        }
      } catch (e) {
        console.warn('Error guardando votante en Supabase:', e);
      }
    }

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

        await supabase.from('votantes_crm').update(updatesDb).eq('id', id);
      } catch (e) {
        console.warn('Error actualizando votante en Supabase:', e);
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
    const nuevoMock = supabaseMock.addActaE14(acta);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('actas_e14')
          .insert({
            id: nuevoMock.id,
            puesto_id: acta.puestoId,
            mesa_numero: acta.mesaNumero,
            hora_reporte: acta.horaReporte,
            digitalizado_por: acta.digitalizadoPor,
            votos_coalicion: acta.votosCoalicion,
            votos_alianza: acta.votosAlianza,
            votos_unidad: acta.votosUnidad,
            votos_otros: acta.votosOtros,
            votos_blanco: acta.votosBlanco,
            votos_nulos: acta.votosNulos,
            votos_no_marcados: acta.votosNoMarcados,
            total_votos_urna: acta.totalVotosUrna,
            estado_revision: acta.estadoRevision,
            foto_acta_url: acta.fotoActaUrl,
            leader_id: acta.leaderId,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          return {
            id: data.id,
            puestoId: data.puesto_id,
            mesaNumero: data.mesa_numero,
            horaReporte: data.hora_reporte,
            digitalizadoPor: data.digitalizado_por,
            votosCoalicion: data.votos_coalicion,
            votosAlianza: data.votos_alianza,
            votosUnidad: data.votos_unidad,
            votosOtros: data.votos_otros,
            votosBlanco: data.votos_blanco,
            votosNulos: data.votos_nulos,
            votosNoMarcados: data.votos_no_marcados,
            totalVotosUrna: data.total_votos_urna,
            estadoRevision: data.estado_revision,
            fotoActaUrl: data.foto_acta_url,
            leaderId: data.leader_id,
          };
        }
      } catch (e) {
        console.warn('Error sincronizando acta con Supabase:', e);
      }
    }

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

        await supabase.from('actas_e14').update(updatesDb).eq('id', id);
      } catch (e) {
        console.warn('Error actualizando acta en Supabase:', e);
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
    const nuevoMock = supabaseMock.addAlertaFraude(alerta);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('alertas_fraude')
          .insert({
            id: nuevoMock.id,
            puesto_id: alerta.puestoId,
            puesto_nombre: alerta.puestoNombre,
            mesa_numero: alerta.mesaNumero,
            severidad: alerta.severidad,
            tipo: alerta.tipo,
            descripcion: alerta.descripcion,
            timestamp: alerta.timestamp,
            resuelta: alerta.resuelta,
            leader_id: alerta.leaderId,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          return {
            id: data.id,
            puestoId: data.puesto_id,
            puestoNombre: data.puesto_nombre,
            mesaNumero: data.mesa_numero,
            severidad: data.severidad,
            tipo: data.tipo,
            descripcion: data.descripcion,
            timestamp: data.timestamp,
            resuelta: data.resuelta,
            leaderId: data.leader_id,
          };
        }
      } catch (e) {
        console.warn('Error guardando alerta en Supabase:', e);
      }
    }

    return nuevoMock;
  }

  static async resolverAlerta(id: string, metadata?: { leaderId?: string }): Promise<AlertaFraude[]> {
    const updatedMock = supabaseMock.resolverAlerta(id, metadata);

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('alertas_fraude')
          .update({ resuelta: true })
          .eq('id', id);
      } catch (e) {
        console.warn('Error resolviendo alerta en Supabase:', e);
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

  static async savePartido(partido: Omit<Partido, 'id' | 'creadoEn'>): Promise<Partido> {
    const nuevo: Partido = {
      ...partido,
      id: generateUuid(),
      creadoEn: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('partidos').insert({
          id: nuevo.id,
          nombre: nuevo.nombre,
          siglas: nuevo.siglas,
          color: nuevo.color,
          logo_url: nuevo.logoUrl,
        });

        if (error) {
          console.error('[Supabase] Error guardando partido:', error.message);
          throw new Error(describeSupabaseError(error.message, 'partidos'));
        }
      } catch (e) {
        console.error('[Supabase] Error guardando partido:', e);
        throw e;
      }
    }

    supabaseMock.addPartido(nuevo);
    return nuevo;
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
    const nuevo: Candidato = {
      ...candidato,
      id: generateUuid(),
      creadoEn: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('candidatos').insert({
          id: nuevo.id,
          partido_id: nuevo.partidoId,
          nombre: nuevo.nombre,
          apellido: nuevo.apellido,
          cedula: nuevo.cedula,
          cargo: nuevo.cargo,
          numero_tarjeton: nuevo.numeroTarjeton,
          numero_lista: nuevo.numeroLista,
          departamento_id: nuevo.departamentoId,
          municipio_id: nuevo.municipioId,
          foto_url: nuevo.fotoUrl,
        });

        if (error) {
          console.error('[Supabase] Error guardando candidato:', error.message);
          throw new Error(describeSupabaseError(error.message, 'candidatos'));
        }
      } catch (e) {
        console.error('[Supabase] Error guardando candidato:', e);
        throw e;
      }
    }

    supabaseMock.addCandidato(nuevo);
    return nuevo;
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
    const nuevo: Actor = {
      ...actor,
      id: generateUuid(),
      creadoEn: new Date().toISOString(),
    };

    supabaseMock.addActor(nuevo);

    if (isSupabaseConfigured() && supabase) {
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
        }
      } catch (e) {
        console.error('[Supabase] Error guardando actor:', e);
      }
    }

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
}
