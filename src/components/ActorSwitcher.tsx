import React, { useState } from 'react';
import { useSecurityStore } from '../store/securityStore';
import { UserPlus, ShieldCheck, ChevronDown } from 'lucide-react';
import { CreateUserModal } from './modals/CreateUserModal';

/**
 * Dropdown para alternar el actor activo y botón de administración de usuarios.
 */
export const ActorSwitcher: React.FC = () => {
  const { actors, currentActorId, setCurrentActor, currentActor } = useSecurityStore(state => ({
    actors: state.actors,
    currentActorId: state.currentActorId,
    setCurrentActor: state.setCurrentActor,
    currentActor: state.currentActor,
  }));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const activeActor = currentActor();
  const isSupervisorTotal = activeActor?.role === 'totalSupervisor';
  const isCandidateSupervisor = activeActor?.role === 'candidateSupervisor';
  const canCreateUsers = isSupervisorTotal || isCandidateSupervisor;

  // Si no hay actor seleccionado pero hay actores disponibles, auto-seleccionar el primero
  React.useEffect(() => {
    if (!currentActorId && actors.length > 0) {
      setCurrentActor(actors[0].id);
    }
  }, [currentActorId, actors, setCurrentActor]);

  return (
    <>
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl shadow-inner shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className={`w-4 h-4 ${isSupervisorTotal ? 'text-emerald-400' : 'text-blue-400'}`} />
          <span className="hidden sm:inline font-medium">Actor:</span>
        </div>

        <select
          className="text-xs bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-2 py-1 outline-none focus:border-emerald-500 font-semibold cursor-pointer max-w-[190px] truncate"
          value={currentActorId ?? (actors[0]?.id || '')}
          onChange={e => setCurrentActor(e.target.value || null)}
        >
          {actors.map(actor => (
            <option key={actor.id} value={actor.id}>
              {actor.nombre} ({actor.role})
            </option>
          ))}
        </select>

        {/* Botón para crear usuarios: habilitado para Supervisor Total y Supervisor de Candidato */}
        {canCreateUsers && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-lg transition-all shadow-sm shadow-emerald-950/40 whitespace-nowrap"
            title="Crear nuevo usuario / actor jerárquico"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Crear Usuario</span>
          </button>
        )}
      </div>

      <CreateUserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
