import { supabase, isSupabaseConfigured } from './supabaseClient';
import { supabaseMock } from './supabaseMock';
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

export class SupabaseService {
  // Carga inicial de Puestos
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

      // Mapear snake_case a camelCase si viene de PostgreSQL
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

  // Testigos Electorales
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
      }));
    } catch (err) {
      return supabaseMock.getTestigos();
    }
  }

  static async saveTestigo(testigo: Omit<TestigoElectoral, 'id'>): Promise<TestigoElectoral> {
    const nuevoMock = supabaseMock.addTestigo(testigo);

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('testigos_electorales').insert({
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
        });
      } catch (e) {
        console.warn('Error guardando en Supabase remoto:', e);
      }
    }

    return nuevoMock;
  }

  // Votantes CRM
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
      }));
    } catch (err) {
      return supabaseMock.getVotantes();
    }
  }

  static async saveVotante(votante: Omit<VotanteCRM, 'id'>): Promise<VotanteCRM> {
    const nuevoMock = supabaseMock.addVotante(votante);

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('votantes_crm').insert({
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
        });
      } catch (e) {
        console.warn('Error guardando votante en Supabase:', e);
      }
    }

    return nuevoMock;
  }

  // Actas E-14
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
      }));
    } catch (err) {
      return supabaseMock.getActasE14();
    }
  }

  static async saveActaE14(acta: Omit<ActaE14, 'id'>): Promise<ActaE14> {
    const res = supabaseMock.addActaE14(acta);

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('actas_e14').insert({
          id: res.id,
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
        });
      } catch (e) {
        console.warn('Error sincronizando acta con Supabase:', e);
      }
    }

    return res;
  }

  // Alertas de Fraude
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
      }));
    } catch (err) {
      return supabaseMock.getAlertas();
    }
  }

  static async resolveAlerta(id: string): Promise<void> {
    supabaseMock.resolverAlerta(id);

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
  }

  // Partidos
  static async getPartidos(): Promise<Partido[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return supabaseMock.getPartidos();
    }

    try {
      const { data, error } = await supabase
        .from('partidos')
        .select('*')
        .order('nombre');

      if (error || !data) {
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
    const nuevoMock = supabaseMock.addPartido(partido as Partido);

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('partidos').insert({
          id: nuevoMock.id,
          nombre: partido.nombre,
          siglas: partido.siglas,
          color: partido.color,
          logo_url: partido.logoUrl,
        });
      } catch (e) {
        console.warn('Error guardando partido en Supabase:', e);
      }
    }

    return nuevoMock;
  }

  // Candidatos
  static async getCandidatos(): Promise<Candidato[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return supabaseMock.getCandidatos();
    }

    try {
      const { data, error } = await supabase
        .from('candidatos')
        .select('*')
        .order('nombre');

      if (error || !data) {
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
    const nuevoMock = supabaseMock.addCandidato(candidato as Candidato);

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('candidatos').insert({
          id: nuevoMock.id,
          partido_id: candidato.partidoId,
          nombre: candidato.nombre,
          apellido: candidato.apellido,
          cedula: candidato.cedula,
          cargo: candidato.cargo,
          numero_tarjeton: candidato.numeroTarjeton,
          numero_lista: candidato.numeroLista,
          departamento_id: candidato.departamentoId,
          municipio_id: candidato.municipioId,
          foto_url: candidato.fotoUrl,
        });
      } catch (e) {
        console.warn('Error guardando candidato en Supabase:', e);
      }
    }

    return nuevoMock;
  }

  // Actores
  static async getActors(): Promise<Actor[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return supabaseMock.getActors();
    }

    try {
      const { data, error } = await supabase
        .from('actors')
        .select('*')
        .order('creado_en', { ascending: false });

      if (error || !data) {
        return supabaseMock.getActors();
      }

      return data.map((a: any) => ({
        id: a.id,
        nombre: a.nombre,
        role: a.role,
        nivel: a.nivel,
        candidatoId: a.candidato_id,
        supervisorId: a.supervisor_id,
        leaderId: a.leader_id,
        scopeLevel: a.scope_level,
        scopeId: a.scope_id,
        userId: a.user_id,
        territorio: a.territorio,
        creadoEn: a.creado_en,
      }));
    } catch (err) {
      return supabaseMock.getActors();
    }
  }

  static async saveActor(actor: Omit<Actor, 'id' | 'creadoEn'>): Promise<Actor> {
    const nuevoMock = supabaseMock.addActor(actor as Actor);

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('actors').insert({
          id: nuevoMock.id,
          nombre: actor.nombre,
          role: actor.role,
          nivel: actor.nivel,
          candidato_id: actor.candidatoId,
          supervisor_id: actor.supervisorId,
          leader_id: actor.leaderId,
          scope_level: actor.scopeLevel,
          scope_id: actor.scopeId,
          user_id: actor.userId,
          territorio: actor.territorio,
        });
      } catch (e) {
        console.warn('Error guardando actor en Supabase:', e);
      }
    }

    return nuevoMock;
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

  // Suscripción en Tiempo Real (Supabase Realtime WebSockets)
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

