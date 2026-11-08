import React, { useEffect } from 'react';
import { useElectoralStore } from './store/electoralStore';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MapViewerModule } from './components/modules/MapViewerModule';
import { CampaignCommandModule } from './components/modules/CampaignCommandModule';
import { DayDModule } from './components/modules/DayDModule';
import { ExecutiveDashboardModule } from './components/modules/ExecutiveDashboardModule';
import { NewWitnessModal } from './components/modals/NewWitnessModal';
import { NewVoterModal } from './components/modals/NewVoterModal';
import { DigitalizeE14Modal } from './components/modals/DigitalizeE14Modal';
import { FraudAlertModal } from './components/modals/FraudAlertModal';
import { ToastContainer } from './components/ui/ToastContainer';
import { useSecurityStore } from './store/securityStore';
import { ActorSwitcher } from './components/ActorSwitcher';
import { LoginForm } from './components/auth/LoginForm';
import { getSupabase } from './services/getSupabase';

export const App: React.FC = () => {
  // Load security actors on app start
  const loadActors = useSecurityStore(state => state.loadActors);
  const getCurrentActorId = useSecurityStore(state => state.getCurrentActorId);
  const currentActorId = useSecurityStore(state => state.currentActorId);
  const actors = useSecurityStore(state => state.actors);
  const { moduloActivo, setActorId } = useElectoralStore();

  const currentActor = actors.find(a => a.id === currentActorId);
  const currentActorRole = currentActor?.role ?? null;

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      await loadActors();
      if (!mounted) return;
      const actorId = await getCurrentActorId();
      if (mounted && actorId) {
        setActorId(actorId, currentActorRole);
      }
    };
    init();
    return () => { mounted = false; };
  }, [loadActors, getCurrentActorId, setActorId, currentActorRole]);

  return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#090d16] text-slate-100 select-none">
      {/* Si no hay actor logueado mostramos login/registro */}
      {!currentActor ? (
        <div className="max-w-sm mx-auto mt-20 space-y-6">
          <h2 className="text-xl font-bold text-center">Acceso a ElectoApp</h2>
          <LoginForm />
        </div>
      ) : (
        <>
          {/* Navbar Superior */}
          <div className="flex items-center px-4 bg-slate-950 border-b border-slate-800">
            <ActorSwitcher />
            <div className="flex-1">
              <Navbar />
            </div>
          </div>

          {/* Cuerpo Principal */}
          <div className="flex flex-1 overflow-hidden relative">
            {/* Barra Lateral Retráctil */}
            <Sidebar />

            {/* Contenido Conmutado por Módulo */}
            <main className="flex-1 relative overflow-hidden bg-slate-950">
              {moduloActivo === 'mapa' && <MapViewerModule />}
              {moduloActivo === 'campana' && <CampaignCommandModule />}
              {moduloActivo === 'dia_d' && <DayDModule />}
              {moduloActivo === 'ejecutivo' && <ExecutiveDashboardModule />}
            </main>
          </div>
        </>
      )}

      {/* Modales Globales */}
      <NewWitnessModal />
      <NewVoterModal />
      <DigitalizeE14Modal />
      <FraudAlertModal />

      {/* Notificaciones Tácticas Flotantes */}
      <ToastContainer />
    </div>
  );
};

export default App;
