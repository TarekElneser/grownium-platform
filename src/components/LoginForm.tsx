import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // Éxito: onAuthStateChange en useSession() actualiza la sesión y
    // App cambia automáticamente a la plataforma.
  }

  return (
    <div className="min-h-screen bg-[#0C0C0C] flex items-center justify-center px-5">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm flex flex-col gap-5 rounded-2xl border border-[#D7E2EA]/15 bg-[#111111] p-8"
      >
        <div>
          <h1 className="text-[#D7E2EA] font-extrabold text-2xl">Grownium</h1>
          <p className="text-[#D7E2EA]/50 font-light text-sm mt-1">
            Inicia sesión para acceder a la plataforma.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[#D7E2EA]/60 uppercase tracking-widest font-medium text-xs">
            Email
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-[#D7E2EA]/5 border border-[#D7E2EA]/15 rounded-xl px-4 py-2.5 text-[#D7E2EA]
              outline-none focus:border-[#00F3B6] transition-colors duration-200"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[#D7E2EA]/60 uppercase tracking-widest font-medium text-xs">
            Contraseña
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-[#D7E2EA]/5 border border-[#D7E2EA]/15 rounded-xl px-4 py-2.5 text-[#D7E2EA]
              outline-none focus:border-[#00F3B6] transition-colors duration-200"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl font-bold text-[#0C0C0C] py-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          style={{ background: 'linear-gradient(180deg, #00FFBF 0%, #00C99A 100%)' }}
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
