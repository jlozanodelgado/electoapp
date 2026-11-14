import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useElectoralStore } from '../../store/electoralStore';
import { useSecurityStore } from '../../store/securityStore';
import { Button } from '../ui/Button';
import { Download, Upload, FileText, AlertTriangle, CheckCircle, Users } from 'lucide-react';

type TipoExportacion = 'lideres' | 'testigos' | 'votantes';

interface Props {
  candidatoId?: string | null;
  actorId?: string | null;
}

export const ImportarMasivoCandidato: React.FC<Props> = ({ candidatoId: candidatoIdProp, actorId: actorIdProp }) => {
  const {
    partidos,
    candidatos,
    actors,
    testigos,
    votantes,
    addActor,
    addTestigo,
    addVotante,
    addToast,
  } = useElectoralStore();
  const actorRole = useElectoralStore(s => s.actorRole);
  const actorId = useElectoralStore(s => s.actorId);
  const actorActivo = useSecurityStore(s => s.currentActor)();
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<{ tabla: string; total: number; exitosos: number; errores: string[] } | null>(null);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<any[][]>([]);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [hojaSeleccionada, setHojaSeleccionada] = useState<TipoExportacion>('lideres');

  const esSupervisorCandidato = actorRole === 'candidateSupervisor';
  const miCandidatoId = candidatoIdProp || actorActivo?.candidatoId;
  const miActorId = actorIdProp || actorId;

  const puedeExportar = esSupervisorCandidato && !!miCandidatoId && !!miActorId;

  if (!puedeExportar) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div className="p-4 text-center text-slate-500 text-xs">
          Debe estar autenticado como Supervisor de Candidato con un candidato asignado para usar esta función.
        </div>
      </div>
    );
  }

  const misLideres = actors.filter(
    (a: any) => a.role === 'leader' && a.candidatoId === miCandidatoId && a.supervisorId === miActorId
  );
  const misLideresIds = misLideres.map((l: any) => l.id);

  const misTestigos = testigos.filter((t: any) => t.leaderId && misLideresIds.includes(t.leaderId));
  const misVotantes = votantes.filter((v: any) => v.leaderId && misLideresIds.includes(v.leaderId));

  const COLUMNAS_REQUERIDAS: Record<TipoExportacion, string[]> = {
    lideres: ['nombre', 'cedula', 'telefono', 'direccion', 'barrio', 'departamento_id', 'municipio_id'],
    testigos: ['nombre', 'cedula', 'telefono', 'puesto_id', 'mesa_numero', 'rol', 'estado', 'leader_id'],
    votantes: ['nombre', 'cedula', 'telefono', 'direccion', 'barrio', 'intencion_voto', 'lider_asignado', 'contacto', 'necesita_transporte', 'ya_voto', 'leader_id', 'puesto_id'],
  };

  const COLUMNAS_EJEMPLO: Record<TipoExportacion, Record<string, any>> = {
    lideres: {
      nombre: 'Carlos Ramírez',
      cedula: '12345678',
      telefono: '+57 300 000 0001',
      direccion: 'Calle 12 # 5-20',
      barrio: 'Centro',
      departamento_id: 'valle',
      municipio_id: 'tulua',
      candidato_id: 'candidato-id-aqui',
      supervisor_id: 'supervisor-id-aqui',
    },
    testigos: {
      nombre: 'María González',
      cedula: '87654321',
      telefono: '+57 310 000 0001',
      puesto_id: 'puesto-tul-01',
      mesa_numero: 1,
      rol: 'testigo_mesa',
      estado: 'confirmado',
      leader_id: 'lider-id-aqui',
    },
    votantes: {
      nombre: 'Juan Pérez',
      cedula: '11223344',
      telefono: '+57 320 000 0001',
      direccion: 'Calle 15 # 10-30',
      barrio: 'San José',
      intencion_voto: 'voto_duro',
      lider_asignado: 'Líder Ejemplo',
      contacto: true,
      necesita_transporte: false,
      ya_voto: false,
      leader_id: 'lider-id-aqui',
      puesto_id: 'puesto-tul-01',
    },
  };

  const descargarPlantilla = () => {
    const wb = XLSX.utils.book_new();

    (Object.keys(COLUMNAS_REQUERIDAS) as TipoExportacion[]).forEach((hoja) => {
      const columnas = COLUMNAS_REQUERIDAS[hoja];
      const ejemplo = COLUMNAS_EJEMPLO[hoja];

      const datos = [
        columnas,
        columnas.map((c) => ejemplo[c] ?? ''),
      ];

      const ws = XLSX.utils.aoa_to_sheet(datos);
      const anchos = columnas.map((c) => ({ wch: Math.max(c.length, 12) }));
      ws['!cols'] = anchos;

      XLSX.utils.book_append_sheet(wb, ws, hoja);
    });

    XLSX.writeFile(wb, `plantilla_electoapp_candidato_${miCandidatoId}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    addToast({
      type: 'info',
      title: 'Plantilla descargada',
      message: 'Abre el archivo Excel y completa los datos en cada hoja.',
    });
  };

  const manejarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArchivo(file);
    setResultado(null);
    setErrorValidacion(null);

    const reader = new FileReader();
    reader.onload = (ev: any) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const ws = workbook.Sheets[hojaSeleccionada];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
        setVistaPrevia(json);
      } catch (err) {
        setErrorValidacion('No se pudo leer el archivo Excel.');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const validarFilas = (filas: any[][], tipo: TipoExportacion): { valido: boolean; registros: any[]; errores: string[] } => {
    const columnas = COLUMNAS_REQUERIDAS[tipo];
    const encabezados = filas[0] as string[];
    const registros: any[] = [];
    const errores: string[] = [];

    const faltantes = columnas.filter((c) => !encabezados.includes(c));
    if (faltantes.length > 0) {
      return {
        valido: false,
        registros: [],
        errores: [`Faltan columnas obligatorias en "${hojaSeleccionada}": ${faltantes.join(', ')}`],
      };
    }

    const indiceColumna = (col: string) => encabezados.indexOf(col);

    for (let i = 1; i < filas.length; i++) {
      const fila = filas[i];
      if (!fila || fila.every((c) => c == null || String(c).trim() === '')) continue;

      const registro: Record<string, any> = {};
      let filaValida = true;

      const obtener = (col: string) => {
        const idx = indiceColumna(col);
        return idx >= 0 ? fila[idx] : '';
      };

      columnas.forEach((col) => {
        const valor = obtener(col);
        if (valor == null || String(valor).trim() === '') {
          if (COLUMNAS_REQUERIDAS[tipo].includes(col)) {
            filaValida = false;
            errores.push(`Fila ${i + 1}: campo "${col}" está vacío.`);
          }
          registro[col] = null;
        } else {
          registro[col] = String(valor).trim();
        }
      });

      if (!filaValida) return { valido: false, registros: [], errores };

      const uuidCampos: string[] = [];
      if (tipo === 'lideres') {
        uuidCampos.push('candidato_id', 'supervisor_id', 'departamento_id', 'municipio_id');
      } else if (tipo === 'testigos') {
        uuidCampos.push('puesto_id', 'leader_id');
      } else if (tipo === 'votantes') {
        uuidCampos.push('puesto_id', 'leader_id');
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      uuidCampos.forEach((campo) => {
        if (registro[campo] && !uuidRegex.test(String(registro[campo]))) {
          errores.push(`Fila ${i + 1}: campo "${campo}" debe ser un UUID válido.`);
          filaValida = false;
        }
      });

      if ((tipo === 'testigos' || tipo === 'votantes') && registro.leader_id && !misLideresIds.includes(registro.leader_id)) {
        errores.push(`Fila ${i + 1}: el líder con ID "${registro.leader_id}" no existe o no pertenece a su candidato.`);
        filaValida = false;
      }

      if (filaValida) registros.push(registro);
    }

    return { valido: errores.length === 0, registros, errores };
  };

  const importar = async () => {
    if (!archivo) return;
    setCargando(true);
    setResultado(null);
    setErrorValidacion(null);

    try {
      const reader = new FileReader();
      reader.onload = async (ev: any) => {
        try {
          const data = new Uint8Array(ev.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const ws = workbook.Sheets[hojaSeleccionada];
          const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];

          const validacion = validarFilas(json, hojaSeleccionada);
          if (!validacion.valido) {
            setErrorValidacion(validacion.errores.join('\n'));
            setCargando(false);
            return;
          }

          const { registros, errores } = validacion;
          if (registros.length === 0) {
            setErrorValidacion('No se encontraron filas válidas para importar.');
            setCargando(false);
            return;
          }

          if (hojaSeleccionada === 'lideres') {
            for (const r of registros) {
              await addActor({
                nombre: r.nombre,
                cedula: r.cedula,
                telefono: r.telefono || '+57 300 000 0000',
                direccion: r.direccion || 'Calle principal',
                barrio: r.barrio || 'Barrio Central',
                departamentoId: r.departamento_id,
                municipioId: r.municipio_id,
                candidatoId: miCandidatoId,
                supervisorId: miActorId,
                role: 'leader',
                scopeLevel: 'municipality',
                scopeId: r.municipio_id,
              } as any);
            }
          } else if (hojaSeleccionada === 'testigos') {
            for (const r of registros) {
              await addTestigo({
                nombre: r.nombre,
                cedula: r.cedula,
                telefono: r.telefono || '+57 300 000 0000',
                puestoId: r.puesto_id,
                puestoNombre: 'Puesto General',
                mesaNumero: Number(r.mesa_numero) || 1,
                rol: r.rol as any,
                estado: r.estado as any,
                leaderId: r.leader_id,
              });
            }
          } else if (hojaSeleccionada === 'votantes') {
            for (const r of registros) {
              await addVotante({
                nombre: r.nombre,
                cedula: r.cedula,
                telefono: r.telefono || '+57 300 000 0000',
                direccion: r.direccion || 'Calle principal',
                barrio: r.barrio || 'Barrio Central',
                intencionVoto: r.intencion_voto as any,
                liderAsignado: r.lider_asignado,
                contactado: r.contacto === 'true' || r.contacto === true,
                necesitaTransporte: r.necesita_transporte === 'true' || r.necesita_transporte === true,
                yaVoto: r.ya_voto === 'true' || r.ya_voto === true,
                leaderId: r.leader_id,
                puestoId: r.puesto_id,
              });
            }
          }

          const exitosos = registros.length;
          setResultado({
            tabla: hojaSeleccionada,
            total: registros.length,
            exitosos,
            errores,
          });

          addToast({
            type: 'success',
            title: 'Importación completada',
            message: `${exitosos} registros insertados en ${hojaSeleccionada}.`,
          });
        } catch (err: any) {
          setErrorValidacion(err.message || 'Error inesperado durante la importación.');
          console.error(err);
        } finally {
          setCargando(false);
        }
      };
      reader.readAsArrayBuffer(archivo);
    } catch (err: any) {
      setErrorValidacion(err.message || 'Error al procesar el archivo.');
      setCargando(false);
    }
  };

  const limpiar = () => {
    setArchivo(null);
    setResultado(null);
    setErrorValidacion(null);
    setVistaPrevia([]);
    (document.getElementById(`file-${hojaSeleccionada}`) as HTMLInputElement).value = '';
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-5 h-5 text-emerald-400" />
        <h2 className="font-bold text-white">Importación Masiva por Excel</h2>
      </div>
      <p className="text-sm text-slate-400 mb-4">
        Descarga la plantilla, completa los datos y súbelos. Los datos se asignarán automáticamente a tu candidato y territorio.
      </p>

      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <label className="text-xs font-semibold text-slate-400 block mb-1">Hoja a importar</label>
          <select
            value={hojaSeleccionada}
            onChange={(e) => setHojaSeleccionada(e.target.value as TipoExportacion)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="lideres">Líderes</option>
            <option value="testigos">Testigos</option>
            <option value="votantes">Votantes</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs font-semibold text-slate-400 block mb-1">Columnas obligatorias</label>
          <div className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-400 overflow-x-auto whitespace-nowrap">
            {COLUMNAS_REQUERIDAS[hojaSeleccionada].map((c) => (
              <span key={c} className="inline-block bg-slate-800/50 px-2 py-1 rounded mr-1 mb-1">
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-xs font-semibold text-slate-400 block mb-1">Seleccionar archivo Excel</label>
        <input
          id={`file-${hojaSeleccionada}`}
          type="file"
          accept=".xlsx,.xls"
          onChange={manejarArchivo}
          disabled={cargando}
          className="block w-full text-sm text-slate-400
            file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
            file:text-sm file:font-semibold file:bg-blue-500/20 file:text-blue-400
            hover:file:bg-blue-500/30 cursor-pointer"
        />
      </div>

      {errorValidacion && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          <AlertTriangle className="w-4 h-4 mr-2" /> {errorValidacion}
        </div>
      )}

      {vistaPrevia.length > 0 && (
        <div className="mb-4 max-h-48 overflow-auto border border-slate-700 rounded-lg bg-slate-950">
          <table className="w-full text-xs text-slate-400">
            <thead>
              {vistaPrevia[0].map((c: any, i: number) => (
                <th key={i} className="px-2 py-1 border-b border-slate-700 bg-slate-900 text-left">
                  {c}
                </th>
              ))}
            </thead>
            <tbody>
              {vistaPrevia.slice(1, 6).map((fila: any, i: number) => (
                <tr key={i} className="border-b border-slate-800">
                  {fila.map((c: any, j: number) => (
                    <td key={j} className="px-2 py-1 border-r border-slate-800 truncate max-w-[120px]">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={importar}
          disabled={cargando || !archivo || resultado != null}
          variant="primary"
          size="sm"
          icon={<FileText className="w-4 h-4" />}
        >
          {cargando ? 'Importando…' : 'Importar a Supabase'}
        </Button>
        <Button
          onClick={descargarPlantilla}
          variant="outline"
          size="sm"
          icon={<Download className="w-4 h-4" />}
        >
          Descargar Plantilla
        </Button>
        <Button
          onClick={limpiar}
          variant="outline"
          size="sm"
          disabled={cargando}
        >
          Limpiar
        </Button>
      </div>

      {resultado && (
        <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-emerald-300">Importación exitosa</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-200">
            <div>
              <p className="text-xs text-slate-400 uppercase">Tabla</p>
              <p className="font-medium">{resultado.tabla}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Registros</p>
              <p className="font-medium">{resultado.total}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Exitosos</p>
              <p className="font-medium text-emerald-400">{resultado.exitosos}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Errores</p>
              <p className="font-medium text-rose-400">{resultado.errores.length}</p>
            </div>
          </div>
          {resultado.errores.length > 0 && (
            <div className="mt-3 max-h-32 overflow-auto text-xs text-rose-300 bg-rose-500/5 rounded p-2 border border-rose-500/20">
              {resultado.errores.map((e, i) => (
                <div key={i} className="mb-1 truncate">• {e}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
