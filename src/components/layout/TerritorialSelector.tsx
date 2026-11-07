import React from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { DEPARTAMENTOS, MUNICIPIOS } from '../../data/mockElectoralData';
import { MapPin, Globe, Compass, ChevronRight } from 'lucide-react';

export const TerritorialSelector: React.FC = () => {
  const { 
    nivelTerritorial,
    departamentoId, 
    municipioId, 
    zona,
    setDepartamentoId, 
    setMunicipioId, 
    setZona,
    selectedPuestoId,
    setSelectedPuestoId,
    puestos
  } = useElectoralStore();

  const departamentosDisponibles = DEPARTAMENTOS;
  const municipiosDisponibles = departamentoId === 'todos' 
    ? MUNICIPIOS 
    : MUNICIPIOS.filter(m => m.departamentoId === departamentoId);

  const municipioActual = MUNICIPIOS.find(m => m.id === municipioId);
  const zonasDisponibles = municipioActual ? municipioActual.zonas : [];

  const puestoActual = puestos.find(p => p.id === selectedPuestoId);

  return (
    <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200">
      {/* Icono de nivel */}
      <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 rounded font-semibold text-emerald-400">
        <Globe className="w-3.5 h-3.5" />
        <span className="uppercase text-[11px] tracking-wider">
          {nivelTerritorial}
        </span>
      </div>

      <ChevronRight className="w-3 h-3 text-slate-600" />

      {/* Selector Departamento */}
      <div className="flex items-center gap-1">
        <span className="text-slate-400 font-medium">Depto:</span>
        <select
          value={departamentoId}
          onChange={(e) => setDepartamentoId(e.target.value)}
          className="bg-slate-950/80 border border-slate-700/80 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
        >
          <option value="todos">🇨🇴 Todo el País (Nacional)</option>
          {departamentosDisponibles.map(d => (
            <option key={d.id} value={d.id}>{d.nombre}</option>
          ))}
        </select>
      </div>

      <ChevronRight className="w-3 h-3 text-slate-600" />

      {/* Selector Municipio */}
      <div className="flex items-center gap-1">
        <span className="text-slate-400 font-medium">Mpio:</span>
        <select
          value={municipioId}
          onChange={(e) => setMunicipioId(e.target.value)}
          disabled={departamentoId === 'todos'}
          className="bg-slate-950/80 border border-slate-700/80 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <option value="todos">Todos los Municipios</option>
          {municipiosDisponibles.map(m => (
            <option key={m.id} value={m.id}>{m.nombre}</option>
          ))}
        </select>
      </div>

      {/* Selector Zona (solo si hay municipio seleccionado) */}
      {municipioId !== 'todos' && zonasDisponibles.length > 0 && (
        <>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <div className="flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={zona}
              onChange={(e) => setZona(e.target.value)}
              className="bg-slate-950/80 border border-slate-700/80 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="todas">Todas las Zonas</option>
              {zonasDisponibles.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Puesto seleccionado breadcrumb */}
      {puestoActual && (
        <>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-300">
            <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="font-medium max-w-[140px] truncate">{puestoActual.nombre}</span>
            <button
              onClick={() => setSelectedPuestoId(null)}
              className="ml-1 text-slate-400 hover:text-slate-100 font-bold"
              title="Cerrar puesto"
            >
              ×
            </button>
          </div>
        </>
      )}
    </div>
  );
};

