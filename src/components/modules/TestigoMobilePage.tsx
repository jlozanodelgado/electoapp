import React, { useState, useEffect, useCallback } from 'react';
import { useSecurityStore } from '../../store/securityStore';
import { useElectoralStore } from '../../store/electoralStore';
import { Button } from '../ui/Button';
import { X, Upload, Phone, CheckCircle, AlertCircle, Cloud, WifiOff, Save } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';

const COLA_KEY = 'electoapp_actas_pendientes_movil';

interface ActaE14Data {
  puesto_id: string;
  mesa_numero: number;
  votos_coalicion: number;
  votos_alianza: number;
  votos_unidad: number;
  votos_otros: number;
  votos_blanco: number;
  votos_nulos: number;
  total_votos_urna: number;
  estado_revision: 'pendiente_verificacion';
  foto_acta_url?: string;
  hora_reporte: string;
}

interface ActaPendiente {
  id: string;
  datos: ActaE14Data;
  fotoBase64?: string;
  timestamp: number;
}

/** Comprime una imagen a JPEG con tamaño y calidad controlados. */
function comprimirImagen(
  file: File,
  maxWidth = 1024,
  calidad = 0.6,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = String(event.target?.result);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo crear el canvas de compresión.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', calidad));
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
  });
}

/** Obtiene la cola pendiente de localStorage. */
function obtenerCola(): ActaPendiente[] {
  try {
    const raw = localStorage.getItem(COLA_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ActaPendiente[];
  } catch {
    return [];
  }
}

/** Guarda la cola pendiente en localStorage. */
function guardarCola(cola: ActaPendiente[]): void {
  localStorage.setItem(COLA_KEY, JSON.stringify(cola));
}

/** Elimina una acta de la cola por id. */
function removerDeCola(id: string): void {
  const cola = obtenerCola().filter((a) => a.id !== id);
  guardarCola(cola);
}

export const TestigoMobilePage: React.FC = () => {
  const { currentActor } = useSecurityStore();
  const { puestos, addActaE14, testigos, actorRole } = useElectoralStore();

  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [colaPendiente, setColaPendiente] = useState<ActaPendiente[]>([]);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Formulario
  const [puestoId, setPuestoId] = useState('');
  const [mesaNumero, setMesaNumero] = useState('');
  const [votosCoalicion, setVotosCoalicion] = useState('0');
  const [votosAlianza, setVotosAlianza] = useState('0');
  const [votosUnidad, setVotosUnidad] = useState('0');
  const [votosOtros, setVotosOtros] = useState('0');
  const [votosBlanco, setVotosBlanco] = useState('0');
  const [votosNulos, setVotosNulos] = useState('0');
  const [observaciones, setObservaciones] = useState('');

  // ------------------------------------------------------------
  // Estado de conexión
  // ------------------------------------------------------------
  useEffect(() => {
    setOnline(navigator.onLine);

    const handleOnline = () => {
      setOnline(true);
      setMensaje({ tipo: 'exito', texto: 'Conexión restaurada. Subiendo actas pendientes...' });
      subirPendientes();
    };
    const handleOffline = () => {
      setOnline(false);
      setMensaje({ tipo: 'error', texto: 'Sin internet. Las actas se guardarán localmente.' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ------------------------------------------------------------
  // Cargar puestos y cola pendiente al iniciar
  // ------------------------------------------------------------
  useEffect(() => {
    setColaPendiente(obtenerCola());
  }, []);

  // ------------------------------------------------------------
  // Manejo de foto con compresión
  // ------------------------------------------------------------
  const manejarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setMensaje({ tipo: 'error', texto: 'Selecciona una imagen válida.' });
      return;
    }

    // Validar tamaño (máximo 5MB antes de comprimir)
    if (file.size > 5 * 1024 * 1024) {
      setMensaje({ tipo: 'error', texto: 'La imagen es muy grande (máx. 5 MB).' });
      return;
    }

    setFotoFile(file);
    setCargando(true);

    try {
      const base64 = await comprimirImagen(file, 1024, 0.6);
      setFotoBase64(base64);
      setVistaPrevia(base64);
      setMensaje(null);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error comprimiendo la imagen.' });
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const quitarFoto = () => {
    setFotoFile(null);
    setFotoBase64(null);
    setVistaPrevia(null);
  };

  // ------------------------------------------------------------
  // Validación del formulario
  // ------------------------------------------------------------
  const validarFormulario = (): string | null => {
    if (!puestoId) return 'Selecciona un puesto de votación.';
    if (!mesaNumero) return 'Ingresa el número de mesa.';
    const total =
      Number(votosCoalicion || 0) +
      Number(votosAlianza || 0) +
      Number(votosUnidad || 0) +
      Number(votosOtros || 0) +
      Number(votosBlanco || 0) +
      Number(votosNulos || 0);
    if (total === 0) return 'Ingresa al menos un voto.';
    return null;
  };

  // ------------------------------------------------------------
  // Guardar acta (online o offline)
  // ------------------------------------------------------------
  const guardarActa = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validarFormulario();
    if (error) {
      setMensaje({ tipo: 'error', texto: error });
      return;
    }

    const totalVotos =
      Number(votosCoalicion || 0) +
      Number(votosAlianza || 0) +
      Number(votosUnidad || 0) +
      Number(votosOtros || 0) +
      Number(votosBlanco || 0) +
      Number(votosNulos || 0);

    const datos: ActaE14Data = {
      puesto_id: puestoId,
      mesa_numero: Number(mesaNumero),
      votos_coalicion: Number(votosCoalicion || 0),
      votos_alianza: Number(votosAlianza || 0),
      votos_unidad: Number(votosUnidad || 0),
      votos_otros: Number(votosOtros || 0),
      votos_blanco: Number(votosBlanco || 0),
      votos_nulos: Number(votosNulos || 0),
      total_votos_urna: totalVotos,
      estado_revision: 'pendiente_verificacion',
      hora_reporte: new Date().toISOString(),
    };

    const id = `acta-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const ahora = new Date().toISOString();

    const guardarLocalmente = (): void => {
      const pendiente: ActaPendiente = {
        id,
        datos,
        fotoBase64: fotoBase64 || undefined,
        timestamp: Date.now(),
      };
      const cola = obtenerCola();
      cola.push(pendiente);
      guardarCola(cola);
      setColaPendiente(cola);
      setMensaje({ tipo: 'exito', texto: 'Acta guardada localmente. Se subirá cuando haya internet.' });
      limpiarFormulario();
    };

    if (!online || !isSupabaseConfigured() || !supabase) {
      guardarLocalmente();
      return;
    }

    // ------------------------------------------------------------
    // Subir a Supabase (online)
    // ------------------------------------------------------------
    setSubiendo(true);
    setMensaje(null);

    try {
      let fotoUrl: string | undefined;

      // Si hay foto comprimida, la intentamos subir como archivo a Supabase Storage
      // o guardamos la data URL directamente si no hay bucket configurado.
      if (fotoBase64) {
        fotoUrl = fotoBase64; // Data URL comprimida (base64)
      }

      const actaConFoto = {
        ...datos,
        foto_acta_url: fotoUrl,
      };

      const { error } = await supabase.from('actas_e14').insert({
        id,
        puesto_id: actaConFoto.puesto_id,
        mesa_numero: actaConFoto.mesa_numero,
        votos_coalicion: actaConFoto.votos_coalicion,
        votos_alianza: actaConFoto.votos_alianza,
        votos_unidad: actaConFoto.votos_unidad,
        votos_otros: actaConFoto.votos_otros,
        votos_blanco: actaConFoto.votos_blanco,
        votos_nulos: actaConFoto.votos_nulos,
        total_votos_urna: actaConFoto.total_votos_urna,
        estado_revision: actaConFoto.estado_revision,
        foto_acta_url: actaConFoto.foto_acta_url,
        hora_reporte: actaConFoto.hora_reporte,
        digitalizado_por: currentActor()?.id || null,
        leader_id: currentActor()?.id || null,
        created_at: ahora,
        updated_at: ahora,
      });

      if (error) throw error;

      setMensaje({ tipo: 'exito', texto: 'Acta E-14 enviada correctamente.' });
      limpiarFormulario();
    } catch (err: any) {
      console.error('Error subiendo acta:', err);
      // Si falla Supabase, guardamos localmente como respaldo
      guardarLocalmente();
      setMensaje({
        tipo: 'error',
        texto: `Error de conexión: ${err.message || 'No se pudo enviar. Se guardó localmente.'}`,
      });
    } finally {
      setSubiendo(false);
    }
  };

  // ------------------------------------------------------------
  // Subir actas pendientes de la cola offline
  // ------------------------------------------------------------
  const subirPendientes = useCallback(async () => {
    const cola = obtenerCola();
    if (cola.length === 0) return;

    setSubiendo(true);
    let exitosas = 0;
    const fallidas: ActaPendiente[] = [];

    for (const pendiente of cola) {
      try {
        if (!isSupabaseConfigured() || !supabase) break;

        const { error } = await supabase.from('actas_e14').insert({
          id: pendiente.id,
          puesto_id: pendiente.datos.puesto_id,
          mesa_numero: pendiente.datos.mesa_numero,
          votos_coalicion: pendiente.datos.votos_coalicion,
          votos_alianza: pendiente.datos.votos_alianza,
          votos_unidad: pendiente.datos.votos_unidad,
          votos_otros: pendiente.datos.votos_otros,
          votos_blanco: pendiente.datos.votos_blanco,
          votos_nulos: pendiente.datos.votos_nulos,
          total_votos_urna: pendiente.datos.total_votos_urna,
          estado_revision: pendiente.datos.estado_revision,
          foto_acta_url: pendiente.fotoBase64 || null,
          hora_reporte: pendiente.datos.hora_reporte,
          digitalizado_por: currentActor()?.id || null,
          leader_id: currentActor()?.id || null,
          created_at: pendiente.datos.hora_reporte,
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;
        exitosas++;
        removerDeCola(pendiente.id);
      } catch (err) {
        console.error(`Error subiendo acta ${pendiente.id}:`, err);
        fallidas.push(pendiente);
      }
    }

    setColaPendiente(obtenerCola());
    setSubiendo(false);

    if (exitosas > 0) {
      setMensaje({
        tipo: 'exito',
        texto: `${exitosas} acta(s) subida(s) correctamente.`,
      });
    }
    if (fallidas.length > 0) {
      setMensaje({
        tipo: 'error',
        texto: `${fallidas.length} acta(s) no se pudieron subir. Se reintentará más tarde.`,
      });
    }
  }, [currentActor()?.id]);

  // ------------------------------------------------------------
  // Limpiar formulario
  // ------------------------------------------------------------
  const limpiarFormulario = () => {
    setPuestoId('');
    setMesaNumero('');
    setVotosCoalicion('0');
    setVotosAlianza('0');
    setVotosUnidad('0');
    setVotosOtros('0');
    setVotosBlanco('0');
    setVotosNulos('0');
    setObservaciones('');
    quitarFoto();
  };

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  const puestosLista = puestos || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Phone className="w-6 h-6 text-blue-400" />
          <h1 className="text-lg font-bold text-white">Testigo Móvil</h1>
        </div>
        <div className="flex items-center gap-1">
          {online ? (
            <span className="flex items-center gap-1 px-2 py-1 bg-emerald-900/50 border border-emerald-500/30 rounded-full text-emerald-300 text-[10px]">
              <Cloud className="w-3 h-3" /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-1 bg-rose-900/50 border border-rose-500/30 rounded-full text-rose-300 text-[10px]">
              <WifiOff className="w-3 h-3" /> Offline
            </span>
          )}
          {colaPendiente.length > 0 && (
            <span className="px-2 py-1 bg-amber-900/50 border border-amber-500/30 rounded-full text-amber-300 text-[10px]">
              <Save className="w-3 h-3" /> {colaPendiente.length} pendiente(s)
            </span>
          )}
        </div>
      </div>

      {/* Mensaje de estado */}
      {mensaje && (
        <div className={`mb-4 p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
          mensaje.tipo === 'exito'
            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
        }`}>
          {mensaje.tipo === 'exito' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {mensaje.texto}
        </div>
      )}

      {/* Formulario de acta E-14 */}
      <form onSubmit={guardarActa} className="space-y-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
          Nueva Acta E-14
        </h2>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">
            Puesto de Votación *
          </label>
          <select
            value={puestoId}
            onChange={(e) => setPuestoId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="">Seleccionar puesto</option>
            {puestosLista.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({p.comunaBarrio})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Mesa *
            </label>
            <input
              type="number"
              min="1"
              max="150"
              value={mesaNumero}
              onChange={(e) => setMesaNumero(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              placeholder="Ej. 5"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Coalición
            </label>
            <input
              type="number"
              min="0"
              value={votosCoalicion}
              onChange={(e) => setVotosCoalicion(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Alianza
            </label>
            <input
              type="number"
              min="0"
              value={votosAlianza}
              onChange={(e) => setVotosAlianza(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Unidad
            </label>
            <input
              type="number"
              min="0"
              value={votosUnidad}
              onChange={(e) => setVotosUnidad(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Otros
            </label>
            <input
              type="number"
              min="0"
              value={votosOtros}
              onChange={(e) => setVotosOtros(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Blanco
            </label>
            <input
              type="number"
              min="0"
              value={votosBlanco}
              onChange={(e) => setVotosBlanco(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Nulos
            </label>
            <input
              type="number"
              min="0"
              value={votosNulos}
              onChange={(e) => setVotosNulos(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Foto */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">
            Foto del Acta E-14 *
          </label>
          <div className="flex items-center gap-3 mb-2">
            <input
              type="file"
              accept="image/*"
              onChange={manejarFoto}
              disabled={cargando}
              className="block w-full text-sm text-slate-400
                file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
                file:text-sm file:font-semibold file:bg-blue-500/20 file:text-blue-400
                hover:file:bg-blue-500/30 cursor-pointer disabled:opacity-50"
            />
            {fotoFile && (
              <button
                type="button"
                onClick={quitarFoto}
                className="text-xs text-rose-400 hover:text-rose-300"
              >
                Quitar
              </button>
            )}
          </div>

          {vistaPrevia && (
            <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
              <img
                src={vistaPrevia}
                alt="Vista previa"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={quitarFoto}
                className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded hover:bg-black/80"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {cargando && (
            <p className="text-[10px] text-slate-400 mt-1">Comprimiendo imagen...</p>
          )}
          <p className="text-[10px] text-slate-500 mt-1">
            La foto se comprime automáticamente para usar pocos datos móviles.
          </p>
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={limpiarFormulario}
            disabled={subiendo}
            className="px-3 py-2 text-sm text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={subiendo || !online || cargando}
            icon={<Upload className="w-4 h-4" />}
          >
            {subiendo ? 'Enviando…' : !online ? 'Sin internet' : 'Enviar Acta E-14'}
          </Button>
        </div>
      </form>

      {/* Cola pendiente */}
      {colaPendiente.length > 0 && (
        <div className="mt-4 bg-amber-900/30 border border-amber-500/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Save className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-amber-300">Actas pendientes ({colaPendiente.length})</h3>
          </div>
          <div className="text-xs text-slate-300">
            Se guardarán hasta que haya conexión. Se subirán automáticamente al recuperar internet.
          </div>
          <div className="mt-2 flex justify-end">
            <button
              onClick={subirPendientes}
              disabled={subiendo || !online}
              className="px-3 py-1.5 text-xs text-amber-400 bg-amber-900/50 border border-amber-500/30 rounded-lg hover:bg-amber-900/80 disabled:opacity-50"
            >
              {subiendo ? 'Subiendo…' : 'Subir ahora'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 text-[10px] text-slate-500 text-center">
        Rol: {actorRole} · Actor: {currentActor()?.nombre || 'Sin asignar'}
      </div>
    </div>
  );
};
