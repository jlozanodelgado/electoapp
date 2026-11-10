import React, { useState } from 'react';
import { useSecurityStore } from '../store/securityStore';
import { useElectoralStore } from '../store/electoralStore';
import { UserPlus, ShieldCheck, Flag, User, Users, Building } from 'lucide-react';
import { CreateUserModal } from './modals/CreateUserModal';
import { NewPartidoModal } from './modals/NewPartidoModal';
import { NewCandidatoModal } from './modals/NewCandidatoModal';

/**
 * Tarjeta de actor activo: muestra nombre y rol sin desplegable.
 * Botones de creación jerárquica según el rol del actor activo.
 */
export const ActorSwitcher: React.FC = () => {
  const { currentActor } = useSecurityStore(state => ({
    currentActor: state.currentActor,
  }));
  const {
    actorRole,
    setIsNewPartidoOpen,
    setIsNewCandidatoOpen,
    setIsNewWitnessOpen,
    setIsNewVoterOpen,
  } = useElectoralStore(state => ({
    actorRole: state.actorRole,
    setIsNewPartidoOpen: state.setIsNewPartidoOpen,
    setIsNewCandidatoOpen: state.setIsNewCandidatoOpen,
    setIsNewWitnessOpen: state.setIsNewWitnessOpen,
    setIsNewVoterOpen: state.setIsNewVoterOpen,
  }));

  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const activeActor = currentActor();
  const isSupervisorTotal = actorRole === 'totalSupervisor';
  const isCandidateSupervisor = actorRole === 'candidateSupervisor';
  const isLider = actorRole === 'leader';

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

        {/* Botón Crear Usuario (auth) – solo supervisores */}
        {(isSupervisorTotal || isCandidateSupervisor) && (
          <button
            onClick={() => setIsCreateUserOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-lg transition-all shadow-sm shadow-emerald-950/40 whitespace-nowrap"
            title="Crear usuario de autenticación"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Usuario Auth</span>
          </button>
        )}

        {/* Botones jerárquicos según rol */}
        {isSupervisorTotal && (
          <>
            <button
              onClick={() => setIsNewPartidoOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-xs font-bold rounded-lg transition-all shadow-sm shadow-blue-950/40 whitespace-nowrap"
              title="Crear partido político"
            >
              <Flag className="w-3.5 h-3.5 text-blue-400" />
              <span>Partido</span>
            </button>
            <button
              onClick={() => setIsNewCandidatoOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-xs font-bold rounded-lg transition-all shadow-sm shadow-blue-950/40 whitespace-nowrap"
              title="Registrar candidato"
            >
              <Building className="w-3.5 h-3.5 text-blue-400" />
              <span>Candidato</span>
            </button>
            <button
              onClick={() => setIsCreateUserOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold rounded-lg transition-all shadow-sm shadow-purple-950/40 whitespace-nowrap"
              title="Crear líder (Supervisor de Candidato)"
            >
              <User className="w-3.5 h-3.5 text-purple-400" />
              <span>Líder</span>
            </button>
          </>
        )}

        {isCandidateSupervisor && (
          <>
            <button
              onClick={() => setIsNewWitnessOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold rounded-lg transition-all shadow-sm shadow-purple-950/40 whitespace-nowrap"
              title="Crear líder"
            >
              <User className="w-3.5 h-3.5 text-purple-400" />
              <span>Líder</span>
            </button>
            <button
              onClick={() => setIsNewWitnessOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold rounded-lg transition-all shadow-sm shadow-purple-950/40 whitespace-nowrap"
              title="Crear testigo"
            >
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>Testigo</span>
            </button>
            <button
              onClick={() => setIsNewVoterOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold rounded-lg transition-all shadow-sm shadow-purple-950/40 whitespace-nowrap"
              title="Registrar votante"
            >
              <User className="w-3.5 h-3.5 text-purple-400" />
              <span>Votante</span>
            </button>
          </>
        )}

        {isLider && (
          <>
            <button
              onClick={() => setIsNewWitnessOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-lg transition-all shadow-sm shadow-rose-950/40 whitespace-nowrap"
              title="Crear testigo"
            >
              <Users className="w-3.5 h-3.5 text-rose-400" />
              <span>Testigo</span>
            </button>
            <button
              onClick={() => setIsNewVoterOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-lg transition-all shadow-sm shadow-rose-950/40 whitespace-nowrap"
              title="Registrar votante"
            >
              <User className="w-3.5 h-3.5 text-rose-400" />
              <span>Votante</span>
            </button>
          </>
        )}
      </div>

      <CreateUserModal isOpen={isCreateUserOpen} onClose={() => setIsCreateUserOpen(false)} />
      <NewPartidoModal />
      <NewCandidatoModal />
    </>
  );
};
