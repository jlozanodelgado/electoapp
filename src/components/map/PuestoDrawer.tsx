import React from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { 
  X, 
  MapPin, 
  Vote, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle,
  Building,
  Target
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';

export const PuestoDrawer: React.FC = () => {
  const { 
    selectedPuestoId, 
    setSelectedPuestoId, 
    puestos, 
    testigos, 
    setIsNewWitnessOpen, 
    setIsDigitalizeE14Open,
    actorRole,
  } = useElectoralStore();

  const isTestigo = actorRole === 'testigo';
  const isSupervisorOrLider = actorRole === 'supervisor_total' || actorRole === 'supervisor_candidato' || actorRole === 'lider';

  const puesto = puestos.find(p => p.id === selectedPuestoId);
  if (!puesto) return null;

  const testigosDelPuesto = testigos.filter(t => t.puestoId === puesto.id);
  const testigosConfirmados = testigosDelPuesto.filter(t => t.estado === 'confirmado').length;

  const pctMeta = Math.min(100, Math.round((puesto.votosProyectados / puesto.metaVotosCampana) * 100));

  // Datos para el gráfico de barras histórico Recharts
  const chartData = puesto.historico.map(h => ({
    ano: h.ano.toString(),
    'Coalición': h.votosPorPartido.coalicion,
    'Alianza': h.votosPorPartido.alianza,
    'Unidad': h.votosPorPartido.unidad,
  }));

  const prioridadVariants = {
    critico: 'red' as const,
    estrategico: 'amber' as const,
    consolidado: 'emerald' as const,
    normal: 'blue' as const,
  };

  return (
    <aside className="w-full lg:w-[420px] bg-slate-950/98 backdrop-blur-xl border-l border-slate-800/80 h-full flex flex-col z-[1001] shadow-2xl overflow-hidden select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-start justify-between bg-slate-900/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={prioridadVariants[puesto.estadoPrioridad]} size="sm">
              PRIORIDAD {puesto.estadoPrioridad.toUpperCase()}
            </Badge>
            <span className="text-[11px] text-slate-400 font-mono">ID: {puesto.id}</span>
          </div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{puesto.nombre}</span>
          </h2>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{puesto.direccion} • {puesto.comunaBarrio} ({puesto.zona})</span>
          </p>
        </div>
        <button
          onClick={() => setSelectedPuestoId(null)}
          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          title="Cerrar panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Métricas Clave Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block font-medium">Censo Electoral</span>
            <span className="text-lg font-bold font-mono text-white">
              {puesto.censoElectoral.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {puesto.mesasHabilitadas} mesas habilitadas
            </span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block font-medium">Participación Histórica</span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              {puesto.participacionHistoricaPct}%
            </span>
            <span className="text-[10px] text-amber-400/80 block mt-0.5">
              {puesto.abstencionismoPct}% abstención
            </span>
          </div>
        </div>

        {/* Meta de Campaña vs Proyección */}
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              Meta de Campaña vs Proyección
            </span>
            <span className="font-mono text-xs font-bold text-emerald-400">{pctMeta}%</span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pctMeta >= 100 ? 'bg-emerald-500' : 'bg-emerald-400'
              }`}
              style={{ width: `${pctMeta}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] font-mono pt-1 text-slate-400">
            <span>Meta: <strong className="text-slate-200">{puesto.metaVotosCampana.toLocaleString()}</strong></span>
            <span>Proyectado: <strong className="text-emerald-400">{puesto.votosProyectados.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Histórico Electoral 3 Elecciones (Recharts) */}
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              Histórico Electoral (Últimas 3 Elecciones)
            </span>
          </div>

          <div className="h-44 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis dataKey="ano" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: '#334155', 
                    borderRadius: '8px', 
                    fontSize: '11px',
                    color: '#f8fafc' 
                  }} 
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
                <Bar dataKey="Coalición" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Alianza" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Unidad" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cobertura de Testigos en este puesto */}
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Testigos Electorales Acreditados
            </span>
            <Badge variant={puesto.coberturaTestigosPct >= 95 ? 'emerald' : 'amber'} size="sm">
              {puesto.coberturaTestigosPct}% Cubierto
            </Badge>
          </div>

          {testigosDelPuesto.length > 0 ? (
            <div className="space-y-1.5">
              {testigosDelPuesto.map(t => (
                <div 
                  key={t.id} 
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-200">{t.nombre}</p>
                    <p className="text-[10px] text-slate-500">Mesa {t.mesaNumero} • {t.rol.replace('_', ' ')}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    t.estado === 'confirmado' ? 'bg-emerald-500/20 text-emerald-400' :
                    t.estado === 'pendiente' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-rose-500/20 text-rose-400'
                  }`}>
                    {t.estado}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3 bg-slate-950/40 rounded-lg border border-dashed border-slate-800 text-xs text-slate-400">
              Sin testigos registrados específicamente para esta mesa.
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/90 grid grid-cols-2 gap-2">
        {!isTestigo && (
          <Button
            variant="secondary"
            size="sm"
            icon={<Users className="w-3.5 h-3.5" />}
            onClick={() => setIsNewWitnessOpen(true)}
          >
            Asignar Testigo
          </Button>
        )}
        {isSupervisorOrLider || isTestigo ? (
          <Button
            variant="primary"
            size="sm"
            icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
            onClick={() => setIsDigitalizeE14Open(true)}
          >
            Digitalizar E-14
          </Button>
        ) : null}
      </div>
    </aside>
  );
};

