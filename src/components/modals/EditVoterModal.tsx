import React, { useEffect, useState } from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { VotanteCRM, IntencionVoto, PuestoVotacion } from '../../types/electoral';
import { Button } from '../ui/Button';
import { X, UserPlus, HeartHandshake } from 'lucide-react';

interface Props {
  votante: VotanteCRM;
}

export const EditVoterModal: React.FC<Props> = ({ votante }) => {
  const {
    isNewVoterOpen,
    editingVoter,
    setEditingVoter,
    puestos,
    actors,
    actorId,
    actorRole,
    updateVotante,
  } = useElectoralStore();

  const [puestoId, setPuestoId] = useState(votante.puestoId);
  const [nombre, setNombre] = useState(votante.nombre);
  const [cedula, setCedula] = useState(votante.cedula);
  const [telefono, setTelefono] = useState(votante.telefono);
  const [direccion, setDireccion] = useState(votante.direccion);
  const [barrio, setBarrio] = useState(votante.barrio);
  const [intencionVoto, setIntencionVoto] = useState<IntencionVoto>(votante.intencionVoto);
  const [liderAsignado, setLiderAsignado] = useState(votante.liderAsignado);
  const [necesitaTransporte, setNecesitaTransporte] = useState(votante.necesitaTransporte);
  const [yaVoto, setYaVoto] = useState(votante.yaVoto);
  const [leaderId, setLeaderId] = useState<string | undefined>(votante.leaderId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lideresDisponibles = actors.filter(a => a.role === 'leader');
  const lideresFiltrados = actorRole === 'candidateSupervisor' && actorId
    ? lideresDisponibles.filter(l => (l as any).supervisorId === actorId)
    : lideresDisponibles;

  useEffect(() => {
    if (!isNewVoterOpen) return;
    if (editingVoter && editingVoter.id === votante.id) {
      setPuestoId(editingVoter.puestoId);
      setNombre(editingVoter.nombre);
      setCedula(editingVoter.cedula);
      setTelefono(editingVoter.telefono);
      setDireccion(editingVoter.direccion);
      setBarrio(editingVoter.barrio);
      setIntencionVoto(editingVoter.intencionVoto);
      setLiderAsignado(editingVoter.liderAsignado);
      setNecesitaTransporte(editingVoter.necesitaTransporte);
      setYaVoto(editingVoter.yaVoto);
      setLeaderId(editingVoter.leaderId);
    }
    setError(null);
  }, [isNewVoterOpen, editingVoter, votante.id]);

  if (!isNewVoterOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !cedula || saving) return;

    setSaving(true);
    setError(null);

    const updates: Partial<VotanteCRM> = {
      puestoId,
      nombre: nombre.trim(),
      cedula: cedula.trim(),
      telefono: telefono || '+57 300 000 0000',
      direccion: direccion || 'Calle principal',
      barrio: barrio || 'Barrio Central',
      intencionVoto,
      liderAsignado: liderAsignado || 'Coordinador Barrial',
      contactado: true,
      necesitaTransporte,
      yaVoto,
      leaderId,
    };

    updateVotante(votante.id, updates)
      .then(() => {})
      .catch(err => {
        setError(err instanceof Error ? err.message : 'No se pudo actualizar el votante.');
        setSaving(false);
      });
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden select-none">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Editar Votante CRM</h3>
          </div>
          <button
            onClick={() => setEditingVoter(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

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

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Nombre y Apellidos</label>
            <input
              type="text"
              placeholder="Ej. María Elena Restrepo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Cédula</label>
              <input
                type="text"
                placeholder="Ej. 52.890.123"
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
                placeholder="+57 312 000 0000"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Barrio / Comuna</label>
              <input
                type="text"
                placeholder="Ej. Santa Bárbara"
                value={barrio}
                onChange={(e) => setBarrio(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Dirección</label>
              <input
                type="text"
                placeholder="Ej. Calle 127 # 15-20"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Semáforo de Intención</label>
              <select
                value={intencionVoto}
                onChange={(e) => setIntencionVoto(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="voto_duro">🟢 Voto Duro (Fidelizado)</option>
                <option value="voto_blando">🔵 Voto Blando (Persuadible)</option>
                <option value="indeciso">🟡 Indeciso</option>
                <option value="opositor">🔴 Opositor</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Líder Responsable (texto)</label>
              <input
                type="text"
                placeholder="Ej. Martha Cárdenas"
                value={liderAsignado}
                onChange={(e) => setLiderAsignado(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {lideresFiltrados.length > 0 && (
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Líder del Sistema (amarrar votante)</label>
                <select
                  value={leaderId || ''}
                  onChange={(e) => setLeaderId(e.target.value || undefined)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Seleccionar líder</option>
                  {lideresFiltrados.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.nombre} ({(l as any).scopeLevel || 'sin territorio'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="pt-1 flex items-center gap-2">
            <input
              type="checkbox"
              id="chk-transporte"
              checked={necesitaTransporte}
              onChange={(e) => setNecesitaTransporte(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-emerald-500 cursor-pointer"
            />
            <label htmlFor="chk-transporte" className="text-slate-300 cursor-pointer">
              ¿Requiere apoyo de transporte para movilización Día D?
            </label>
          </div>

          <div className="pt-1 flex items-center gap-2">
            <input
              type="checkbox"
              id="chk-yavoto"
              checked={yaVoto}
              onChange={(e) => setYaVoto(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-emerald-500 cursor-pointer"
            />
            <label htmlFor="chk-yavoto" className="text-slate-300 cursor-pointer">
              Ya votó (Día D)
            </label>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] leading-relaxed">
              {error}
            </div>
          )}

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingVoter(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!nombre || !cedula || saving}
              icon={<UserPlus className="w-4 h-4" />}
            >
              {saving ? 'Guardando…' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
