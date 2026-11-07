import React from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { X, ShieldAlert, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';

export const FraudAlertModal: React.FC = () => {
  const { 
    isFraudModalOpen, 
    setIsFraudModalOpen, 
    alertas, 
    resolverAlerta,
    setSelectedPuestoId,
    setModuloActivo 
  } = useElectoralStore();

  if (!isFraudModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden select-none">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Centro de Inteligencia Antifraude & Discrepancias</h3>
              <p className="text-[10px] text-slate-400">Verificación de inconsistencias estadísticas en escrutinio</p>
            </div>
          </div>
          <button
            onClick={() => setIsFraudModalOpen(false)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-3">
          {alertas.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No se han detectado alertas de fraude o discrepancias estadísticas en este momento.
            </div>
          ) : (
            alertas.map(alerta => (
              <div
                key={alerta.id}
                className={`p-4 rounded-xl border text-xs transition-all ${
                  alerta.resuelta
                    ? 'bg-slate-950/40 border-slate-800 opacity-60'
                    : alerta.severidad === 'alta'
                    ? 'bg-rose-500/10 border-rose-500/40 shadow-lg'
                    : 'bg-amber-500/10 border-amber-500/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={alerta.severidad === 'alta' ? 'red' : 'amber'} size="sm">
                        {alerta.severidad.toUpperCase()} • {alerta.tipo.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className="font-mono text-slate-400 text-[10px]">{alerta.timestamp}</span>
                    </div>
                    <h4 className="font-bold text-white text-sm mt-1">{alerta.puestoNombre} — Mesa #{alerta.mesaNumero}</h4>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    alerta.resuelta ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {alerta.resuelta ? 'OBJECIÓN RADICADA' : 'ACTIVA'}
                  </span>
                </div>

                <p className="text-slate-300 mt-2 leading-relaxed">
                  {alerta.descripcion}
                </p>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setSelectedPuestoId(alerta.puestoId);
                      setModuloActivo('mapa');
                      setIsFraudModalOpen(false);
                    }}
                    className="text-emerald-400 hover:underline text-[11px] font-semibold"
                  >
                    Localizar en Mapa GIS →
                  </button>

                  {!alerta.resuelta && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => resolverAlerta(alerta.id)}
                      icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      className="text-xs py-1"
                    >
                      Radicar Objeción Legal
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsFraudModalOpen(false)}
          >
            Cerrar Panel
          </Button>
        </div>
      </div>
    </div>
  );
};

