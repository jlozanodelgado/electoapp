import React, { useState, useEffect } from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { useSecurityStore } from '../../store/securityStore';
import { Button } from '../ui/Button';
import { X, User, Shield, MapPin, Building, Users, Flag } from 'lucide-react';
import { Partido, Candidato, Departamento, Municipio, Actor } from '../../types/electoral';
type ScopeLevel = 'department' | 'municipality' | 'national';

export const EditActorModal: React.FC<{ actor: any }> = ({ actor }) => {
  const {
    editingActor,
    setEditingActor,
    partidos,
    candidatos,
    actors,
    departamentos,
    municipios,
  } = useElectoralStore();
  const updateActor = useSecurityStore(s => s.updateActor);

  const [nombre, setNombre] = useState(actor?.nombre || '');
  const [role, setRole] = useState<Actor['role']>(actor.role);
  const [scopeLevel, setScopeLevel] = useState<ScopeLevel | undefined>(actor.scopeLevel);
  const [scopeId, setScopeId] = useState(actor.scopeId || '');
  const [candidatoId, setCandidatoId] = useState(actor.candidatoId || '');
  const [supervisorId, setSupervisorId] = useState(actor.supervisorId || '');
  const [leaderId, setLeaderId] = useState(actor.leaderId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleLabels: Record<Actor['role'], string> = {
    totalSupervisor: 'Supervisor Total',
    candidateSupervisor: 'Supervisor de Candidato',
    leader: 'Líder Político',
    witness: 'Testigo Electoral',
    voter: 'Votante CRM',
  };

  const puedeEditarRol = editingActor?.role !== 'totalSupervisor' || actor.role !== 'totalSupervisor';

  // Construir mapa de municipios por departamento
  const municipiosPorDepartamento = React.useMemo(() => {
    const mapa: Record<string, { id: string; nombre: string }[]> = {};
    municipios.forEach((m: any) => {
      if (!mapa[m.departamentoId]) mapa[m.departamentoId] = [];
      mapa[m.departamentoId].push({ id: m.id, nombre: m.nombre });
    });
    return mapa;
  }, [municipios]);

  const municipiosDisponibles = municipiosPorDepartamento[scopeId] || [];

  // Supervisores y líderes disponibles
  const supervisoresDisponibles = actors.filter((a: any) => a.role === 'candidateSupervisor');
  const lideresDisponibles = actors.filter((a: any) => a.role === 'leader');
  const candidatosDisponibles = candidatos;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !role) return;

    setSaving(true);
    setError(null);

    try {
      await updateActor(actor.id, {
        nombre: nombre.trim(),
        role,
        scopeLevel: scopeLevel || undefined,
        scopeId: scopeId || undefined,
        candidatoId: candidatoId || undefined,
        supervisorId: supervisorId || undefined,
        leaderId: leaderId || undefined,
      });
      setEditingActor(null);
    } catch (err) {
      console.error('Error actualizando actor:', err);
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el actor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden select-none">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Editar Actor</h3>
          </div>
          <button
            onClick={() => setEditingActor(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          <div>
            <label className="text-slate-400 block mb-1 font-medium">Nombre completo *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Rol *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Actor['role'])}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              disabled={!puedeEditarRol}
            >
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {!puedeEditarRol && (
              <p className="text-xs text-rose-400 mt-1">
                No se puede cambiar el rol del Supervisor Total desde aquí.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Ámbito territorial</label>
              <select
                value={scopeLevel || ''}
                onChange={(e) => setScopeLevel(e.target.value as ScopeLevel)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Nacional / Sin ámbito</option>
                <option value="department">Departamento</option>
                <option value="municipality">Municipio</option>
              </select>
            </div>
            {scopeLevel === 'department' && (
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Departamento</label>
                <select
                  value={scopeId}
                  onChange={(e) => setScopeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  {departamentos.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
            )}
            {scopeLevel === 'municipality' && (
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Municipio</label>
                <select
                  value={scopeId}
                  onChange={(e) => setScopeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  {municipiosDisponibles.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Candidato asignado (opcional)</label>
            <select
              value={candidatoId}
              onChange={(e) => setCandidatoId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Ninguno</option>
              {candidatosDisponibles.map((c: any) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Supervisor (opcional)</label>
            <select
              value={supervisorId}
              onChange={(e) => setSupervisorId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Ninguno</option>
              {supervisoresDisponibles.map((s: any) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Líder responsable (opcional)</label>
            <select
              value={leaderId}
              onChange={(e) => setLeaderId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Ninguno</option>
              {lideresDisponibles.map((l: any) => (
                <option key={l.id} value={l.id}>{l.nombre}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
              {error}
            </div>
          )}

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingActor(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!nombre || saving}
              icon={<Shield className="w-4 h-4" />}
            >
              {saving ? 'Guardando…' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
