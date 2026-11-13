import React, { useEffect, useState } from 'react';
import { useSecurityStore } from '../../store/securityStore';
import { useElectoralStore } from '../../store/electoralStore';
import { Actor } from '../../types/security';
import { Candidato } from '../../types/electoral';
import { Partido } from '../../types/electoral';
import { X, UserPlus, Shield, Check, AlertCircle, MapPin, Building, Users, Flag } from 'lucide-react';
import { DEPARTAMENTOS as MOCK_DEPARTAMENTOS, MUNICIPIOS as MOCK_MUNICIPIOS } from '../../data/mockElectoralData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type ScopeLevel = 'national' | 'department' | 'municipality';

export const CreateUserModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { registerUser, currentActor, actors } = useSecurityStore();
  const { partidos, candidatos, departamentos, municipios } = useElectoralStore();
  const actorActivo = currentActor();
  const isSupervisorTotal = actorActivo?.role === 'totalSupervisor';
  const isCandidateSupervisor = actorActivo?.role === 'candidateSupervisor';

  // Determinamos los roles que este usuario puede otorgar según la jerarquía
  const allowedRoles: Array<{ value: Actor['role']; label: string; desc: string }> = isSupervisorTotal
    ? [
        { value: 'candidateSupervisor', label: 'Supervisor de Candidato', desc: 'Gestiona un candidato y su territorio' },
        { value: 'leader', label: 'Líder Político', desc: 'Coordina testigos y votantes en un municipio/zona' },
        { value: 'witness', label: 'Testigo Electoral', desc: 'Monitorea mesas y digitaliza actas E-14' },
      ]
    : [
        { value: 'leader', label: 'Líder Político', desc: 'Coordina testigos y votantes en un municipio/zona' },
        { value: 'witness', label: 'Testigo Electoral', desc: 'Monitorea mesas y digitaliza actas E-14' },
      ];

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<Actor['role']>(allowedRoles[0]?.value || 'leader');

  // Campos condicionales
  const [partidoId, setPartidoId] = useState('');
  const [candidatoId, setCandidatoId] = useState('');
  const [departamentoId, setDepartamentoId] = useState('');
  const [municipioId, setMunicipioId] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [leaderId, setLeaderId] = useState('');

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // Candidatos disponibles, opcionalmente filtrados por partido
  const candidatosDisponibles = candidatos.filter(c =>
    partidoId ? c.partidoId === partidoId : true
  ).map(c => {
    const p = partidos.find(p => p.id === c.partidoId);
    return {
      id: c.id,
      nombre: `${c.nombre} ${c.apellido || ''} – ${p?.nombre ?? 'Sin partido'} (${p?.siglas ?? '-'})`,
      cargo: c.cargo,
      partidoId: c.partidoId,
    };
  });

  // Candidato seleccionado (para leer su cargo)
  const candidatoSeleccionado = candidatos.find(c => c.id === candidatoId);

  // Supervisores disponibles (candidateSupervisors) para amarrar un líder
  const supervisoresDisponibles = actors.filter((a: Actor) => a.role === 'candidateSupervisor');

  // Líderes disponibles para amarrar testigos y votantes
  const lideresDisponibles = actors.filter((a: Actor) => a.role === 'leader');

  // Departamentos y municipios desde Supabase (con fallback al mock inicial)
  const departamentosDisponibles = departamentos.length > 0 ? departamentos : MOCK_DEPARTAMENTOS;
  const municipiosDisponiblesStore = municipios.length > 0 ? municipios : MOCK_MUNICIPIOS;
  const municipiosFiltrados = municipiosDisponiblesStore.filter(m => m.departamentoId === departamentoId);

  // Reglas de visibilidad y obligatoriedad por rol
  const mostrarPartido = rol === 'candidateSupervisor' || rol === 'leader';
  const mostrarCandidato = rol === 'candidateSupervisor' || rol === 'leader';
  // Departamento se muestra para leader, witness y candidateSupervisor (si no es nacional)
  const mostrarDepartamento = rol === 'leader' || rol === 'witness' || (rol === 'candidateSupervisor' && municipioId);
  // Municipio solo se muestra si ya se seleccionó un departamento
  const mostrarMunicipio = (rol === 'leader' || rol === 'witness' || rol === 'candidateSupervisor') && departamentoId;
  const mostrarSupervisor = rol === 'leader';
  const mostrarLider = rol === 'witness';

  // Determinar scopeLevel y scopeId para el registro
  const computeScope = (): { scopeLevel: ScopeLevel; scopeId: string } => {
    if (rol === 'leader' || rol === 'witness') {
      // Líderes y testigos siempre van amarrados a un municipio específico
      return { scopeLevel: 'municipality', scopeId: municipioId || departamentoId || '' };
    }
    if (rol === 'candidateSupervisor') {
      if (municipioId) return { scopeLevel: 'municipality', scopeId: municipioId };
      if (departamentoId) return { scopeLevel: 'department', scopeId: departamentoId };
      return { scopeLevel: 'national', scopeId: '' };
    }
    return { scopeLevel: 'national', scopeId: '' };
  };

  const camposFaltantes = (): string | null => {
    if (!nombre.trim()) return 'El nombre completo es obligatorio.';
    if (!email.trim()) return 'El correo electrónico es obligatorio.';
    if (!password) return 'La contraseña es obligatoria.';
    if (!rol) return 'El rol es obligatorio.';

    if (mostrarPartido && !partidoId) return 'Debe seleccionar un partido.';
    if (mostrarCandidato && !candidatoId) return 'Debe seleccionar un candidato.';
    if (mostrarDepartamento && !departamentoId) return 'Debe seleccionar un departamento.';
    if (mostrarMunicipio && !municipioId) return 'Debe seleccionar un municipio.';
    if (mostrarSupervisor && !supervisorId) return 'Debe seleccionar un supervisor.';
    if (mostrarLider && !leaderId) return 'Debe seleccionar un líder responsable.';

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    const falta = camposFaltantes();
    if (falta) {
      setStatusMsg({ type: 'error', text: falta });
      setLoading(false);
      return;
    }

    try {
      const { scopeLevel, scopeId } = computeScope();

      // Si quien crea es un candidateSupervisor, se hereda su candidatoId si no se seleccionó otro
      const finalCandidatoId = isCandidateSupervisor && !candidatoId
        ? actorActivo?.candidatoId || actorActivo?.id
        : candidatoId || undefined;

      // Un líder debe reportar a un supervisor (candidateSupervisor)
      const finalSupervisorId = rol === 'leader' ? supervisorId : undefined;

      const result = await registerUser({
        nombre,
        email,
        password,
        role: rol,
        scopeLevel,
        scopeId,
        candidatoId: finalCandidatoId,
        supervisorId: finalSupervisorId,
        leaderId: rol === 'witness' ? leaderId : undefined,
      });

      setStatusMsg({
        type: 'success',
        text: `Usuario ${nombre} creado con rol ${rol} y vinculado correctamente.`,
      });

      setTimeout(() => {
        setNombre('');
        setEmail('');
        setPassword('');
        setRol(allowedRoles[0]?.value || 'leader');
        setPartidoId('');
        setCandidatoId('');
        setDepartamentoId('');
        setMunicipioId('');
        setSupervisorId('');
        setLeaderId('');
        setStatusMsg(null);
        onClose();
      }, 1600);
    } catch (err: any) {
      console.error('Error al registrar usuario y actor:', err);
      setStatusMsg({
        type: 'error',
        text: err.message || 'Error al guardar el usuario en el sistema.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn select-none">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Crear Nuevo Actor / Usuario
              </h2>
              <p className="text-xs text-slate-400">
                Creado por: <span className="font-semibold text-emerald-400">{actorActivo?.nombre}</span> ({actorActivo?.role})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensaje de estado */}
        {statusMsg && (
          <div
            className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Carlos Ramírez Gómez"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Correo Electrónico (Auth) *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@electoapp.com"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Contraseña de Acceso *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Rol a asignar */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>Rol a Asignar *</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {isSupervisorTotal ? 'Permisos: Todos los roles' : 'Permisos: Roles subordinados'}
              </span>
            </label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value as Actor['role'])}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 font-medium"
            >
              {allowedRoles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} — {r.desc}
                </option>
              ))}
            </select>
          </div>

          {/* Partido (candidateSupervisor y leader) */}
          {mostrarPartido && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Partido Político *
              </label>
              <select
                value={partidoId}
                onChange={(e) => {
                  setPartidoId(e.target.value);
                  if (!e.target.value) {
                    setCandidatoId('');
                    setDepartamentoId('');
                    setMunicipioId('');
                  }
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Seleccionar partido</option>
                {partidos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.siglas})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Candidato (candidateSupervisor y leader) */}
          {mostrarCandidato && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Candidato *
              </label>
              <select
                value={candidatoId}
                onChange={(e) => {
                  setCandidatoId(e.target.value);
                  const cand = candidatos.find(c => c.id === e.target.value);
                  if (cand) {
                    // Auto-completar departamento y municipio según el cargo del candidato
                    if (cand.cargo === 'presidente') {
                      setDepartamentoId('');
                      setMunicipioId('');
                    } else if (cand.cargo === 'gobernacion' || cand.cargo === 'asamblea_departamental') {
                      setDepartamentoId('');
                      setMunicipioId('');
                    } else {
                      setDepartamentoId(cand.departamentoId || '');
                      setMunicipioId(cand.municipioId || '');
                    }
                  }
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Seleccionar candidato</option>
                {candidatosDisponibles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.cargo})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Departamento (líder, o candidato no-presidencial) */}
          {mostrarDepartamento && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Departamento *
              </label>
              <select
                value={departamentoId}
                onChange={(e) => {
                  setDepartamentoId(e.target.value);
                  const firstMun = municipiosDisponiblesStore.find(m => m.departamentoId === e.target.value);
                  if (firstMun) setMunicipioId(firstMun.id);
                  else setMunicipioId('');
                }}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Seleccionar departamento</option>
                {departamentosDisponibles.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre} (Cód. {d.codigo})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Municipio (líder, testigo, votante, o candidato no-gobernación/asamblea) */}
          {mostrarMunicipio && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Municipio *
              </label>
              <select
                value={municipioId}
                onChange={(e) => setMunicipioId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Seleccionar municipio</option>
                {municipiosFiltrados.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
                {municipiosFiltrados.length === 0 && (
                  <option value="" disabled>No hay municipios para este departamento</option>
                )}
              </select>
            </div>
          )}

          {/* Supervisor (solo leader) */}
          {mostrarSupervisor && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Supervisor (candidateSupervisor) *
              </label>
              <select
                value={supervisorId}
                onChange={(e) => setSupervisorId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Seleccionar supervisor</option>
                {supervisoresDisponibles.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
                {supervisoresDisponibles.length === 0 && (
                  <option value="" disabled>No hay supervisores disponibles</option>
                )}
              </select>
            </div>
          )}

          {/* Líder (solo witness y voter) */}
          {mostrarLider && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Líder Responsable *
              </label>
              <select
                value={leaderId}
                onChange={(e) => setLeaderId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Seleccionar líder</option>
                {lideresDisponibles.map((l) => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
                {lideresDisponibles.length === 0 && (
                  <option value="" disabled>No hay líderes disponibles</option>
                )}
              </select>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !!camposFaltantes()}
              className="px-5 py-2 text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-xl transition-all shadow-lg shadow-emerald-950/50 flex items-center gap-2"
            >
              {loading ? 'Guardando en BD…' : 'Crear y Vincular Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
