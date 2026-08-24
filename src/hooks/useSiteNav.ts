import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Site } from './useSiteAccess';

export type SiteModule = 'projects' | 'testimonials' | 'services' | 'logos';

const MODULE_TABLES: { module: SiteModule; table: string }[] = [
  { module: 'projects', table: 'projects' },
  { module: 'testimonials', table: 'testimonials' },
  { module: 'services', table: 'services' },
  { module: 'logos', table: 'client_logos' },
];

type SiteNavState = {
  loading: boolean;
  error: string | null;
  /** Valores distintos de `fields.page` para este sitio, en el mismo orden
   *  en que llegan de la consulta (ordenada por `page`). */
  pages: string[];
  /** Solo los módulos (projects/testimonials/services/logos) que tienen al menos
   *  una fila para este sitio — así el sidebar no muestra secciones vacías. */
  modules: SiteModule[];
  /** true si el sitio tiene al menos un campo 'seo.*' en `fields` — controla
   *  si el item "SEO" (SeoTab) aparece en el sidebar. Separado de `pages`
   *  porque SEO es su propio grupo de navegación, no un "page" más. */
  hasSeo: boolean;
};

const initialState: SiteNavState = { loading: true, error: null, pages: [], modules: [], hasSeo: false };

/**
 * Resuelve la navegación dinámica del nivel "sitio" del sidebar:
 * - páginas: `SELECT DISTINCT page FROM fields WHERE site_id = site.id`
 *   (deduplicado acá porque postgrest no expone DISTINCT). Cada página lleva
 *   al mismo editor de contenido (ContentTab) — hoy es un único sitio de una
 *   sola página, así que en la práctica esto resuelve a un solo item.
 * - módulos: projects/testimonials/services/logos, filtrados a los que ya tienen
 *   filas para este sitio (un `count` con `head: true`, sin traer filas).
 * - SEO: mismo criterio de presencia (`count` con `head: true`), pero sobre
 *   `fields` filtrado a `field_id LIKE 'seo.%'` — no es una tabla aparte,
 *   son filas de `fields` que ContentTab ya excluye (las edita SeoTab).
 *
 * Asume que el componente que la usa está montado con `key={site.id}` (como
 * hace <SiteLevelShell>), así que `site.id` no cambia durante la vida del
 * hook y no hace falta resetear el estado a mitad de camino.
 */
export function useSiteNav(site: Site): SiteNavState {
  const [state, setState] = useState<SiteNavState>(initialState);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [fieldsResult, seoResult, ...moduleResults] = await Promise.all([
        supabase.from('fields').select('page').eq('site_id', site.id).order('page', { ascending: true }),
        supabase
          .from('fields')
          .select('id', { count: 'exact', head: true })
          .eq('site_id', site.id)
          .like('field_id', 'seo.%'),
        ...MODULE_TABLES.map(({ table }) =>
          supabase.from(table).select('id', { count: 'exact', head: true }).eq('site_id', site.id)
        ),
      ]);

      if (cancelled) return;

      if (fieldsResult.error) {
        setState({ loading: false, error: fieldsResult.error.message, pages: [], modules: [], hasSeo: false });
        return;
      }

      if (seoResult.error) {
        setState({ loading: false, error: seoResult.error.message, pages: [], modules: [], hasSeo: false });
        return;
      }

      const moduleError = moduleResults.find((r) => r.error)?.error;
      if (moduleError) {
        setState({ loading: false, error: moduleError.message, pages: [], modules: [], hasSeo: false });
        return;
      }

      const pages = [
        ...new Set(
          (fieldsResult.data ?? [])
            .map((row) => (row as { page: string | null }).page)
            .filter((page): page is string => Boolean(page))
        ),
      ];

      const modules = MODULE_TABLES.filter((_, i) => (moduleResults[i].count ?? 0) > 0).map((m) => m.module);
      const hasSeo = (seoResult.count ?? 0) > 0;

      setState({ loading: false, error: null, pages, modules, hasSeo });
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [site.id]);

  return state;
}
