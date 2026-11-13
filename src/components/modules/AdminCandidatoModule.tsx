import React, { useState } from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { useSecurityStore } from '../../store/securityStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Pencil, Trash2, UserPlus, Users, Shield, Target, Flag } from 'lucide-react';
import { Partido, Candidato } from '../../types/electoral';

export const AdminCandidatoModule: React.FC = () => {
  const {
    partidos,
    candidatos,
    actors,
    testigos,
    votantes,
    actorRole,
    actorId,
    isNewWitnessOpen,
    setIsNewWitnessOpen,
    isNewVoterOpen,
    setIsNewVoterOpen,
  } = useElectoralStore();

  const { currentActor } = useSecurityStore();
  const actor = currentActor();

  const [tab, setTab] = useState<'lideres' | 'testigos' | 'votantes'>('lideres');
  const [busqueda, setBusqueda] = useState('');

  const esSupervisorCandidato = actorRole === 'candidateSupervisor';
  const miCandidatoId = actor?.candidatoId;
  const miActorId = actorId;

  // Filtrar candidatos del supervisor de candidato
  const miCandidato = candidatos.find(c => c.id === miCandidatoId);
  const miPartido = partidos.find(p => p.id === miCandidato?.partidoId);

  // Filtrar líderes de este candidato y este supervisor
  const misLideres = actors.filter(
    a => a.role === 'leader' && a.candidatoId === miCandidatoId && a.supervisorId === miActorId
  );

  // Filtrar testigos de este candidato y de mis líderes
  const misLideresIds = misLideres.map(l => l.id);
  const misTestigos = testigos.filter(
    t => t.leaderId && misLideresIds.includes(t.leaderId)
  );

  // Filtrar votantes de este candidato y de mis líderes
  const misVotantes = votantes.filter(
    v => v.leaderId && misLideresIds.includes(v.leaderId)
  );

  // Búsqueda
  const q = busqueda.trim().toLowerCase();
  const lideresFiltrados = misLideres.filter(l => l.nombre.toLowerCase().includes(q));
  const testigosFiltrados = misTestigos.filter(t => t.nombre.toLowerCase().includes(q) || t.cedula.toLowerCase().includes(q));
  const votantesFiltrados = misVotantes.filter(v => v.nombre.toLowerCase().includes(q) || v.cedula.toLowerCase().includes(q));

  if (!esSupervisorCandidato || !miCandidato) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-slate-950">
        <Card className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-rose-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-1">Acceso restringido</h2>
          <p className="text-sm text-slate-400">
            Solo el <span className="font-semibold text-blue-300">Supervisor de Candidato</span> puede acceder a este módulo.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto p-6 space-y-6 select-none bg-slate-950">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-4">
          {/* Cabecera del candidato asignado */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[color:{miPartido?.color}] border border-[color:{miPartido.color}] flex items-center justify-center overflow-hidden">
                {miCandidato?.fotoUrl ? (
                  <img src={miCandidato.fotoUrl} alt={miCandidato.nombre} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-6 h-6 text-white/80 flex items-center justify-center">
                    <Flag className="w-4 h-4" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-white" style={{ color: miPartido?.color }}>
                  {miPartido?.nombre}
                </p>
                <p className="text-[10px] font-semibold text-white/90 uppercase tracking-wider">
                  {miPartido?.siglas}
                </p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-white/10">
              <p className="text-xs font-medium text-slate-400">Candidato</p>
              <p className="text-sm font-bold text-white">{miCandidato?.nombre} {miCandidato.apellido || ''}</p>
              {miCandidato?.numeroTarjeton && (
                <p className="text-xs text-slate-500 mt-0.5">Tarjetón: {miCandidato.numeroTarjeton}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-blue-300 uppercase tracking-wider font-bold">
            Supervisor de Candidato
          </span>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Líderes</span>
              <div className="text-2xl font-black font-mono text-blue-400 mt-1">{misLideres.length}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Testigos</span>
              <div className="text-2xl font-black font-mono text-purple-400 mt-1">{misTestigos.length}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Votantes</span>
              <div className="text-2xl font-black font-mono text-amber-400 mt-1">{misVotantes.length}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Target className="w-4 h-4" />
            </div>
          </div>
        </Card>
      </div>

      {/* Buscador */}
      <div className="relative max-w-md">
        <Users className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o cédula..."
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
        <button
          onClick={() => setTab('lideres')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
            tab === 'lideres'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Líderes ({misLideres.length})</span>
        </button>
        <button
          onClick={() => setTab('testigos')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
            tab === 'testigos'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Testigos ({misTestigos.length})</span>
        </button>
        <button
          onClick={() => setTab('votantes')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
            tab === 'votantes'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Votantes ({misVotantes.length})</span>
        </button>
      </div>

      {/* TAB LÍDERES */}
      {tab === 'lideres' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider text-[10px]">
              Mis Líderes
            </h3>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsNewWitnessOpen(true)}
              icon={<UserPlus className="w-3.5 h-3.5" />}
            >
              Nuevo Líder
            </Button>
          </div>
          {lideresFiltrados.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-xs">
              No hay líderes registrados.
            </div>
          ) : (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/50 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-2">Líder</th>
                    <th className="p-2 text-center">Testigos</th>
                    <th className="p-2 text-center">Votantes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {lideresFiltrados.map(l => {
                    const testigosLider = testigos.filter(t => t.leaderId === l.id);
                    const votantesLider = votantes.filter(v => v.leaderId === l.id);
                    return (
                      <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-2">
                          <p className="font-semibold text-white">{l.nombre}</p>
                          <span className="text-[9px] text-slate-500 font-mono">ID: {l.id.slice(0, 8)}...</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="font-mono font-bold text-emerald-400">{testigosLider.length}</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="font-mono font-bold text-amber-400">{votantesLider.length}</span>
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

      {/* TAB TESTIGOS */}
      {tab === 'testigos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider text-[10px]">
              Mis Testigos
            </h3>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsNewWitnessOpen(true)}
              icon={<UserPlus className="w-3.5 h-3.5" />}
            >
              Nuevo Testigo
            </Button>
          </div>
          {testigosFiltrados.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-xs">
              No hay testigos registrados.
            </div>
          ) : (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/50 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-2">Testigo</th>
                    <th className="p-2">Cédula</th>
                    <th className="p-2 text-center">Mesa</th>
                    <th className="p-2">Líder</th>
                    <th className="p-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {testigosFiltrados.map(t => {
                    const lider = misLideres.find(l => l.id === t.leaderId);
                    return (
                      <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-2">
                          <p className="font-semibold text-white">{t.nombre}</p>
                          <span className="text-[9px] text-slate-500 font-mono">CC {t.cedula}</span>
                        </td>
                        <td className="p-2">{t.puestoNombre || '-'} · Mesa {t.mesaNumero}</td>
                        <td className="p-2">
                          <span className="text-xs text-slate-300">{lider?.nombre || '-'}</span>
                        </td>
                        <td className="p-2">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
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
        </div>
      )}

      {/* TAB VOTANTES */}
      {tab === 'votantes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider text-[10px]">
              Mis Votantes
            </h3>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsNewVoterOpen(true)}
              icon={<Target className="w-3.5 h-3.5" />}
            >
              Nuevo Votante
            </Button>
          </div>
          {votantesFiltrados.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-xs">
              No hay votantes registrados.
            </div>
          ) : (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/50 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-2">Votante</th>
                    <th className="p-2">Cédula</th>
                    <th className="p-2">Intención</th>
                    <th className="p-2">Líder</th>
                    <th className="p-2 text-center">Día D</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {votantesFiltrados.map(v => {
                    const lider = misLideres.find(l => l.id === v.leaderId);
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
                          <span className="text-xs text-slate-300">{lider?.nombre || '-'}</span>
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
        </div>
      )}
    </div>
  );
};
