import React from 'react';
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
import { useEffect } from 'react';
import { ActorSwitcher } from './components/ActorSwitcher';



export const App: React.FC = () => {
  // Load security actors on app start
  const loadActors = useSecurityStore(state => state.loadActors);
  useEffect(() => {
    loadActors();
  }, [loadActors]);

  const { moduloActivo } = useElectoralStore();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#090d16] text-slate-100 select-none">
      {/* Navbar Superior */}
      <div className="flex items-center space-x-4">
        <ActorSwitcher />
        <Navbar />
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

