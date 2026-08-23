import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

/**
 * Sesión actual de Supabase Auth.
 * `undefined` mientras se resuelve la sesión inicial, `null` si no hay
 * usuario logueado, o la `Session` si hay uno. Se mantiene sincronizada con
 * login/logout vía `onAuthStateChange`.
 */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return session;
}
