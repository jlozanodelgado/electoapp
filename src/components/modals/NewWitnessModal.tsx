import React, { useState } from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { Button } from '../ui/Button';
import { RolTestigo, EstadoTestigo, Actor } from '../../types/electoral';
import { X, UserPlus, ShieldCheck } from 'lucide-react';

export const NewWitnessModal: React.FC = () => {
  const {
    isNewWitnessOpen,
    setIsNewWitnessOpen,
    puestos,
    selectedPuestoId,
    addTestigo,
    actors,
    actorId,
    actorRole,
  } = useElectoralStore();

  const [puestoId, setPuestoId] = useState(selectedPuestoId || puestos[0]?.id || '');
  const [mesaNumero, setMesaNumero] = useState(1);
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rol, setRol] = useState<RolTestigo>('testigo_mesa');
  const [estado, setEstado] = useState<EstadoTestigo>('confirmado');
  const [leaderId, setLeaderId] = useState<string | undefined>(undefined);

  // Líderes disponibles según el rol del creador
  const lideresDisponibles = actors.filter(a => a.role === 'leader');

  const lideresFiltrados = actorRole === 'candidateSupervisor' && actorId
    ? lideresDisponibles.filter(l => l.supervisorId === actorId)
    : lideresDisponibles;

  // Si el creador es líder, su propio id es el leaderId por defecto
  React.useEffect(() => {
    if (actorRole === 'leader' && actorId && !leaderId) {
      setLeaderId(actorId ?? undefined);
    }
  }, [actorRole, actorId, leaderId]);

  if (!isNewWitnessOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !cedula) return;

    const puesto = puestos.find(p => p.id === puestoId);
    const finalLeaderId = actorRole === 'leader' ? actorId ?? undefined : leaderId;

    addTestigo({
      puestoId,
      puestoNombre: puesto ? puesto.nombre : 'Puesto General',
      mesaNumero: Number(mesaNumero),
      nombre,
      cedula,
      telefono: telefono || '+57 300 000 0000',
      rol,
      estado,
      horaLlegada: estado === 'confirmado' ? '07:00 AM' : undefined,
      leaderId: finalLeaderId,
    });

    setIsNewWitnessOpen(false);
    setNombre('');
    setCedula('');
    setTelefono('');
    setLeaderId(undefined);
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden select-none">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Acreditar Nuevo Testigo Electoral</h3>
          </div>
          <button
            onClick={() => setIsNewWitnessOpen(false)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          <div>
            <label className="text-slate-400 block mb-1 font-medium">Puesto de Votación</label>
            <select
              value={puestoId}
              onChange={(e) => setPuestoId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              {puestos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} ({p.comunaBarrio})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Mesa Asignada</label>
              <input
                type="number"
                min="1"
                max="150"
                value={mesaNumero}
                onChange={(e) => setMesaNumero(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Rol</label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="testigo_mesa">Testigo de Mesa</option>
                <option value="coordinador_puesto">Coordinador de Puesto</option>
                <option value="abogado_escrutinio">Abogado de Escrutinio</option>
                <option value="remanente">Remanente de Reserva</option>
              </select>
            </div>
          </div>

          {lideresFiltrados.length > 0 && (
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Líder Responsable</label>
              <select
                value={leaderId || ''}
                onChange={(e) => setLeaderId(e.target.value || undefined)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Seleccionar líder</option>
                {lideresFiltrados.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.nombre} ({l.scopeLevel || 'sin territorio'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {lideresFiltrados.length === 0 && actorRole !== 'leader' && (
            <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              No hay líderes disponibles para asignar. Crea un líder primero.
            </div>
          )}

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Nombre y Apellidos</label>
            <input
              type="text"
              placeholder="Ej. Juan Camilo Ortiz"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Cédula de Ciudadanía</label>
              <input
                type="text"
                placeholder="Ej. 1.020.340.890"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Teléfono / WhatsApp</label>
              <input
                type="text"
                placeholder="+57 310 000 0000"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Estado de Confirmación</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="confirmado">Confirmado (Capacitado y Listo)</option>
              <option value="pendiente">Pendiente de Confirmación</option>
              <option value="ausente">Ausente / Por Reemplazar</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewWitnessOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<UserPlus className="w-4 h-4" />}
            >
              Guardar Testigo
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

