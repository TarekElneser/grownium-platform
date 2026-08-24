import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import ImageUploadField from '../components/ImageUploadField';
import type { TabProps } from './types';

interface FieldRow {
  id: string;
  field_id: string;
  value: string;
  type: string;
}

// Orden de secciones = orden en que aparecen en la página del sitio, para
// que el panel se recorra en el mismo orden que el sitio real.
// Nota: 'agency' (AgencyDifferencesSection) no está incluido en la página
// hoy — el componente existe pero no se renderiza en ninguna ruta — así que
// no tiene una posición real. Se deja al final, marcado en su label.
const SECTION_ORDER = [
  'hero', 'marquee', 'about', 'expectativas', 'differentiators',
  'services', 'projects', 'testimonials', 'results', 'process',
  'cta', 'calendly', 'contact', 'footer', 'agency',
];

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero',
  marquee: 'Marquee de logos',
  about: 'Sobre nosotros',
  expectativas: 'Expectativas',
  differentiators: 'Diferenciadores',
  services: 'Servicios',
  projects: 'Proyectos',
  testimonials: 'Testimonios',
  results: 'Resultados',
  process: 'Proceso',
  cta: 'Banda CTA',
  calendly: 'Calendly',
  contact: 'Formulario de contacto',
  footer: 'Footer',
  agency: 'Diferencias vs. agencias (sección no usada en la página)',
};

// Etiqueta humana de cada campo — se muestra como "<etiqueta> (<field_id>)".
// Si un field_id nuevo no está acá, se usa el field_id solo (ver fieldLabel).
const FIELD_LABELS: Record<string, string> = {
  'hero.badge': 'Etiqueta superior',
  'hero.title': 'Título principal',
  'hero.paragraph': 'Párrafo de introducción',
  'hero.ctaPrimary': 'Texto del botón principal',
  'hero.ctaSecondary': 'Texto del link secundario',

  'marquee.title': 'Texto sobre el carrusel de logos',

  'about.badge': 'Etiqueta',
  'about.title': 'Título',
  'about.paragraph': 'Párrafo',
  'about.ctaButton': 'Texto del botón',

  'expectativas.badge': 'Etiqueta',
  'expectativas.title': 'Título',
  'expectativas.paragraph': 'Párrafo',
  'expectativas.ctaButton': 'Texto del botón',

  'differentiators.badge': 'Etiqueta',
  'differentiators.title': 'Título',
  'differentiators.ctaButton': 'Texto del botón',

  'agency.title': 'Título',
  'agency.ctaButton': 'Texto del botón',

  'services.badge': 'Etiqueta',
  'services.paragraph': 'Párrafo',

  'projects.badge': 'Etiqueta',
  'projects.title': 'Título',
  'projects.paragraph': 'Párrafo',
  'projects.viralizando.image': 'Foto — Viralizando Academy',
  'projects.gremca.image': 'Foto — Gremca',
  'projects.mia.image': 'Foto — Mia Lighting',
  'projects.lbj.image': 'Foto — Lyndon B. Johnson School',
  'projects.proteins.image': 'Foto — Perfect Ten Proteins',
  'projects.stefano.image': 'Foto — Dr. Stefano Serrano',
  'projects.casacuadrada.image': 'Foto — Galería Casa Cuadrada',
  'projects.total.image': 'Foto — Total Tools',

  'testimonials.badge': 'Etiqueta',
  'testimonials.title': 'Título',
  'testimonials.paragraph': 'Párrafo',

  'results.badge': 'Etiqueta',
  'results.title': 'Título',
  'results.paragraph': 'Párrafo',
  'results.ctaButton': 'Texto del botón',

  'process.badge': 'Etiqueta',
  'process.title': 'Título',
  'process.paragraph': 'Párrafo',

  'cta.badge': 'Etiqueta',
  'cta.title': 'Título',
  'cta.paragraph': 'Párrafo',
  'cta.ctaButton': 'Texto del botón',

  'contact.badge': 'Etiqueta',
  'contact.title': 'Título',
  'contact.paragraph': 'Párrafo',
  'contact.submitButton': 'Texto del botón de enviar',

  'calendly.badge': 'Etiqueta',
  'calendly.title': 'Título',
  'calendly.paragraph': 'Párrafo',

  'footer.tagline': 'Frase junto al logo',
  'footer.bottomTagline': 'Frase final (pie de página)',
};

// Etiqueta HTML real que envuelve cada campo de TEXTO hoy — verificada
// contra el JSX de cada sección, no asumida por el nombre del campo.
// Los 8 campos type='image' (projects.<slug>.image) no tienen entrada acá
// a propósito: no son texto, no aplica.
//
// 'texto' = envuelto en un elemento sin significado semántico propio (hoy,
// siempre un <span> de badge) — para no inventarle un nivel de heading que
// no existe en el código. 'a' = los botones/CTA en realidad son links
// (<ContactButton> y el link secundario del hero renderizan <a>, nunca
// <button>) — solo contact.submitButton es un <button> de verdad.
//
// Nota aparte: differentiators.title usa <AnimatedText>, cuyo elemento raíz
// es <p> — visualmente se ve como un heading (grande, bold) pero en el DOM
// no es ningún h1-h6. Se reporta tal cual está en el código.
const FIELD_TAGS: Record<string, string> = {
  'hero.badge': 'texto',
  'hero.title': 'h1',
  'hero.paragraph': 'p',
  'hero.ctaPrimary': 'a',
  'hero.ctaSecondary': 'a',

  'marquee.title': 'p',

  'about.badge': 'texto',
  'about.title': 'h2',
  'about.paragraph': 'p',
  'about.ctaButton': 'a',

  'expectativas.badge': 'texto',
  'expectativas.title': 'h2',
  'expectativas.paragraph': 'p',
  'expectativas.ctaButton': 'a',

  'differentiators.badge': 'texto',
  'differentiators.title': 'p',
  'differentiators.ctaButton': 'a',

  'agency.title': 'h2',
  'agency.ctaButton': 'a',

  'services.badge': 'texto',
  'services.paragraph': 'p',

  'projects.badge': 'texto',
  'projects.title': 'h2',
  'projects.paragraph': 'p',

  'testimonials.badge': 'texto',
  'testimonials.title': 'h2',
  'testimonials.paragraph': 'p',

  'results.badge': 'texto',
  'results.title': 'h2',
  'results.paragraph': 'p',
  'results.ctaButton': 'a',

  'process.badge': 'texto',
  'process.title': 'h2',
  'process.paragraph': 'p',

  'cta.badge': 'texto',
  'cta.title': 'h2',
  'cta.paragraph': 'p',
  'cta.ctaButton': 'a',

  'contact.badge': 'texto',
  'contact.title': 'h2',
  'contact.paragraph': 'p',
  'contact.submitButton': 'button',

  'calendly.badge': 'texto',
  'calendly.title': 'h2',
  'calendly.paragraph': 'p',

  'footer.tagline': 'p',
  'footer.bottomTagline': 'p',
};

// Qué campos de texto son en realidad la etiqueta de un botón, y de qué
// variante — verificado contra el JSX de cada sección en el sitio (mismo
// criterio que FIELD_TAGS): 'primary' = <ContactButton> sin variant (o el
// submit del formulario, con el mismo estilo verde relleno); 'secondary' =
// <ContactButton variant="secondary"> o el link con borde del hero. No
// coincide 1:1 con isCtaField() de abajo: ese helper solo mira el nombre
// del campo (para el divisor visual) y a propósito deja afuera
// contact.submitButton, que acá sí cuenta porque también es un botón.
const FIELD_CTA_VARIANT: Record<string, 'primary' | 'secondary'> = {
  'hero.ctaPrimary': 'primary',
  'hero.ctaSecondary': 'secondary',
  'about.ctaButton': 'primary',
  'expectativas.ctaButton': 'secondary',
  'differentiators.ctaButton': 'primary',
  'agency.ctaButton': 'primary',
  'results.ctaButton': 'primary',
  'cta.ctaButton': 'primary',
  'contact.submitButton': 'primary',
};

// Badge que se superpone adentro, a la derecha, de los inputs que son
// etiquetas de botón — para que quede claro de un vistazo si ese texto va
// en el botón principal (verde) o secundario (gris) del sitio real.
function CtaVariantBadge({ variant }: { variant: 'primary' | 'secondary' }) {
  return (
    <span
      className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        variant === 'primary' ? 'bg-primary text-primary-foreground' : 'bg-neutral-500 text-white'
      }`}
    >
      {variant === 'primary' ? 'Principal' : 'Secundario'}
    </span>
  );
}

// El field_id (y el tag HTML entre paréntesis) es un identificador técnico,
// no prosa — va en JetBrains Mono, igual que el resto de "datos técnicos"
// de la interfaz.
function FieldLabel({ fieldId }: { fieldId: string }) {
  const human = FIELD_LABELS[fieldId];
  const tag = FIELD_TAGS[fieldId];

  if (!human) {
    return <span className="font-mono">{fieldId}</span>;
  }

  return (
    <>
      {human} <span className="font-mono">({fieldId}{tag ? ` · ${tag}` : ''})</span>
    </>
  );
}

// Campos "botón/CTA" — cualquier field_id cuyo nombre de campo (después de
// la sección) contenga 'cta' (ctaPrimary, ctaSecondary, ctaButton). Se usa
// para dibujar el divisor chico que separa "contenido" de "botón de acción"
// dentro de una misma sección.
// Nota: contact.submitButton queda fuera de este criterio a propósito — no
// tiene 'cta' en el nombre, aunque también es un botón de acción. Avisar si
// se quiere que también lleve el divisor.
function isCtaField(fieldId: string): boolean {
  const [, ...rest] = fieldId.split('.');
  return rest.join('.').toLowerCase().includes('cta');
}

// Orden real de aparición de cada campo dentro de su sección (de arriba
// hacia abajo en el JSX / DOM), el mismo criterio que SECTION_ORDER pero a
// nivel de campo individual.
const FIELD_ORDER = [
  'hero.badge', 'hero.title', 'hero.paragraph', 'hero.ctaPrimary', 'hero.ctaSecondary',
  'marquee.title',
  'about.badge', 'about.title', 'about.paragraph', 'about.ctaButton',
  'expectativas.badge', 'expectativas.title', 'expectativas.paragraph', 'expectativas.ctaButton',
  'differentiators.badge', 'differentiators.title', 'differentiators.ctaButton',
  'services.badge', 'services.paragraph',
  'projects.badge', 'projects.title', 'projects.paragraph',
  'projects.viralizando.image', 'projects.gremca.image', 'projects.mia.image', 'projects.lbj.image',
  'projects.proteins.image', 'projects.stefano.image', 'projects.casacuadrada.image', 'projects.total.image',
  'testimonials.badge', 'testimonials.title', 'testimonials.paragraph',
  'results.badge', 'results.title', 'results.paragraph', 'results.ctaButton',
  'process.badge', 'process.title', 'process.paragraph',
  'cta.badge', 'cta.title', 'cta.paragraph', 'cta.ctaButton',
  'calendly.badge', 'calendly.title', 'calendly.paragraph',
  'contact.badge', 'contact.title', 'contact.paragraph', 'contact.submitButton',
  'footer.tagline', 'footer.bottomTagline',
  'agency.title', 'agency.ctaButton',
];

function sectionOf(fieldId: string): string {
  return fieldId.split('.')[0] ?? fieldId;
}

function fieldOrderIndex(fieldId: string): number {
  const idx = FIELD_ORDER.indexOf(fieldId);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

export default function ContentTab({ session, site }: TabProps) {
  const [rows, setRows] = useState<FieldRow[] | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('fields')
      .select('id, field_id, value, default_value, type')
      .eq('site_id', site.id)
      // Los campos 'seo.*' se editan aparte, en SeoTab — ya no aparecen acá.
      .not('field_id', 'like', 'seo.%')
      .order('field_id')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setLoadError(error.message);
          return;
        }
        const loaded: FieldRow[] = (data ?? []).map((r) => ({
          id: r.id,
          field_id: r.field_id,
          value: r.value ?? r.default_value ?? '',
          type: r.type,
        }));
        setRows(loaded);
        setEdits(Object.fromEntries(loaded.map((r) => [r.id, r.value])));
      });

    return () => {
      cancelled = true;
    };
  }, [site.id]);

  const grouped = useMemo(() => {
    if (!rows) return [];
    const bySection = new Map<string, FieldRow[]>();
    for (const row of rows) {
      const section = sectionOf(row.field_id);
      if (!bySection.has(section)) bySection.set(section, []);
      bySection.get(section)!.push(row);
    }
    const orderedSections = [
      ...SECTION_ORDER.filter((s) => bySection.has(s)),
      ...[...bySection.keys()].filter((s) => !SECTION_ORDER.includes(s)).sort(),
    ];
    return orderedSections.map((section) => {
      const fields = [...bySection.get(section)!].sort((a, b) => {
        // 1) texto antes que imagen
        if (a.type !== b.type) return a.type === 'image' ? 1 : -1;
        // 2) dentro del mismo tipo, orden real de aparición en la página
        return fieldOrderIndex(a.field_id) - fieldOrderIndex(b.field_id);
      });
      return {
        section,
        label: SECTION_LABELS[section] ?? section,
        fields,
      };
    });
  }, [rows]);

  const dirtyRows = useMemo(
    () => (rows ?? []).filter((r) => edits[r.id] !== r.value),
    [rows, edits]
  );

  async function handleSave() {
    if (!rows || dirtyRows.length === 0) return;
    setSaving(true);
    setMessage(null);

    try {
      const changedByEmail = session.user.email ?? session.user.id;
      const now = new Date().toISOString();

      // 1) Actualizar solo los campos que cambiaron.
      const updateResults = await Promise.all(
        dirtyRows.map((row) =>
          supabase
            .from('fields')
            .update({ value: edits[row.id], updated_at: now, updated_by: changedByEmail })
            .eq('id', row.id)
        )
      );
      const updateError = updateResults.find((r) => r.error)?.error;
      if (updateError) throw updateError;

      // 2) Registrar el historial (valor viejo -> nuevo) de cada campo modificado.
      const historyPayload = dirtyRows.map((row) => ({
        field_id: row.id,
        old_value: row.value,
        new_value: edits[row.id],
        changed_by: changedByEmail,
      }));
      const { error: historyError } = await supabase.from('field_history').insert(historyPayload);
      if (historyError) throw historyError;

      // Los valores guardados pasan a ser los nuevos "originales" (deja de estar dirty).
      setRows((prev) =>
        (prev ?? []).map((r) =>
          dirtyRows.some((d) => d.id === r.id) ? { ...r, value: edits[r.id] } : r
        )
      );
      setMessage({ type: 'success', text: `✓ ${dirtyRows.length} campo(s) guardado(s) correctamente.` });
    } catch (err) {
      setMessage({
        type: 'error',
        text: `Error al guardar: ${err instanceof Error ? err.message : 'error desconocido'}`,
      });
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center px-5 py-20">
        <p className="text-red-400">Error cargando los campos: {loadError}</p>
      </div>
    );
  }

  if (!rows) {
    return (
      <div className="flex items-center justify-center px-5 py-20">
        <p className="text-[#D7E2EA]/50">Cargando campos…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-3xl mx-auto px-5 sm:px-8 md:px-10 pt-10">
        <header className="pb-10">
          <h1 className="text-[#D7E2EA] font-extrabold text-2xl">Editar contenido</h1>
          <p className="text-[#D7E2EA]/50 font-light text-sm mt-1">
            Conectado como {session.user.email}
          </p>
        </header>
      </div>

      {grouped.map(({ section, label, fields }, sectionIndex) => (
        <div key={section}>
          {/* Divisor grande — todo el ancho de la pantalla, entre secciones */}
          {sectionIndex > 0 && <div className="border-t border-[#D7E2EA]/10" />}

          <div className="max-w-3xl mx-auto px-5 sm:px-8 md:px-10 py-8">
            <section className="flex flex-col gap-4">
              <h2 className="text-[#00F3B6] uppercase tracking-widest font-medium text-xs">
                {label}
              </h2>
              <div className="flex flex-col gap-4">
                {fields.map((row, fieldIndex) => (
                  <div key={row.id} className="flex flex-col gap-4">
                    {/* Divisor chico — solo el ancho de la columna, separa
                        contenido del botón/CTA dentro de la misma sección */}
                    {fieldIndex > 0 && isCtaField(row.field_id) && (
                      <div className="border-t border-[#D7E2EA]/10" />
                    )}

                    {row.type === 'image' ? (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[#D7E2EA]/40 text-xs"><FieldLabel fieldId={row.field_id} /></label>
                        <ImageUploadField
                          value={edits[row.id] ?? ''}
                          pathPrefix={`${site.id}/${row.field_id}`}
                          onUploadingChange={(u) => setUploading((prev) => ({ ...prev, [row.id]: u }))}
                          onChange={(url) => setEdits((prev) => ({ ...prev, [row.id]: url }))}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[#D7E2EA]/40 text-xs"><FieldLabel fieldId={row.field_id} /></label>
                        <div className="relative">
                          <textarea
                            rows={row.field_id.endsWith('.paragraph') || row.field_id.endsWith('.title') ? 2 : 1}
                            value={edits[row.id] ?? ''}
                            onChange={(e) => setEdits((prev) => ({ ...prev, [row.id]: e.target.value }))}
                            className={`w-full bg-[#D7E2EA]/5 border border-[#D7E2EA]/15 rounded-xl px-4 py-2.5 text-[#D7E2EA]
                              outline-none focus:border-[#00F3B6] transition-colors duration-200 resize-y ${
                                FIELD_CTA_VARIANT[row.field_id] ? 'pr-24' : ''
                              }`}
                            style={{ fontSize: '0.9375rem' }}
                          />
                          {FIELD_CTA_VARIANT[row.field_id] && (
                            <CtaVariantBadge variant={FIELD_CTA_VARIANT[row.field_id]} />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      ))}

      {/* Barra inferior — guardar cambios. `sticky` (no `fixed`) a
          propósito: así queda contenida en el ancho del <main> de
          PlatformShell y nunca se superpone al sidebar de la izquierda —
          `fixed` la estiraba a todo el viewport, tapándolo. `h-12`: misma
          altura que el header de la plataforma (`py-2.5` + el botón de
          logout de `h-7` ahí = 48px) — el botón de acá se achica a `h-8`
          para entrar cómodo, en vez de la altura por defecto que tenía. */}
      <div className="sticky bottom-0 h-12 flex items-center border-t border-[#D7E2EA]/10 bg-[#0C0C0C]/95 backdrop-blur-md px-5 sm:px-8 md:px-10">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between gap-4">
          <p className="text-sm">
            {message ? (
              <span className={message.type === 'success' ? 'text-[#00F3B6]' : 'text-red-400'}>
                {message.text}
              </span>
            ) : (
              <span className="text-[#D7E2EA]/40">
                {dirtyRows.length > 0 ? `${dirtyRows.length} campo(s) sin guardar` : 'Sin cambios pendientes'}
              </span>
            )}
          </p>
          <button
            onClick={handleSave}
            disabled={saving || dirtyRows.length === 0 || Object.values(uploading).some(Boolean)}
            className="h-8 inline-flex items-center justify-center rounded-full font-bold text-sm text-[#0C0C0C] px-5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
            style={{ background: 'linear-gradient(180deg, #00FFBF 0%, #00C99A 100%)' }}
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
