import { useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  ArrowLeft,
  Briefcase,
  FileText,
  Images,
  LayoutDashboard,
  LayoutGrid,
  Layers,
  LogOut,
  MessageSquareQuote,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { getSiteLabel, type Site } from '../hooks/useSiteAccess';
import { useSiteNav, type SiteModule } from '../hooks/useSiteNav';
import { supabase } from '../lib/supabaseClient';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import SiteSelector from './SiteSelector';
import ContentTab from '../tabs/ContentTab';
import ProjectsTab from '../tabs/ProjectsTab';
import TestimonialsTab from '../tabs/TestimonialsTab';
import ServicesTab from '../tabs/ServicesTab';
import LogosTab from '../tabs/LogosTab';
import SeoTab from '../tabs/SeoTab';

type PlatformTab = 'dashboard' | 'projects' | 'config' | 'roles';

type SiteNavItem = { kind: 'page'; page: string } | { kind: 'module'; module: SiteModule } | { kind: 'seo' };

const PLATFORM_TABS: { tab: PlatformTab; label: string; icon: LucideIcon }[] = [
  { tab: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { tab: 'projects', label: 'Proyectos', icon: LayoutGrid },
  { tab: 'config', label: 'Configuración', icon: Settings },
  { tab: 'roles', label: 'Roles', icon: Users },
];

const MODULE_LABELS: Record<SiteModule, string> = {
  projects: 'Proyectos',
  testimonials: 'Testimonios',
  services: 'Servicios',
  logos: 'Logos',
};

const MODULE_ICONS: Record<SiteModule, LucideIcon> = {
  projects: Briefcase,
  testimonials: MessageSquareQuote,
  services: Layers,
  logos: Images,
};

function pageLabel(page: string): string {
  const spaced = page.replace(/[_-]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/* ------------------------------- header ------------------------------- */

/**
 * Header global, a todo el ancho, por encima de ambos niveles del sidebar
 * (no vive dentro de ninguno de los dos). El logo es un placeholder por
 * ahora — cuadrito redondeado en el verde de marca con la 'G' — y siempre
 * lleva de vuelta a "Proyectos" del nivel plataforma, sin importar en qué
 * nivel/pestaña se esté parado.
 */
function Header({ session, onLogoClick }: { session: Session; onLogoClick: () => void }) {
  return (
    // `h-12` (48px) explícito — las barras inferiores fijas de
    // guardado (ContentTab, SeoTab) usan la misma altura a propósito.
    <header className="h-12 flex-shrink-0 flex items-center justify-between gap-4 border-b border-border bg-background px-4">
      <button
        onClick={onLogoClick}
        title="Ir a Proyectos"
        className="flex items-center gap-2 cursor-pointer group"
      >
        <span className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs flex-shrink-0">
          G
        </span>
        <span className="text-foreground text-sm font-medium group-hover:text-foreground/80 transition-colors duration-200">
          Grownium
        </span>
      </button>

      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-muted-foreground">{session.user.email}</span>
        <button
          onClick={() => supabase.auth.signOut()}
          title="Cerrar sesión"
          className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200 cursor-pointer"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}

/* ---------- piezas de sidebar compartidas por ambos niveles ---------- */
//
// El padding horizontal vive en cada item (SidebarButton, SidebarHeading) y
// nunca en el <nav> que los contiene, así los divisores (`border-t` sueltos
// entre grupos) quedan de punta a punta, sin que el padding del contenedor
// los corte.

/** Envuelve un control del sidebar con su tooltip — solo cuando `show` es
 *  true (el sidebar está colapsado y el ícono queda solo, sin texto al
 *  lado). Expandido, el label ya es visible como texto, así que el tooltip
 *  sería redundante — no se renderiza en absoluto. */
function SidebarTooltip({ label, show, children }: { label: string; show: boolean; children: ReactNode }) {
  if (!show) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function Sidebar({
  collapsed,
  onToggleCollapsed,
  children,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  children: ReactNode;
}) {
  return (
    <aside
      className={`${collapsed ? 'w-14' : 'w-52'} flex-shrink-0 h-full overflow-y-auto border-r border-border bg-background flex flex-col transition-[width] duration-200`}
    >
      {children}

      <div className="mt-auto border-t border-border p-2">
        <SidebarTooltip label={collapsed ? 'Expandir barra' : 'Colapsar barra'} show={collapsed}>
          <button
            onClick={onToggleCollapsed}
            className="w-full flex items-center justify-end px-2 py-2 rounded-lg text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors duration-200 cursor-pointer"
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </SidebarTooltip>
      </div>
    </aside>
  );
}

function SidebarHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="px-3 pt-4 pb-2">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
      <p className="text-foreground text-sm font-semibold mt-0.5 truncate">{title}</p>
    </div>
  );
}

function SidebarButton({
  active,
  onClick,
  icon: Icon,
  collapsed,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  collapsed: boolean;
  children: string;
}) {
  return (
    <SidebarTooltip label={children} show={collapsed}>
      <button
        onClick={onClick}
        className={`flex items-center gap-2.5 mx-2 py-2 rounded-lg text-sm cursor-pointer transition-colors duration-200 ${
          collapsed ? 'justify-center px-0' : 'px-2.5'
        } ${
          active
            ? 'bg-accent text-foreground font-medium'
            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
        }`}
      >
        <Icon size={16} className={`flex-shrink-0 ${active ? 'text-primary' : ''}`} />
        {!collapsed && children}
      </button>
    </SidebarTooltip>
  );
}

function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center px-5 py-24">
      <div className="text-center">
        <h1 className="text-foreground font-extrabold text-2xl">{title}</h1>
        <p className="text-muted-foreground font-light text-sm mt-2">Próximamente.</p>
      </div>
    </div>
  );
}

/* ---------------------- nivel plataforma ---------------------- */

function PlatformLevelShell({
  sites,
  tab,
  onTabChange,
  onSelectSite,
  collapsed,
  onToggleCollapsed,
}: {
  sites: Site[];
  tab: PlatformTab;
  onTabChange: (tab: PlatformTab) => void;
  onSelectSite: (site: Site) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  return (
    <>
      <Sidebar collapsed={collapsed} onToggleCollapsed={onToggleCollapsed}>
        <nav className="flex flex-col gap-1 py-3">
          {PLATFORM_TABS.map(({ tab: t, label, icon }) => (
            <SidebarButton key={t} active={tab === t} icon={icon} collapsed={collapsed} onClick={() => onTabChange(t)}>
              {label}
            </SidebarButton>
          ))}
        </nav>
      </Sidebar>

      <main className="flex-1 min-w-0 overflow-y-auto">
        {tab === 'dashboard' && <PlaceholderView title="Dashboard" />}
        {tab === 'projects' && <SiteSelector sites={sites} onSelect={onSelectSite} />}
        {tab === 'config' && <PlaceholderView title="Configuración" />}
        {tab === 'roles' && <PlaceholderView title="Roles" />}
      </main>
    </>
  );
}

/* ------------------------- nivel sitio ------------------------- */

function SiteLevelShell({
  session,
  site,
  onBack,
  collapsed,
  onToggleCollapsed,
}: {
  session: Session;
  site: Site;
  onBack: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const { loading, error, pages, modules, hasSeo } = useSiteNav(site);

  // `activeItem` es lo que el usuario eligió explícitamente haciendo click.
  // Mientras sea null (nada elegido todavía, o la navegación recién está
  // cargando), se usa `defaultItem` — el primer item disponible (páginas,
  // si no hay módulos, si no hay SEO como último recurso — es la sección
  // más técnica/especializada) — calculado en el render en vez de en un
  // efecto, para no encadenar un setState extra apenas llegan los datos.
  const [activeItem, setActiveItem] = useState<SiteNavItem | null>(null);
  const defaultItem: SiteNavItem | null =
    pages.length > 0
      ? { kind: 'page', page: pages[0] }
      : modules.length > 0
        ? { kind: 'module', module: modules[0] }
        : hasSeo
          ? { kind: 'seo' }
          : null;
  const effectiveItem = activeItem ?? defaultItem;

  return (
    <>
      <Sidebar collapsed={collapsed} onToggleCollapsed={onToggleCollapsed}>
        <div className="px-2 py-3">
          <SidebarTooltip label="Volver a Proyectos" show={collapsed}>
            <button
              onClick={onBack}
              className={`flex items-center gap-1.5 rounded-lg text-muted-foreground text-xs hover:text-foreground hover:bg-accent/60 transition-colors duration-200 cursor-pointer ${
                collapsed ? 'w-full justify-center py-1.5' : 'px-2 py-1.5'
              }`}
            >
              <ArrowLeft size={14} />
              {!collapsed && 'Volver'}
            </button>
          </SidebarTooltip>
        </div>

        {/* Separa "Volver" de la sección "Sitio" de abajo — de punta a
            punta, es hijo directo de <aside> (sin padding propio). */}
        <div className="border-t border-border" />

        {!collapsed && <SidebarHeading eyebrow="Sitio" title={getSiteLabel(site)} />}

        <nav className="flex flex-col gap-1 py-2">
          {loading && !collapsed && <p className="px-4 py-2 text-muted-foreground text-xs">Cargando navegación…</p>}
          {error && !collapsed && <p className="px-4 py-2 text-destructive text-xs">{error}</p>}
          {!loading && !error && !collapsed && pages.length === 0 && modules.length === 0 && !hasSeo && (
            <p className="px-4 py-2 text-muted-foreground text-xs">Este sitio todavía no tiene contenido.</p>
          )}

          {pages.map((page) => (
            <SidebarButton
              key={`page:${page}`}
              icon={FileText}
              collapsed={collapsed}
              active={effectiveItem?.kind === 'page' && effectiveItem.page === page}
              onClick={() => setActiveItem({ kind: 'page', page })}
            >
              {pageLabel(page)}
            </SidebarButton>
          ))}

          {pages.length > 0 && modules.length > 0 && <div className="border-t border-border my-2" />}

          {modules.map((module) => (
            <SidebarButton
              key={`module:${module}`}
              icon={MODULE_ICONS[module]}
              collapsed={collapsed}
              active={effectiveItem?.kind === 'module' && effectiveItem.module === module}
              onClick={() => setActiveItem({ kind: 'module', module })}
            >
              {MODULE_LABELS[module]}
            </SidebarButton>
          ))}

          {/* Divisor + "SEO" — grupo propio, aparte del resto de módulos de
              contenido (más técnico: metadatos para buscadores/redes). */}
          {hasSeo && (
            <>
              <div className="border-t border-border my-2" />
              <SidebarButton
                icon={Search}
                collapsed={collapsed}
                active={effectiveItem?.kind === 'seo'}
                onClick={() => setActiveItem({ kind: 'seo' })}
              >
                SEO
              </SidebarButton>
            </>
          )}
        </nav>
      </Sidebar>

      <main className="flex-1 min-w-0 overflow-y-auto">
        {effectiveItem?.kind === 'page' && <ContentTab session={session} site={site} />}
        {effectiveItem?.kind === 'module' && effectiveItem.module === 'projects' && (
          <ProjectsTab session={session} site={site} />
        )}
        {effectiveItem?.kind === 'module' && effectiveItem.module === 'testimonials' && (
          <TestimonialsTab session={session} site={site} />
        )}
        {effectiveItem?.kind === 'module' && effectiveItem.module === 'services' && (
          <ServicesTab session={session} site={site} />
        )}
        {effectiveItem?.kind === 'module' && effectiveItem.module === 'logos' && (
          <LogosTab session={session} site={site} />
        )}
        {effectiveItem?.kind === 'seo' && <SeoTab session={session} site={site} />}
      </main>
    </>
  );
}

/* ---------------------------- shell ---------------------------- */

type Props = {
  session: Session;
  sites: Site[];
};

export default function PlatformShell({ session, sites }: Props) {
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [platformTab, setPlatformTab] = useState<PlatformTab>('projects');
  // Colapsado del sidebar — mismo estado para ambos niveles, así no se
  // reabre solo por entrar/salir de un sitio.
  const [collapsed, setCollapsed] = useState(false);

  function goToProjects() {
    setSelectedSite(null);
    setPlatformTab('projects');
  }

  return (
    <TooltipProvider delayDuration={200}>
      {/* `h-screen` + `flex-col`: el header ocupa su alto natural y la fila
          de abajo (sidebar + contenido) se lleva el resto (`flex-1
          min-h-0`). Así el sidebar (`h-full` dentro de esa fila) llega solo
          hasta el borde inferior de la pantalla, nunca por detrás del
          header. */}
      <div className="h-screen flex flex-col bg-background">
        <Header session={session} onLogoClick={goToProjects} />

        <div className="flex-1 flex min-h-0">
          {selectedSite ? (
            // `key={selectedSite.id}` remonta todo el nivel sitio (sidebar +
            // contenido) al cambiar de sitio: no arrastra datos ni cambios
            // sin guardar del sitio anterior.
            <SiteLevelShell
              key={selectedSite.id}
              session={session}
              site={selectedSite}
              onBack={() => setSelectedSite(null)}
              collapsed={collapsed}
              onToggleCollapsed={() => setCollapsed((c) => !c)}
            />
          ) : (
            <PlatformLevelShell
              sites={sites}
              tab={platformTab}
              onTabChange={setPlatformTab}
              onSelectSite={setSelectedSite}
              collapsed={collapsed}
              onToggleCollapsed={() => setCollapsed((c) => !c)}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
