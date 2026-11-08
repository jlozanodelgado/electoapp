import { useState } from 'react';
import { useSecurityStore } from '../../store/securityStore';
import { Actor } from '../../types/security';

export const RegisterForm = () => {
  const register = useSecurityStore(state => state.registerUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [role, setRole] = useState<Actor['role']>('voter');
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await register({ email, password, role, nombre });
      setMsg(`Usuario ${result.user?.email || 'desconocido'} creado`);
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 p-4 bg-gray-800 rounded mt-4">
      <input
        type="text"
        placeholder="Nombre completo"
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        required
        className="w-full p-2 border rounded bg-gray-700 text-white"
      />
      <input
        type="email"
        placeholder="correo@ejemplo.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="w-full p-2 border rounded bg-gray-700 text-white"
      />
      <input
        type="password"
        placeholder="contraseña"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        className="w-full p-2 border rounded bg-gray-700 text-white"
      />
      <select
        value={role}
        onChange={e => setRole(e.target.value as Actor['role'])}
        className="w-full p-2 border rounded bg-gray-700 text-white"
      >
        <option value="totalSupervisor">Supervisor total</option>
        <option value="candidateSupervisor">Supervisor candidato</option>
        <option value="leader">Líder</option>
        <option value="witness">Testigo</option>
        <option value="voter">Votante</option>
      </select>
      <button
        type="submit"
        className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded"
      >
        Registrarse
      </button>
      {msg && <p className="mt-2 text-sm text-center">{msg}</p>}
    </form>
  );
};

