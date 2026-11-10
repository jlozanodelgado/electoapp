import React, { useState } from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MapPin, Users, CheckCircle2, Clock, Layout } from 'lucide-react';
import { ElectoralMap } from '../map/ElectoralMap';

export const TerritoryDashboard: React.FC = () => {
  const { puestos, testigos, votantes, departamentoId, municipioId } = useElectoralStore();
  const [activeAction, setActiveAction] = useState<string | null>('ver_viviendas');

  const totalPuestos = puestos.length;
  const totalMesas = puestos.reduce((acc, p) => acc + p.mesasHabilitadas, 0);
  const testigosConfirmados = testigos.filter(t => t.estado === 'confirmado').length;
  const totalVotantes = votantes.length;
  const votantesConfirmados = votantes.filter(v => v.yaVoto).length;

  const acciones = [
    { id: 'ver_viviendas', label: 'Ver viviendas', subtitle: 'Puntos de residencia', icon: <MapPin className="w-5 h-5 text-emerald-400" /> },
    { id: 'personas_ubicadas', label: 'Personas ubicadas', subtitle: 'Solo registros con coordenadas', icon: <Users className="w-5 h-5 text-blue-400" /> },
    { id: 'verificar_direcciones', label: 'Verificar direcciones', subtitle: 'Confirma municipio y referencia', icon: <CheckCircle2 className="w-5 h-5 text-amber-400" /> },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto p-6 space-y-6 select-none bg-slate-950">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Tu territorio, en perspectiva
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Campaña Ejemplo
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {departamentoId !== 'todos' ? departamentoId : 'Nacional'} • {municipioId !== 'todos' ? municipioId : 'Todos los municipios'}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => setActiveAction('ver_viviendas')}
            className={activeAction === 'ver_viviendas' ? 'bg-emerald-500 text-white border-emerald-500' : ''}
          >
            Ver viviendas y ubicar direcciones
          </Button>
          <Button variant="outline" onClick={() => setActiveAction('paso_revisado')}>
            Paso revisado
          </Button>
        </div>
      </div>

      {/* Mapa principal */}
      <div className="lg:w-2/3 h-[600px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="absolute inset-0 z-10 flex items-center justify-center text-slate-500 text-xs">
          Mapa interactivo - Zonas y puestos de votación
        </div>
        <ElectoralMap />
      </div>

      {/* Panel derecho: Acciones y Estadísticas */}
      <div className="lg:w-1/3 space-y-6">
        {/* Acciones rápidas */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Layout className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white text-sm uppercase tracking-wider text-[10px]">
              Acciones rápidas
            </span>
          </div>
          <div className="space-y-2.5">
            {acciones.map((accion) => (
              <button
                key={accion.id}
                onClick={() => setActiveAction(accion.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  activeAction === accion.id
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="p-2 rounded-lg ${
                  activeAction === accion.id
                    ? 'bg-emerald-500/20 border border-emerald-500/30'
                    : 'bg-slate-800 border border-transparent'
                }">
                  {accion.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{accion.label}</h3>
                  <p className="text-[10px] text-slate-400">{accion.subtitle}</p>
                </div>
                <span className="ml-auto text-[10px] text-slate-500">
                  {activeAction === accion.id ? 'Activo' : 'Inactivo'}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* Estadísticas del territorio */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-white text-sm uppercase tracking-wider text-[10px]">
              Resumen del territorio
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Puestos</span>
              <div className="text-xl font-black font-mono text-emerald-400">{totalPuestos}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Mesas</span>
              <div className="text-xl font-black font-mono text-blue-400">{totalMesas}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Testigos conf.</span>
              <div className="text-xl font-black font-mono text-purple-400">{testigosConfirmados}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Votantes votaron</span>
              <div className="text-xl font-black font-mono text-rose-400">{votantesConfirmados}</div>
            </div>
          </div>
        </Card>

        {/* Nota informativa */}
        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50">
          <p className="text-[10px] text-slate-400 leading-relaxed">
            <span className="text-emerald-400 font-bold">Mapa ilustrativo</span> - Los marcadores representan puestos de votación. Usa las acciones rápidas para gestionar viviendas y direcciones de tu territorio.
          </p>
        </div>
      </div>
    </div>
  );
};
