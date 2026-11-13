import React, { useState } from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { useSecurityStore } from '../../store/securityStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CreateUserModal } from '../modals/CreateUserModal';
import {
  Shield,
  Flag,
  User,
  Users,
  Building,
  Plus,
  Trash2,
  Search,
  UserPlus,
  Pencil,
  Download,
  Upload,
} from 'lucide-react';
import { ImportarMasivoExcel } from '../modules/ImportarMasivoExcel';

type AdminTab = 'partidos' | 'candidatos' | 'actores' | 'usuarios' | 'importar';

const ROLE_LABELS: Record<string, string> = {
  totalSupervisor: 'Supervisor Total',
  supervisor_total: 'Supervisor Total',
  candidateSupervisor: 'Supervisor de Candidato',
  supervisor_candidato: 'Supervisor de Candidato',
  leader: 'Líder',
  lider: 'Líder',
  witness: 'Testigo',
  testigo: 'Testigo',
  voter: 'Votante',
  votante: 'Votante',
};

const ROLE_BADGE: Record<string, 'emerald' | 'blue' | 'purple' | 'amber' | 'slate'> = {
  totalSupervisor: 'emerald',
  supervisor_total: 'emerald',
  candidateSupervisor: 'blue',
  supervisor_candidato: 'blue',
  leader: 'purple',
  lider: 'purple',
  witness: 'amber',
  testigo: 'amber',
  voter: 'slate',
  votante: 'slate',
};

export const AdminPanelModule: React.FC = () => {
  const actorRole = useElectoralStore(s => s.actorRole);
  const partidos = useElectoralStore(s => s.partidos);
  const candidatos = useElectoralStore(s => s.candidatos);
  const actors = useSecurityStore(s => s.actors);
  const testigos = useElectoralStore(s => s.testigos);
  const votantes = useElectoralStore(s => s.votantes);
  const setIsNewPartidoOpen = useElectoralStore(s => s.setIsNewPartidoOpen);
  const setIsNewCandidatoOpen = useElectoralStore(s => s.setIsNewCandidatoOpen);
  const setIsNewWitnessOpen = useElectoralStore(s => s.setIsNewWitnessOpen);
  const setIsNewVoterOpen = useElectoralStore(s => s.setIsNewVoterOpen);
  const openEditPartido = useElectoralStore(s => s.openEditPartido);
  const openEditCandidato = useElectoralStore(s => s.openEditCandidato);
  const setEditingActor = useElectoralStore(s => s.setEditingActor);
  const openEditTestigo = useElectoralStore(s => s.openEditTestigo);
  const openEditVoter = useElectoralStore(s => s.openEditVoter);
  const migrateMockToSupabase = useElectoralStore(s => s.migrateMockToSupabase);
  const deleteActor = useSecurityStore(s => s.deleteActor);

  const [tab, setTab] = useState<AdminTab>('partidos');
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [migracionCargando, setMigracionCargando] = useState(false);
  const [resultadoMigracion, setResultadoMigracion] = useState<any>(null);

  // ---- Control de acceso: solo Supervisor Total ----
  if (actorRole !== 'totalSupervisor') {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-slate-950">
        <Card className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-rose-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-1">Acceso restringido</h2>
          <p className="text-sm text-slate-400">
            Solo el <span className="font-semibold text-rose-300">Supervisor Total</span> puede
            acceder al Panel de Administración.
          </p>
        </Card>
      </div>
    );
  }

  const q = busqueda.trim().toLowerCase();
  const filtrar = <T extends { nombre?: string; nombreCompleto?: string; siglas?: string; cargo?: string; rol?: string; role?: string }>(
    list: T[],
  ) =>
    q
      ? list.filter(item =>
          [item.nombre, item.nombreCompleto, item.siglas, item.cargo, item.rol, item.role]
            .filter(Boolean)
            .some(v => String(v).toLowerCase().includes(q)),
        )
      : list;

  const tabs: Array<{ id: AdminTab; label: string; icon: React.ReactNode; count: number }> = [
    { id: 'partidos', label: 'Partidos', icon: <Flag className="w-4 h-4" />, count: partidos.length },
    { id: 'candidatos', label: 'Candidatos', icon: <Building className="w-4 h-4" />, count: candidatos.length },
    { id: 'actores', label: 'Actores', icon: <Users className="w-4 h-4" />, count: actors.length },
    { id: 'usuarios', label: 'Usuarios Auth', icon: <UserPlus className="w-4 h-4" />, count: actors.length },
    { id: 'importar', label: 'Importar Excel', icon: <Download className="w-4 h-4" />, count: 0 },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-5 bg-slate-950 select-none">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            Panel de Administración
          </span>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2 mt-0.5">
            <Shield className="w-5 h-5 text-emerald-400" />
            Administración ElectoApp
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Gestión exclusiva del Supervisor Total: partidos, candidatos, líderes, testigos y votantes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="emerald" size="sm">Acceso autorizado</Badge>
          <Badge variant="slate" size="sm">Supervisor Total</Badge>
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex flex-wrap gap-2 bg-slate-900/90 p-1.5 border border-slate-800 rounded-xl">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t.id
                ? 'bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 shadow-sm'
                : 'border border-transparent text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
            <span
              className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                tab === t.id ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, siglas, cargo o rol..."
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Contenido */}
      {tab === 'partidos' && (
        <Card
          title="Partidos Políticos"
          subtitle="Organizaciones registradas en el sistema"
          headerAction={
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setIsNewPartidoOpen(true)}>
              Nuevo Partido
            </Button>
          }
        >
          {filtrar(partidos).length === 0 ? (
            <EmptyState text="No hay partidos registrados." actionLabel="Crear primer partido" onAction={() => setIsNewPartidoOpen(true)} />
          ) : (
            <div className="grid gap-2">
              {filtrar(partidos).map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg border border-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0"
                      style={{ backgroundColor: (p.color || '#10b981') + '22', color: p.color || '#10b981' }}
                    >
                      {p.siglas?.slice(0, 3) || '???'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{p.nombre}</p>
                      <p className="text-[11px] text-slate-500">Siglas: {p.siglas}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="blue" size="sm">
                      {candidatos.filter(c => c.partidoId === p.id).length} candidatos
                    </Badge>
                    <button
                      onClick={() => openEditPartido(p)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition-colors"
                      title="Editar partido"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'candidatos' && (
        <Card
          title="Candidatos"
          subtitle="Candidatos inscritos por partido y cargo"
          headerAction={
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setIsNewCandidatoOpen(true)}>
              Nuevo Candidato
            </Button>
          }
        >
          {candidatos.length === 0 ? (
            <EmptyState text="No hay candidatos registrados." actionLabel="Crear primer candidato" onAction={() => setIsNewCandidatoOpen(true)} />
          ) : (
            <div className="grid gap-2">
              {filtrar(candidatos).map(c => {
                const partido = partidos.find(p => p.id === c.partidoId);
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold shrink-0"
                        style={{
                          backgroundColor: (partido?.color || '#3b82f6') + '22',
                          borderColor: (partido?.color || '#3b82f6') + '55',
                          color: partido?.color || '#3b82f6',
                        }}
                      >
                        {(c.nombre?.[0] || '?') + (c.apellido?.[0] || '')}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {c.nombre} {c.apellido}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {c.cargo} · {partido?.nombre ?? 'Sin partido'} · Cédula {c.cedula}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.numeroTarjeton && <Badge variant="slate" size="sm">Tarjetón {c.numeroTarjeton}</Badge>}
                      <button
                        onClick={() => openEditCandidato(c)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/30 transition-colors"
                        title="Editar candidato"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {tab === 'actores' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card
            title="Actores del Sistema"
            subtitle="Supervisores, líderes, testigos y votantes"
            headerAction={
              <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setIsCreateUserOpen(true)}>
                Nuevo Actor
              </Button>
            }
          >
            {filtrar(actors).length === 0 ? (
              <EmptyState text="No hay actores registrados." actionLabel="Crear actor" onAction={() => setIsCreateUserOpen(true)} />
            ) : (
              <div className="space-y-2">
                {filtrar(actors).map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{a.nombre}</p>
                        <p className="text-[10px] text-slate-500 font-mono">ID: {a.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={ROLE_BADGE[a.role] || 'slate'} size="sm">
                        {ROLE_LABELS[a.role] || a.role}
                      </Badge>
                      <button
                        onClick={() => setEditingActor(a as any)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition-colors"
                        title="Editar actor"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {a.role !== 'totalSupervisor' && (
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Eliminar al actor "${a.nombre}"? Esta acción no se puede deshacer.`)) {
                              deleteActor(a.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-colors"
                          title="Eliminar actor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="space-y-4">
            <Card title="Testigos Electorales" subtitle={`${testigos.length} registrados`}>
              <div className="space-y-2">
                {testigos.length === 0 ? (
                  <p className="text-center py-4 text-slate-500 text-xs">No hay testigos.</p>
                ) : (
                  testigos.slice(0, 8).map(t => (
                    <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{t.nombre}</p>
                        <p className="text-[10px] text-slate-500 truncate">Mesa {t.mesaNumero} · {t.puestoNombre}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={t.estado === 'confirmado' ? 'emerald' : 'slate'} size="sm">{t.estado}</Badge>
                        <button
                          onClick={() => openEditTestigo(t)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition-colors"
                          title="Editar testigo"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card title="Votantes CRM" subtitle={`${votantes.length} registrados`}>
              <div className="space-y-2">
                {votantes.length === 0 ? (
                  <p className="text-center py-4 text-slate-500 text-xs">No hay votantes.</p>
                ) : (
                  votantes.slice(0, 8).map(v => (
                    <div key={v.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{v.nombre}</p>
                        <p className="text-[10px] text-slate-500 truncate">{v.intencionVoto} · {v.liderAsignado || 'Sin líder'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={v.yaVoto ? 'emerald' : v.contactado ? 'blue' : 'slate'} size="sm">
                          {v.yaVoto ? 'Ya votó' : v.contactado ? 'Contactado' : 'Pendiente'}
                        </Badge>
                        <button
                          onClick={() => openEditVoter(v)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition-colors"
                          title="Editar votante"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'usuarios' && (
        <Card
          title="Usuarios de Autenticación"
          subtitle="Usuarios con acceso a la plataforma (auth.users + tabla actors)"
          headerAction={
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setIsCreateUserOpen(true)}>
              Nuevo Usuario
            </Button>
          }
        >
          <div className="space-y-2">
            {actors.filter(a => a.user_id).length === 0 ? (
              <EmptyState text="No hay usuarios de autenticación vinculados." actionLabel="Crear usuario" onAction={() => setIsCreateUserOpen(true)} />
            ) : (
              actors.filter(a => a.user_id).map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{a.nombre}</p>
                      <p className="text-[10px] text-slate-500 font-mono truncate">user_id: {a.user_id?.slice(0, 12)}...</p>
                    </div>
                  </div>
                  <Badge variant={ROLE_BADGE[a.role] || 'slate'} size="sm">
                    {ROLE_LABELS[a.role] || a.role}
                  </Badge>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800">
            <Button variant="outline" size="sm" icon={<UserPlus className="w-3.5 h-3.5" />} onClick={() => setIsCreateUserOpen(true)}>
              Crear usuario con correo y contraseña
            </Button>
          </div>
        </Card>
      )}

      {tab === 'importar' && (
        <Card title="Importación Masiva por Excel" subtitle="Carga departamentos, municipios y puestos de votación desde un archivo Excel">
          <ImportarMasivoExcel />
        </Card>
      )}

      {/* Modales globales del panel */}
      <CreateUserModal isOpen={isCreateUserOpen} onClose={() => setIsCreateUserOpen(false)} />

      {/* Tarjeta de migración de datos (solo Supervisor Total) */}
      {actorRole === 'totalSupervisor' && (
        <Card
          title="Migración de Datos a Supabase"
          subtitle="Mueve los datos guardados localmente (localStorage) a la base de datos de Supabase"
        >
          <p className="text-xs text-slate-400 mb-4">
            Esto copiará partidos, candidatos, puestos, actores, testigos, votantes, actas y alertas
            desde el almacenamiento local del navegador a Supabase. Los datos ya existentes en Supabase
            podrían generarse errores de duplicado.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                setMigracionCargando(true);
                setResultadoMigracion(null);
                try {
                  const res = await migrateMockToSupabase();
                  setResultadoMigracion(res);
                } catch (e: any) {
                  setResultadoMigracion({ error: e.message });
                } finally {
                  setMigracionCargando(false);
                }
              }}
              disabled={migracionCargando}
              variant="outline"
              size="sm"
              icon={<Upload className="w-4 h-4" />}
            >
              {migracionCargando ? 'Migrando…' : 'Migrar datos a Supabase'}
            </Button>
          </div>
          {resultadoMigracion && (
            <div className="mt-4 p-3 rounded-lg bg-slate-900 border border-slate-700 text-xs">
              <h4 className="text-xs font-bold text-emerald-400 mb-2">Resultado de la migración</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 uppercase">Partidos</p>
                  <p className="text-emerald-400">{resultadoMigracion.partidos?.insertados}</p>
                  {resultadoMigracion.partidos?.errores.length > 0 && (
                    <p className="text-rose-400 text-[10px]">
                      {resultadoMigracion.partidos.errores.length} error(es)
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-slate-400 uppercase">Candidatos</p>
                  <p className="text-emerald-400">{resultadoMigracion.candidatos?.insertados}</p>
                  {resultadoMigracion.candidatos?.errores.length > 0 && (
                    <p className="text-rose-400 text-[10px]">
                      {resultadoMigracion.candidatos.errores.length} error(es)
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-slate-400 uppercase">Puestos</p>
                  <p className="text-emerald-400">{resultadoMigracion.puestos?.insertados}</p>
                  {resultadoMigracion.puestos?.errores.length > 0 && (
                    <p className="text-rose-400 text-[10px]">
                      {resultadoMigracion.puestos.errores.length} error(es)
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-slate-400 uppercase">Actores</p>
                  <p className="text-emerald-400">{resultadoMigracion.actores?.insertados}</p>
                  {resultadoMigracion.actores?.errores.length > 0 && (
                    <p className="text-rose-400 text-[10px]">
                      {resultadoMigracion.actores.errores.length} error(es)
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-slate-400 uppercase">Testigos</p>
                  <p className="text-emerald-400">{resultadoMigracion.testigos?.insertados}</p>
                  {resultadoMigracion.testigos?.errores.length > 0 && (
                    <p className="text-rose-400 text-[10px]">
                      {resultadoMigracion.testigos.errores.length} error(es)
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-slate-400 uppercase">Votantes</p>
                  <p className="text-emerald-400">{resultadoMigracion.votantes?.insertados}</p>
                  {resultadoMigracion.votantes?.errores.length > 0 && (
                    <p className="text-rose-400 text-[10px]">
                      {resultadoMigracion.votantes.errores.length} error(es)
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-slate-400 uppercase">Actas</p>
                  <p className="text-emerald-400">{resultadoMigracion.actas?.insertados}</p>
                  {resultadoMigracion.actas?.errores.length > 0 && (
                    <p className="text-rose-400 text-[10px]">
                      {resultadoMigracion.actas.errores.length} error(es)
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-slate-400 uppercase">Alertas</p>
                  <p className="text-emerald-400">{resultadoMigracion.alertas?.insertados}</p>
                  {resultadoMigracion.alertas?.errores.length > 0 && (
                    <p className="text-rose-400 text-[10px]">
                      {resultadoMigracion.alertas.errores.length} error(es)
                    </p>
                  )}
                </div>
              </div>
              {resultadoMigracion.error && (
                <p className="text-rose-400 text-[10px] mt-2">
                  Error: {resultadoMigracion.error}
                </p>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

const EmptyState: React.FC<{ text: string; actionLabel?: string; onAction?: () => void }> = ({
  text,
  actionLabel,
  onAction,
}) => (
  <div className="text-center py-8">
    <p className="text-slate-500 text-xs mb-3">{text}</p>
    {actionLabel && onAction && (
      <Button variant="outline" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);

export default AdminPanelModule;
