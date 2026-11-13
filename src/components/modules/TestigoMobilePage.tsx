import React, { useState, useEffect, useCallback } from 'react';
import { useSecurityStore } from '../../store/securityStore';
import { useElectoralStore } from '../../store/electoralStore';
import { Button } from '../ui/Button';
import { X, Upload, Phone, CheckCircle, AlertCircle, Cloud, WifiOff, Save, Plus, Trash2, Flag, MapPin } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { Partido } from '../../types/electoral';

const COLA_KEY = 'electoapp_actas_pendientes_movil';

interface MesaActa {
  id: string;
  mesaNumero: number;
  votosPartido: Record<string, number>; // partidoId -> votos
  votosBlanco: number;
  votosNulos: number;
  totalVotos: number;
  fotoBase64?: string;
  horaReporte: string;
}

interface ActaPendiente {
  id: string;
  puesto_id: string;
  mesas: MesaActa[];
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
  const {
    puestos,
    partidos,
    addActaE14,
    testigos,
    actorRole,
    getActaVotosPartido,
  } = useElectoralStore();

  const actor = currentActor();
  const isTestigo = actorRole === 'witness';

  // Buscar el testigo asignado a este actor
  const testigoAsignado = testigos.find(
    (t) => t.nombre === actor?.nombre || t.leaderId === actor?.id,
  );

  const puestoId = testigoAsignado?.puestoId || '';
  const puestoNombre = testigoAsignado?.puestoNombre || 'Sin puesto asignado';

  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [colaPendiente, setColaPendiente] = useState<ActaPendiente[]>([]);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Partidos inscritos (para mostrar como campos de voto)
  const [partidosInscritos, setPartidosInscritos] = useState<Partido[]>([]);

  // Formulario de múltiples mesas
  const [mesas, setMesas] = useState<MesaActa[]>([
    {
      id: `mesa-${Date.now()}-1`,
      mesaNumero: 1,
      votosPartido: {},
      votosBlanco: 0,
      votosNulos: 0,
      totalVotos: 0,
      horaReporte: new Date().toISOString(),
    },
  ]);

  // Inicializar votosPartido con 0 para cada partido
  useEffect(() => {
    if (partidosInscritos.length > 0) {
      setMesas(prev => prev.map(m => ({
        ...m,
        votosPartido: partidosInscritos.reduce((acc, p) => ({
          ...acc,
          [p.id]: m.votosPartido[p.id] ?? 0,
        }), {} as Record<string, number>),
      })));
    }
  }, [partidosInscritos]);

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
  // Cargar partidos y cola pendiente al iniciar
  // ------------------------------------------------------------
  useEffect(() => {
    setColaPendiente(obtenerCola());
    if (partidos.length > 0) {
      setPartidosInscritos(partidos);
    }
  }, [partidos]);

  // ------------------------------------------------------------
  // Agregar / quitar mesa
  // ------------------------------------------------------------
  const agregarMesa = () => {
    const nuevoId = `mesa-${Date.now()}-${mesas.length + 1}`;
    const votosPartidoInicial: Record<string, number> = {};
    partidosInscritos.forEach(p => {
      votosPartidoInicial[p.id] = 0;
    });

    setMesas(prev => [
      ...prev,
      {
        id: nuevoId,
        mesaNumero: prev.length + 1,
        votosPartido: votosPartidoInicial,
        votosBlanco: 0,
        votosNulos: 0,
        totalVotos: 0,
        horaReporte: new Date().toISOString(),
      },
    ]);
  };

  const quitarMesa = (id: string) => {
    setMesas(prev => prev.filter(m => m.id !== id));
  };

  const actualizarVotoMesa = (mesaId: string, campo: string, valor: string | number) => {
    setMesas(prev => prev.map(m => {
      if (m.id === mesaId) {
        const actualizado = { ...m };
        if (campo.startsWith('partido_')) {
          actualizado.votosPartido = {
            ...actualizado.votosPartido,
            [campo.replace('partido_', '')]: Number(valor) || 0,
          };
        } else if (campo === 'votosBlanco') {
          actualizado.votosBlanco = Number(valor) || 0;
        } else if (campo === 'votosNulos') {
          actualizado.votosNulos = Number(valor) || 0;
        }
        // Recalcular total
        const votosPartidoVals = Object.values(actualizado.votosPartido).filter(v => v != null);
        actualizado.totalVotos =
          votosPartidoVals.reduce((sum, v) => sum + Number(v), 0) +
          Number(actualizado.votosBlanco || 0) +
          Number(actualizado.votosNulos || 0);
        return actualizado;
      }
      return m;
    }));
  };

  // ------------------------------------------------------------
  // Validación del formulario
  // ------------------------------------------------------------
  const validarFormulario = (): string | null => {
    if (!puestoId) return 'No tienes un puesto asignado. Contacta al administrador.';
    if (mesas.length === 0) return 'Debe agregar al menos una mesa.';
    for (const mesa of mesas) {
      if (!mesa.mesaNumero) return `La mesa ${mesa.id} necesita número de mesa.`;
      const total =
        Object.values(mesa.votosPartido).reduce((sum, v) => sum + Number(v), 0) +
        Number(mesa.votosBlanco || 0) +
        Number(mesa.votosNulos || 0);
      if (total === 0) return `La mesa ${mesa.mesaNumero} necesita al menos un voto.`;
    }
    return null;
  };

  // ------------------------------------------------------------
  // Guardar actas (online o offline)
  // ------------------------------------------------------------
  const guardarActas = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validarFormulario();
    if (error) {
      setMensaje({ tipo: 'error', texto: error });
      return;
    }

    const id = `acta-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const ahora = new Date().toISOString();

    const guardarLocalmente = (): void => {
      const pendiente: ActaPendiente = {
        id,
        puesto_id: puestoId,
        mesas: mesas.map(m => ({
          ...m,
          horaReporte: ahora,
        })),
        timestamp: Date.now(),
      };
      const cola = obtenerCola();
      cola.push(pendiente);
      guardarCola(cola);
      setColaPendiente(cola);
      setMensaje({ tipo: 'exito', texto: 'Actas guardadas localmente. Se subirán cuando haya internet.' });
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
      for (const mesa of mesas) {
        const actaId = `${id}-mesa-${mesa.mesaNumero}`;
        const { error } = await supabase.from('actas_e14').insert({
          id: actaId,
          puesto_id: puestoId,
          mesa_numero: mesa.mesaNumero,
          hora_reporte: mesa.horaReporte,
          digitalizado_por: actor?.id ?? null,
          votos_coalicion: 0,
          votos_alianza: 0,
          votos_unidad: 0,
          votos_otros: 0,
          votos_blanco: mesa.votosBlanco,
          votos_nulos: mesa.votosNulos,
          votos_no_marcados: 0,
          total_votos_urna: mesa.totalVotos,
          estado_revision: 'pendiente_verificacion',
          foto_acta_url: mesa.fotoBase64 ?? null,
          leader_id: actor?.id ?? null,
          created_at: ahora,
          updated_at: ahora,
        });

        if (error) throw error;

        // Guardar votos por partido
        const votosPartido = Object.entries(mesa.votosPartido)
          .filter(([_, v]) => Number(v) > 0)
          .map(([partidoId, votos]) => ({
            partidoId,
            votos: Number(votos),
          }));

        if (votosPartido.length > 0) {
          await supabase.from('acta_votos_partido').insert(
            votosPartido.map(v => ({
              acta_id: actaId,
              partido_id: v.partidoId,
              votos: v.votos,
            }))
          );
        }
      }

      setMensaje({ tipo: 'exito', texto: `${mesas.length} acta(s) enviada(s) correctamente.` });
      limpiarFormulario();
    } catch (err: any) {
      console.error('Error subiendo actas:', err);
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

        for (const mesa of pendiente.mesas) {
          const actaId = `${pendiente.id}-mesa-${mesa.mesaNumero}`;
          const { error } = await supabase.from('actas_e14').insert({
            id: actaId,
            puesto_id: pendiente.puesto_id,
            mesa_numero: mesa.mesaNumero,
            hora_reporte: mesa.horaReporte,
            digitalizado_por: actor?.id ?? null,
            votos_coalicion: 0,
            votos_alianza: 0,
            votos_unidad: 0,
            votos_otros: 0,
            votos_blanco: mesa.votosBlanco,
            votos_nulos: mesa.votosNulos,
            votos_no_marcados: 0,
            total_votos_urna: mesa.totalVotos,
            estado_revision: 'pendiente_verificacion',
            foto_acta_url: mesa.fotoBase64 ?? null,
            leader_id: actor?.id ?? null,
            created_at: mesa.horaReporte,
            updated_at: new Date().toISOString(),
          });

          if (error) throw error;

          // Guardar votos por partido
          const votosPartido = Object.entries(mesa.votosPartido)
            .filter(([_, v]) => Number(v) > 0)
            .map(([partidoId, votos]) => ({
              partidoId,
              votos: Number(votos),
            }));

          if (votosPartido.length > 0) {
            await supabase.from('acta_votos_partido').insert(
              votosPartido.map(v => ({
                acta_id: actaId,
                partido_id: v.partidoId,
                votos: v.votos,
              }))
            );
          }
        }

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
  }, [actor?.id]);

  // ------------------------------------------------------------
  // Limpiar formulario
  // ------------------------------------------------------------
  const limpiarFormulario = () => {
    const votosPartidoInicial: Record<string, number> = {};
    partidosInscritos.forEach(p => {
      votosPartidoInicial[p.id] = 0;
    });

    setMesas([
      {
        id: `mesa-${Date.now()}-1`,
        mesaNumero: 1,
        votosPartido: votosPartidoInicial,
        votosBlanco: 0,
        votosNulos: 0,
        totalVotos: 0,
        horaReporte: new Date().toISOString(),
      },
    ]);
  };

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
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

      {/* Información del puesto asignado (solo lectura) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 text-[10px]">
            <MapPin className="w-3 h-3" />
          </div>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider text-[10px]">Puesto Asignado</h3>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">{puestoNombre}</span>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
            ID: {puestoId.slice(0, 8)}...
          </span>
        </div>
        {!puestoId && (
          <p className="text-xs text-rose-400 mt-2">
            No tienes un puesto asignado. Contacta al administrador para asignarte uno.
          </p>
        )}
      </div>

      {/* Formulario de actas E-14 (múltiples mesas) */}
      <form onSubmit={guardarActas} className="space-y-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
          Actas E-14 ({mesas.length} mesa(s))
        </h2>

        <div className="space-y-3">
          {mesas.map((mesa, index) => (
            <div key={mesa.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-[9px]">
                    #{mesa.mesaNumero}
                  </div>
                  <span className="text-xs font-semibold text-slate-300">Mesa {mesa.mesaNumero}</span>
                </div>
                <button
                  type="button"
                  onClick={() => quitarMesa(mesa.id)}
                  disabled={mesas.length === 1}
                  className="text-xs text-rose-400 hover:text-rose-300 disabled:opacity-30"
                  title={mesas.length === 1 ? 'No se puede quitar la última mesa' : 'Quitar mesa'}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Votos por partido */}
              <div className="mb-3">
                <label className="block text-[10px] font-semibold text-slate-400 mb-2">
                  Votos por Partido
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {partidosInscritos.map(p => (
                    <div key={p.id}>
                      <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                        {p.nombre} ({p.siglas})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={mesa.votosPartido[p.id] || 0}
                        onChange={(e) => actualizarVotoMesa(mesa.id, `partido_${p.id}`, e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-slate-100 text-[11px] focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Votos en Blanco
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={mesa.votosBlanco}
                    onChange={(e) => actualizarVotoMesa(mesa.id, 'votosBlanco', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-slate-100 text-[11px] focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Votos Nulos
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={mesa.votosNulos}
                    onChange={(e) => actualizarVotoMesa(mesa.id, 'votosNulos', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-slate-100 text-[11px] focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Total
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={mesa.totalVotos}
                    readOnly
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-slate-400 text-[11px]"
                  />
                </div>
              </div>

              {/* Foto por mesa */}
              <div className="mt-3">
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                  Foto del Acta Mesa {mesa.mesaNumero}
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!file.type.startsWith('image/')) {
                        setMensaje({ tipo: 'error', texto: 'Selecciona una imagen válida.' });
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        setMensaje({ tipo: 'error', texto: 'La imagen es muy grande (máx. 5 MB).' });
                        return;
                      }
                      setCargando(true);
                      comprimirImagen(file, 1024, 0.6)
                        .then((base64) => {
                          setMesas(prev => prev.map(m => {
                            if (m.id === mesa.id) return { ...m, fotoBase64: base64 };
                            return m;
                          }));
                          setCargando(false);
                        })
                        .catch(() => {
                          setMensaje({ tipo: 'error', texto: 'Error comprimiendo imagen.' });
                          setCargando(false);
                        });
                    }}
                    disabled={cargando}
                    className="block w-full text-sm text-slate-400
                      file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
                      file:text-sm file:font-semibold file:bg-blue-500/20 file:text-blue-400
                      hover:file:bg-blue-500/30 cursor-pointer disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={agregarMesa}
            disabled={cargando || subiendo}
            icon={<Plus className="w-3 h-3" />}
          >
            Agregar Mesa
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={subiendo || cargando || !online || !puestoId}
            icon={<Upload className="w-4 h-4" />}
          >
            {subiendo ? 'Enviando…' : !online ? 'Sin internet' : 'Enviar Actas'}
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
        Rol: {actorRole} · Actor: {actor?.nombre || 'Sin asignar'}
      </div>
    </div>
  );
};
