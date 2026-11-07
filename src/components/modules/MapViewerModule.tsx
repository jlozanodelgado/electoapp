import React from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { ElectoralMap } from '../map/ElectoralMap';
import { MapControls } from '../map/MapControls';
import { PuestoDrawer } from '../map/PuestoDrawer';
import { DEPARTAMENTOS, MUNICIPIOS } from '../../data/mockElectoralData';
import { 
  Building, 
  Users, 
  Vote, 
  TrendingUp, 
  AlertCircle,
  MapPin,
  CheckCircle2,
  PieChart
} from 'lucide-react';
import { ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Tooltip } from 'recharts';

export const MapViewerModule: React.FC = () => {
  const { 
    selectedPuestoId, 
    departamentoId, 
    municipioId, 
    puestos, 
    testigos, 
    setSelectedPuestoId 
  } = useElectoralStore();

  // Filtrar puestos del territorio actual
  let puestosTerritorio = puestos;
  if (departamentoId !== 'todos') {
    puestosTerritorio = puestosTerritorio.filter(p => p.departamentoId === departamentoId);
  }
  if (municipioId !== 'todos') {
    puestosTerritorio = puestosTerritorio.filter(p => p.municipioId === municipioId);
  }

  const censoTotal = puestosTerritorio.reduce((acc, p) => acc + p.censoElectoral, 0);
  const metaTotal = puestosTerritorio.reduce((acc, p) => acc + p.metaVotosCampana, 0);
  const mesasTotales = puestosTerritorio.reduce((acc, p) => acc + p.mesasHabilitadas, 0);
  const testigosEnTerritorio = testigos.filter(t => 
    puestosTerritorio.some(p => p.id === t.puestoId)
  );
  const testigosConfirmados = testigosEnTerritorio.filter(t => t.estado === 'confirmado').length;
  const pctCoberturaTestigos = mesasTotales > 0 
    ? Math.round((testigosConfirmados / mesasTotales) * 100) 
    : 0;

  // Distribución agregada de votos históricos
  const votosCoalicion = puestosTerritorio.reduce((acc, p) => {
    const ultimo = p.historico[p.historico.length - 1];
    return acc + (ultimo?.votosPorPartido.coalicion || 0);
  }, 0);
  const votosAlianza = puestosTerritorio.reduce((acc, p) => {
    const ultimo = p.historico[p.historico.length - 1];
    return acc + (ultimo?.votosPorPartido.alianza || 0);
  }, 0);
  const votosUnidad = puestosTerritorio.reduce((acc, p) => {
    const ultimo = p.historico[p.historico.length - 1];
    return acc + (ultimo?.votosPorPartido.unidad || 0);
  }, 0);

  const pieData = [
    { name: 'Coalición Por el Cambio', value: votosCoalicion, color: '#10b981' },
    { name: 'Alianza Democrática', value: votosAlianza, color: '#3b82f6' },
    { name: 'Unidad Republicana', value: votosUnidad, color: '#ef4444' },
  ];

  const depActual = DEPARTAMENTOS.find(d => d.id === departamentoId);
  const munActual = MUNICIPIOS.find(m => m.id === municipioId);
  const nombreTerritorio = munActual ? munActual.nombre : depActual ? depActual.nombre : 'República de Colombia (Nacional)';

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex overflow-hidden">
      {/* 65% Área Central: Mapa GIS Interactivo */}
      <div className="flex-1 relative h-full">
        <MapControls />
        <ElectoralMap />
      </div>

      {/* 35% Drawer Contextual: Puesto específico seleccionado O Resumen Territorial */}
      {selectedPuestoId ? (
        <PuestoDrawer />
      ) : (
        <aside className="w-full lg:w-[420px] bg-slate-950/98 backdrop-blur-xl border-l border-slate-800/80 h-full flex flex-col z-[1001] shadow-2xl overflow-y-auto p-4 space-y-4 select-none">
          {/* Header Territorial */}
          <div className="border-b border-slate-800/80 pb-3">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              Analítica Contextual
            </span>
            <h2 className="text-lg font-bold text-white mt-1.5 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{nombreTerritorio}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Haz clic en cualquier puesto de votación en el mapa para inspeccionar sus micro-datos.
            </p>
          </div>

          {/* Tarjetas KPI del Territorio */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Potencial Electoral</span>
              <span className="text-lg font-bold font-mono text-white">
                {censoTotal.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {puestosTerritorio.length} puestos • {mesasTotales} mesas
              </span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Meta Campaña</span>
              <span className="text-lg font-bold font-mono text-emerald-400">
                {metaTotal.toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-500/80 block">
                {censoTotal > 0 ? Math.round((metaTotal / censoTotal) * 100) : 0}% del censo
              </span>
            </div>
          </div>

          {/* Cobertura de Testigos en el territorio */}
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                Cobertura Global de Testigos
              </span>
              <span className="font-mono font-bold text-blue-400">{pctCoberturaTestigos}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-500 h-full rounded-full transition-all"
                style={{ width: `${pctCoberturaTestigos}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Mesas aseguradas: <strong className="text-slate-200">{testigosConfirmados}</strong></span>
              <span>Por cubrir: <strong className="text-amber-400">{Math.max(0, mesasTotales - testigosConfirmados)}</strong></span>
            </div>
          </div>

          {/* Gráfico de Torta: Distribución de Fuerzas */}
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-emerald-400" />
                Fuerza Electoral Proyectada
              </span>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155', 
                      borderRadius: '8px', 
                      fontSize: '11px', 
                      color: '#fff' 
                    }} 
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1 text-xs pt-1 border-t border-slate-800">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-300">{d.name}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-200">{d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Puestos Estratégicos Recomendados para Movilización */}
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                Puestos Estratégicos Prioritarios
              </span>
            </div>

            <div className="space-y-1.5">
              {puestosTerritorio.slice(0, 4).map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPuestoId(p.id)}
                  className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/50 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="truncate pr-2">
                    <p className="font-semibold text-slate-200 text-xs truncate group-hover:text-emerald-300">
                      {p.nombre}
                    </p>
                    <p className="text-[10px] text-slate-400">{p.comunaBarrio} • {p.censoElectoral.toLocaleString()} electores</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    Meta: {p.metaVotosCampana.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};

