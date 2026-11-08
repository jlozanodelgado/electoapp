import React from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { CapaMetrica } from '../../types/electoral';
import { TipoBasemap } from '../../types/tactical';
import { 
  Layers, 
  Flame, 
  Search, 
  CircleDot, 
  Filter, 
  MapPin,
  TrendingUp,
  Users,
  Moon,
  Sun,
  Satellite,
  Layout
} from 'lucide-react';

export const MapControls: React.FC = () => {
  const {
    capaMetrica,
    setCapaMetrica,
    partidoFiltro,
    setPartidoFiltro,
    busquedaTexto,
    setBusquedaTexto,
    mostrarHeatmap,
    setMostrarHeatmap,
    tipoBasemap,
    setTipoBasemap,
    radioInfluenciaKm,
    setRadioInfluencia,
    puestos,
    setSelectedPuestoId
  } = useElectoralStore();

  const metricas: Array<{ id: CapaMetrica; label: string; icon: React.ReactNode }> = [
    { id: 'partido_dominante', label: 'Partido Ganador', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'participacion', label: '% Participación', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'abstencionismo', label: '% Abstención', icon: <Filter className="w-3.5 h-3.5" /> },
    { id: 'margen_victoria', label: 'Margen Victoria', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'potencial_censo', label: 'Censo Electoral', icon: <MapPin className="w-3.5 h-3.5" /> },
    { id: 'cobertura_testigos', label: 'Cobertura Testigos', icon: <Users className="w-3.5 h-3.5" /> },
  ];

  // Buscador con sugerencias de puestos
  const resultadosBusqueda = busquedaTexto.trim().length > 1 
    ? puestos.filter(p => 
        p.nombre.toLowerCase().includes(busquedaTexto.toLowerCase()) ||
        p.zona.toLowerCase().includes(busquedaTexto.toLowerCase()) ||
        p.comunaBarrio.toLowerCase().includes(busquedaTexto.toLowerCase())
      ).slice(0, 5)
    : [];

  // Estilos de mapa disponibles
  const basemaps: Array<{ id: TipoBasemap; label: string; icon: React.ReactNode }> = [
    { id: 'dark', label: 'Oscuro', icon: <Moon className="w-3.5 h-3.5" /> },
    { id: 'light', label: 'Claro', icon: <Sun className="w-3.5 h-3.5" /> },
    { id: 'satellite', label: 'Satelital', icon: <Satellite className="w-3.5 h-3.5" /> },
    { id: 'lines', label: 'Solo Líneas', icon: <Layout className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2.5 max-w-sm w-full pointer-events-auto">
      {/* Buscador Rápido con Autocompletado */}
      <div className="relative">
        <div className="relative bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl flex items-center px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={busquedaTexto}
            onChange={(e) => setBusquedaTexto(e.target.value)}
            placeholder="Buscar puesto, barrio o zona..."
            className="w-full bg-transparent border-none text-xs text-slate-100 placeholder-slate-400 focus:outline-none pl-2.5"
          />
          {busquedaTexto && (
            <button 
              onClick={() => setBusquedaTexto('')} 
              className="text-xs text-slate-500 hover:text-slate-300 font-bold px-1"
            >
              ×
            </button>
          )}
        </div>

        {/* Dropdown de resultados */}
        {resultadosBusqueda.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900/98 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl overflow-hidden py-1 z-50">
            {resultadosBusqueda.map(p => (
              <div
                key={p.id}
                onClick={() => {
                  setSelectedPuestoId(p.id);
                  setBusquedaTexto('');
                }}
                className="px-3 py-2 hover:bg-slate-800/80 cursor-pointer text-xs border-b border-slate-800/60 last:border-none flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-200">{p.nombre}</p>
                  <p className="text-[10px] text-slate-400">{p.zona} • {p.comunaBarrio}</p>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                  {p.censoElectoral.toLocaleString()} censo
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selector de Métricas y Capas Coropléticas */}
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800/90 rounded-xl p-3 shadow-2xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Capa Coroplética</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">GIS Multi-Criterio</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {metricas.map(m => {
            const isSelected = capaMetrica === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setCapaMetrica(m.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left ${
                  isSelected
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 shadow-sm'
                    : 'bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {m.icon}
                <span className="truncate">{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Herramientas Avanzadas: Heatmap & Radio de Influencia */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          {/* Heatmap Toggle */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <Flame className={`w-3.5 h-3.5 ${mostrarHeatmap ? 'text-amber-400' : 'text-slate-500'}`} />
              <span>Capa de Calor (Heatmap)</span>
            </label>
            <input
              type="checkbox"
              checked={mostrarHeatmap}
              onChange={(e) => setMostrarHeatmap(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
            />
          </div>

          {/* Radio de Influencia (PostGIS Buffer) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <CircleDot className="w-3.5 h-3.5 text-blue-400" />
                <span>Buffer de Influencia:</span>
              </span>
              <span className="font-mono text-blue-400 font-semibold">
                {radioInfluenciaKm ? `${radioInfluenciaKm} km` : 'Inactivo'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={radioInfluenciaKm || 0}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setRadioInfluencia(val > 0 ? val : null);
                }}
                className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              {radioInfluenciaKm && (
                <button
                  onClick={() => setRadioInfluencia(null)}
                  className="text-[10px] text-slate-400 hover:text-rose-400 underline font-semibold"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Selector de Estilo del Mapa (Basemap) */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">
              Estilo Mapa
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {basemaps.map(b => {
              const isSelected = tipoBasemap === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setTipoBasemap(b.id)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 shadow-sm'
                      : 'bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {b.icon}
                  <span className="truncate">{b.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

