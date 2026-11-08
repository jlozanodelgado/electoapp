import React, { useState } from 'react';
import { useElectoralStore, ModuloActivo } from '../../store/electoralStore';
import { useSecurityStore } from '../../store/securityStore';
import { 
  Map, 
  Target, 
  Vote, 
  BarChart3, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  FileCheck2,
  Users2,
  CheckCircle2,
  Clock,
  User
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { moduloActivo, setModuloActivo, puestos, testigos, votantes } = useElectoralStore();
  const { actorRole } = useElectoralStore();
  const [collapsed, setCollapsed] = useState(false);

  const isTestigo = actorRole === 'testigo';
  const isLider = actorRole === 'leader';
  const isSupervisor = actorRole === 'supervisor_total' || actorRole === 'supervisor_candidato';

  const allNavItems: Array<{ id: ModuloActivo; label: string; desc: string; icon: React.ReactNode }> = [
    {
      id: 'mapa',
      label: 'Visor Cartográfico',
      desc: 'Inteligencia GIS y Puestos',
      icon: <Map className="w-5 h-5" />,
    },
    {
      id: 'campana',
      label: 'Comando de Campaña',
      desc: 'CRM Votantes y Testigos',
      icon: <Target className="w-5 h-5" />,
    },
    {
      id: 'candidatos',
      label: 'Candidatos',
      desc: 'Listado y detalle de candidatos',
      icon: <User className="w-5 h-5" />,
    },
    {
      id: 'preparacion',
      label: 'Preparación Día D',
      desc: 'Líderes, Testigos y Planificación',
      icon: <Clock className="w-5 h-5" />,
    },
    {
      id: 'dia_d',
      label: 'Día D Escrutinio',
      desc: 'Actas E-14 y Fraude en Vivo',
      icon: <Vote className="w-5 h-5" />,
    },
    {
      id: 'ejecutivo',
      label: 'Dashboard Ejecutivo',
      desc: 'Curules, Metas y Exportación',
      icon: <BarChart3 className="w-5 h-5" />,
    },
  ];

  // Filtro de módulos por rol
  let navItems = allNavItems;
  if (isTestigo) {
    navItems = allNavItems.filter(i => i.id === 'mapa' || i.id === 'dia_d');
  } else if (isLider) {
    navItems = allNavItems.filter(i => i.id !== 'ejecutivo');
  }

  // Si el módulo activo ya no existe para este rol, resetear a mapa
  const moduloValido = navItems.some(i => i.id === moduloActivo);
  const moduloInicial = moduloValido ? moduloActivo : navItems[0]?.id ?? 'mapa';

  const totalCenso = puestos.reduce((acc, p) => acc + p.censoElectoral, 0);
  const totalMeta = puestos.reduce((acc, p) => acc + p.metaVotosCampana, 0);
  const votantesFidelizados = votantes.filter(v => v.intencionVoto === 'voto_duro').length;
  const testigosConfirmados = testigos.filter(t => t.estado === 'confirmado').length;

  // Resetear módulo si el rol ya no da acceso a él
  React.useEffect(() => {
    if (!moduloValido) {
      setModuloActivo(moduloInicial);
    }
  }, [moduloValido, moduloInicial, setModuloActivo]);

  return (
    <aside 
      className={`bg-slate-950/95 border-r border-slate-800/80 flex flex-col justify-between transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Nav List */}
      <div className="p-3">
        {/* Toggle Collapse */}
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Modules navigation */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = moduloActivo === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setModuloActivo(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                  isActive
                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-950/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <div className={`p-2 rounded-lg transition-colors ${
                  isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-900 group-hover:bg-slate-800 text-slate-400 group-hover:text-slate-200'
                }`}>
                  {item.icon}
                </div>
                {!collapsed && (
                  <div className="truncate">
                    <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                      {item.label}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{item.desc}</p>
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Campaign Summary Stats (only when expanded) */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Meta Campaña</span>
              <span className="font-mono font-bold text-emerald-400">{totalMeta.toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.round((totalMeta / totalCenso) * 100))}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Voto Duro</span>
                <span className="font-bold text-slate-200 font-mono">{votantesFidelizados}</span>
              </div>
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Testigos Conf.</span>
                <span className="font-bold text-blue-400 font-mono">{testigosConfirmados}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-2 text-center text-[10px] text-slate-500">
            GovTech Intelligence v1.0 • Supabase PostGIS Mock
          </div>
        </div>
      )}
    </aside>
  );
};

