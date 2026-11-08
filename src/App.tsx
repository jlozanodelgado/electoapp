import React, { useEffect, useState } from 'react';
import { useElectoralStore } from './store/electoralStore';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MapViewerModule } from './components/modules/MapViewerModule';
import { CampaignCommandModule } from './components/modules/CampaignCommandModule';
import { DayDModule } from './components/modules/DayDModule';
import { ExecutiveDashboardModule } from './components/modules/ExecutiveDashboardModule';
import { NewWitnessModal } from './components/modals/NewWitnessModal';
import { NewVoterModal } from './components/modals/NewVoterModal';
import { CandidatosModule } from './components/modules/CandidatosModule';
import { PreparacionModule } from './components/modules/PreparacionModule';
import { DigitalizeE14Modal } from './components/modals/DigitalizeE14Modal';
import { FraudAlertModal } from './components/modals/FraudAlertModal';
import { ToastContainer } from './components/ui/ToastContainer';
import { useSecurityStore } from './store/securityStore';
import { ActorSwitcher } from './components/ActorSwitcher';
import { LoginForm } from './components/auth/LoginForm';
import { Menu, X, Map, Target, User, Vote, BarChart3, Clock } from 'lucide-react';

export const App: React.FC = () => {
  const loadActors = useSecurityStore(state => state.loadActors);
  const getCurrentActorId = useSecurityStore(state => state.getCurrentActorId);
  const currentActorId = useSecurityStore(state => state.currentActorId);
  const actors = useSecurityStore(state => state.actors);
  const { moduloActivo, setModuloActivo, setActorId, loadHierarchicalData } = useElectoralStore();

  const currentActor = actors.find(a => a.id === currentActorId);
  const currentActorRole = currentActor?.role ?? null;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = window.innerWidth < 768;

  const moduloItems: Array<{ id: string; label: string; icon: React.ReactNode }> = [
    { id: 'mapa', label: 'Visor Cartográfico', icon: <Map className="w-5 h-5" /> },
    { id: 'campana', label: 'Comando de Campaña', icon: <Target className="w-5 h-5" /> },
    { id: 'candidatos', label: 'Candidatos', icon: <User className="w-5 h-5" /> },
    { id: 'preparacion', label: 'Preparación Día D', icon: <Clock className="w-5 h-5" /> },
    { id: 'dia_d', label: 'Día D Escrutinio', icon: <Vote className="w-5 h-5" /> },
    { id: 'ejecutivo', label: 'Dashboard Ejecutivo', icon: <BarChart3 className="w-5 h-5" /> },
  ];

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      await loadActors();
      await loadHierarchicalData();
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
      {!currentActor ? (
        <div className="max-w-sm mx-auto mt-20 space-y-6 p-4">
          <h2 className="text-xl font-bold text-center">Acceso a ElectoApp</h2>
          <LoginForm />
        </div>
      ) : (
        <>
          <div className="flex items-center px-4 bg-slate-950 border-b border-slate-800">
            <ActorSwitcher />
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="mr-2 p-2 text-slate-400 hover:text-white"
                aria-label="Menú"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
            <div className="flex-1">
              <Navbar />
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden relative">
            {!isMobile || sidebarOpen ? (
              <Sidebar />
            ) : null}

            {isMobile && sidebarOpen && (
              <div
                className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            <main className="flex-1 relative overflow-hidden bg-slate-950">
              {moduloActivo === 'mapa' && <MapViewerModule />}
              {moduloActivo === 'campana' && <CampaignCommandModule />}
              {moduloActivo === 'candidatos' && <CandidatosModule />}
              {moduloActivo === 'preparacion' && <PreparacionModule />}
              {moduloActivo === 'dia_d' && <DayDModule />}
              {moduloActivo === 'ejecutivo' && <ExecutiveDashboardModule />}

              {isMobile && (
                <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-50">
                  {moduloItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setModuloActivo(item.id as any);
                        setSidebarOpen(false);
                      }}
                      className={`p-2.5 rounded-lg text-xs font-medium text-slate-300 transition-all ${
                        moduloActivo === item.id
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                          : 'bg-slate-900 border border-slate-800 hover:bg-slate-800/80'
                      }`}
                    >
                      {item.icon}
                      <span className="ml-1">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </main>
          </div>
        </>
      )}
      <NewWitnessModal />
      <NewVoterModal />
      <DigitalizeE14Modal />
      <FraudAlertModal />
      <ToastContainer />
    </div>
  );
};

export default App;
