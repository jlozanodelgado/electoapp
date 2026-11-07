import React from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { TerritorialSelector } from './TerritorialSelector';
import { 
  ShieldAlert, 
  Activity, 
  Users, 
  RotateCcw, 
  Vote,
  Radio
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    alertas, 
    setIsFraudModalOpen, 
    testigos, 
    puestos, 
    isSimulandoDiaD, 
    diaDProgresoPct, 
    toggleSimulacionDiaD, 
    reiniciarDatos 
  } = useElectoralStore();

  const alertasNoResueltas = alertas.filter(a => !a.resuelta);
  const testigosConfirmados = testigos.filter(t => t.estado === 'confirmado').length;
  const totalMesas = puestos.reduce((acc, p) => acc + p.mesasHabilitadas, 0);
  const pctCobertura = totalMesas > 0 ? Math.round((testigosConfirmados / totalMesas) * 100) : 0;

  return (
    <header className="h-16 bg-slate-950/95 border-b border-slate-800/80 px-4 flex items-center justify-between gap-4 z-40 select-none">
      {/* Brand & Territorial Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-950/60 border border-emerald-400/40">
            <Vote className="w-5 h-5 text-slate-950 font-black" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                ELECTO<span className="text-emerald-400">APP</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 -mt-0.5">Votomap Intelligence & Campaign OS</p>
          </div>
        </div>

        <div className="hidden lg:block h-7 w-[1px] bg-slate-800" />

        {/* Dynamic Global Territorial Selector */}
        <div className="hidden md:block">
          <TerritorialSelector />
        </div>
      </div>

      {/* Center / Right KPIs & Day D Live Indicator */}
      <div className="flex items-center gap-3">
        {/* Live Day D Ticker */}
        <div 
          onClick={toggleSimulacionDiaD}
          className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${
            isSimulandoDiaD 
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-md shadow-rose-950/40 animate-pulse'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
          title="Click para alternar simulación de escrutinio Día D"
        >
          <Radio className={`w-3.5 h-3.5 ${isSimulandoDiaD ? 'text-rose-400 animate-spin' : 'text-slate-400'}`} />
          <span className="font-semibold">Día D Transmisión:</span>
          <span className="font-mono font-bold text-white">{diaDProgresoPct}% mesas</span>
          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${isSimulandoDiaD ? 'bg-rose-500/30 text-rose-200' : 'bg-slate-800 text-slate-400'}`}>
            {isSimulandoDiaD ? 'EN VIVO' : 'PAUSADO'}
          </span>
        </div>

        {/* Testigos Cobertura Summary */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-300">
          <Users className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-400">Testigos:</span>
          <span className="font-mono font-bold text-slate-100">{testigosConfirmados} / {totalMesas}</span>
          <span className="font-bold text-blue-400">({pctCobertura}%)</span>
        </div>

        {/* Alertas de Fraude */}
        <button
          onClick={() => setIsFraudModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            alertasNoResueltas.length > 0
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 shadow-md shadow-amber-950/30'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          <ShieldAlert className={`w-3.5 h-3.5 ${alertasNoResueltas.length > 0 ? 'text-amber-400 animate-bounce' : 'text-slate-500'}`} />
          <span>Alertas Electorales:</span>
          <span className="px-1.5 py-0.2 bg-amber-500/30 text-amber-200 rounded text-[11px] font-mono">
            {alertasNoResueltas.length}
          </span>
        </button>

        {/* Reset Mock Data button */}
        <button
          onClick={() => {
            if (confirm('¿Restablecer datos de prueba a valores por defecto?')) {
              reiniciarDatos();
            }
          }}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
          title="Restablecer datos de prueba"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

