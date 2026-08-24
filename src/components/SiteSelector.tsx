import { getSiteLabel, type Site } from '../hooks/useSiteAccess';

type Props = {
  sites: Site[];
  onSelect: (site: Site) => void;
};

/**
 * Vista "Proyectos" del nivel plataforma del sidebar: la lista de sitios a
 * los que tiene acceso el usuario. Antes era una pantalla propia (dropdown
 * de selección) que se mostraba antes de entrar a <PlatformShell>; ahora es
 * uno de los items del sidebar de nivel plataforma, así que se renderiza
 * como panel de contenido, no como pantalla completa centrada.
 */
export default function SiteSelector({ sites, onSelect }: Props) {
  return (
    <div className="px-5 sm:px-8 md:px-10 py-10 pb-16">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <header>
          <h1 className="text-[#D7E2EA] font-extrabold text-2xl">Proyectos</h1>
          <p className="text-[#D7E2EA]/50 font-light text-sm mt-1">
            Elige un sitio para editar su contenido.
          </p>
        </header>

        <div className="flex flex-col gap-2">
          {sites.map((site) => (
            <button
              key={site.id}
              onClick={() => onSelect(site)}
              className="text-left rounded-xl border border-[#D7E2EA]/15 bg-[#D7E2EA]/5 px-4 py-3 text-[#D7E2EA]
                hover:border-[#00F3B6] transition-colors duration-200 cursor-pointer"
            >
              {getSiteLabel(site)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
