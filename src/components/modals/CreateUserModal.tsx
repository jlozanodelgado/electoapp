import React, { useState } from 'react';
import { useSecurityStore } from '../../store/securityStore';
import { Actor } from '../../types/security';
import { DEPARTAMENTOS, MUNICIPIOS } from '../../data/mockElectoralData';
import { X, UserPlus, Shield, Check, AlertCircle, MapPin } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateUserModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { registerUser, currentActor } = useSecurityStore();
  const actorActivo = currentActor();
  const isSupervisorTotal = actorActivo?.role === 'totalSupervisor';
  const isCandidateSupervisor = actorActivo?.role === 'candidateSupervisor';

  // Determinamos los roles que este usuario puede otorgar según la jerarquía
  // totalSupervisor -> puede crear candidateSupervisor, leader, witness, voter
  // candidateSupervisor -> solo puede crear leader, witness, voter (debajo de él)
  const allowedRoles: Array<{ value: Actor['role']; label: string; desc: string }> = isSupervisorTotal
    ? [
        { value: 'candidateSupervisor', label: 'Supervisor de Candidato', desc: 'Gestiona un candidato y su territorio' },
        { value: 'leader', label: 'Líder Político', desc: 'Coordina testigos y votantes en un municipio/zona' },
        { value: 'witness', label: 'Testigo Electoral', desc: 'Monitorea mesas y digitaliza actas E-14' },
        { value: 'voter', label: 'Votante CRM', desc: 'Votante simpatizante registrado' },
      ]
    : [
        { value: 'leader', label: 'Líder Político', desc: 'Coordina testigos y votantes en un municipio/zona' },
        { value: 'witness', label: 'Testigo Electoral', desc: 'Monitorea mesas y digitaliza actas E-14' },
        { value: 'voter', label: 'Votante CRM', desc: 'Votante simpatizante registrado' },
      ];

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<Actor['role']>(allowedRoles[0]?.value || 'leader');

  // Amarre territorial
  const [departamentoId, setDepartamentoId] = useState<string>(
    actorActivo?.scopeLevel === 'department' ? actorActivo.scopeId || 'valle' : 'valle'
  );
  const [municipioId, setMunicipioId] = useState<string>(
    actorActivo?.scopeLevel === 'municipality' ? actorActivo.scopeId || 'tulua' : 'tulua'
  );

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // Municipios filtrados por el departamento seleccionado
  const municipiosFiltrados = MUNICIPIOS.filter(m => m.departamentoId === departamentoId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    try {
      // Determinamos el scopeLevel y scopeId según el rol
      let scopeLevel: 'national' | 'department' | 'municipality' = 'municipality';
      let scopeId = municipioId;

      if (rol === 'candidateSupervisor') {
        // Puede ser departamental o municipal según se elija
        scopeLevel = 'department';
        scopeId = departamentoId;
      } else {
        // Líderes, Testigos y Votantes siempre amarrados a un Municipio
        scopeLevel = 'municipality';
        scopeId = municipioId;
      }

      // Si quien crea es un candidateSupervisor, se hereda su candidatoId
      const candidatoId = isCandidateSupervisor
        ? actorActivo?.candidatoId || actorActivo?.id
        : undefined;

      const result = await registerUser({
        nombre,
        email,
        password,
        role: rol,
        scopeLevel,
        scopeId,
        candidatoId,
      });

      setStatusMsg({
        type: 'success',
        text: `Usuario ${nombre} creado y guardado en la tabla 'actors' con id de auth sincronizado.`,
      });

      setTimeout(() => {
        setNombre('');
        setEmail('');
        setPassword('');
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

          {/* Rol a asignar (filtrado por jerarquía) */}
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

          {/* Amarre Territorial Obligatorio */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <MapPin className="w-4 h-4" />
              <span>Amarre Territorial (Departamento / Municipio)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Departamento Asignado *
                </label>
                <select
                  value={departamentoId}
                  onChange={(e) => {
                    setDepartamentoId(e.target.value);
                    const firstMun = MUNICIPIOS.find(m => m.departamentoId === e.target.value);
                    if (firstMun) setMunicipioId(firstMun.id);
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {DEPARTAMENTOS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre} (Cód. {d.codigo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Municipio Asignado *
                </label>
                <select
                  value={municipioId}
                  onChange={(e) => setMunicipioId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {municipiosFiltrados.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              Este usuario solo podrá ver métricas, puestos, testigos y votantes pertenecientes a esta jurisdicción territorial.
            </p>
          </div>

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
              disabled={loading}
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
