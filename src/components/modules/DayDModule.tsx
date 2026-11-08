import React, { useEffect } from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Vote, 
  Radio, 
  ShieldAlert, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Flame,
  Check
} from 'lucide-react';

export const DayDModule: React.FC = () => {
  const {
    actas,
    alertas,
    puestos,
    diaDProgresoPct,
    isSimulandoDiaD,
    toggleSimulacionDiaD,
    tickSimulacion,
    setIsDigitalizeE14Open,
    resolverAlerta,
    setIsFraudModalOpen,
    actorId,
    actorRole,
  } = useElectoralStore();

  const isTestigo = actorRole === 'testigo';

  // Filtrar actas y alertas propias si es testigo
  const actasFiltradas = isTestigo && actorId
    ? actas.filter(a => a.leaderId === actorId)
    : actas;

  const alertasFiltradas = isTestigo && actorId
    ? alertas.filter(a => a.leaderId === actorId)
    : alertas;

  // Ticker de simulación en vivo
  useEffect(() => {
    let interval: any;
    if (isSimulandoDiaD) {
      interval = setInterval(() => {
        tickSimulacion();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isSimulandoDiaD]);

  // Totales de votos transmitidos a partir de actas registradas
  const totalMesas = puestos.reduce((acc, p) => acc + p.mesasHabilitadas, 0);
  const totalVotosTransmitidos = actasFiltradas.reduce((acc, a) => acc + a.totalVotosUrna, 0);
  const votosCoalicion = actasFiltradas.reduce((acc, a) => acc + a.votosCoalicion, 0);
  const votosAlianza = actasFiltradas.reduce((acc, a) => acc + a.votosAlianza, 0);
  const votosUnidad = actasFiltradas.reduce((acc, a) => acc + a.votosUnidad, 0);
  const votosBlanco = actasFiltradas.reduce((acc, a) => acc + a.votosBlanco, 0);
  const votosNulos = actasFiltradas.reduce((acc, a) => acc + a.votosNulos, 0);

  const pctCoalicion = totalVotosTransmitidos > 0 ? ((votosCoalicion / totalVotosTransmitidos) * 100).toFixed(1) : '0';
  const pctAlianza = totalVotosTransmitidos > 0 ? ((votosAlianza / totalVotosTransmitidos) * 100).toFixed(1) : '0';
  const pctUnidad = totalVotosTransmitidos > 0 ? ((votosUnidad / totalVotosTransmitidos) * 100).toFixed(1) : '0';

  const alertasPendientes = alertasFiltradas.filter(a => !a.resuelta);

  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto p-6 space-y-6 select-none bg-slate-950">
      {/* Top Header & Simulation Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-rose-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 animate-pulse text-rose-400" />
            Módulo 3 • Sala de Crisis Día D
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Vote className="w-6 h-6 text-rose-400" />
            <span>Escrutinio y Transmisión de Datos en Vivo</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Recepción en tiempo real de formularios E-14, verificación antifraude y conteo rápido.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={isSimulandoDiaD ? 'danger' : 'secondary'}
            size="sm"
            icon={<Radio className={`w-4 h-4 ${isSimulandoDiaD ? 'animate-spin' : ''}`} />}
            onClick={toggleSimulacionDiaD}
          >
            {isSimulandoDiaD ? 'Pausar Simulación en Vivo' : 'Iniciar Simulación Día D'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<FileSpreadsheet className="w-4 h-4" />}
            onClick={() => setIsDigitalizeE14Open(true)}
          >
            Digitalizar Formato E-14
          </Button>
        </div>
      </div>

      {/* Progress Bar General de Escrutinio */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Boletín Oficial de Escrutinio Rápido</h3>
              <p className="text-xs text-slate-400">
                Última sincronización: {new Date().toLocaleTimeString('es-CO')} • Transmisión encriptada
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium">Avance de Mesas Informadas:</span>
            <div className="text-3xl font-black font-mono text-emerald-400">
              {diaDProgresoPct}%
            </div>
          </div>
        </div>

        {/* Barra animada */}
        <div className="w-full bg-slate-950 rounded-full h-3.5 p-0.5 border border-slate-800 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-400 h-full rounded-full transition-all duration-700 shadow-lg shadow-emerald-500/30"
            style={{ width: `${diaDProgresoPct}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-slate-400 font-mono pt-1">
          <span>{Math.round((totalMesas * diaDProgresoPct) / 100)} mesas informadas</span>
          <span>Total mesas a escrutar: {totalMesas}</span>
        </div>
      </div>

      {/* Conteo Rápido de Votos por Partido */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Coalición */}
        <Card className="bg-slate-900/90 border-slate-800 border-l-4 border-l-emerald-500">
          <span className="text-xs text-slate-400 font-medium">Coalición Por el Cambio</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black font-mono text-emerald-400">
              {votosCoalicion.toLocaleString()}
            </span>
            <span className="text-sm font-bold text-emerald-300 font-mono">
              {pctCoalicion}%
            </span>
          </div>
          <span className="text-[11px] text-slate-500">Candidatura Principal</span>
        </Card>

        {/* Alianza */}
        <Card className="bg-slate-900/90 border-slate-800 border-l-4 border-l-blue-500">
          <span className="text-xs text-slate-400 font-medium">Alianza Democrática</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black font-mono text-blue-400">
              {votosAlianza.toLocaleString()}
            </span>
            <span className="text-sm font-bold text-blue-300 font-mono">
              {pctAlianza}%
            </span>
          </div>
          <span className="text-[11px] text-slate-500">Segundo Lugar Proyectado</span>
        </Card>

        {/* Unidad */}
        <Card className="bg-slate-900/90 border-slate-800 border-l-4 border-l-rose-500">
          <span className="text-xs text-slate-400 font-medium">Unidad Republicana</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black font-mono text-rose-400">
              {votosUnidad.toLocaleString()}
            </span>
            <span className="text-sm font-bold text-rose-300 font-mono">
              {pctUnidad}%
            </span>
          </div>
          <span className="text-[11px] text-slate-500">Tercera Fuerza</span>
        </Card>

        {/* Votos Blancos / Nulos */}
        <Card className="bg-slate-900/90 border-slate-800 border-l-4 border-l-amber-500">
          <span className="text-xs text-slate-400 font-medium">Votos en Blanco & Nulos</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black font-mono text-amber-400">
              {(votosBlanco + votosNulos).toLocaleString()}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {votosNulos} nulos
            </span>
          </div>
          <span className="text-[11px] text-amber-400/80">Monitoreo Antifraude</span>
        </Card>
      </div>

      {/* Centro de Alertas de Fraude y Discrepancias Electorales */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <ShieldAlert className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Alertas Antifraude & Discrepancias Estadísticas</h3>
              <p className="text-xs text-slate-400">
                Detección automática de inconsistencias en digitalización de actas E-14 vs censo de mesa.
              </p>
            </div>
          </div>

          <Badge variant={alertasPendientes.length > 0 ? 'amber' : 'emerald'}>
            {alertasPendientes.length} Alertas Activas
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {alertasFiltradas.map(alerta => (
            <div
              key={alerta.id}
              className={`p-4 rounded-xl border transition-all ${
                alerta.resuelta
                  ? 'bg-slate-950/40 border-slate-800 opacity-60'
                  : alerta.severidad === 'alta'
                  ? 'bg-rose-500/10 border-rose-500/40 shadow-lg shadow-rose-950/30'
                  : 'bg-amber-500/10 border-amber-500/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Badge variant={alerta.severidad === 'alta' ? 'red' : 'amber'} size="sm">
                    {alerta.severidad.toUpperCase()} • {alerta.tipo.replace('_', ' ')}
                  </Badge>
                  <p className="font-bold text-white text-xs mt-1.5">{alerta.puestoNombre}</p>
                  <p className="text-[11px] text-slate-400 font-mono">Mesa #{alerta.mesaNumero} • {alerta.timestamp}</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 mt-2 line-clamp-3">
                {alerta.descripcion}
              </p>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                <span className={`text-[10px] font-bold ${alerta.resuelta ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {alerta.resuelta ? 'OBJECIÓN RADICADA' : 'REQUIERE RECLAMACIÓN'}
                </span>
                {!alerta.resuelta && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resolverAlerta(alerta.id)}
                    className="text-[10px] py-1 px-2"
                  >
                    Marcar Resuelta
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla en Vivo de Actas E-14 Digitalizadas */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-2">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Actas E-14 Recibidas y Auditadas ({actasFiltradas.length})</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Protocolo de Auditoría Cero-Papel</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-3">Puesto / Mesa</th>
                <th className="p-3">Hora Reporte</th>
                <th className="p-3">Digitalizado Por</th>
                <th className="p-3 text-emerald-400">Coalición</th>
                <th className="p-3 text-blue-400">Alianza</th>
                <th className="p-3 text-rose-400">Unidad</th>
                <th className="p-3 text-amber-400">Nulos</th>
                <th className="p-3 text-center">Total Urna</th>
                <th className="p-3 text-right">Auditoría E14</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {actasFiltradas.map(acta => (
                <tr key={acta.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3">
                    <p className="font-semibold text-white">Mesa #{acta.mesaNumero}</p>
                    <span className="text-[10px] text-slate-500 font-mono">{acta.puestoId}</span>
                  </td>
                  <td className="p-3 font-mono text-slate-400">{acta.horaReporte}</td>
                  <td className="p-3 text-slate-300">{acta.digitalizadoPor}</td>
                  <td className="p-3 font-mono font-bold text-emerald-400">{acta.votosCoalicion}</td>
                  <td className="p-3 font-mono font-bold text-blue-400">{acta.votosAlianza}</td>
                  <td className="p-3 font-mono font-bold text-rose-400">{acta.votosUnidad}</td>
                  <td className="p-3 font-mono font-bold text-amber-400">{acta.votosNulos}</td>
                  <td className="p-3 text-center font-mono font-bold text-white bg-slate-950/50">
                    {acta.totalVotosUrna}
                  </td>
                  <td className="p-3 text-right">
                    {acta.estadoRevision === 'aprobada' ? (
                      <Badge variant="emerald" size="sm">APROBADA</Badge>
                    ) : (
                      <Badge variant="red" size="sm">DISCREPANCIA</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

