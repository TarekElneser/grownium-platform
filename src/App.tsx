import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSession } from './hooks/useSession';
import { useSiteAccess } from './hooks/useSiteAccess';
import { supabase } from './lib/supabaseClient';
import LoginForm from './components/LoginForm';
import SiteSelector from './components/SiteSelector';
import PlatformShell from './components/PlatformShell';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0C0C0C] flex items-center justify-center">
      <p className="text-[#D7E2EA]/50">Cargando…</p>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#0C0C0C] flex flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="text-red-400 text-sm max-w-sm">{message}</p>
      <button
        onClick={() => supabase.auth.signOut()}
        className="text-[#D7E2EA]/50 text-xs hover:text-[#D7E2EA]/80 transition-colors duration-200 cursor-pointer"
      >
        Cerrar sesión
      </button>
    </div>
  );
}

/**
 * Todo lo que depende de una sesión ya resuelta. Se monta con
 * `key={session.user.id}` desde <App>, así si cambia el usuario (logout +
 * login con otra cuenta) React la remonta de cero y el sitio elegido no
 * queda pegado de la sesión anterior.
 */
function AuthenticatedApp({ session }: { session: Session }) {
  const { loading, error, sites } = useSiteAccess(session);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} />;
  }

  if (sites.length === 0) {
    return (
      <ErrorScreen message="Tu cuenta no tiene acceso a ningún sitio todavía. Contacta a un administrador." />
    );
  }

  const activeSite =
    sites.find((s) => s.id === selectedSiteId) ?? (sites.length === 1 ? sites[0] : null);

  if (!activeSite) {
    return (
      <SiteSelector
        sites={sites}
        onSelect={(site) => setSelectedSiteId(site.id)}
        onLogout={() => supabase.auth.signOut()}
      />
    );
  }

  return (
    <PlatformShell
      session={session}
      site={activeSite}
      canSwitchSite={sites.length > 1}
      onSwitchSite={() => setSelectedSiteId(null)}
    />
  );
}

export default function App() {
  const session = useSession();

  if (session === undefined) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <LoginForm />;
  }

  return <AuthenticatedApp key={session.user.id} session={session} />;
}
