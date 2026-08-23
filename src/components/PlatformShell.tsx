import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSiteLabel, type Site } from '../hooks/useSiteAccess';
import { supabase } from '../lib/supabaseClient';
import ContentTab from '../tabs/ContentTab';
import ProjectsTab from '../tabs/ProjectsTab';
import TestimonialsTab from '../tabs/TestimonialsTab';
import ServicesTab from '../tabs/ServicesTab';

type Tab = 'content' | 'projects' | 'testimonials' | 'services';

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-1 pb-3 text-sm font-medium border-b-2 cursor-pointer transition-colors duration-200 ${
        active
          ? 'text-[#D7E2EA] border-[#00F3B6]'
          : 'text-[#D7E2EA]/40 border-transparent hover:text-[#D7E2EA]/70'
      }`}
    >
      {children}
    </button>
  );
}

type Props = {
  session: Session;
  site: Site;
  canSwitchSite: boolean;
  onSwitchSite: () => void;
};

export default function PlatformShell({ session, site, canSwitchSite, onSwitchSite }: Props) {
  const [tab, setTab] = useState<Tab>('content');

  return (
    <div className="min-h-screen bg-[#0C0C0C]">
      <div className="sticky top-0 z-30 border-b border-[#D7E2EA]/10 bg-[#0C0C0C]/95 backdrop-blur-md px-5 sm:px-8 md:px-10">
        <div className="max-w-3xl mx-auto pt-4">
          <div className="flex items-center justify-between pb-4">
            <div>
              <p className="text-[#D7E2EA]/40 text-xs uppercase tracking-widest font-medium">Sitio</p>
              <p className="text-[#D7E2EA] font-bold">{getSiteLabel(site)}</p>
            </div>
            <div className="flex items-center gap-4">
              {canSwitchSite && (
                <button
                  onClick={onSwitchSite}
                  className="text-[#D7E2EA]/50 text-xs hover:text-[#D7E2EA]/80 transition-colors duration-200 cursor-pointer"
                >
                  Cambiar sitio
                </button>
              )}
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-[#D7E2EA]/50 text-xs hover:text-[#D7E2EA]/80 transition-colors duration-200 cursor-pointer"
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          <div className="flex gap-6">
            <TabButton active={tab === 'content'} onClick={() => setTab('content')}>
              Contenido
            </TabButton>
            <TabButton active={tab === 'projects'} onClick={() => setTab('projects')}>
              Proyectos
            </TabButton>
            <TabButton active={tab === 'testimonials'} onClick={() => setTab('testimonials')}>
              Testimonios
            </TabButton>
            <TabButton active={tab === 'services'} onClick={() => setTab('services')}>
              Servicios
            </TabButton>
          </div>
        </div>
      </div>

      {/* Cada pestaña maneja su propio ancho/layout (algunas necesitan
          secciones a todo el ancho de la pantalla), por eso no se envuelve
          acá en un contenedor angosto. `key={site.id}` fuerza a remontar la
          pestaña activa al cambiar de sitio, así no arrastra datos ni
          cambios sin guardar del sitio anterior. */}
      {tab === 'content' && <ContentTab key={site.id} session={session} site={site} />}
      {tab === 'projects' && <ProjectsTab key={site.id} session={session} site={site} />}
      {tab === 'testimonials' && <TestimonialsTab key={site.id} session={session} site={site} />}
      {tab === 'services' && <ServicesTab key={site.id} session={session} site={site} />}
    </div>
  );
}
