import type { ReactNode } from 'react';

export const inputClass =
  'bg-[#D7E2EA]/5 border border-[#D7E2EA]/15 rounded-xl px-4 py-2.5 text-[#D7E2EA] outline-none ' +
  'focus:border-[#00F3B6] transition-colors duration-200 text-sm w-full';

/** Label + control, mismo estilo en todas las pestañas de la plataforma (Proyectos, Testimonios, Servicios). */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[#D7E2EA]/40 uppercase tracking-widest font-medium text-xs">{label}</label>
      {children}
    </div>
  );
}
