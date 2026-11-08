import { useState } from 'react';
import { useSecurityStore } from '../../store/securityStore';

export const LoginForm = () => {
  const login = useSecurityStore(state => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const user = await login(email, password);
      if (user) {
        const nombre = (user.user_metadata?.full_name as string) || email.split('@')[0];
        setMsg(`¡Bienvenido ${nombre}!`);
        // currentActorId is now set → App will re‑render and show the main UI
      } else {
        setMsg('Credenciales inválidas. Verifica tu correo y contraseña.');
      }
    } catch {
      setMsg('Error al intentar ingresar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
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
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded"
      >
        {loading ? 'Ingresando…' : 'Ingresar'}
      </button>
      {msg && <p className="mt-2 text-sm text-center">{msg}</p>}
    </form>
  );
};
