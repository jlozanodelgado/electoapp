import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useElectoralStore } from '../../store/electoralStore';
import { Button } from '../ui/Button';
import { Download, Upload, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';

interface ImportResult {
  tabla: string;
  total: number;
  exitosos: number;
  errores: string[];
}

type HojaTipo = 'departamentos' | 'municipios' | 'puestos_votacion';

const COLUMNAS_REQUERIDAS: Record<HojaTipo, string[]> = {
  departamentos: ['id', 'nombre', 'codigo', 'censo', 'curules', 'lat', 'lng'],
  municipios: ['id', 'departamento_id', 'nombre', 'codigo', 'censo', 'curules', 'lat', 'lng'],
  puestos_votacion: [
    'id', 'nombre', 'municipio_id', 'departamento_id', 'zona', 'comuna_barrio',
    'direccion', 'lat', 'lng', 'censo_electoral', 'mesas_habilitadas',
    'meta_votos_campana', 'votos_proyectados',
  ],
};

const COLUMNAS_EJEMPLO: Record<HojaTipo, Record<string, string | number>> = {
  departamentos: {
    id: 'valle',
    nombre: 'Valle del Cauca',
    codigo: '76',
    censo: 3780000,
    curules: 13,
    lat: 4.0847,
    lng: -76.1954,
  },
  municipios: {
    id: 'tulua',
    departamento_id: 'valle',
    nombre: 'Tuluá',
    codigo: '76834',
    censo: 178500,
    curules: 17,
    lat: 4.0847,
    lng: -76.1954,
  },
  puestos_votacion: {
    id: 'puesto-001',
    nombre: 'Colegio San José',
    municipio_id: 'tulua',
    departamento_id: 'valle',
    zona: 'Centro',
    comuna_barrio: 'Comuna 1',
    direccion: 'Calle 12 # 5-20',
    lat: 4.0847,
    lng: -76.1954,
    censo_electoral: 1200,
    mesas_habilitadas: 4,
    meta_votos_campana: 800,
    votos_proyectados: 700,
  },
};

export const ImportarMasivoExcel: React.FC = () => {
  const { addToast } = useElectoralStore();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [hojaSeleccionada, setHojaSeleccionada] = useState<HojaTipo>('departamentos');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<ImportResult | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<any[][]>([]);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  // ------------------------------------------------------------
  // 1. DESCARGAR PLANTILLA
  // ------------------------------------------------------------
  const descargarPlantilla = () => {
    const wb = XLSX.utils.book_new();

    (Object.keys(COLUMNAS_REQUERIDAS) as HojaTipo[]).forEach((hoja) => {
      const columnas = COLUMNAS_REQUERIDAS[hoja];
      const ejemplo = COLUMNAS_EJEMPLO[hoja];

      const datos = [
        columnas, // fila de encabezados
        columnas.map((c) => ejemplo[c] ?? ''), // fila de ejemplo
      ];

      const ws = XLSX.utils.aoa_to_sheet(datos);

      // Ancho de columnas automático aproximado
      const anchos = columnas.map((c) => ({ wch: Math.max(c.length, 12) }));
      ws['!cols'] = anchos;

      XLSX.utils.book_append_sheet(wb, ws, hoja);
    });

    XLSX.writeFile(wb, 'plantilla_electoapp_departamentos_municipios_puestos.xlsx');
    addToast({
      type: 'info',
      title: 'Plantilla descargada',
      message: 'Abre el archivo Excel y completa los datos en cada hoja.',
    });
  };

  // ------------------------------------------------------------
  // 2. LEER ARCHIVO AL SELECCIONARLO
  // ------------------------------------------------------------
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

        if (!workbook.SheetNames.includes(hojaSeleccionada)) {
          setErrorValidacion(
            `El archivo no tiene la hoja "${hojaSeleccionada}". Hojas disponibles: ${workbook.SheetNames.join(', ')}`,
          );
          return;
        }

        const ws = workbook.Sheets[hojaSeleccionada];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
        setVistaPrevia(json);
      } catch (err) {
        setErrorValidacion('No se pudo leer el archivo Excel. Verifica que sea un archivo .xlsx válido.');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ------------------------------------------------------------
  // 3. VALIDAR FILAS ANTES DE IMPORTAR
  // ------------------------------------------------------------
  const validarFilas = (filas: any[][]): { valido: boolean; registros: any[]; errores: string[] } => {
    const columnas = COLUMNAS_REQUERIDAS[hojaSeleccionada];
    const encabezados = filas[0] as string[];
    const registros: any[] = [];
    const errores: string[] = [];

    // Verificar que las columnas requeridas existan
    const faltantes = columnas.filter((c) => !encabezados.includes(c));
    if (faltantes.length > 0) {
      return {
        valido: false,
        registros: [],
        errores: [`Faltan columnas obligatorias en la hoja "${hojaSeleccionada}": ${faltantes.join(', ')}`],
      };
    }

    const indiceColumna = (nombre: string) => encabezados.indexOf(nombre);

    for (let i = 1; i < filas.length; i++) {
      const fila = filas[i];
      if (!fila || fila.every((c) => c == null || String(c).trim() === '')) continue; // saltar vacías

      const obtener = (col: string) => {
        const idx = indiceColumna(col);
        return idx >= 0 ? fila[idx] : '';
      };

      const registro: Record<string, any> = {};
      let filaValida = true;

      columnas.forEach((col) => {
        const valor = obtener(col);
        if (valor == null || String(valor).trim() === '') {
          if (COLUMNAS_REQUERIDAS[hojaSeleccionada].includes(col)) {
            filaValida = false;
            errores.push(`Fila ${i + 1}: campo "${col}" está vacío.`);
          }
          registro[col] = null;
        } else {
          registro[col] = String(valor).trim();
        }
      });

      if (!filaValida) return { valido: false, registros: [], errores };

      // Convertir numéricos
      const numericos: Record<string, 'int' | 'float'> = {
        censo: 'int', curules: 'int', zoom: 'int', lat: 'float', lng: 'float',
        censo_electoral: 'int', mesas_habilitadas: 'int', meta_votos_campana: 'int',
        votos_proyectados: 'int', participacion_pct: 'float',
        margen_victoria_pct: 'float', participacion_historica_pct: 'float',
        abstencionismo_pct: 'float', cobertura_testigos_pct: 'float',
      };

      Object.keys(registro).forEach((k) => {
        if (numericos[k] && registro[k] != null) {
          const num = parseFloat(String(registro[k]));
          if (isNaN(num)) {
            errores.push(`Fila ${i + 1}: campo "${k}" debe ser numérico.`);
            filaValida = false;
          } else {
            registro[k] = numericos[k] === 'int' ? Math.round(num) : num;
          }
        }
      });

      // zonas es un array de texto separado por comas
      if (hojaSeleccionada === 'municipios' && registro.zonas) {
        registro.zonas = String(registro.zonas)
          .split(',')
          .map((z: string) => z.trim())
          .filter((z: string) => z.length > 0);
      }

      if (filaValida) registros.push(registro);
    }

    return { valido: errores.length === 0, registros, errores };
  };

  // ------------------------------------------------------------
  // 4. IMPORTAR A SUPABASE
  // ------------------------------------------------------------
  const importar = async () => {
    if (!archivo) return;
    if (!isSupabaseConfigured() || !supabase) {
      setErrorValidacion('Supabase no está configurado. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env');
      return;
    }
    setCargando(true);
    setResultado(null);
    setErrorValidacion(null);

    try {
      const reader = new FileReader();
      reader.onload = async (ev: any) => {
        try {
          const sb = supabase;
          if (!sb) {
            setErrorValidacion('Supabase no está configurado.');
            setCargando(false);
            return;
          }
          const data = new Uint8Array(ev.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const ws = workbook.Sheets[hojaSeleccionada];
          const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];

          const validacion = validarFilas(json);
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

          // Insertar en Supabase
          const { error } = await sb
            .from(hojaSeleccionada)
            .upsert(registros, { onConflict: 'id' });

          if (error) {
            setErrorValidacion(`Error de base de datos: ${error.message}`);
            setCargando(false);
            return;
          }

          const res: ImportResult = {
            tabla: hojaSeleccionada,
            total: registros.length,
            exitosos: registros.length,
            errores,
          };
          setResultado(res);
          addToast({
            type: 'success',
            title: 'Importación completada',
            message: `${registros.length} registros insertados/actualizados en ${hojaSeleccionada}.`,
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
    <div className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Download className="w-5 h-5 text-emerald-400" />
          <h2 className="font-bold text-white">Descargar Plantilla Excel</h2>
        </div>
        <p className="text-sm text-slate-400 mb-3">
          Descarga la plantilla con las columnas obligatorias y un ejemplo de fila.
          Completa los datos en Excel y luego súbelos abajo.
        </p>
        <Button
          onClick={descargarPlantilla}
          variant="outline"
          size="sm"
          icon={<Download className="w-4 h-4" />}
        >
          Descargar Plantilla (.xlsx)
        </Button>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-5 h-5 text-blue-400" />
          <h2 className="font-bold text-white">Importar Datos Masivos</h2>
        </div>

        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Hoja a importar
            </label>
            <select
              value={hojaSeleccionada}
              onChange={(e) => setHojaSeleccionada(e.target.value as HojaTipo)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="departamentos">Departamentos</option>
              <option value="municipios">Municipios</option>
              <option value="puestos_votacion">Puestos de Votación</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Columnas obligatorias
            </label>
            <div className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-400 overflow-x-auto whitespace-nowrap">
              {COLUMNAS_REQUERIDAS[hojaSeleccionada].map((c) => (
                <span key={c} className="inline-block bg-slate-800/50 px-2 py-1 rounded mr-1">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-400 block mb-1">
            Seleccionar archivo Excel
          </label>
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
                <tr>
                  {vistaPrevia[0].map((c: any, i: number) => (
                    <th key={i} className="px-2 py-1 border-b border-slate-700 bg-slate-900 text-left">
                      {c}
                    </th>
                  ))}
                </tr>
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
                {vistaPrevia.length > 6 && (
                  <tr>
                    <td colSpan={vistaPrevia[0].length} className="px-2 py-1 text-center text-slate-500 text-[10px]">
                      … y {vistaPrevia.length - 6} filas más
                    </td>
                  </tr>
                )}
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
            onClick={limpiar}
            variant="outline"
            size="sm"
            disabled={cargando}
          >
            Limpiar
          </Button>
        </div>
      </div>

      {resultado && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-emerald-300">Importación exitosa</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-200">
            <div>
              <p className="text-xs text-slate-400 uppercase">Tabla</p>
              <p className="font-medium">{resultado.tabla}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Total registros</p>
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
                <div key={i} className="mb-1">• {e}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
