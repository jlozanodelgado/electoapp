import React, { useState } from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Search, User, Building, MapPin, Clock } from 'lucide-react';
import { CandidatoAvatar } from '../ui/CandidatoAvatar';

export const CandidatosModule: React.FC = () => {
  const { candidatos, partidos, actorRole, actorId } = useElectoralStore();
  const [busqueda, setBusqueda] = useState('');

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

  const cargoLabels: Record<string, string> = {
    presidente: 'Presidente',
    alcalde: 'Alcalde',
    concejal: 'Concejal',
    diputado: 'Diputado',
    senador: 'Senador',
    representante: 'Representante',
  };

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
            Listado de candidatos con su partido, número de tarjetón y foto.
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
      </div>

      {/* Listado */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-3 w-16">Foto</th>
                <th className="p-3">Candidato</th>
                <th className="p-3">Partido</th>
                <th className="p-3 text-center">Tarjetón</th>
                <th className="p-3 text-center">Cargo</th>
                <th className="p-3">Territorio</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {candidatosFiltrados.map((c) => {
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
                      <span className="text-[10px] text-slate-400 font-mono">
                        {c.departamentoId ?? 'Nacional'}
                      </span>
                      {c.municipioId && (
                        <span className="text-[10px] text-slate-500 block">
                          {c.municipioId}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Badge variant="blue" size="sm">
                        ID: {c.id.slice(0, 8)}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {candidatosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500 text-xs">
                    No se encontraron candidatos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leyenda de cargos */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
            Cargos disponibles
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(cargoLabels).map(([key, label]) => (
            <span key={key} className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300">
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
