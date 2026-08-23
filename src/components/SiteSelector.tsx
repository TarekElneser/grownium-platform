import { getSiteLabel, type Site } from '../hooks/useSiteAccess';

type Props = {
  sites: Site[];
  onSelect: (site: Site) => void;
  onLogout: () => void;
};

export default function SiteSelector({ sites, onSelect, onLogout }: Props) {
  return (
    <div className="min-h-screen bg-[#0C0C0C] flex items-center justify-center px-5">
      <div className="w-full max-w-sm flex flex-col gap-5 rounded-2xl border border-[#D7E2EA]/15 bg-[#111111] p-8">
        <div>
          <h1 className="text-[#D7E2EA] font-extrabold text-2xl">Elige un sitio</h1>
          <p className="text-[#D7E2EA]/50 font-light text-sm mt-1">
            Tienes acceso a varios sitios. Selecciona con cuál quieres trabajar.
          </p>
        </div>

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

        <button
          onClick={onLogout}
          className="text-[#D7E2EA]/40 text-xs hover:text-[#D7E2EA]/70 transition-colors duration-200 cursor-pointer self-start"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
