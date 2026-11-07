import React, { useState } from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { TestigoElectoral, VotanteCRM } from '../../types/electoral';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ExportService } from '../../services/exportService';
import { 
  Users, 
  Target, 
  ShieldCheck, 
  UserPlus, 
  Phone, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  AlertOctagon, 
  Search,
  Filter,
  Download,
  Check,
  CheckCircle2,
  Car
} from 'lucide-react';

export const CampaignCommandModule: React.FC = () => {
  const [tab, setTab] = useState<'testigos' | 'crm'>('testigos');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  const {
    testigos,
    votantes,
    puestos,
    updateTestigoEstado,
    toggleVotanteYaVoto,
    setIsNewWitnessOpen,
    setIsNewVoterOpen,
  } = useElectoralStore();

  const totalMesas = puestos.reduce((acc, p) => acc + p.mesasHabilitadas, 0);
  const testigosConfirmados = testigos.filter(t => t.estado === 'confirmado').length;
  const testigosPendientes = testigos.filter(t => t.estado === 'pendiente').length;
  const testigosAusentes = testigos.filter(t => t.estado === 'ausente').length;
  const pctCobertura = totalMesas > 0 ? Math.round((testigosConfirmados / totalMesas) * 100) : 0;

  // CRM Votantes KPIs
  const totalVotantes = votantes.length;
  const votoDuro = votantes.filter(v => v.intencionVoto === 'voto_duro').length;
  const votoBlando = votantes.filter(v => v.intencionVoto === 'voto_blando').length;
  const indecisos = votantes.filter(v => v.intencionVoto === 'indeciso').length;
  const opositores = votantes.filter(v => v.intencionVoto === 'opositor').length;
  const yaVotaron = votantes.filter(v => v.yaVoto).length;

  // Filtrado de testigos
  const testigosFiltrados = testigos.filter(t => {
    const matchBusqueda = t.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.puestoNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.cedula.includes(busqueda);
    const matchEstado = filtroEstado === 'todos' || t.estado === filtroEstado;
    return matchBusqueda && matchEstado;
  });

  // Filtrado de votantes
  const votantesFiltrados = votantes.filter(v => {
    const matchBusqueda = v.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.barrio.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.cedula.includes(busqueda) ||
      v.liderAsignado.toLowerCase().includes(busqueda.toLowerCase());
    const matchIntencion = filtroEstado === 'todos' || v.intencionVoto === filtroEstado;
    return matchBusqueda && matchIntencion;
  });

  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto p-6 space-y-6 select-none bg-slate-950">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Módulo 2 • Centro de Operaciones
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-emerald-400" />
            <span>Centro de Comando de Campaña</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Gestión táctica de testigos electorales, cobertura mesa a mesa y CRM de simpatizantes georreferenciados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex">
            <button
              onClick={() => { setTab('testigos'); setFiltroEstado('todos'); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'testigos'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Testigos Electorales ({testigos.length})</span>
            </button>
            <button
              onClick={() => { setTab('crm'); setFiltroEstado('todos'); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'crm'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>CRM Votantes ({votantes.length})</span>
            </button>
          </div>

          {/* Action button */}
          {tab === 'testigos' ? (
            <Button
              variant="primary"
              size="sm"
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => setIsNewWitnessOpen(true)}
            >
              Nuevo Testigo
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => setIsNewVoterOpen(true)}
            >
              Registrar Votante
            </Button>
          )}
        </div>
      </div>

      {/* SUB-VISTA 1: TESTIGOS ELECTORALES */}
      {tab === 'testigos' && (
        <div className="space-y-6">
          {/* KPI Cards Cobertura */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-900/90 border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">Cobertura Total Mesas</span>
                  <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                    {pctCobertura}%
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {testigosConfirmados} de {totalMesas} mesas aseguradas
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900/90 border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">Testigos Confirmados</span>
                  <div className="text-2xl font-black font-mono text-white mt-1">
                    {testigosConfirmados}
                  </div>
                  <span className="text-[11px] text-emerald-400 font-medium">
                    En puesto con credencial
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900/90 border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">Testigos Pendientes</span>
                  <div className="text-2xl font-black font-mono text-amber-400 mt-1">
                    {testigosPendientes}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Requieren llamada de confirmación
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900/90 border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">Mesas Descuidadas / Ausente</span>
                  <div className="text-2xl font-black font-mono text-rose-400 mt-1">
                    {testigosAusentes}
                  </div>
                  <span className="text-[11px] text-rose-400/80">
                    Requieren remanente urgente
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <AlertOctagon className="w-6 h-6" />
                </div>
              </div>
            </Card>
          </div>

          {/* Filtros y Barra de Búsqueda */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, cédula o puesto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-400">Estado:</span>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
              >
                <option value="todos">Todos los Estados</option>
                <option value="confirmado">Confirmados</option>
                <option value="pendiente">Pendientes</option>
                <option value="ausente">Ausentes</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={() => ExportService.exportTestigosToCSV(testigos)}
              >
                CSV
              </Button>
            </div>
          </div>

          {/* Tabla de Testigos */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Testigo / Contacto</th>
                    <th className="p-3">Puesto Asignado</th>
                    <th className="p-3 text-center">Mesa</th>
                    <th className="p-3">Rol</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Acciones Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {testigosFiltrados.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3">
                        <p className="font-semibold text-white">{t.nombre}</p>
                        <p className="text-[11px] text-slate-400 font-mono">C.C. {t.cedula}</p>
                        <p className="text-[11px] text-emerald-400 font-mono">{t.telefono}</p>
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-slate-200">{t.puestoNombre}</p>
                        <span className="text-[10px] text-slate-500 font-mono">ID: {t.puestoId}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                          #{t.mesaNumero}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge variant="blue" size="sm">
                          {t.rol.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <select
                          value={t.estado}
                          onChange={(e) => updateTestigoEstado(t.id, e.target.value as any)}
                          className={`text-xs font-semibold rounded px-2 py-1 border bg-slate-950 focus:outline-none cursor-pointer ${
                            t.estado === 'confirmado' ? 'border-emerald-500/50 text-emerald-400' :
                            t.estado === 'pendiente' ? 'border-amber-500/50 text-amber-400' :
                            'border-rose-500/50 text-rose-400'
                          }`}
                        >
                          <option value="confirmado">Confirmado</option>
                          <option value="pendiente">Pendiente</option>
                          <option value="ausente">Ausente</option>
                        </select>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <a
                          href={`https://wa.me/${t.telefono.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                          title="Enviar WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`tel:${t.telefono.replace(/[^0-9]/g, '')}`}
                          className="inline-flex items-center p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
                          title="Llamar"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VISTA 2: CRM DE VOTANTES */}
      {tab === 'crm' && (
        <div className="space-y-6">
          {/* Semáforo Intención de Voto Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-slate-900/90 border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Total Registrados</span>
              <div className="text-2xl font-black font-mono text-white mt-1">
                {totalVotantes}
              </div>
              <span className="text-[11px] text-slate-500">{yaVotaron} confirmaron voto hoy</span>
            </Card>

            <Card className="bg-slate-900/90 border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">🟢 Voto Duro</span>
                  <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                    {votoDuro}
                  </div>
                  <span className="text-[11px] text-emerald-500/80">Fidelizados 100%</span>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900/90 border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">🔵 Voto Blando</span>
                  <div className="text-2xl font-black font-mono text-blue-400 mt-1">
                    {votoBlando}
                  </div>
                  <span className="text-[11px] text-blue-500/80">Persuadibles</span>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900/90 border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">🟡 Indecisos</span>
                  <div className="text-2xl font-black font-mono text-amber-400 mt-1">
                    {indecisos}
                  </div>
                  <span className="text-[11px] text-amber-500/80">Por convencer</span>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900/90 border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">🔴 Opositores</span>
                  <div className="text-2xl font-black font-mono text-rose-400 mt-1">
                    {opositores}
                  </div>
                  <span className="text-[11px] text-rose-500/80">No prioritarios</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Filtros CRM */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por simpatizante, líder o barrio..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-400">Intención:</span>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
              >
                <option value="todos">Todas las Intenciones</option>
                <option value="voto_duro">Voto Duro</option>
                <option value="voto_blando">Voto Blando</option>
                <option value="indeciso">Indeciso</option>
                <option value="opositor">Opositor</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={() => ExportService.exportVotantesToCSV(votantes)}
              >
                CSV
              </Button>
            </div>
          </div>

          {/* Tabla de Votantes CRM */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Simpatizante</th>
                    <th className="p-3">Ubicación / Barrio</th>
                    <th className="p-3">Líder Asignado</th>
                    <th className="p-3">Intención</th>
                    <th className="p-3 text-center">Transporte</th>
                    <th className="p-3 text-center">Día D (¿Ya Votó?)</th>
                    <th className="p-3 text-right">Contacto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {votantesFiltrados.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3">
                        <p className="font-semibold text-white">{v.nombre}</p>
                        <p className="text-[11px] text-slate-400 font-mono">C.C. {v.cedula}</p>
                      </td>
                      <td className="p-3">
                        <p className="text-slate-200 font-medium">{v.barrio}</p>
                        <p className="text-[11px] text-slate-500 truncate max-w-[160px]">{v.direccion}</p>
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-slate-300">{v.liderAsignado}</span>
                      </td>
                      <td className="p-3">
                        {v.intencionVoto === 'voto_duro' && <Badge variant="emerald">VOTO DURO</Badge>}
                        {v.intencionVoto === 'voto_blando' && <Badge variant="blue">VOTO BLANDO</Badge>}
                        {v.intencionVoto === 'indeciso' && <Badge variant="amber">INDECISO</Badge>}
                        {v.intencionVoto === 'opositor' && <Badge variant="red">OPOSITOR</Badge>}
                      </td>
                      <td className="p-3 text-center">
                        {v.necesitaTransporte ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                            <Car className="w-3 h-3" /> Requiere
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">No</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => toggleVotanteYaVoto(v.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                            v.yaVoto
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                              : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Check className={`w-3.5 h-3.5 ${v.yaVoto ? 'text-emerald-400' : 'text-slate-600'}`} />
                          {v.yaVoto ? 'VOTÓ' : 'PENDIENTE'}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <a
                          href={`https://wa.me/${v.telefono.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

