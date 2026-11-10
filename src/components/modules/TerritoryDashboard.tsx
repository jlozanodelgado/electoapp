import React, { useState } from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MapPin, Users, CheckCircle2, Clock, Layout, AlertTriangle } from 'lucide-react';
import { ElectoralMap } from '../map/ElectoralMap';

export const TerritoryDashboard: React.FC = () => {
  const {
    puestos,
    testigos,
    votantes,
    departamentoId,
    municipioId,
    mostrarVotantesMapa,
    setMostrarVotantesMapa,
  } = useElectoralStore();

  const [activeAction, setActiveAction] = useState<string>('ver_viviendas');

  // Calcular listas según la acción
  const votantesConCoordenadas = votantes.filter((v) => v.lat && v.lng);
  const votantesSinCoordenadas = votantes.filter((v) => !v.lat || !v.lng);

  const totalPuestos = puestos.length;
  const totalMesas = puestos.reduce((acc, p) => acc + p.mesasHabilitadas, 0);
  const testigosConfirmados = testigos.filter(t => t.estado === 'confirmado').length;
  const totalVotantes = votantes.length;
  const votantesConfirmados = votantes.filter(v => v.yaVoto).length;

  const acciones = [
    { id: 'ver_viviendas', label: 'Ver viviendas', subtitle: 'Puntos de residencia', icon: <MapPin className="w-5 h-5 text-emerald-400" /> },
    { id: 'personas_ubicadas', label: 'Personas ubicadas', subtitle: 'Solo registros con coordenadas', icon: <Users className="w-5 h-5 text-blue-400" /> },
    { id: 'verificar_direcciones', label: 'Verificar direcciones', subtitle: 'Votantes sin coordenadas', icon: <AlertTriangle className="w-5 h-5 text-amber-400" /> },
  ];

  // Cuando cambia la acción, controlar visibilidad de votantes en el mapa
  React.useEffect(() => {
    if (activeAction === 'verificar_direcciones') {
      setMostrarVotantesMapa(false);
    } else {
      setMostrarVotantesMapa(true);
    }
  }, [activeAction, setMostrarVotantesMapa]);

  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto p-6 space-y-6 select-none bg-slate-950">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Tu territorio, en perspectiva
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Campaña Ejemplo
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {departamentoId !== 'todos' ? departamentoId : 'Nacional'} • {municipioId !== 'todos' ? municipioId : 'Todos los municipios'}
          </p>
        </div>

        <div className="flex gap-2">
          {acciones.map((accion) => (
            <Button
              key={accion.id}
              variant={activeAction === accion.id ? 'primary' : 'outline'}
              onClick={() => setActiveAction(accion.id)}
              className={activeAction === accion.id ? 'bg-emerald-500 text-white border-emerald-500' : ''}
            >
              {accion.icon}
              <span>{accion.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Mapa principal */}
      <div className="lg:w-2/3 h-[600px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <ElectoralMap />
      </div>

      {/* Panel derecho: Acciones y listados */}
      <div className="lg:w-1/3 space-y-6">
        {/* Acciones rápidas */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Layout className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white text-sm uppercase tracking-wider text-[10px]">
              Acciones rápidas
            </span>
          </div>
          <div className="space-y-2.5">
            {acciones.map((accion) => (
              <button
                key={accion.id}
                onClick={() => setActiveAction(accion.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  activeAction === accion.id
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="p-2 rounded-lg ${
                  activeAction === accion.id
                    ? 'bg-emerald-500/20 border border-emerald-500/30'
                    : 'bg-slate-800 border border-transparent'
                }">
                  {accion.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{accion.label}</h3>
                  <p className="text-[10px] text-slate-400">{accion.subtitle}</p>
                </div>
                <span className="text-[10px] text-slate-500">
                  {activeAction === accion.id ? 'Activo' : 'Inactivo'}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* Listado según acción activa */}
        <div className="space-y-4">
          {activeAction === 'ver_viviendas' || activeAction === 'personas_ubicadas' ? (
            <>
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    Votantes con ubicación ({votantesConCoordenadas.length})
                  </span>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {votantesConCoordenadas.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs">
                      No hay votantes con coordenadas registradas.
                    </div>
                  ) : (
                    votantesConCoordenadas.map((v) => (
                      <div key={v.id} className="p-2 rounded-lg bg-slate-800 border border-slate-700/50 hover:bg-slate-700/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-sm truncate">
                              {v.nombre}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              CC {v.cedula}
                            </p>
                            <span className="text-[10px] text-slate-400 block">
                              {v.barrio || v.direccion}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                                v.yaVoto ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {v.yaVoto ? 'Votó' : 'Pendiente'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </>
          ) : (
            <>
              <Card className="p-3 border-l-4 border-l-rose-500">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                    Votantes sin dirección ({votantesSinCoordenadas.length})
                  </span>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {votantesSinCoordenadas.length === 0 ? (
                    <div className="p-4 text-center text-emerald-400 text-xs font-bold">
                      Todos los votantes tienen coordenadas asignadas ✓
                    </div>
                  ) : (
                    votantesSinCoordenadas.map((v) => (
                      <div key={v.id} className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-sm truncate">
                              {v.nombre}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              CC {v.cedula}
                            </p>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">
                              {v.direccion} - {v.barrio}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                                v.yaVoto ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {v.yaVoto ? 'Votó' : 'Pendiente'}
                              </span>
                              <button
                                onClick={() => {
                                  // Aquí se podría abrir un modal para asignar coordenadas
                                  alert(`Asignar coordenadas a ${v.nombre} en ${v.direccion}`);
                                }}
                                className="text-[10px] text-blue-400 hover:underline font-semibold"
                              >
                                Asignar ubicación
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card className="p-3 bg-slate-900/50 border border-slate-800">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                    Resumen del territorio
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Puestos</span>
                    <div className="text-xl font-black font-mono text-emerald-400">{totalPuestos}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Mesas</span>
                    <div className="text-xl font-black font-mono text-blue-400">{totalMesas}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Testigos conf.</span>
                    <div className="text-xl font-black font-mono text-purple-400">{testigosConfirmados}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Votantes votaron</span>
                    <div className="text-xl font-black font-mono text-rose-400">{votantesConfirmados}</div>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
