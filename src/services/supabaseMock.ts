import { 
  PuestoVotacion, 
  TestigoElectoral, 
  VotanteCRM, 
  ActaE14, 
  AlertaFraude 
} from '../types/electoral';
import { 
  PUESTOS_VOTACION, 
  TESTIGOS_INICIALES, 
  VOTANTES_INICIALES, 
  ACTAS_E14_INICIALES, 
  ALERTAS_FRAUDE_INICIALES 
} from '../data/mockElectoralData';

const STORAGE_KEYS = {
  PUESTOS: 'electoapp_tulua_puestos_v1',
  TESTIGOS: 'electoapp_tulua_testigos_v1',
  VOTANTES: 'electoapp_tulua_votantes_v1',
  ACTAS: 'electoapp_tulua_actas_v1',
  ALERTAS: 'electoapp_tulua_alertas_v1',
};

class SupabasePostGISMockService {
  private getStorage<T>(key: string, defaultData: T): T {
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('LocalStorage error, using defaults', e);
    }
    return defaultData;
  }

  private setStorage<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }
  }

  // Puestos
  getPuestos(): PuestoVotacion[] {
    return this.getStorage(STORAGE_KEYS.PUESTOS, PUESTOS_VOTACION);
  }

  updatePuesto(id: string, updates: Partial<PuestoVotacion>): PuestoVotacion[] {
    const list = this.getPuestos().map(p => p.id === id ? { ...p, ...updates } : p);
    this.setStorage(STORAGE_KEYS.PUESTOS, list);
    return list;
  }

  // Testigos
  getTestigos(): TestigoElectoral[] {
    return this.getStorage(STORAGE_KEYS.TESTIGOS, TESTIGOS_INICIALES);
  }

  addTestigo(testigo: Omit<TestigoElectoral, 'id'>): TestigoElectoral {
    const list = this.getTestigos();
    const nuevo: TestigoElectoral = {
      ...testigo,
      id: `testigo-${Date.now()}`
    };
    list.unshift(nuevo);
    this.setStorage(STORAGE_KEYS.TESTIGOS, list);
    return nuevo;
  }

  updateTestigo(id: string, updates: Partial<TestigoElectoral>): TestigoElectoral[] {
    const list = this.getTestigos().map(t => t.id === id ? { ...t, ...updates } : t);
    this.setStorage(STORAGE_KEYS.TESTIGOS, list);
    return list;
  }

  // Votantes CRM
  getVotantes(): VotanteCRM[] {
    return this.getStorage(STORAGE_KEYS.VOTANTES, VOTANTES_INICIALES);
  }

  addVotante(votante: Omit<VotanteCRM, 'id'>): VotanteCRM {
    const list = this.getVotantes();
    const nuevo: VotanteCRM = {
      ...votante,
      id: `votante-${Date.now()}`
    };
    list.unshift(nuevo);
    this.setStorage(STORAGE_KEYS.VOTANTES, list);
    return nuevo;
  }

  updateVotante(id: string, updates: Partial<VotanteCRM>): VotanteCRM[] {
    const list = this.getVotantes().map(v => v.id === id ? { ...v, ...updates } : v);
    this.setStorage(STORAGE_KEYS.VOTANTES, list);
    return list;
  }

  // Actas E-14
  getActasE14(): ActaE14[] {
    return this.getStorage(STORAGE_KEYS.ACTAS, ACTAS_E14_INICIALES);
  }

  addActaE14(acta: Omit<ActaE14, 'id'>): { acta: ActaE14; nuevaAlerta?: AlertaFraude } {
    const list = this.getActasE14();
    const nuevo: ActaE14 = {
      ...acta,
      id: `acta-e14-${Date.now()}`
    };
    list.unshift(nuevo);
    this.setStorage(STORAGE_KEYS.ACTAS, list);

    // Detección automática de fraude / anomalía
    let nuevaAlerta: AlertaFraude | undefined;
    const totalSuma = acta.votosCoalicion + acta.votosAlianza + acta.votosUnidad + acta.votosOtros + acta.votosBlanco + acta.votosNulos + acta.votosNoMarcados;
    
    // Alerta 1: Discrepancia entre suma y total urna
    if (Math.abs(totalSuma - acta.totalVotosUrna) > 5) {
      nuevaAlerta = this.addAlertaFraude({
        puestoId: acta.puestoId,
        puestoNombre: `Puesto ${acta.puestoId}`,
        mesaNumero: acta.mesaNumero,
        severidad: 'alta',
        tipo: 'discrepancia_urna',
        descripcion: `Discrepancia aritmética: Suma de votos por partido (${totalSuma}) no coincide con el total de votos en urna reportado (${acta.totalVotosUrna}).`,
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        resuelta: false,
      });
    } else if (acta.votosNulos > (acta.totalVotosUrna * 0.12)) {
      // Alerta 2: Votos nulos anormalmente altos (> 12%)
      nuevaAlerta = this.addAlertaFraude({
        puestoId: acta.puestoId,
        puestoNombre: `Puesto ${acta.puestoId}`,
        mesaNumero: acta.mesaNumero,
        severidad: 'alta',
        tipo: 'nulos_anormales',
        descripcion: `Porcentaje anómalo de votos nulos detectado: ${acta.votosNulos} votos (${((acta.votosNulos / acta.totalVotosUrna) * 100).toFixed(1)}%). Umbral máximo esperado: 5%.`,
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        resuelta: false,
      });
    }

    return { acta: nuevo, nuevaAlerta };
  }

  // Alertas de fraude
  getAlertas(): AlertaFraude[] {
    return this.getStorage(STORAGE_KEYS.ALERTAS, ALERTAS_FRAUDE_INICIALES);
  }

  addAlertaFraude(alerta: Omit<AlertaFraude, 'id'>): AlertaFraude {
    const list = this.getAlertas();
    const nuevo: AlertaFraude = {
      ...alerta,
      id: `alerta-${Date.now()}`
    };
    list.unshift(nuevo);
    this.setStorage(STORAGE_KEYS.ALERTAS, list);
    return nuevo;
  }

  resolverAlerta(id: string): AlertaFraude[] {
    const list = this.getAlertas().map(a => a.id === id ? { ...a, resuelta: true } : a);
    this.setStorage(STORAGE_KEYS.ALERTAS, list);
    return list;
  }

  // Simulación PostGIS: ST_DWithin (puntos a menos de X km de una coordenada)
  postgisST_DWithin(centerLat: number, centerLng: number, radiusKm: number): PuestoVotacion[] {
    const puestos = this.getPuestos();
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371; // Radio tierra en km

    return puestos.filter(p => {
      const dLat = toRad(p.lat - centerLat);
      const dLng = toRad(p.lng - centerLng);
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(centerLat)) * Math.cos(toRad(p.lat)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      return distance <= radiusKm;
    });
  }

  resetToDefaults(): void {
    localStorage.removeItem(STORAGE_KEYS.PUESTOS);
    localStorage.removeItem(STORAGE_KEYS.TESTIGOS);
    localStorage.removeItem(STORAGE_KEYS.VOTANTES);
    localStorage.removeItem(STORAGE_KEYS.ACTAS);
    localStorage.removeItem(STORAGE_KEYS.ALERTAS);
  }
}

export const supabaseMock = new SupabasePostGISMockService();

