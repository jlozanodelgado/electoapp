import { useState } from 'react';
import { useSecurityStore } from '../../store/securityStore';

export const LoginForm = () => {
  const login = useSecurityStore(state => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = await login(email, password);
    setMsg(user ? `¡Bienvenido ${user.email}!` : 'Credenciales inválidas');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 p-4 bg-gray-800 rounded">
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
      <button
        type="submit"
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded"
      >
        Ingresar
      </button>
      {msg && <p className="mt-2 text-sm text-center">{msg}</p>}
    </form>
  );
};

