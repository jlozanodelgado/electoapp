import React, { useState } from 'react';
import { useElectoralStore, ModuloActivo } from '../../store/electoralStore';
import { useSecurityStore } from '../../store/securityStore';
import { Partido, Candidato } from '../../types/electoral';
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
  User,
  Home,
  Shield,
  Phone,
  MapPin,
  Image,
  Flag
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { moduloActivo, setModuloActivo, puestos, testigos, votantes, partidos, candidatos } = useElectoralStore();
  const { actorRole, actorId, actors } = useElectoralStore();
  const [collapsed, setCollapsed] = useState(false);

  const isTestigo = actorRole === 'testigo';
  const isLider = actorRole === 'leader';
  const isSupervisor = actorRole === 'totalSupervisor' || actorRole === 'candidateSupervisor';
  const isCandidateSupervisor = actorRole === 'candidateSupervisor';

  // Obtener el actor actual y sus datos de partido/candidato
  const actor = actors.find(a => a.id === actorId);
  const candidato = candidatos.find(c => c.id === actor?.candidatoId);
  const partido = partidos.find(p => p.id === candidato?.partidoId);
  const isTotalSupervisor = actorRole === 'totalSupervisor';

  const allNavItems: Array<{ id: ModuloActivo; label: string; desc: string; icon: React.ReactNode }> = [
    {
      id: 'territorio',
      label: 'Territorio',
      desc: 'Mapa, viviendas y direcciones',
      icon: <Home className="w-5 h-5" />,
    },
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
    {
      id: 'testigo_mobile',
      label: 'Testigo Móvil',
      desc: 'Actas E-14 y fotos desde el celular',
      icon: <Phone className="w-5 h-5" />,
    },
    {
      id: 'coordinador_puesto',
      label: 'Mi Puesto',
      desc: 'Ver mesas y actas de mi puesto',
      icon: <MapPin className="w-5 h-5" />,
    },
    {
      id: 'admin_candidato',
      label: 'Administración Candidato',
      desc: 'Gestionar líderes, testigos y votantes',
      icon: <Shield className="w-5 h-5" />,
    },
  ];

  // Filtro de módulos por rol
  let navItems = allNavItems;
  if (isTotalSupervisor) {
    navItems = [
      ...allNavItems,
      {
        id: 'admin' as ModuloActivo,
        label: 'Administración',
        desc: 'Gestión total del sistema',
        icon: <Shield className="w-5 h-5" />,
      },
    ];
  } else if (isTestigo) {
    navItems = allNavItems.filter(i => i.id === 'mapa' || i.id === 'dia_d' || i.id === 'testigo_mobile');
  } else if (isLider) {
    navItems = allNavItems.filter(i => i.id !== 'ejecutivo');
  } else if (isCandidateSupervisor) {
    navItems = allNavItems.filter(i => 
      i.id === 'mapa' || 
      i.id === 'candidatos' || 
      i.id === 'preparacion' || 
      i.id === 'testigo_mobile' || 
      i.id === 'coordinador_puesto' || 
      i.id === 'admin_candidato'
    );
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

        {/* Cabecera personalizada para Supervisor de Candidato */}
        {isCandidateSupervisor && partido && candidato && (
          <div className="mb-3 p-3 rounded-xl border border-slate-800/50 relative overflow-hidden">
            {/* Fondo con color del partido */}
            <div className="absolute inset-0 bg-[color:{partido.color}] opacity-20 rounded-xl" />
            <div className="relative z-10 flex flex-col p-3">
              {/* Logo del partido */}
              <div className="mb-2 flex items-center justify-center">
                {partido.logoUrl ? (
                  <img src={partido.logoUrl} alt={partido.nombre} className="w-8 h-8 rounded-lg object-cover bg-white/20" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center text-white/80">
                    <Flag className="w-4 h-4" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 overflow-hidden">
                  {candidato.fotoUrl ? (
                    <img src={candidato.fotoUrl} alt={candidato.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-6 h-6 text-white/80" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-white" style={{ color: partido.color }}>
                    {partido.nombre}
                  </p>
                  <p className="text-[10px] font-semibold text-white/90 uppercase tracking-wider">
                    {partido.siglas}
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-white/20">
                <p className="text-xs font-medium text-white">Candidato</p>
                <p className="text-sm font-bold text-white">{candidato.nombre} {candidato.apellido || ''}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Tarjetón: {candidato.numeroTarjeton || 'Sin asignar'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cabecera personalizada para Líder */}
        {isLider && actor && candidato && partido && (
          <div className="mb-3 p-3 rounded-xl border border-slate-800/50 relative overflow-hidden">
            {/* Fondo con color del partido */}
            <div className="absolute inset-0 bg-[color:{partido.color}] opacity-15 rounded-xl" />
            <div className="relative z-10 flex flex-col p-3">
              {/* Logo del partido */}
              <div className="mb-2 flex items-center justify-center">
                {partido.logoUrl ? (
                  <img src={partido.logoUrl} alt={partido.nombre} className="w-8 h-8 rounded-lg object-cover bg-white/20" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center text-white/80">
                    <Flag className="w-4 h-4" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 overflow-hidden">
                  {candidato.fotoUrl ? (
                    <img src={candidato.fotoUrl} alt={candidato.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-5 h-5 text-white/80" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-white" style={{ color: partido.color }}>
                    {partido.nombre}
                  </p>
                  <p className="text-[10px] font-semibold text-white/90 uppercase tracking-wider">
                    {partido.siglas}
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-white/20">
                <p className="text-xs font-medium text-white">Candidato</p>
                <p className="text-sm font-bold text-white">{candidato.nombre} {candidato.apellido || ''}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Tarjetón: {candidato.numeroTarjeton || 'Sin asignar'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cabecera personalizada para Testigo */}
        {isTestigo && actor && actor.leaderId && (
          <>
            {(() => {
              const liderActor = actors.find(a => a.id === actor.leaderId);
              const liderCandidato = candidatos.find(c => c.id === liderActor?.candidatoId);
              const liderPartido = partidos.find(p => p.id === liderCandidato?.partidoId);
              
              if (liderActor && liderCandidato && liderPartido) {
                return (
                  <div className="mb-3 p-3 rounded-xl border border-slate-800/50 relative overflow-hidden">
                    {/* Fondo con color del partido */}
                    <div className="absolute inset-0 bg-[color:{liderPartido.color}] opacity-15 rounded-xl" />
                    <div className="relative z-10 flex flex-col p-3">
                      {/* Logo del partido */}
                      <div className="mb-2 flex items-center justify-center">
                        {liderPartido.logoUrl ? (
                          <img src={liderPartido.logoUrl} alt={liderPartido.nombre} className="w-8 h-8 rounded-lg object-cover bg-white/20" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center text-white/80">
                            <Flag className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 overflow-hidden">
                          {liderCandidato.fotoUrl ? (
                            <img src={liderCandidato.fotoUrl} alt={liderCandidato.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <Image className="w-5 h-5 text-white/80" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white" style={{ color: liderPartido.color }}>
                            {liderPartido.nombre}
                          </p>
                          <p className="text-[10px] font-semibold text-white/90 uppercase tracking-wider">
                            {liderPartido.siglas}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-white/20">
                        <p className="text-xs font-medium text-white">Candidato</p>
                        <p className="text-sm font-bold text-white">{liderCandidato.nombre} {liderCandidato.apellido || ''}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Tarjetón: {liderCandidato.numeroTarjeton || 'Sin asignar'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </>
        )}

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

