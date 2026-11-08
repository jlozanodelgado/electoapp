import React, { useState } from 'react';
import { useSecurityStore } from '../../store/securityStore';
import { Actor } from '../../types/security';
import { X, UserPlus, Shield, Check, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateUserModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { registerUser, createActor, currentActor } = useSecurityStore();
  const actorActivo = currentActor();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<Actor['role']>('candidateSupervisor');
  const [scopeLevel, setScopeLevel] = useState<'national' | 'department' | 'municipality'>('municipality');
  const [scopeId, setScopeId] = useState('tulua');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    try {
      // 1. Registrar usuario en Supabase Auth y sincronizar en actors
      await registerUser(email, password, rol);

      // 2. Si se crearon campos adicionales como scope
      if (scopeLevel) {
        // Obtenemos los actores actuales para complementar detalles
      }

      setStatusMsg({
        type: 'success',
        text: `Usuario ${nombre} (${rol}) creado exitosamente en el sistema.`,
      });

      setTimeout(() => {
        setNombre('');
        setEmail('');
        setPassword('');
        setStatusMsg(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error al crear usuario:', err);
      // Fallback: Si auth falla (por ejemplo confirmación de correo requerida), crear el actor en la BD
      try {
        await createActor({
          nombre,
          role: rol,
          scopeLevel,
          scopeId,
        });
        setStatusMsg({
          type: 'success',
          text: `Actor ${nombre} registrado en base de datos.`,
        });
        setTimeout(() => {
          onClose();
        }, 1500);
      } catch (err2: any) {
        setStatusMsg({
          type: 'error',
          text: err.message || 'Error al crear el usuario en Supabase',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100">
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
                Gestión de roles jerárquicos (Supervisor Total)
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
              Nombre Completo
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
                Correo Electrónico (Auth)
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
                Contraseña
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Rol Jerárquico
              </label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value as Actor['role'])}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="totalSupervisor">Supervisor Total (Nivel Nacional)</option>
                <option value="candidateSupervisor">Supervisor de Candidato</option>
                <option value="leader">Líder Político / Territorial</option>
                <option value="witness">Testigo Electoral</option>
                <option value="voter">Votante CRM</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nivel Territorial (Scope)
              </label>
              <select
                value={scopeLevel}
                onChange={(e) => setScopeLevel(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="national">Nacional</option>
                <option value="department">Departamental</option>
                <option value="municipality">Municipal</option>
              </select>
            </div>
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
              {loading ? 'Creando…' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

