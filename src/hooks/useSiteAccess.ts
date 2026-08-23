import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export type Site = {
  id: string;
  name?: string | null;
  [key: string]: unknown;
};

/** Texto legible para mostrar un sitio en la UI, sin asumir un único nombre de columna. */
export function getSiteLabel(site: Site): string {
  return (
    (site.name as string | undefined) ||
    (site.domain as string | undefined) ||
    (site.slug as string | undefined) ||
    site.id
  );
}

type SiteAccessState = {
  loading: boolean;
  error: string | null;
  sites: Site[];
  isAdmin: boolean;
};

const initialState: SiteAccessState = {
  loading: true,
  error: null,
  sites: [],
  isAdmin: false,
};

/**
 * Resuelve a qué sitios tiene acceso el usuario logueado:
 * - admin (profiles.role = 'admin'): todos los sitios de `sites`.
 * - cliente: solo los sitios donde tiene una fila en `profile_sites`.
 *
 * Requiere una sesión ya resuelta: se debe llamar solo cuando hay usuario
 * logueado (monta el componente que la usa con `key={session.user.id}` para
 * que el estado se reinicie limpio si cambia de usuario).
 */
export function useSiteAccess(session: Session): SiteAccessState {
  const [state, setState] = useState<SiteAccessState>(initialState);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const userId = session.user.id;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (cancelled) return;

      if (profileError) {
        setState({ loading: false, error: profileError.message, sites: [], isAdmin: false });
        return;
      }

      const isAdmin = profile?.role === 'admin';

      if (isAdmin) {
        const { data, error } = await supabase.from('sites').select('*');
        if (cancelled) return;

        if (error) {
          setState({ loading: false, error: error.message, sites: [], isAdmin: true });
          return;
        }

        const sites = [...(data ?? [])].sort((a, b) =>
          getSiteLabel(a).localeCompare(getSiteLabel(b))
        );
        setState({ loading: false, error: null, sites, isAdmin: true });
        return;
      }

      const { data, error } = await supabase
        .from('profile_sites')
        .select('site:sites(*)')
        .eq('profile_id', userId);

      if (cancelled) return;

      if (error) {
        setState({ loading: false, error: error.message, sites: [], isAdmin: false });
        return;
      }

      const sites = (data ?? [])
        .map((row) => row.site as unknown as Site | null)
        .filter((site): site is Site => Boolean(site))
        .sort((a, b) => getSiteLabel(a).localeCompare(getSiteLabel(b)));

      setState({ loading: false, error: null, sites, isAdmin: false });
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [session]);

  return state;
}
