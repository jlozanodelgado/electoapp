import React, { useState } from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { Button } from '../ui/Button';
import { X, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const DigitalizeE14Modal: React.FC = () => {
  const { 
    isDigitalizeE14Open, 
    setIsDigitalizeE14Open, 
    puestos, 
    selectedPuestoId, 
    addActaE14 
  } = useElectoralStore();

  const [puestoId, setPuestoId] = useState(selectedPuestoId || puestos[0]?.id || '');
  const [mesaNumero, setMesaNumero] = useState(1);
  const [digitalizadoPor, setDigitalizadoPor] = useState('Testigo Mesa Acreditado');

  const [votosCoalicion, setVotosCoalicion] = useState(120);
  const [votosAlianza, setVotosAlianza] = useState(65);
  const [votosUnidad, setVotosUnidad] = useState(18);
  const [votosOtros, setVotosOtros] = useState(5);
  const [votosBlanco, setVotosBlanco] = useState(4);
  const [votosNulos, setVotosNulos] = useState(2);
  const [votosNoMarcados, setVotosNoMarcados] = useState(1);
  const [totalVotosUrna, setTotalVotosUrna] = useState(215);

  if (!isDigitalizeE14Open) return null;

  const sumaVotos = votosCoalicion + votosAlianza + votosUnidad + votosOtros + votosBlanco + votosNulos + votosNoMarcados;
  const hayDiscrepanciaSuma = sumaVotos !== totalVotosUrna;
  const hayPicoNulos = totalVotosUrna > 0 && (votosNulos / totalVotosUrna) > 0.12;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    addActaE14({
      puestoId,
      mesaNumero: Number(mesaNumero),
      horaReporte: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      digitalizadoPor,
      votosCoalicion: Number(votosCoalicion),
      votosAlianza: Number(votosAlianza),
      votosUnidad: Number(votosUnidad),
      votosOtros: Number(votosOtros),
      votosBlanco: Number(votosBlanco),
      votosNulos: Number(votosNulos),
      votosNoMarcados: Number(votosNoMarcados),
      totalVotosUrna: Number(totalVotosUrna),
      estadoRevision: hayDiscrepanciaSuma || hayPicoNulos ? 'alerta_discrepancia' : 'aprobada',
    });

    setIsDigitalizeE14Open(false);
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden select-none">
        {/* Header E-14 Form */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-xs">
              E-14
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Formato E-14 • Acta de Escrutinio de Mesa</h3>
              <p className="text-[10px] text-slate-400">Digitalización de Claveros y Testigos Electorales</p>
            </div>
          </div>
          <button
            onClick={() => setIsDigitalizeE14Open(false)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Identificación de Puesto y Mesa */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-2">
              <label className="text-slate-400 block mb-1 font-medium">Puesto de Votación</label>
              <select
                value={puestoId}
                onChange={(e) => setPuestoId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
              >
                {puestos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} ({p.comunaBarrio})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Mesa #</label>
              <input
                type="number"
                min="1"
                max="200"
                value={mesaNumero}
                onChange={(e) => setMesaNumero(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Digitalizado por</label>
            <input
              type="text"
              value={digitalizadoPor}
              onChange={(e) => setDigitalizadoPor(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Sección de Votos por Partido E-14 */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Votación Mesa a Mesa
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-emerald-400 font-semibold block mb-0.5">Coalición Por el Cambio</label>
                <input
                  type="number"
                  min="0"
                  value={votosCoalicion}
                  onChange={(e) => setVotosCoalicion(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-emerald-500/40 rounded-lg p-1.5 font-mono font-bold text-slate-100"
                />
              </div>
              <div>
                <label className="text-blue-400 font-semibold block mb-0.5">Alianza Democrática</label>
                <input
                  type="number"
                  min="0"
                  value={votosAlianza}
                  onChange={(e) => setVotosAlianza(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-blue-500/40 rounded-lg p-1.5 font-mono font-bold text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-rose-400 font-semibold block mb-0.5">Unidad Republicana</label>
                <input
                  type="number"
                  min="0"
                  value={votosUnidad}
                  onChange={(e) => setVotosUnidad(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-rose-500/40 rounded-lg p-1.5 font-mono font-bold text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-0.5">Otros Partidos</label>
                <input
                  type="number"
                  min="0"
                  value={votosOtros}
                  onChange={(e) => setVotosOtros(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 font-mono font-bold text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800">
              <div>
                <label className="text-slate-400 block mb-0.5 text-[10px]">Votos en Blanco</label>
                <input
                  type="number"
                  min="0"
                  value={votosBlanco}
                  onChange={(e) => setVotosBlanco(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1 font-mono text-center text-slate-100"
                />
              </div>
              <div>
                <label className="text-amber-400 block mb-0.5 text-[10px] font-semibold">Votos Nulos</label>
                <input
                  type="number"
                  min="0"
                  value={votosNulos}
                  onChange={(e) => setVotosNulos(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-amber-500/40 rounded-lg p-1 font-mono text-center text-amber-300 font-bold"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-0.5 text-[10px]">No Marcados</label>
                <input
                  type="number"
                  min="0"
                  value={votosNoMarcados}
                  onChange={(e) => setVotosNoMarcados(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1 font-mono text-center text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Total Votos Urna y Balance Aritmético */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <label className="text-white font-bold block">Total Sufragantes en Urna</label>
              <span className="text-[10px] text-slate-400">Total papeletas encontradas</span>
            </div>
            <input
              type="number"
              min="0"
              value={totalVotosUrna}
              onChange={(e) => setTotalVotosUrna(Number(e.target.value))}
              className="w-24 bg-slate-900 border border-slate-600 rounded-lg p-2 font-mono font-black text-center text-white text-base"
              required
            />
          </div>

          {/* Verificación de Discrepancia en Tiempo Real */}
          {hayDiscrepanciaSuma ? (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <strong className="block font-bold">¡Alerta de Discrepancia Aritmética!</strong>
                <span>
                  La suma de votos por partido ({sumaVotos}) no coincide con el total de sufragantes en urna ({totalVotosUrna}). Diferencia: {Math.abs(sumaVotos - totalVotosUrna)} votos. Se activará protocolo antifraude.
                </span>
              </div>
            </div>
          ) : hayPicoNulos ? (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <strong className="block font-bold">¡Alerta de Nulos Anormales!</strong>
                <span>
                  El {((votosNulos / totalVotosUrna) * 100).toFixed(1)}% de votos nulos excede el umbral estadístico normal (5%). Se registrará objeción.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Balance aritmético perfecto: {sumaVotos} votos coinciden exactamente con urna.</span>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDigitalizeE14Open(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<FileSpreadsheet className="w-4 h-4" />}
            >
              Transmitir Acta E-14
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

