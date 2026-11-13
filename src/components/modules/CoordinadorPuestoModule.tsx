import React, { useState, useEffect } from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { useSecurityStore } from '../../store/securityStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { MapPin, Target, FileText, Users, Clock, CheckCircle, AlertCircle, Search, ChevronRight } from 'lucide-react';
import { PuestoVotacion, ActaVotoPartido } from '../../types/electoral';

export const CoordinadorPuestoModule: React.FC = () => {
  const { puestos, testigos, actas, actors, partidos, getActaVotosPartido } = useElectoralStore();
  const { currentActor } = useSecurityStore();

  const actor = currentActor();
  const esCoordinador = actor?.role === 'leader';
  const esSupervisor = actor?.role === 'totalSupervisor' || actor?.role === 'candidateSupervisor';

  // Si es coordinador, mostrar solo puestos de su municipio (scopeId)
  const puestosFiltrados = esSupervisor
    ? puestos
    : puestos.filter(p => p.departamentoId === actor?.scopeId || p.municipioId === actor?.scopeId);

  // Filtrar puestos por búsqueda
  const puestosMostrados = puestosFiltrados.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.comunaBarrio.toLowerCase().includes(busqueda.toLowerCase())
  );

  const [puestoSeleccionado, setPuestoSeleccionado] = useState<PuestoVotacion | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [votosPorActa, setVotosPorActa] = useState<Record<string, any[]>>({});

  // Cargar votos por partido cuando se selecciona un puesto
  useEffect(() => {
    if (!puestoSeleccionado) return;
    const cargarVotos = async () => {
      const actasPuesto = actas.filter(a => a.puestoId === puestoSeleccionado.id);
      const votosMap: Record<string, any[]> = {};
      for (const a of actasPuesto) {
        const votos = await getActaVotosPartido(a.id);
        votosMap[a.id] = votos;
      }
      setVotosPorActa(votosMap);
    };
    cargarVotos();
  }, [puestoSeleccionado, actas, getActaVotosPartido]);

  // Obtener datos de una mesa específica
  const getDatosMesa = (puestoId: string, mesaNumero: number) => {
    const acta = actas.find(a => a.puestoId === puestoId && a.mesaNumero === mesaNumero);
    const testigosMesa = testigos.filter(t => t.puestoId === puestoId && t.mesaNumero === mesaNumero);
    return { acta, testigos: testigosMesa };
  };

  const abrirPuesto = (puesto: PuestoVotacion) => {
    setPuestoSeleccionado(puesto);
  };

  const cerrarPuesto = () => {
    setPuestoSeleccionado(null);
  };

  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto p-6 space-y-6 select-none bg-slate-950">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Coordinador de Puesto
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-400" />
            <span>Puesto de Votación</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Vea el detalle de su puesto, las mesas asignadas y el estado de cada acta E-14.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
            {actor?.nombre} · {actor?.role}
          </span>
        </div>
      </div>

      {/* Búsqueda de puesto */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar puesto por nombre o comuna..."
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Lista de puestos disponibles */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Puestos disponibles
        </h3>
        {puestosMostrados.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs">
            No hay puestos disponibles en su jurisdicción.
          </div>
        ) : (
          <div className="space-y-2">
            {puestosMostrados.map(p => {
              const actasPuesto = actas.filter(a => a.puestoId === p.id);
              const testigosPuesto = testigos.filter(t => t.puestoId === p.id);
              const actasConfirmadas = actasPuesto.filter(a => a.estadoRevision === 'aprobada').length;
              return (
                <div
                  key={p.id}
                  onClick={() => abrirPuesto(p)}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800/80 hover:bg-slate-800/50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white truncate">{p.nombre}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {p.comunaBarrio} · {p.zona} · {p.mesasHabilitadas} mesas
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={actasPuesto.length > 0 ? 'emerald' : 'slate'} size="sm">
                      {actasPuesto.length} actas
                    </Badge>
                    <Badge variant={testigosPuesto.length > 0 ? 'blue' : 'slate'} size="sm">
                      {testigosPuesto.length} testigos
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================
         DETALLE DEL PUESTO SELECCIONADO
         ========================================= */}
      {puestoSeleccionado && (
        <div className="max-w-4xl mx-auto">
          {/* Header del puesto */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cerrarPuesto}
                  icon={<ChevronRight className="w-4 h-4 rotate-180" />}
                >
                  Volver
                </Button>
              </div>
              <div className="flex gap-2">
                <Badge variant={puestoSeleccionado.estadoPrioridad === 'critico' ? 'red' : 'blue'} size="sm">
                  {puestoSeleccionado.estadoPrioridad}
                </Badge>
                <Badge variant="slate" size="sm">
                  {puestoSeleccionado.mesasHabilitadas} mesas
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase">Nombre</p>
                <p className="text-sm font-semibold text-white">{puestoSeleccionado.nombre}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase">Comuna / Barrio</p>
                <p className="text-sm font-semibold text-white truncate">
                  {puestoSeleccionado.comunaBarrio}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase">Zona</p>
                <p className="text-sm font-semibold text-white">{puestoSeleccionado.zona}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase">Dirección</p>
                <p className="text-sm font-semibold text-white truncate">
                  {puestoSeleccionado.direccion}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase">Censo</p>
                <p className="text-sm font-bold text-emerald-400">
                  {puestoSeleccionado.censoElectoral.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase">Mesas habilitadas</p>
                <p className="text-sm font-bold text-blue-400">
                  {puestoSeleccionado.mesasHabilitadas}
                </p>
              </div>
            </div>
          </div>

          {/* Lista de mesas del puesto */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Mesas del Puesto ({puestoSeleccionado.mesasHabilitadas})
            </h3>
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/50 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-2 w-16 text-center">Mesa</th>
                    <th className="p-2">Votos por Partido</th>
                    <th className="p-2">Blancos</th>
                    <th className="p-2">Nulos</th>
                    <th className="p-2 text-center">Total</th>
                    <th className="p-2 text-center">Estado</th>
                    <th className="p-2 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {Array.from({ length: puestoSeleccionado.mesasHabilitadas }, (_, i) => i + 1).map(mesaNumero => {
                    const { acta, testigos: testigosMesa } = getDatosMesa(puestoSeleccionado.id, mesaNumero);
                    const tieneActa = !!acta;
                    const votosMesa = tieneActa ? votosPorActa[acta.id] ?? [] : [];
                    const totalVotosMesa = votosMesa.reduce((sum, v) => sum + Number(v.votos), 0) +
                      Number(mesaNumVotosBlanco(mesaNumero, acta)) +
                      Number(mesaNumVotosNulos(mesaNumero, acta));

                    return (
                      <tr key={mesaNumero} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-2 text-center">
                          <span className="font-mono font-bold text-white">#{mesaNumero}</span>
                        </td>
                        <td className="p-2">
                          {votosMesa.length > 0 ? (
                            <div className="space-y-1">
                              {votosMesa.map(v => (
                                <div key={v.partidoId} className="flex items-center gap-1">
                                  <span className="text-[9px] text-slate-400 truncate max-w-[60px]">
                                    {v.partidoSiglas || v.partidoNombre?.slice(0, 8)}
                                  </span>
                                  <span className="text-[10px] font-mono font-bold text-white">{v.votos}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500">Sin votos</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <span className="font-mono text-slate-300">
                            {tieneActa ? acta.votosBlanco : 0}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="font-mono text-slate-300">
                            {tieneActa ? acta.votosNulos : 0}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="font-mono font-bold text-white">
                            {totalVotosMesa > 0 ? totalVotosMesa : '-'}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            acta?.estadoRevision === 'aprobada'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : acta?.estadoRevision === 'alerta_discrepancia'
                                ? 'bg-rose-500/20 text-rose-400'
                                : acta?.estadoRevision === 'pendiente_verificacion'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-slate-800 text-slate-500'
                          }`}>
                            {acta?.estadoRevision ?? 'Sin acta'}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          {tieneActa ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {}}
                              disabled
                              icon={<FileText className="w-3 h-3" />}
                            >
                              Ver
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                console.log('Crear acta para mesa', mesaNumero);
                              }}
                              icon={<FileText className="w-3 h-3" />}
                            >
                              Crear
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function mesaNumVotosBlanco(mesaNumero: number, acta: any): number {
  return acta?.votosBlanco ?? 0;
}

function mesaNumVotosNulos(mesaNumero: number, acta: any): number {
  return acta?.votosNulos ?? 0;
}
