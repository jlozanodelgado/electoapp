import React, { useEffect, useState } from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { useSecurityStore } from '../../store/securityStore';
import { Actor } from '../../types/security';
import { Candidato } from '../../types/electoral';
import { Partido } from '../../types/electoral';
import { Button } from '../ui/Button';
import { X, User, Shield, MapPin, Building, Users, Flag } from 'lucide-react';

interface Props {
  actor: Actor;
}

type ScopeLevel = 'national' | 'department' | 'municipality';

export const EditActorModal: React.FC<Props> = ({ actor }) => {
  const {
    editingActor,
    setEditingActor,
    partidos,
    candidatos,
    actors,
  } = useElectoralStore();
  const updateActor = useSecurityStore(s => s.updateActor);

  const [nombre, setNombre] = useState(actor.nombre);
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

  const departamentos = [
    { id: 'valle', nombre: 'Valle del Cauca' },
    { id: 'cundinamarca', nombre: 'Cundinamarca / Bogotá D.C.' },
    { id: 'antioquia', nombre: 'Antioquia' },
  ];

  const municipiosPorDepartamento: Record<string, { id: string; nombre: string }[]> = {
    valle: [
      { id: 'tulua', nombre: 'Tuluá' },
      { id: 'cali', nombre: 'Cali' },
      { id: 'buga', nombre: 'Guadalajara de Buga' },
      { id: 'palmira', nombre: 'Palmira' },
    ],
    cundinamarca: [
      { id: 'bogota', nombre: 'Bogotá D.C.' },
      { id: 'soacha', nombre: 'Soacha' },
      { id: 'chía', nombre: 'Chía' },
    ],
    antioquia: [
      { id: 'medellin', nombre: 'Medellín' },
      { id: 'envigado', nombre: 'Envigado' },
      { id: 'itaguí', nombre: 'Itagüí' },
    ],
  };

  const municipiosDisponibles = municipiosPorDepartamento[scopeId] || [];

  // Candidatos y partidos disponibles para dropdowns
  const candidatosDisponibles = candidatos.map(c => {
    const p = partidos.find(p => p.id === c.partidoId);
    return {
      id: c.id,
      nombre: `${c.nombre} ${c.apellido || ''} – ${p?.nombre ?? 'Sin partido'} (${p?.siglas ?? '-'})`,
      partidoId: c.partidoId,
    };
  });

  // Supervisores de candidato disponibles (para amarrar un líder)
  const supervisoresDisponibles = actors.filter(a => a.role === 'candidateSupervisor');

  // Líderes disponibles (para amarrar un testigo o votante)
  const lideresDisponibles = actors.filter(a => a.role === 'leader');

  useEffect(() => {
    if (!editingActor || editingActor.id !== actor.id) return;
    setNombre(editingActor.nombre);
    setRole(editingActor.role);
    setScopeLevel(editingActor.scopeLevel);
    setScopeId(editingActor.scopeId || '');
    setCandidatoId(editingActor.candidatoId || '');
    setSupervisorId(editingActor.supervisorId || '');
    setLeaderId(editingActor.leaderId || '');
    setError(null);
  }, [editingActor, actor.id]);

  // Al cambiar el rol, limpiar campos que no aplican
  useEffect(() => {
    if (role !== 'leader') {
      setSupervisorId('');
    }
    if (role !== 'candidateSupervisor' && role !== 'leader') {
      setCandidatoId('');
    }
    if (role !== 'witness' && role !== 'voter') {
      setLeaderId('');
    }
    if (role === 'totalSupervisor') {
      setScopeLevel('national');
      setScopeId('');
    }
  }, [role]);

  const campoObligatorioFaltante = (): string | null => {
    if (!nombre.trim()) return 'Nombre completo es obligatorio.';
    if (!role) return 'Rol es obligatorio.';

    if (role === 'candidateSupervisor') {
      if (!candidatoId) return 'Debe seleccionar un candidato.';
    }

    if (role === 'leader') {
      if (!scopeLevel || scopeLevel !== 'municipality') return 'El ámbito debe ser Municipio.';
      if (!scopeId) return 'Debe seleccionar un municipio.';
      if (!candidatoId) return 'Debe seleccionar un candidato.';
      if (!supervisorId) return 'Debe seleccionar un supervisor (Supervisor de Candidato).';
    }

    if (role === 'witness') {
      if (!leaderId) return 'Debe seleccionar un líder responsable.';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const falta = campoObligatorioFaltante();
    if (falta) {
      setError(falta);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateActor(actor.id, {
        nombre: nombre.trim(),
        role,
        scopeLevel: role === 'totalSupervisor' ? 'national' : scopeLevel || undefined,
        scopeId: scopeId || undefined,
        candidatoId:
          role === 'candidateSupervisor' || role === 'leader' ? (candidatoId || undefined) : undefined,
        supervisorId: role === 'leader' ? (supervisorId || undefined) : undefined,
        leaderId: (role === 'witness' || role === 'voter') ? (leaderId || undefined) : undefined,
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
              <p className="text-[10px] text-rose-400 mt-1">
                No se puede cambiar el rol del Supervisor Total desde aquí.
              </p>
            )}
          </div>

          {/* Ámbito territorial */}
          {role !== 'totalSupervisor' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Ámbito territorial</label>
                  <select
                    value={scopeLevel || ''}
                    onChange={(e) => {
                      const val = e.target.value as ScopeLevel | '';
                      setScopeLevel(val || undefined);
                      if (val === 'national') setScopeId('');
                      if (val !== 'department') setScopeId('');
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Seleccionar ámbito</option>
                    <option value="national">Nacional</option>
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
                      <option value="">Seleccionar departamento</option>
                      {departamentos.map((d) => (
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
                      <option value="">Seleccionar municipio</option>
                      {municipiosDisponibles.map((m) => (
                        <option key={m.id} value={m.id}>{m.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {role === 'candidateSupervisor' && (
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Candidato asignado *</label>
                  <select
                    value={candidatoId}
                    onChange={(e) => setCandidatoId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Seleccionar candidato</option>
                    {candidatosDisponibles.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {role === 'leader' && (
                <>
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Partido *</label>
                    <select
                      value={candidatosDisponibles.find(c => c.id === candidatoId)?.partidoId || ''}
                      onChange={(e) => {
                        const partido = partidos.find(p => p.id === e.target.value);
                        const cand = candidatosDisponibles.find(c => c.partidoId === e.target.value);
                        setCandidatoId(cand?.id || '');
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Seleccionar partido</option>
                      {partidos.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre} ({p.siglas})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Candidato *</label>
                    <select
                      value={candidatoId}
                      onChange={(e) => setCandidatoId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Seleccionar candidato</option>
                      {candidatosDisponibles.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Supervisor (candidateSupervisor) *</label>
                    <select
                      value={supervisorId}
                      onChange={(e) => setSupervisorId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Seleccionar supervisor</option>
                      {supervisoresDisponibles.map((s) => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {(role === 'witness' || role === 'voter') && (
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">
                    {role === 'witness' ? 'Líder responsable *' : 'Líder responsable (opcional)'}
                  </label>
                  <select
                    value={leaderId}
                    onChange={(e) => setLeaderId(e.target.value || '')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Seleccionar líder</option>
                    {lideresDisponibles.map((l) => (
                      <option key={l.id} value={l.id}>{l.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

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
              disabled={saving || !!campoObligatorioFaltante()}
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
