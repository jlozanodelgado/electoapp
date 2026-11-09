import React, { useState } from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Search, User, MapPin, Clock, Layers, ChevronDown } from 'lucide-react';
import { CandidatoAvatar } from '../ui/CandidatoAvatar';

export const CandidatosModule: React.FC = () => {
  const { candidatos, partidos } = useElectoralStore();
  const [busqueda, setBusqueda] = useState('');
  const [municipioFiltro, setMunicipioFiltro] = useState<string | 'todos'>('todos');
  const [cargoFiltro, setCargoFiltro] = useState<string | 'todos'>('todos');
  const [municipiosAbiertos, setMunicipiosAbiertos] = useState<Record<string, boolean>>({});

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
    nacional: 'Nacional',
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

  const getMunicipioDisplay = (municipioId: string | undefined, departamentoId: string | undefined) => {
    if (!municipioId) {
      if (departamentoId) return departamentos[departamentoId] ?? 'Sin departamento';
      return 'Nacional';
    }
    return municipios[municipioId] ?? municipioId;
  };

  // Filtrar candidatos
  const candidatosFiltrados = candidatos.filter((c) => {
    const partido = partidos.find((p) => p.id === c.partidoId);
    const matchBusqueda =
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.apellido?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.cedula.includes(busqueda) ||
      partido?.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      partido?.siglas.toLowerCase().includes(busqueda.toLowerCase());
    const matchMunicipio =
      municipioFiltro === 'todos' ||
      c.municipioId === municipioFiltro ||
      (municipioFiltro === 'nacional' && !c.municipioId);
    const matchCargo = cargoFiltro === 'todos' || c.cargo === cargoFiltro;
    return matchBusqueda && matchMunicipio && matchCargo;
  });

  // Agrupar por municipio
  const candidatosPorMunicipio: Record<string, typeof candidatosFiltrados> = {};
  candidatosFiltrados.forEach((c) => {
    const key = c.municipioId || 'nacional';
    if (!candidatosPorMunicipio[key]) {
      candidatosPorMunicipio[key] = [];
    }
    candidatosPorMunicipio[key].push(c);
  });

  const municipiosOrdenados = Object.keys(candidatosPorMunicipio).sort((a, b) => {
    if (a === 'nacional') return -1;
    if (b === 'nacional') return 1;
    return municipios[a].localeCompare(municipios[b]);
  });

  const municipiosDisponibles = Array.from(
    new Set(candidatos.map((c) => c.municipioId || 'nacional'))
  ).sort((a, b) => {
    if (a === 'nacional') return -1;
    if (b === 'nacional') return 1;
    return municipios[a].localeCompare(municipios[b]);
  });

  const cargosDisponibles = Array.from(new Set(candidatos.map((c) => c.cargo))).sort();

  const toggleMunicipio = (municipioId: string) => {
    setMunicipiosAbiertos((prev) => ({ ...prev, [municipioId]: !prev[municipioId] }));
  };

  const isMunicipioOpen = (municipioId: string) => {
    if (!(municipioId in municipiosAbiertos)) {
      return municipiosAbiertos[Object.keys(municipiosAbiertos)[0]] !== false;
    }
    return municipiosAbiertos[municipioId];
  };

  // Componente para una lista de corporación (concejo/asamblea)
  const renderListaCorporacion = (candidatosDelCargo: typeof candidatosFiltrados) => {
    const listasPorPartido: Record<string, { partido: any; candidatos: typeof candidatosDelCargo }> = {};
    candidatosDelCargo.forEach((c) => {
      const pid = c.partidoId;
      if (!listasPorPartido[pid]) {
        const partido = partidos.find((p) => p.id === pid);
        listasPorPartido[pid] = { partido: partido ?? null, candidatos: [] };
      }
      listasPorPartido[pid].candidatos.push(c);
    });

    return (
      <div className="space-y-2">
        {Object.entries(listasPorPartido).map(([pid, { partido, candidatos: lista }]) => (
          <div key={pid} className="bg-slate-950/40 rounded-lg border border-slate-800/50 p-2 mb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full border border-slate-700"
                  style={{ backgroundColor: partido?.color ?? '#64748b' }}
                />
                <div>
                  <span className="font-medium text-slate-200 text-xs">
                    {partido?.nombre ?? 'Sin Partido'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono uppercase">
                    {partido?.siglas ?? '-'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                Lista #{lista[0]?.numeroLista ?? '—'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {lista.map((c) => (
                <div key={c.id} className="bg-slate-800/50 rounded p-2 border border-slate-800/40">
                  <div className="flex items-center gap-2 mb-1">
                    <CandidatoAvatar fotoUrl={c.fotoUrl} nombre={c.nombre} size="xs" />
                    <span className="text-slate-300 truncate">
                      {c.nombre} {c.apellido ?? ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-slate-500 font-mono">Tarjetón:</span>
                    <span className={`text-[9px] font-bold ${c.numeroTarjeton ? 'text-blue-400' : 'text-slate-500'}`}>
                      {c.numeroTarjeton ?? '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
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
            <span>Candidatos por Ciudad y Cargo</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Agrupados por municipio y tipo de cargo electoral.
          </p>
        </div>

        <div className="relative w-full md:w-96">
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

      {/* Filtros rápidos */}
      <div className="flex flex-wrap gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Municipio:</span>
          <select
            value={municipioFiltro}
            onChange={(e) => setMunicipioFiltro(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="todos">Todos</option>
            {municipiosDisponibles.map((m) => (
              <option key={m} value={m}>
                {municipios[m] ?? m}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Cargo:</span>
          <select
            value={cargoFiltro}
            onChange={(e) => setCargoFiltro(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="todos">Todos los cargos</option>
            {cargosDisponibles.map((c) => (
              <option key={c} value={c}>
                {cargoLabels[c] ?? c}
              </option>
            ))}
          </select>
        </div>
        <span className="ml-auto text-[10px] text-slate-500">
          {candidatosFiltrados.length} candidato(s)
        </span>
      </div>

      {/* Vista agrupada por municipio */}
      <div className="space-y-4">
        {municipiosOrdenados.map((municipioKey) => {
          const candidatosDelMunicipio = candidatosPorMunicipio[municipioKey];
          const isOpen = isMunicipioOpen(municipioKey);
          const nombreMunicipio = municipios[municipioKey] ?? municipioKey;

          // Agrupar por cargo dentro del municipio
          const candidatosPorCargo: Record<string, typeof candidatosDelMunicipio> = {};
          candidatosDelMunicipio.forEach((c) => {
            if (!candidatosPorCargo[c.cargo]) {
              candidatosPorCargo[c.cargo] = [];
            }
            candidatosPorCargo[c.cargo].push(c);
          });

          return (
            <div
              key={municipioKey}
              className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm"
            >
              {/* Encabezado del municipio */}
              <div
                className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between cursor-pointer hover:bg-slate-800/40"
                onClick={() => toggleMunicipio(municipioKey)}
              >
                <div className="flex items-center gap-2">
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  <span className="font-bold text-white text-sm">{nombreMunicipio}</span>
                  <span className="text-[10px] text-slate-500 font-mono ml-auto">
                    {candidatosDelMunicipio.length} candidato(s)
                  </span>
                </div>
              </div>

              {/* Contenido del municipio (colapsable) */}
              {isOpen && (
                <div className="p-3 space-y-3">
                  {Object.entries(candidatosPorCargo).map(([cargo, candidatosDelCargo]) => (
                    <div key={cargo} className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            cargoEsLista(cargo)
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          }`}
                        >
                          {cargoLabels[cargo] ?? cargo}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {candidatosDelCargo.length}
                        </span>
                      </div>

                      {cargoEsLista(cargo)
                        ? renderListaCorporacion(candidatosDelCargo)
                        : candidatosDelCargo.map((c) => {
                            const partido = partidos.find((p) => p.id === c.partidoId);
                            return (
                              <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-950/50 border border-slate-800/50 hover:bg-slate-800/70 transition-colors">
                                <CandidatoAvatar fotoUrl={c.fotoUrl} nombre={c.nombre} size="sm" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-white text-sm truncate">
                                      {c.nombre} {c.apellido ?? ''}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      CC {c.cedula}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <div
                                      className="w-2.5 h-2.5 rounded-full border border-slate-700"
                                      style={{ backgroundColor: partido?.color ?? '#64748b' }}
                                    />
                                    <span className="text-[10px] text-slate-400 truncate">
                                      {partido?.nombre ?? 'Sin Partido'}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {partido?.siglas ?? '-'}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      • Tarjetón: {c.numeroTarjeton ?? '—'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {municipiosOrdenados.length === 0 && (
          <div className="p-6 text-center text-slate-500 text-xs">
            No hay candidatos con los filtros seleccionados.
          </div>
        )}
      </div>
    </div>
  );
};
