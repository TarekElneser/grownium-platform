import type { Session } from '@supabase/supabase-js';
import type { Site } from '../hooks/useSiteAccess';

/** Props comunes a todas las pestañas de la plataforma. */
export type TabProps = {
  session: Session;
  site: Site;
};
