import React, { useState } from 'react';
import { useSecurityStore } from '../store/securityStore';
import { UserPlus, ShieldCheck } from 'lucide-react';
import { CreateUserModal } from './modals/CreateUserModal';

/**
 * Tarjeta de actor activo: muestra nombre y rol sin desplegable.
 * Botón de administración de usuarios para supervisores.
 */
export const ActorSwitcher: React.FC = () => {
  const { currentActor } = useSecurityStore(state => ({
    currentActor: state.currentActor,
  }));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const activeActor = currentActor();
  const isSupervisorTotal = activeActor?.role === 'totalSupervisor';
  const isCandidateSupervisor = activeActor?.role === 'candidateSupervisor';
  const canCreateUsers = isSupervisorTotal || isCandidateSupervisor;

  return (
    <>
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl shadow-inner shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className={`w-4 h-4 ${isSupervisorTotal ? 'text-emerald-400' : 'text-blue-400'}`} />
          <span className="hidden sm:inline font-medium">Actor:</span>
        </div>

        <div className="flex flex-col items-start min-w-[160px]">
          <span className="text-xs font-semibold text-slate-100 truncate">
            {activeActor?.nombre ?? 'Sin actor'}
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
            {activeActor?.role ?? '-'}
          </span>
        </div>

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
