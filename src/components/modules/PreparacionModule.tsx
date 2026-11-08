import React, { useState } from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Users, Target, FileSpreadsheet, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export const PreparacionModule: React.FC = () => {
  const [tab, setTab] = useState<'lideres' | 'testigos' | 'votantes' | 'plan'>('plan');
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
            Carga de líderes, testigos y votantes antes de activar el escrutinio en vivo.
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

      {/* Tabs de gestión */}
      <div className="bg-slate-900/90 p-1 flex border border-slate-800 rounded-xl">
        <button
          onClick={() => setTab('plan')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            tab === 'plan'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Plan General</span>
        </button>
        <button
          onClick={() => setTab('lideres')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            tab === 'lideres'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Líderes ({lideres.length})</span>
        </button>
        <button
          onClick={() => setTab('testigos')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            tab === 'testigos'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Testigos ({testigos.length})</span>
        </button>
        <button
          onClick={() => setTab('votantes')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            tab === 'votantes'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Votantes ({votantes.length})</span>
        </button>
      </div>

      {/* CONTENIDO POR TAB */}
      {tab === 'plan' && (
        <div className="space-y-6">
          <Card className="bg-slate-900/90 border-slate-800">
            <div className="p-4 space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[10px]">
                Activación del Día D
              </h3>
              <p className="text-xs text-slate-400">
                Cuando esté listo el plan de líderes, testigos y votantes, el Supervisor Total
                puede activar el modo Día D para comenzar la transmisión de actas E-14 en vivo.
              </p>
              {!diaDActivado && isTotalSupervisor && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={manejarActivarDiaD}
                  className="w-full"
                  icon={<Clock className="w-4 h-4" />}
                >
                  Activar Día D – Iniciar Escrutinio en Vivo
                </Button>
              )}
              {diaDActivado && isTotalSupervisor && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={manejarDesactivarDiaD}
                  className="w-full"
                  icon={<AlertCircle className="w-4 h-4" />}
                >
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-slate-900/90 border-slate-800 p-4">
              <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider text-[10px]">
                Próximos pasos
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  Registrar partidos y candidatos (Supervisor Total)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">○</span>
                  Crear líderes (Supervisor de Candidato)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">○</span>
                  Asignar testigos y votantes a líderes
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-rose-400">○</span>
                  Activar Día D (Supervisor Total)
                </li>
              </ul>
            </Card>

            <Card className="bg-slate-900/90 border-slate-800 p-4">
              <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider text-[10px]">
                Estado actual del plan
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Líderes creados</span>
                  <Badge variant={lideres.length > 0 ? 'emerald' : 'red'} size="sm">
                    {lideres.length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Testigos acreditados</span>
                  <Badge variant={testigos.length > 0 ? 'emerald' : 'red'} size="sm">
                    {testigos.length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Votantes en CRM</span>
                  <Badge variant={votantes.length > 0 ? 'emerald' : 'red'} size="sm">
                    {votantes.length}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900/90 border-slate-800 p-4">
              <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider text-[10px]">
                Acciones rápidas
              </h3>
              <div className="space-y-2">
                {isTotalSupervisor && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsNewWitnessOpen(true)}
                    className="w-full justify-start"
                    icon={<Users className="w-3.5 h-3.5" />}
                  >
                    Crear Líder
                  </Button>
                )}
                {(isTotalSupervisor || actorRole === 'candidateSupervisor') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsNewWitnessOpen(true)}
                    className="w-full justify-start"
                    icon={<Users className="w-3.5 h-3.5" />}
                  >
                    Crear Testigo
                  </Button>
                )}
                {(isTotalSupervisor || actorRole === 'candidateSupervisor' || actorRole === 'leader') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsNewVoterOpen(true)}
                    className="w-full justify-start"
                    icon={<Target className="w-3.5 h-3.5" />}
                  >
                    Registrar Votante
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB LÍDERES */}
      {tab === 'lideres' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[10px]">
              Líderes del Plan
            </h3>
            <Button variant="primary" size="sm" onClick={() => setIsNewWitnessOpen(true)} icon={<Users className="w-3.5 h-3.5" />}>
              Nuevo Líder
            </Button>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Líder</th>
                    <th className="p-3">Supervisor</th>
                    <th className="p-3">Territorio</th>
                    <th className="p-3 text-center">Testigos</th>
                    <th className="p-3 text-center">Votantes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {lideres.map(l => {
                    const testigosDelLider = testigos.filter(t => t.leaderId === l.id);
                    const votantesDelLider = votantes.filter(v => v.leaderId === l.id);
                    const supervisor = actors.find(a => a.id === l.supervisorId);
                    return (
                      <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          <p className="font-semibold text-white">{l.nombre}</p>
                          <span className="text-[10px] text-slate-500 font-mono">ID: {l.id}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-300">{supervisor?.nombre ?? 'Sin asignar'}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] text-slate-400">{l.scopeLevel ?? '-'}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{l.scopeId ?? '-'}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-mono font-bold text-emerald-400">{testigosDelLider.length}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-mono font-bold text-amber-400">{votantesDelLider.length}</span>
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

      {/* TAB TESTIGOS */}
      {tab === 'testigos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[10px]">
              Testigos Acreditados
            </h3>
            <Button variant="primary" size="sm" onClick={() => setIsNewWitnessOpen(true)} icon={<Users className="w-3.5 h-3.5" />}>
              Nuevo Testigo
            </Button>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Testigo</th>
                    <th className="p-3">Puesto</th>
                    <th className="p-3 text-center">Mesa</th>
                    <th className="p-3">Líder</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {testigos.map(t => {
                    const lider = actors.find(a => a.id === t.leaderId);
                    return (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          <p className="font-semibold text-white">{t.nombre}</p>
                          <span className="text-[10px] text-slate-500 font-mono">CC {t.cedula}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-300">{t.puestoNombre}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-mono font-bold text-slate-200">#{t.mesaNumero}</span>
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded ${t.leaderId ? 'bg-slate-800 text-slate-300' : 'bg-rose-500/20 text-rose-400'}`}>
                            {lider?.nombre ?? 'Sin líder'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
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
          </div>
          {testigosSinLider.length > 0 && (
            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              ⚠️ {testigosSinLider.length} testigo(s) sin líder asignado. Asignen un líder antes de activar el Día D.
            </div>
          )}
        </div>
      )}

      {/* TAB VOTANTES */}
      {tab === 'votantes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[10px]">
              Votantes en CRM
            </h3>
            <Button variant="primary" size="sm" onClick={() => setIsNewVoterOpen(true)} icon={<Target className="w-3.5 h-3.5" />}>
              Nuevo Votante
            </Button>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Votante</th>
                    <th className="p-3">Barrio</th>
                    <th className="p-3">Intención</th>
                    <th className="p-3">Líder</th>
                    <th className="p-3 text-center">Día D</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {votantes.map(v => {
                    const lider = actors.find(a => a.id === v.leaderId);
                    return (
                      <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          <p className="font-semibold text-white">{v.nombre}</p>
                          <span className="text-[10px] text-slate-500 font-mono">CC {v.cedula}</span>
                        </td>
                        <td className="p-3">{v.barrio}</td>
                        <td className="p-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded ${
                            v.intencionVoto === 'voto_duro' ? 'bg-emerald-500/20 text-emerald-400' :
                            v.intencionVoto === 'voto_blando' ? 'bg-blue-500/20 text-blue-400' :
                            v.intencionVoto === 'indeciso' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-rose-500/20 text-rose-400'
                          }`}>
                            {v.intencionVoto.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded ${v.leaderId ? 'bg-slate-800 text-slate-300' : 'bg-rose-500/20 text-rose-400'}`}>
                            {lider?.nombre ?? 'Sin líder'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
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
          </div>
          {votantesSinLider.length > 0 && (
            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              ⚠️ {votantesSinLider.length} votante(s) sin líder asignado. Asignen un líder antes de activar el Día D.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
