import React, { useState } from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Users, Target, FileSpreadsheet, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export const PreparacionModule: React.FC = () => {
  const [abierta, setAbierta] = useState<'lideres' | 'testigos' | 'votantes' | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const {
    diaDActivado,
    setDiaDActivado,
    actors,
    actorRole,
    actorId,
    testigos,
    votantes,
    puestos,
    setIsNewWitnessOpen,
    setIsNewVoterOpen,
    setModuloActivo,
  } = useElectoralStore();

  const isTotalSupervisor = actorRole === 'totalSupervisor';
  const esLider = actorRole === 'leader';

  const lideres = actors.filter(a => a.role === 'leader');
  const testigosSinLider = testigos.filter(t => !t.leaderId);
  const votantesSinLider = votantes.filter(v => !v.leaderId);

  const totalMesas = puestos.reduce((acc, p) => acc + p.mesasHabilitadas, 0);
  const testigosConfirmados = testigos.filter(t => t.estado === 'confirmado').length;
  const pctCobertura = totalMesas > 0 ? Math.round((testigosConfirmados / totalMesas) * 100) : 0;

  const manejarActivarDiaD = () => {
    if (!isTotalSupervisor) return;
    setDiaDActivado(true);
    setModuloActivo('dia_d');
  };

  const manejarDesactivarDiaD = () => {
    if (!isTotalSupervisor) return;
    setDiaDActivado(false);
    setModuloActivo('preparacion');
  };

  const toggleSeccion = (seccion: 'lideres' | 'testigos' | 'votantes') => {
    setAbierta(abierta === seccion ? null : seccion);
  };

  // Filtro por búsqueda
  const q = busqueda.trim().toLowerCase();
  const lideresFiltrados = lideres.filter(l => l.nombre.toLowerCase().includes(q));
  const testigosFiltrados = testigos.filter(t => t.nombre.toLowerCase().includes(q) || t.cedula.toLowerCase().includes(q));
  const votantesFiltrados = votantes.filter(v => v.nombre.toLowerCase().includes(q) || v.cedula.toLowerCase().includes(q));

  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto p-6 space-y-6 select-none bg-slate-950">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Módulo de Preparación
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-400" />
            <span>Planificación Día D</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Selecciona qué grupo quieres revisar: líderes, testigos o votantes.
          </p>
        </div>

        {/* Estado de activación Día D */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
          diaDActivado
            ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-md shadow-rose-950/40'
            : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-950/40'
        }`}>
          <span className={`w-2 h-2 rounded-full ${diaDActivado ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
          <span>{diaDActivado ? 'DÍA D ACTIVADO' : 'DÍA D DESACTIVADO'}</span>
          {isTotalSupervisor && (
            <span className="text-[10px] ml-2 text-slate-400">(Solo Supervisor Total puede activar)</span>
          )}
        </div>
      </div>

      {/* KPIs de Preparación */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/90 border-slate-800 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Líderes Registrados</span>
              <div className="text-2xl font-black font-mono text-blue-400 mt-1">{lideres.length}</div>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Testigos Acreditados</span>
              <div className="text-2xl font-black font-mono text-purple-400 mt-1">{testigos.length}</div>
              <span className="text-[11px] text-slate-500">{testigosSinLider.length} sin líder asignado</span>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Votantes en CRM</span>
              <div className="text-2xl font-black font-mono text-amber-400 mt-1">{votantes.length}</div>
              <span className="text-[11px] text-slate-500">{votantesSinLider.length} sin líder asignado</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Target className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Cobertura Mesas</span>
              <div className="text-2xl font-black font-mono text-emerald-400 mt-1">{pctCobertura}%</div>
              <span className="text-[11px] text-slate-500">{testigosConfirmados} de {totalMesas} mesas</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Buscador global */}
      <div className="relative max-w-md">
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <Users className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar líder, testigo o votante por nombre o cédula..."
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Acciones rápidas */}
      <div className="flex gap-3">
        {isTotalSupervisor && (
          <Button variant="outline" size="sm" onClick={() => setIsNewWitnessOpen(true)} icon={<Users className="w-3.5 h-3.5" />}>
            Crear Líder
          </Button>
        )}
        {(isTotalSupervisor || actorRole === 'candidateSupervisor') && (
          <Button variant="outline" size="sm" onClick={() => setIsNewWitnessOpen(true)} icon={<Users className="w-3.5 h-3.5" />}>
            Crear Testigo
          </Button>
        )}
        {(isTotalSupervisor || actorRole === 'candidateSupervisor' || actorRole === 'leader') && (
          <Button variant="outline" size="sm" onClick={() => setIsNewVoterOpen(true)} icon={<Target className="w-3.5 h-3.5" />}>
            Registrar Votante
          </Button>
        )}
      </div>

      {/* =========================================
         SECCIÓN LÍDERES (acordeón colapsable)
         ========================================= */}
      <Card className="bg-slate-900/90 border border-slate-800/80 rounded-xl overflow-hidden">
        <div className="p-4 bg-slate-900/50 border-b border-slate-800/50 cursor-pointer flex items-center justify-between" onClick={() => toggleSeccion('lideres')}>
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-white text-sm uppercase tracking-wider text-[10px]">Líderes del Plan</h3>
              <p className="text-[10px] text-slate-400">{lideresFiltrados.length} líder(es) registrado(s)</p>
            </div>
          </div>
          {abierta === 'lideres' ? (
            <ChevronUp className="w-4 h-4 text-blue-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-blue-400" />
          )}
        </div>

        {abierta === 'lideres' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Button variant="primary" size="sm" onClick={() => setIsNewWitnessOpen(true)} icon={<Users className="w-3.5 h-3.5" />}>
                Nuevo Líder
              </Button>
            </div>
            {lideresFiltrados.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-xs">
                No hay líderes registrados.
              </div>
            ) : (
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/50 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-2">Líder</th>
                      <th className="p-2">Supervisor</th>
                      <th className="p-2 text-center">Testigos</th>
                      <th className="p-2 text-center">Votantes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {lideresFiltrados.map(l => {
                      const testigosDelLider = testigos.filter(t => t.leaderId === l.id);
                      const votantesDelLider = votantes.filter(v => v.leaderId === l.id);
                      const supervisor = actors.find(a => a.id === l.supervisorId);
                      return (
                        <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-2">
                            <p className="font-semibold text-white">{l.nombre}</p>
                            <span className="text-[9px] text-slate-500 font-mono">ID: {l.id.slice(0, 8)}...</span>
                          </td>
                          <td className="p-2">
                            <span className="text-slate-300">{supervisor?.nombre ?? 'Sin asignar'}</span>
                          </td>
                          <td className="p-2 text-center">
                            <span className="font-mono font-bold text-emerald-400">{testigosDelLider.length}</span>
                          </td>
                          <td className="p-2 text-center">
                            <span className="font-mono font-bold text-amber-400">{votantesDelLider.length}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* =========================================
         SECCIÓN TESTIGOS (acordeón colapsable)
         ========================================= */}
      <Card className="bg-slate-900/90 border border-slate-800/80 rounded-xl overflow-hidden mt-4">
        <div className="p-4 bg-slate-900/50 border-b border-slate-800/50 cursor-pointer flex items-center justify-between" onClick={() => toggleSeccion('testigos')}>
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="font-bold text-white text-sm uppercase tracking-wider text-[10px]">Testigos Acreditados</h3>
              <p className="text-[10px] text-slate-400">{testigosFiltrados.length} testigo(s) inscrito(s)</p>
            </div>
          </div>
          {abierta === 'testigos' ? (
            <ChevronUp className="w-4 h-4 text-purple-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-purple-400" />
          )}
        </div>

        {abierta === 'testigos' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Button variant="primary" size="sm" onClick={() => setIsNewWitnessOpen(true)} icon={<Users className="w-3.5 h-3.5" />}>
                Nuevo Testigo
              </Button>
            </div>
            {testigosFiltrados.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-xs">
                No hay testigos registrados.
              </div>
            ) : (
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/50 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-2">Testigo</th>
                      <th className="p-2">Puesto</th>
                      <th className="p-2 text-center">Mesa</th>
                      <th className="p-2">Líder</th>
                      <th className="p-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {testigosFiltrados.map(t => {
                      const lider = actors.find(a => a.id === t.leaderId);
                      return (
                        <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-2">
                            <p className="font-semibold text-white">{t.nombre}</p>
                            <span className="text-[9px] text-slate-500 font-mono">CC {t.cedula}</span>
                          </td>
                          <td className="p-2">
                            <span className="text-slate-300 truncate max-w-[80px]">{t.puestoNombre}</span>
                          </td>
                          <td className="p-2 text-center">
                            <span className="font-mono font-bold text-slate-200">#{t.mesaNumero}</span>
                          </td>
                          <td className="p-2">
                            <span className={`text-[9px] px-2 py-0.5 rounded ${t.leaderId ? 'bg-slate-800 text-slate-300' : 'bg-rose-500/20 text-rose-400'}`}>
                              {lider?.nombre ?? 'Sin líder'}
                            </span>
                          </td>
                          <td className="p-2">
                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                              t.estado === 'confirmado' ? 'bg-emerald-500/20 text-emerald-400' :
                              t.estado === 'pendiente' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-rose-500/20 text-rose-400'
                            }`}>
                              {t.estado}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {testigosSinLider.length > 0 && (
              <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] mt-3">
                ⚠️ {testigosSinLider.length} testigo(s) sin líder asignado. Asignen un líder antes de activar el Día D.
              </div>
            )}
          </div>
        )}
      </Card>

      {/* =========================================
         SECCIÓN VOTANTES (acordeón colapsable)
         ========================================= */}
      <Card className="bg-slate-900/90 border border-slate-800/80 rounded-xl overflow-hidden mt-4">
        <div className="p-4 bg-slate-900/50 border-b border-slate-800/50 cursor-pointer flex items-center justify-between" onClick={() => toggleSeccion('votantes')}>
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-white text-sm uppercase tracking-wider text-[10px]">Votantes en CRM</h3>
              <p className="text-[10px] text-slate-400">{votantesFiltrados.length} votante(s) registrado(s)</p>
            </div>
          </div>
          {abierta === 'votantes' ? (
            <ChevronUp className="w-4 h-4 text-amber-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-amber-400" />
          )}
        </div>

        {abierta === 'votantes' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Button variant="primary" size="sm" onClick={() => setIsNewVoterOpen(true)} icon={<Target className="w-3.5 h-3.5" />}>
                Nuevo Votante
              </Button>
            </div>
            {votantesFiltrados.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-xs">
                No hay votantes registrados.
              </div>
            ) : (
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/50 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-2">Votante</th>
                      <th className="p-2">Barrio</th>
                      <th className="p-2">Intención</th>
                      <th className="p-2">Líder</th>
                      <th className="p-2 text-center">Día D</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {votantesFiltrados.map(v => {
                      const lider = actors.find(a => a.id === v.leaderId);
                      return (
                        <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-2">
                            <p className="font-semibold text-white">{v.nombre}</p>
                            <span className="text-[9px] text-slate-500 font-mono">CC {v.cedula}</span>
                          </td>
                          <td className="p-2">{v.barrio}</td>
                          <td className="p-2">
                            <span className={`text-[9px] px-2 py-0.5 rounded ${
                              v.intencionVoto === 'voto_duro' ? 'bg-emerald-500/20 text-emerald-400' :
                              v.intencionVoto === 'voto_blando' ? 'bg-blue-500/20 text-blue-400' :
                              v.intencionVoto === 'indeciso' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-rose-500/20 text-rose-400'
                            }`}>
                              {v.intencionVoto.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-2">
                            <span className={`text-[9px] px-2 py-0.5 rounded ${v.leaderId ? 'bg-slate-800 text-slate-300' : 'bg-rose-500/20 text-rose-400'}`}>
                              {lider?.nombre ?? 'Sin líder'}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                              v.yaVoto ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                            }`}>
                              {v.yaVoto ? 'VOTÓ' : 'PENDIENTE'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {votantesSinLider.length > 0 && (
              <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] mt-3">
                ⚠️ {votantesSinLider.length} votante(s) sin líder asignado. Asignen un líder antes de activar el Día D.
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Activación Día D */}
      <div className="mt-6">
        <Card className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4">
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[10px]">
              Activación del Día D
            </h3>
            <p className="text-xs text-slate-400">
              Cuando esté listo el plan de líderes, testigos y votantes, el Supervisor Total
              puede activar el modo Día D para comenzar la transmisión de actas E-14 en vivo.
            </p>
            {!diaDActivado && isTotalSupervisor && (
              <Button variant="primary" size="sm" onClick={manejarActivarDiaD} className="w-full" icon={<Clock className="w-4 h-4" />}>
                Activar Día D – Iniciar Escrutinio en Vivo
              </Button>
            )}
            {diaDActivado && isTotalSupervisor && (
              <Button variant="outline" size="sm" onClick={manejarDesactivarDiaD} className="w-full" icon={<AlertCircle className="w-4 h-4" />}>
                Desactivar Día D – Volver a Preparación
              </Button>
            )}
            {!isTotalSupervisor && (
              <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                Solo el Supervisor Total puede activar el Día D.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
