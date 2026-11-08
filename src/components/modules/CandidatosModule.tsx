import React, { useState } from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Search, User, Building, MapPin, Clock, Layers } from 'lucide-react';
import { CandidatoAvatar } from '../ui/CandidatoAvatar';

export const CandidatosModule: React.FC = () => {
  const { candidatos, partidos } = useElectoralStore();
  const [busqueda, setBusqueda] = useState('');

  const municipios: Record<string, string> = {
    tulua: 'Tuluá',
    cali: 'Cali',
    buga: 'Guadalajara de Buga',
    palmira: 'Palmira',
    bogota: 'Bogotá D.C.',
    soacha: 'Soacha',
    chia: 'Chía',
    medellin: 'Medellín',
    envigado: 'Envigado',
    itagui: 'Itagüí',
  };

  const departamentos: Record<string, string> = {
    valle: 'Valle del Cauca',
    cundinamarca: 'Cundinamarca / Bogotá D.C.',
    antioquia: 'Antioquia',
  };

  const cargoLabels: Record<string, string> = {
    presidente: 'Presidente',
    gobernacion: 'Gobernación',
    alcalde: 'Alcalde',
    concejal: 'Concejal',
    asamblea_departamental: 'Asamblea Departamental',
    diputado: 'Diputado',
    senador: 'Senador',
    representante: 'Representante',
  };

  const cargoEsLista = (cargo: string) => cargo === 'concejal' || cargo === 'asamblea_departamental';

  // Filtrar por búsqueda
  const candidatosFiltrados = candidatos.filter((c) => {
    const partido = partidos.find((p) => p.id === c.partidoId);
    return (
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.apellido?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.cedula.includes(busqueda) ||
      partido?.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      partido?.siglas.toLowerCase().includes(busqueda.toLowerCase())
    );
  });

  // Separar candidatos individuales de listas de corporación
  const candidatosIndividuales = candidatosFiltrados.filter((c) => !cargoEsLista(c.cargo));
  const candidatosLista = candidatosFiltrados.filter((c) => cargoEsLista(c.cargo));

  // Agrupar candidatos de lista por partido
  const listasPorPartido: Record<string, { partido: any; candidatos: typeof candidatosLista }> = {};
  candidatosLista.forEach((c) => {
    const pid = c.partidoId;
    if (!listasPorPartido[pid]) {
      const partido = partidos.find((p) => p.id === pid);
      listasPorPartido[pid] = { partido: partido ?? null, candidatos: [] };
    }
    listasPorPartido[pid].candidatos.push(c);
  });

  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto p-6 space-y-6 select-none bg-slate-950">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
            Gestión de Candidatos
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <User className="w-6 h-6 text-blue-400" />
            <span>Candidatos Registrados</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Listado de candidatos con su partido, número de tarjetón, número de lista y foto.
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por nombre, cédula, partido o siglas..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900/90 border-slate-800 border-l-4 border-l-blue-500">
          <div className="p-4">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
              Total Candidatos
            </span>
            <div className="text-3xl font-black font-mono text-white mt-1">
              {candidatos.length}
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800 border-l-4 border-l-emerald-500">
          <div className="p-4">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
              Partidos Registrados
            </span>
            <div className="text-3xl font-black font-mono text-emerald-400 mt-1">
              {partidos.length}
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800 border-l-4 border-l-purple-500">
          <div className="p-4">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
              Con Foto de Perfil
            </span>
            <div className="text-3xl font-black font-mono text-purple-400 mt-1">
              {candidatos.filter((c) => c.fotoUrl).length}
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800 border-l-4 border-l-amber-500">
          <div className="p-4">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              Listas de Corporación
            </span>
            <div className="text-3xl font-black font-mono text-amber-400 mt-1">
              {Object.keys(listasPorPartido).length}
            </div>
          </div>
        </Card>
      </div>

      {/* SECCIÓN: Listas de Corporación (Concejo / Asamblea) */}
      {Object.keys(listasPorPartido).length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-sm uppercase tracking-wider text-[10px]">
                Listas de Corporación (Concejo / Asamblea Departamental)
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Cada partido presenta una lista con múltiples candidatos
            </span>
          </div>

          <div className="p-4 space-y-4">
            {Object.values(listasPorPartido).map(({ partido, candidatos: listaCandidatos }) => {
              const cargo = listaCandidatos[0]?.cargo;
              const numeroLista = listaCandidatos[0]?.numeroLista ?? '—';
              return (
                <div key={partido?.id ?? 'sin-partido'} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 mb-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full border border-slate-700"
                        style={{ backgroundColor: partido?.color ?? '#64748b' }}
                      />
                      <div>
                        <span className="font-bold text-slate-200 text-sm">
                          {partido?.nombre ?? 'Sin Partido'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono uppercase">
                          {partido?.siglas ?? '-'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40`}>
                        Lista #{numeroLista}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${cargoEsLista(cargo) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        {cargoLabels[cargo] ?? cargo}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {listaCandidatos.length} candidato(s)
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900/40 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="p-2 w-14">Foto</th>
                          <th className="p-2">Candidato</th>
                          <th className="p-2 text-center">Tarjetón</th>
                          <th className="p-2">Municipio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {listaCandidatos.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-2">
                              <CandidatoAvatar fotoUrl={c.fotoUrl} nombre={c.nombre} size="xs" />
                            </td>
                            <td className="p-2">
                              <p className="font-semibold text-white text-sm truncate">
                                {c.nombre} {c.apellido ?? ''}
                              </p>
                              <span className="text-[10px] text-slate-500 font-mono">
                                CC {c.cedula}
                              </span>
                            </td>
                            <td className="p-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                c.numeroTarjeton
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                                  : 'bg-slate-800 text-slate-500 border border-slate-700'
                              }`}>
                                {c.numeroTarjeton ?? '—'}
                              </span>
                            </td>
                            <td className="p-2">
                              <span className={`text-[10px] font-mono ${c.municipioId ? 'text-slate-300' : 'text-slate-500'}`}>
                                {c.municipioId ? municipios[c.municipioId] : '—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECCIÓN: Candidatos Individuales */}
      {candidatosIndividuales.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider text-[10px]">
              Candidatos Individuales
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              Presidente, Alcaldía, Gobernación, Senado, Cámara, Diputado
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                <tr>
                  <th className="p-3 w-16">Foto</th>
                  <th className="p-3">Candidato</th>
                  <th className="p-3">Partido</th>
                  <th className="p-3 text-center">Tarjetón</th>
                  <th className="p-3 text-center">Cargo</th>
                  <th className="p-3">Departamento</th>
                  <th className="p-3">Municipio</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {candidatosIndividuales.map((c) => {
                  const partido = partidos.find((p) => p.id === c.partidoId);
                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="p-3">
                        <CandidatoAvatar fotoUrl={c.fotoUrl} nombre={c.nombre} size="sm" />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white truncate">
                            {c.nombre} {c.apellido ?? ''}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            CC {c.cedula}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full border border-slate-700"
                            style={{ backgroundColor: partido?.color ?? '#64748b' }}
                          />
                          <span className="text-slate-300 font-medium truncate">
                            {partido?.nombre ?? 'Sin partido'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {partido?.siglas ?? '-'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.numeroTarjeton
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}>
                          {c.numeroTarjeton ?? '—'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-slate-300 text-xs capitalize">
                          {cargoLabels[c.cargo] ?? c.cargo}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-slate-300 text-xs capitalize">
                          {c.departamentoId ? departamentos[c.departamentoId] : 'Nacional'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-mono ${c.municipioId ? 'text-slate-300' : 'text-slate-500'}`}>
                          {c.municipioId ? municipios[c.municipioId] : (cargoEsLista(c.cargo) ? 'Requerido' : '—')}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Badge variant="blue" size="sm">
                          ID: {c.id.slice(0, 8)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                {candidatosIndividuales.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500 text-xs">
                      No hay candidatos individuales con los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {candidatosFiltrados.length === 0 && (
        <div className="p-6 text-center text-slate-500 text-xs">
          No se encontraron candidatos.
        </div>
      )}
    </div>
  );
};
