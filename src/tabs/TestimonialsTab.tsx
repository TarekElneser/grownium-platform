import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { slugify } from '../lib/slugify';
import ImageUploadField from '../components/ImageUploadField';
import { Field, inputClass } from '../components/AdminFormControls';
import type { TabProps } from './types';

interface TestimonialRow {
  id: string;
  slug: string;
  quote: string;
  name: string;
  role: string;
  company: string;
  logo_url: string | null;
  logo_height: number | null;
  sort_order: number;
}

const TESTIMONIAL_COLUMNS = 'id, slug, quote, name, role, company, logo_url, logo_height, sort_order';

export default function TestimonialsTab({ session, site }: TabProps) {
  const [testimonials, setTestimonials] = useState<TestimonialRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('testimonials')
      .select(TESTIMONIAL_COLUMNS)
      .eq('site_id', site.id)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setLoadError(error.message);
          return;
        }
        setTestimonials((data ?? []) as unknown as TestimonialRow[]);
      });

    return () => {
      cancelled = true;
    };
  }, [site.id]);

  async function handleAddTestimonial() {
    if (!testimonials) return;
    setAdding(true);
    setMessage(null);

    const nextSortOrder = testimonials.length > 0 ? Math.max(...testimonials.map((t) => t.sort_order)) + 1 : 0;
    const placeholder = {
      site_id: site.id,
      // Slug único-por-ahora (timestamp); se reemplaza por uno limpio en el
      // primer "Guardar cambios" — mismo patrón que ProjectsTab.
      slug: `nuevo-testimonio-${Date.now()}`,
      quote: '',
      name: 'Nuevo testimonio',
      role: '',
      company: '',
      logo_url: null,
      logo_height: null,
      sort_order: nextSortOrder,
    };

    const { data, error } = await supabase
      .from('testimonials')
      .insert(placeholder)
      .select(TESTIMONIAL_COLUMNS)
      .single();
    setAdding(false);

    if (error || !data) {
      setMessage({ type: 'error', text: `Error creando el testimonio: ${error?.message ?? 'desconocido'}` });
      return;
    }

    const created = data as unknown as TestimonialRow;
    setTestimonials((prev) => [...(prev ?? []), created]);
    setExpandedId(created.id);
  }

  async function handleMove(index: number, direction: -1 | 1) {
    if (!testimonials) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= testimonials.length) return;

    const a = testimonials[index];
    const b = testimonials[targetIndex];

    const [r1, r2] = await Promise.all([
      supabase.from('testimonials').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('testimonials').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
    if (r1.error || r2.error) {
      setMessage({ type: 'error', text: 'Error moviendo el testimonio.' });
      return;
    }

    setTestimonials((prev) => {
      if (!prev) return prev;
      const next = prev.map((t) => {
        if (t.id === a.id) return { ...t, sort_order: b.sort_order };
        if (t.id === b.id) return { ...t, sort_order: a.sort_order };
        return t;
      });
      return [...next].sort((x, y) => x.sort_order - y.sort_order);
    });
  }

  function handleSaved(updated: TestimonialRow) {
    setTestimonials((prev) => (prev ?? []).map((t) => (t.id === updated.id ? updated : t)));
    setMessage({ type: 'success', text: `✓ "${updated.name}" guardado.` });
  }

  function handleDeleted(id: string) {
    setTestimonials((prev) => (prev ?? []).filter((t) => t.id !== id));
    setExpandedId((prev) => (prev === id ? null : prev));
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center px-5 py-20">
        <p className="text-red-400">Error cargando testimonios: {loadError}</p>
      </div>
    );
  }

  if (!testimonials) {
    return (
      <div className="flex items-center justify-center px-5 py-20">
        <p className="text-[#D7E2EA]/50">Cargando testimonios…</p>
      </div>
    );
  }

  return (
    <div className="px-5 sm:px-8 md:px-10 py-10 pb-16">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <header>
          <h1 className="text-[#D7E2EA] font-extrabold text-2xl">Testimonios</h1>
          <p className="text-[#D7E2EA]/50 font-light text-sm mt-1">Conectado como {session.user.email}</p>
        </header>

        {message && (
          <p className={`text-sm ${message.type === 'success' ? 'text-[#00F3B6]' : 'text-red-400'}`}>
            {message.text}
          </p>
        )}

        <div className="flex flex-col gap-4">
          {testimonials.map((testimonial, i) => (
            <TestimonialCard
              key={testimonial.id}
              testimonial={testimonial}
              siteId={site.id}
              index={i}
              total={testimonials.length}
              expanded={expandedId === testimonial.id}
              onToggle={() => setExpandedId((prev) => (prev === testimonial.id ? null : testimonial.id))}
              onMove={(dir) => handleMove(i, dir)}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
              onMessage={setMessage}
            />
          ))}
        </div>

        <button
          onClick={handleAddTestimonial}
          disabled={adding}
          className="self-start rounded-full font-bold text-[#0C0C0C] px-6 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={{ background: 'linear-gradient(180deg, #00FFBF 0%, #00C99A 100%)' }}
        >
          {adding ? 'Creando…' : '+ Agregar testimonio nuevo'}
        </button>
      </div>
    </div>
  );
}

function TestimonialCard({
  testimonial,
  siteId,
  index,
  total,
  expanded,
  onToggle,
  onMove,
  onSaved,
  onDeleted,
  onMessage,
}: {
  testimonial: TestimonialRow;
  siteId: string;
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  onMove: (direction: -1 | 1) => void;
  onSaved: (updated: TestimonialRow) => void;
  onDeleted: (id: string) => void;
  onMessage: (m: { type: 'success' | 'error'; text: string } | null) => void;
}) {
  const [edits, setEdits] = useState<TestimonialRow>(testimonial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  // Si `testimonial` cambia desde afuera (después de guardar), resincroniza
  // el formulario local con el nuevo "original". Ajustado durante el render
  // (patrón recomendado por React para esto) en vez de un efecto, para no
  // disparar un render extra de más.
  const [syncedTestimonial, setSyncedTestimonial] = useState(testimonial);
  if (testimonial !== syncedTestimonial) {
    setSyncedTestimonial(testimonial);
    setEdits(testimonial);
  }

  const dirty = useMemo(() => JSON.stringify(edits) !== JSON.stringify(testimonial), [edits, testimonial]);

  function updateField<K extends keyof TestimonialRow>(key: K, value: TestimonialRow[K]) {
    setEdits((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    onMessage(null);

    const slug = slugify(edits.name, 'persona');
    const payload = {
      slug,
      quote: edits.quote,
      name: edits.name,
      role: edits.role,
      company: edits.company,
      logo_url: edits.logo_url,
      logo_height: edits.logo_height,
    };

    const { data, error } = await supabase
      .from('testimonials')
      .update(payload)
      .eq('id', testimonial.id)
      .select(TESTIMONIAL_COLUMNS)
      .single();

    setSaving(false);

    if (error) {
      const friendly =
        error.code === '23505'
          ? `ya existe un testimonio con un nombre muy parecido (el slug "${slug}" está en uso) — cambia el nombre un poco.`
          : error.message;
      onMessage({ type: 'error', text: `Error guardando: ${friendly}` });
      return;
    }

    onSaved(data as unknown as TestimonialRow);
  }

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar el testimonio de "${testimonial.name}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    onMessage(null);

    const { error } = await supabase.from('testimonials').delete().eq('id', testimonial.id);
    setDeleting(false);

    if (error) {
      onMessage({ type: 'error', text: `Error eliminando: ${error.message}` });
      return;
    }
    onDeleted(testimonial.id);
  }

  return (
    <div className="rounded-2xl border border-[#D7E2EA]/10 bg-[#111111] overflow-hidden">
      {/* Header colapsado */}
      <div className="flex items-center gap-3 p-4">
        <button onClick={onToggle} className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer">
          <img
            src={testimonial.logo_url || undefined}
            alt=""
            className="w-12 h-12 rounded-lg object-contain border border-[#D7E2EA]/15 bg-[#D7E2EA]/5 flex-shrink-0 p-1.5"
          />
          <span className="text-[#D7E2EA] font-medium truncate">{testimonial.name || '(sin nombre)'}</span>
        </button>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            title="Mover arriba"
            className="w-7 h-7 flex items-center justify-center rounded-md text-[#D7E2EA]/50 hover:text-[#D7E2EA] hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
          >
            ↑
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            title="Mover abajo"
            className="w-7 h-7 flex items-center justify-center rounded-md text-[#D7E2EA]/50 hover:text-[#D7E2EA] hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
          >
            ↓
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Eliminar"
            className="w-7 h-7 flex items-center justify-center rounded-md text-red-400/60 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-40 cursor-pointer"
          >
            {deleting ? '…' : '✕'}
          </button>
          <button onClick={onToggle} className="w-7 h-7 flex items-center justify-center text-[#D7E2EA]/40 cursor-pointer">
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Form expandido */}
      {expanded && (
        <div className="border-t border-[#D7E2EA]/10 p-4 flex flex-col gap-4">
          <Field label="Nombre">
            <input value={edits.name} onChange={(e) => updateField('name', e.target.value)} className={inputClass} />
          </Field>

          <Field label="Cargo">
            <input value={edits.role} onChange={(e) => updateField('role', e.target.value)} className={inputClass} />
          </Field>

          <Field label="Empresa">
            <input value={edits.company} onChange={(e) => updateField('company', e.target.value)} className={inputClass} />
          </Field>

          <Field label="Cita">
            <textarea
              rows={4}
              value={edits.quote}
              onChange={(e) => updateField('quote', e.target.value)}
              className={`${inputClass} resize-y`}
            />
          </Field>

          <Field label="Logo del cliente">
            <ImageUploadField
              value={edits.logo_url ?? ''}
              pathPrefix={`${siteId}/testimonial-logos/${testimonial.slug}`}
              onUploadingChange={setLogoUploading}
              onChange={(url) => updateField('logo_url', url)}
            />
          </Field>

          <Field label="Alto del logo en px (opcional — usa 36px si se deja vacío)">
            <input
              type="number"
              min={1}
              value={edits.logo_height ?? ''}
              onChange={(e) => updateField('logo_height', e.target.value ? Number(e.target.value) : null)}
              placeholder="36"
              className={inputClass}
            />
          </Field>

          <div className="flex items-center justify-between gap-4 pt-2">
            <span className="text-[#D7E2EA]/40 text-xs">
              {dirty ? 'Cambios sin guardar' : 'Sin cambios pendientes'}
            </span>
            <button
              onClick={handleSave}
              disabled={saving || !dirty || logoUploading}
              className="rounded-full font-bold text-[#0C0C0C] px-6 py-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
              style={{ background: 'linear-gradient(180deg, #00FFBF 0%, #00C99A 100%)' }}
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
