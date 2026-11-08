import React, { useState, useEffect } from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { Button } from '../ui/Button';
import { X, User, Building } from 'lucide-react';

export const NewCandidatoModal: React.FC = () => {
  const { candidatos, partidos, addCandidato, setIsNewWitnessOpen } = useElectoralStore();
  const [partidoId, setPartidoId] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [cedula, setCedula] = useState('');
  const [cargo, setCargo] = useState('concejal');
  const [departamentoId, setDepartamentoId] = useState('');

  const cargos = [
    { value: 'presidente', label: 'Presidente' },
    { value: 'alcalde', label: 'Alcalde' },
    { value: 'concejal', label: 'Concejal' },
    { value: 'diputado', label: 'Diputado' },
    { value: 'senador', label: 'Senador' },
    { value: 'representante', label: 'Representante a la Cámara' },
  ];

  const departamentos = [
    { id: 'valle', nombre: 'Valle del Cauca' },
    { id: 'cundinamarca', nombre: 'Cundinamarca / Bogotá' },
    { id: 'antioquia', nombre: 'Antioquia' },
  ];

  useEffect(() => {
    if (partidos.length > 0 && !partidoId) {
      setPartidoId(partidos[0].id);
    }
  }, [partidos, partidoId]);

  if (!partidos || partidos.length === 0) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !cedula || !partidoId) return;

    addCandidato({
      partidoId,
      nombre,
      apellido: apellido || undefined,
      cedula,
      cargo,
      departamentoId: departamentoId || undefined,
    });

    setIsNewWitnessOpen(false);
    setNombre('');
    setApellido('');
    setCedula('');
    setPartidoId(partidos[0].id);
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden select-none">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white text-sm">Registrar Candidato</h3>
          </div>
          <button
            onClick={() => setIsNewWitnessOpen(false)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          <div>
            <label className="text-slate-400 block mb-1 font-medium">Partido Político</label>
            <select
              value={partidoId}
              onChange={(e) => setPartidoId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              required
            >
              {partidos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.siglas})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Nombres</label>
              <input
                type="text"
                placeholder="Ej. Juan Carlos"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Apellidos</label>
              <input
                type="text"
                placeholder="Ej. Pérez Gómez"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Cédula de Ciudadanía</label>
            <input
              type="text"
              placeholder="Ej. 1.234.567"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Cargo</label>
            <select
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              required
            >
              {cargos.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Departamento (opcional)</label>
            <select
              value={departamentoId}
              onChange={(e) => setDepartamentoId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Nacional / Todos</option>
              {departamentos.map(d => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
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
              icon={<Building className="w-4 h-4" />}
              disabled={!nombre || !cedula || !partidoId}
            >
              Registrar Candidato
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
