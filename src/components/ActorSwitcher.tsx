import React from 'react';
import { useSecurityStore } from '../store/securityStore';

/**
 * Simple dropdown to switch the active security actor.
 * It reads the list of actors from the security store and sets the
 * currentActorId when the user selects a different option.
 */
export const ActorSwitcher: React.FC = () => {
  const { actors, currentActorId, setCurrentActorId } = useSecurityStore(state => ({
    actors: state.actors,
    currentActorId: state.currentActorId,
    setCurrentActorId: state.setCurrentActorId,
  }));

  return (
    <div className="p-2 bg-gray-800 rounded-md">
      <label className="block text-sm font-medium text-gray-200 mb-1">
        Actor activo
      </label>
      <select
        className="w-full rounded border-gray-600 bg-gray-700 text-white"
        value={currentActorId ?? ''}
        onChange={e => setCurrentActorId(e.target.value || null)}
      >
        <option value="">— Ninguno —</option>
        {actors.map(actor => (
          <option key={actor.id} value={actor.id}>
            {actor.nombre} ({actor.rol})
          </option>
        ))}
      </select>
    </div>
  );
};

