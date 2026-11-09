import React, { useState, useEffect } from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { Button } from '../ui/Button';
import { X, User, Building, ImageOff } from 'lucide-react';

export const NewCandidatoModal: React.FC = () => {
  const { candidatos, partidos, addCandidato, setIsNewCandidatoOpen } = useElectoralStore();
  const [partidoId, setPartidoId] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [cedula, setCedula] = useState('');
  const [numeroTarjeton, setNumeroTarjeton] = useState('');
  const [numeroLista, setNumeroLista] = useState('');
  const [cargo, setCargo] = useState('concejal');
  const [departamentoId, setDepartamentoId] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');

  const cargos = [
    { value: 'presidente', label: 'Presidente' },
    { value: 'gobernacion', label: 'Gobernación' },
    { value: 'alcalde', label: 'Alcalde' },
    { value: 'concejal', label: 'Concejal' },
    { value: 'asamblea_departamental', label: 'Asamblea Departamental' },
    { value: 'diputado', label: 'Diputado' },
    { value: 'senador', label: 'Senador' },
    { value: 'representante', label: 'Representante a la Cámara' },
  ];

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

  const [municipioId, setMunicipioId] = useState('');
  const municipiosDisponibles = municipiosPorDepartamento[departamentoId] || [];

  const cargoRequiereMunicipio = cargo === 'concejal' || cargo === 'asamblea_departamental';
  const cargoRequiereLista = cargo === 'concejal' || cargo === 'asamblea_departamental';

  useEffect(() => {
    if (partidos.length > 0 && !partidoId) {
      setPartidoId(partidos[0].id);
    }
  }, [partidos, partidoId]);

  if (!partidos || partidos.length === 0) return null;

  const [keepOpen, setKeepOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !cedula || !partidoId) return;
    if (cargoRequiereMunicipio && !municipioId) return;

    await addCandidato({
      partidoId,
      nombre,
      apellido: apellido || undefined,
      cedula,
      numeroTarjeton: numeroTarjeton || undefined,
      numeroLista: cargoRequiereLista ? (numeroLista || undefined) : undefined,
      cargo,
      departamentoId: departamentoId || undefined,
      municipioId: cargoRequiereMunicipio ? municipioId : undefined,
      fotoUrl: fotoUrl || undefined,
    });

    if (keepOpen) {
      // Limpiar formulario pero mantener modal abierto para crear otro
      setNombre('');
      setApellido('');
      setCedula('');
      setNumeroTarjeton('');
      setNumeroLista('');
      setPartidoId(partidos[0].id);
      setMunicipioId('');
      setFotoUrl('');
    } else {
      setIsNewCandidatoOpen(false);
      setNombre('');
      setApellido('');
      setCedula('');
      setNumeroTarjeton('');
      setNumeroLista('');
      setPartidoId(partidos[0].id);
      setMunicipioId('');
      setFotoUrl('');
    }
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
            onClick={() => setIsNewCandidatoOpen(false)}
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
              {partidos.map((p) => (
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
            <label className="text-slate-400 block mb-1 font-medium">Número de Tarjetón</label>
            <input
              type="text"
              placeholder="Ej. 045"
              value={numeroTarjeton}
              onChange={(e) => setNumeroTarjeton(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {cargoRequiereLista && (
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Número de Lista (Partido)</label>
              <input
                type="text"
                placeholder="Ej. 1"
                value={numeroLista}
                onChange={(e) => setNumeroLista(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">
                Para corporación, todos los candidatos del mismo partido comparten el mismo número de lista.
              </p>
            </div>
          )}

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Cargo</label>
            <select
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              required
            >
              {cargos.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
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
              {departamentos.map((d) => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>
          </div>

          {cargoRequiereMunicipio && (
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Municipio (requerido)</label>
              <select
                value={municipioId}
                onChange={(e) => setMunicipioId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                required
              >
                <option value="">Seleccionar municipio</option>
                {municipiosDisponibles.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Foto del Candidato (opcional)</label>
            <div className="flex items-center gap-3">
              <input
                type="url"
                placeholder="https://ejemplo.com/foto.jpg"
                value={fotoUrl}
                onChange={(e) => setFotoUrl(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-700 bg-slate-800">
                {fotoUrl ? (
                  <img
                    src={fotoUrl}
                    alt={nombre}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <ImageOff className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Si no subes foto, se mostrará una silueta genérica.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={keepOpen}
                  onChange={(e) => setKeepOpen(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Crear otro candidato después</span>
              </label>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewCandidatoOpen(false)}
              className="flex-1"
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
              {keepOpen ? 'Crear Otro' : 'Crear y Salir'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
