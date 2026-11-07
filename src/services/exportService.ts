import { PuestoVotacion, TestigoElectoral, VotanteCRM } from '../types/electoral';

export class ExportService {
  private static downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Exportar Puestos a CSV
  static exportPuestosToCSV(puestos: PuestoVotacion[]) {
    const headers = [
      'ID',
      'Nombre Puesto',
      'Municipio',
      'Departamento',
      'Zona',
      'Comuna/Barrio',
      'Dirección',
      'Latitud',
      'Longitud',
      'Censo Electoral',
      'Mesas Habilitadas',
      'Meta Votos Campaña',
      'Votos Proyectados',
      'Prioridad',
      'Partido Dominante',
      'Participación %',
      'Abstencionismo %',
      'Cobertura Testigos %'
    ];

    const rows = puestos.map(p => [
      p.id,
      `"${p.nombre}"`,
      p.municipioId,
      p.departamentoId,
      `"${p.zona}"`,
      `"${p.comunaBarrio}"`,
      `"${p.direccion}"`,
      p.lat,
      p.lng,
      p.censoElectoral,
      p.mesasHabilitadas,
      p.metaVotosCampana,
      p.votosProyectados,
      p.estadoPrioridad,
      p.partidoDominante,
      p.participacionHistoricaPct,
      p.abstencionismoPct,
      p.coberturaTestigosPct
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    this.downloadFile(csvContent, `electoapp_puestos_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
  }

  // Exportar a Excel (TSV / XML format compatible con MS Excel sin dependencias)
  static exportPuestosToExcel(puestos: PuestoVotacion[]) {
    const headers = [
      'ID',
      'Nombre Puesto',
      'Municipio',
      'Departamento',
      'Zona',
      'Dirección',
      'Censo',
      'Mesas',
      'Meta Votos',
      'Votos Proyectados',
      'Prioridad',
      'Partido Dominante'
    ];

    const rows = puestos.map(p => [
      p.id,
      p.nombre,
      p.municipioId.toUpperCase(),
      p.departamentoId.toUpperCase(),
      p.zona,
      p.direccion,
      p.censoElectoral,
      p.mesasHabilitadas,
      p.metaVotosCampana,
      p.votosProyectados,
      p.estadoPrioridad.toUpperCase(),
      p.partidoDominante.toUpperCase()
    ]);

    // TSV with Excel BOM opens directly in Excel as native formatted spreadsheet
    const excelContent = '\uFEFF' + [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\r\n');
    this.downloadFile(excelContent, `electoapp_analisis_territorial_${new Date().toISOString().slice(0, 10)}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
  }

  // Exportar Testigos a CSV
  static exportTestigosToCSV(testigos: TestigoElectoral[]) {
    const headers = ['ID', 'Puesto', 'Mesa', 'Nombre Testigo', 'Cédula', 'Teléfono', 'Rol', 'Estado', 'Hora Llegada'];
    const rows = testigos.map(t => [
      t.id,
      `"${t.puestoNombre}"`,
      t.mesaNumero,
      `"${t.nombre}"`,
      t.cedula,
      t.telefono,
      t.rol,
      t.estado,
      t.horaLlegada || 'No reportado'
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    this.downloadFile(csvContent, `electoapp_testigos_electorales_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
  }

  // Exportar Votantes CRM a CSV
  static exportVotantesToCSV(votantes: VotanteCRM[]) {
    const headers = ['ID', 'Puesto ID', 'Nombre', 'Cédula', 'Teléfono', 'Dirección', 'Barrio', 'Intención Voto', 'Líder Asignado', 'Contactado', 'Transporte', 'Ya Votó'];
    const rows = votantes.map(v => [
      v.id,
      v.puestoId,
      `"${v.nombre}"`,
      v.cedula,
      v.telefono,
      `"${v.direccion}"`,
      `"${v.barrio}"`,
      v.intencionVoto,
      `"${v.liderAsignado}"`,
      v.contactado ? 'SÍ' : 'NO',
      v.necesitaTransporte ? 'SÍ' : 'NO',
      v.yaVoto ? 'SÍ' : 'NO'
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    this.downloadFile(csvContent, `electoapp_crm_votantes_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
  }

  // Exportar Capa GeoJSON
  static exportPuestosToGeoJSON(puestos: PuestoVotacion[]) {
    const geojson = {
      type: 'FeatureCollection',
      name: 'PuestosVotacion_ElectoApp',
      crs: {
        type: 'name',
        properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
      },
      features: puestos.map(p => ({
        type: 'Feature',
        properties: {
          id: p.id,
          nombre: p.nombre,
          municipio: p.municipioId,
          departamento: p.departamentoId,
          zona: p.zona,
          censo: p.censoElectoral,
          mesas: p.mesasHabilitadas,
          metaVotos: p.metaVotosCampana,
          votosProyectados: p.votosProyectados,
          partidoDominante: p.partidoDominante,
          participacionPct: p.participacionHistoricaPct,
          coberturaTestigos: p.coberturaTestigosPct,
        },
        geometry: {
          type: 'Point',
          coordinates: [p.lng, p.lat]
        }
      }))
    };

    const jsonStr = JSON.stringify(geojson, null, 2);
    this.downloadFile(jsonStr, `electoapp_puestos_layer_${new Date().toISOString().slice(0, 10)}.geojson`, 'application/geo+json;charset=utf-8;');
  }
}

