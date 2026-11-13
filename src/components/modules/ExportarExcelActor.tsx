import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useElectoralStore } from '../../store/electoralStore';
import { useSecurityStore } from '../../store/securityStore';
import { Button } from '../ui/Button';
import { Download, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { Actor, Candidato } from '../../types/electoral';

type TipoExportacion = 'actores' | 'testigos' | 'votantes' | 'todos';

interface DatosExportacion {
  actores: Actor[];
  testigos: any[];
  votantes: any[];
}

interface Props {
  canExport: boolean;
  candidatoId?: string | null;
}

const UsersIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const TargetIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18a6 6 0 100-12 6 6 0 000 12z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 7v4m0 4v4m0-8a2 2 0 100-4 2 2 0 000 4z" />
  </svg>
);

export const ExportarExcelActor: React.FC<Props> = ({ canExport, candidatoId }) => {
  const { actors, testigos, votantes } = useElectoralStore();
  const actorActivo = useSecurityStore(s => s.currentActor());

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Filtrar según el rol del usuario que está exportando
  const obtenerDatos = (): DatosExportacion => {
    if (!canExport) return { actores: [], testigos: [], votantes: [] };

    const esSupervisorTotal = actorActivo?.role === 'totalSupervisor';
    const esSupervisorCandidato = actorActivo?.role === 'candidateSupervisor';

    // Si es supervisor de candidato, solo actores amarrados a su candidato
    const actoresFiltrados = esSupervisorCandidato && candidatoId
      ? actors.filter((a: Actor) => a.candidatoId === candidatoId)
      : actors;

    return {
      actores: actoresFiltrados,
      testigos: esSupervisorTotal || esSupervisorCandidato ? testigos : [],
      votantes: esSupervisorTotal || esSupervisorCandidato ? votantes : [],
    };
  };

  const exportarExcel = (tipo: TipoExportacion) => {
    if (!canExport) {
      setMensaje({ tipo: 'error', texto: 'No tienes permisos para exportar datos.' });
      return;
    }

    setCargando(true);
    setMensaje(null);

    try {
      const datos = obtenerDatos();
      const wb = XLSX.utils.book_new();

      const fecha = new Date().toISOString().slice(0, 10);
      const nombreArchivo = `electoapp_${tipo}_${fecha}.xlsx`;

      if (tipo === 'actores' || tipo === 'todos') {
        const datosActores = datos.actores.map((a: Actor) => ({
          ID: a.id,
          Nombre: a.nombre,
          Rol: a.role,
          Nivel: a.nivel ?? '',
          Candidato_ID: a.candidatoId ?? '',
          Supervisor_ID: a.supervisorId ?? '',
          Líder_ID: a.leaderId ?? '',
          Ámbito: a.scopeLevel ?? '',
          Territorio_ID: a.scopeId ?? '',
          Usuario_ID: a.userId ?? '',
          Creado_En: a.creadoEn ?? '',
        }));
        const ws = XLSX.utils.json_to_sheet(datosActores);
        XLSX.utils.book_append_sheet(wb, ws, 'Actores');
      }

      if (tipo === 'testigos' || tipo === 'todos') {
        const datosTestigos = datos.testigos.map((t: any) => ({
          ID: t.id,
          Nombre: t.nombre,
          Cédula: t.cedula,
          Puesto: t.puestoNombre,
          Mesa: t.mesaNumero,
          Rol: t.rol,
          Estado: t.estado,
          Líder_ID: t.leaderId ?? '',
          Hora_Llegada: t.horaLlegada ?? '',
        }));
        const ws = XLSX.utils.json_to_sheet(datosTestigos);
        XLSX.utils.book_append_sheet(wb, ws, 'Testigos');
      }

      if (tipo === 'votantes' || tipo === 'todos') {
        const datosVotantes = datos.votantes.map((v: any) => ({
          ID: v.id,
          Nombre: v.nombre,
          Cédula: v.cedula,
          Puesto_ID: v.puestoId,
          Barrio: v.barrio,
          Intención: v.intencionVoto,
          Líder_Asignado: v.liderAsignado,
          Líder_ID: v.leaderId ?? '',
          Contactado: v.contactado,
          Ya_Votó: v.yaVoto,
          Necesita_Transporte: v.necesitaTransporte,
        }));
        const ws = XLSX.utils.json_to_sheet(datosVotantes);
        XLSX.utils.book_append_sheet(wb, ws, 'Votantes');
      }

      XLSX.writeFile(wb, nombreArchivo);

      setMensaje({
        tipo: 'exito',
        texto: `Exportación completada: ${nombreArchivo}`,
      });
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al exportar Excel.' });
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  if (!canExport) return null;

  const datos = obtenerDatos();
  const totalActores = datos.actores.length;
  const totalTestigos = datos.testigos.length;
  const totalVotantes = datos.votantes.length;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-5 h-5 text-emerald-400" />
        <h2 className="font-bold text-white">Exportar a Excel</h2>
      </div>
      <p className="text-sm text-slate-400 mb-4">
        Descarga los datos en formato Excel para reporte o análisis externo.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button
          onClick={() => exportarExcel('actores')}
          disabled={cargando || totalActores === 0}
          variant="outline"
          size="sm"
          icon={<UsersIcon className="w-4 h-4" />}
        >
          {cargando ? 'Exportando…' : `Actores (${totalActores})`}
        </Button>
        <Button
          onClick={() => exportarExcel('testigos')}
          disabled={cargando || totalTestigos === 0}
          variant="outline"
          size="sm"
          icon={<UsersIcon className="w-4 h-4" />}
        >
          {cargando ? 'Exportando…' : `Testigos (${totalTestigos})`}
        </Button>
        <Button
          onClick={() => exportarExcel('votantes')}
          disabled={cargando || totalVotantes === 0}
          variant="outline"
          size="sm"
          icon={<TargetIcon className="w-4 h-4" />}
        >
          {cargando ? 'Exportando…' : `Votantes (${totalVotantes})`}
        </Button>
        <Button
          onClick={() => exportarExcel('todos')}
          disabled={cargando || (totalActores === 0 && totalTestigos === 0 && totalVotantes === 0)}
          variant="primary"
          size="sm"
          icon={<FileText className="w-4 h-4" />}
        >
          {cargando ? 'Exportando…' : 'Todo en un archivo'}
        </Button>
      </div>

      {mensaje && (
        <div className={`mt-3 p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
          mensaje.tipo === 'exito'
            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
        }`}>
          {mensaje.tipo === 'exito' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          {mensaje.texto}
        </div>
      )}
    </div>
  );
};
