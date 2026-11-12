import React, { useEffect, useState } from 'react';
import { useElectoralStore } from '../../store/electoralStore';
import { Button } from '../ui/Button';
import { X, Flag } from 'lucide-react';

export const NewPartidoModal: React.FC = () => {
  const {
    isNewPartidoOpen,
    setIsNewPartidoOpen,
    addPartido,
    editingPartido,
    updatePartido,
  } = useElectoralStore();
  const [nombre, setNombre] = useState('');
  const [siglas, setSiglas] = useState('');
  const [color, setColor] = useState('#10b981');
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(editingPartido);

  const colores = [
    { value: '#10b981', label: 'Esmeralda' },
    { value: '#3b82f6', label: 'Azul' },
    { value: '#ef4444', label: 'Rojo' },
    { value: '#f59e0b', label: 'Ámbar' },
    { value: '#8b5cf6', label: 'Púrpura' },
    { value: '#f43f5e', label: 'Rosa' },
    { value: '#06b6d4', label: 'Cian' },
    { value: '#84cc16', label: 'Lima' },
  ];

  useEffect(() => {
    if (!isNewPartidoOpen) return;

    if (editingPartido) {
      setNombre(editingPartido.nombre);
      setSiglas(editingPartido.siglas);
      setColor(editingPartido.color || '#10b981');
      setLogoUrl(editingPartido.logoUrl || '');
    } else {
      setNombre('');
      setSiglas('');
      setColor('#10b981');
      setLogoUrl('');
    }
    setError(null);
  }, [isNewPartidoOpen, editingPartido]);

  if (!isNewPartidoOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !siglas || saving) return;

    setSaving(true);
    setError(null);

    const datos = {
      nombre: nombre.trim(),
      siglas: siglas.trim().toUpperCase(),
      color,
      logoUrl: logoUrl.trim() || undefined,
    };

    try {
      if (editingPartido) {
        await updatePartido(editingPartido.id, datos);
      } else {
        await addPartido(datos);
      }
      setIsNewPartidoOpen(false);
    } catch (err) {
      console.error('Error guardando partido:', err);
      setError(err instanceof Error ? err.message : 'No se pudo guardar el partido.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden select-none">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">
              {isEditing ? 'Editar Partido Político' : 'Crear Partido Político'}
            </h3>
          </div>
          <button
            onClick={() => setIsNewPartidoOpen(false)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          <div>
            <label className="text-slate-400 block mb-1 font-medium">Nombre del Partido</label>
            <input
              type="text"
              placeholder="Ej. Coalición Por el Cambio"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Siglas</label>
            <input
              type="text"
              placeholder="Ej. CPC"
              maxLength={10}
              value={siglas}
              onChange={(e) => setSiglas(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Color Identitario</label>
            <div className="flex gap-2">
              {colores.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  style={{ backgroundColor: c.value }}
                  className={`w-9 h-9 rounded-full border-2 cursor-pointer ${
                    color === c.value
                      ? 'ring-2 ring-emerald-400 scale-110'
                      : 'ring-transparent'
                  } border-slate-700 hover:scale-105 transition-transform`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">URL del Logo (opcional)</label>
            <input
              type="url"
              placeholder="https://ejemplo.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            />
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
              onClick={() => setIsNewPartidoOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<Flag className="w-4 h-4" />}
              disabled={!nombre || !siglas || saving}
            >
              {saving ? 'Guardando…' : isEditing ? 'Guardar Cambios' : 'Crear Partido'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
