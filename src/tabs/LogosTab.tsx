import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import ImageUploadField from '../components/ImageUploadField';
import { Field, inputClass } from '../components/AdminFormControls';
import type { TabProps } from './types';

interface LogoRow {
  id: string;
  src: string;
  alt: string;
  sort_order: number;
}

// `style` (tabla `client_logos`, CSSProperties por logo) queda afuera a
// propósito — no se selecciona ni se edita acá, mismo criterio que
// logoStyle/imageStyle en projects/testimonials.
const LOGO_COLUMNS = 'id, src, alt, sort_order';

export default function LogosTab({ session, site }: TabProps) {
  const [logos, setLogos] = useState<LogoRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('client_logos')
      .select(LOGO_COLUMNS)
      .eq('site_id', site.id)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setLoadError(error.message);
          return;
        }
        setLogos((data ?? []) as unknown as LogoRow[]);
      });

    return () => {
      cancelled = true;
    };
  }, [site.id]);

  async function handleAddLogo() {
    if (!logos) return;
    setAdding(true);
    setMessage(null);

    const nextSortOrder = logos.length > 0 ? Math.max(...logos.map((l) => l.sort_order)) + 1 : 0;
    const placeholder = {
      site_id: site.id,
      src: '',
      alt: 'Nuevo logo',
      sort_order: nextSortOrder,
    };

    const { data, error } = await supabase.from('client_logos').insert(placeholder).select(LOGO_COLUMNS).single();
    setAdding(false);

    if (error || !data) {
      setMessage({ type: 'error', text: `Error creando el logo: ${error?.message ?? 'desconocido'}` });
      return;
    }

    const created = data as unknown as LogoRow;
    setLogos((prev) => [...(prev ?? []), created]);
    setExpandedId(created.id);
  }

  async function handleMove(index: number, direction: -1 | 1) {
    if (!logos) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= logos.length) return;

    const a = logos[index];
    const b = logos[targetIndex];

    const [r1, r2] = await Promise.all([
      supabase.from('client_logos').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('client_logos').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
    if (r1.error || r2.error) {
      setMessage({ type: 'error', text: 'Error moviendo el logo.' });
      return;
    }

    setLogos((prev) => {
      if (!prev) return prev;
      const next = prev.map((l) => {
        if (l.id === a.id) return { ...l, sort_order: b.sort_order };
        if (l.id === b.id) return { ...l, sort_order: a.sort_order };
        return l;
      });
      return [...next].sort((x, y) => x.sort_order - y.sort_order);
    });
  }

  function handleSaved(updated: LogoRow) {
    setLogos((prev) => (prev ?? []).map((l) => (l.id === updated.id ? updated : l)));
    setMessage({ type: 'success', text: `✓ "${updated.alt}" guardado.` });
  }

  function handleDeleted(id: string) {
    setLogos((prev) => (prev ?? []).filter((l) => l.id !== id));
    setExpandedId((prev) => (prev === id ? null : prev));
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center px-5 py-20">
        <p className="text-red-400">Error cargando logos: {loadError}</p>
      </div>
    );
  }

  if (!logos) {
    return (
      <div className="flex items-center justify-center px-5 py-20">
        <p className="text-[#D7E2EA]/50">Cargando logos…</p>
      </div>
    );
  }

  return (
    <div className="px-5 sm:px-8 md:px-10 py-10 pb-16">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <header>
          <h1 className="text-[#D7E2EA] font-extrabold text-2xl">Logos</h1>
          <p className="text-[#D7E2EA]/50 font-light text-sm mt-1">Conectado como {session.user.email}</p>
        </header>

        {message && (
          <p className={`text-sm ${message.type === 'success' ? 'text-[#00F3B6]' : 'text-red-400'}`}>
            {message.text}
          </p>
        )}

        <div className="flex flex-col gap-4">
          {logos.map((logo, i) => (
            <LogoCard
              key={logo.id}
              logo={logo}
              siteId={site.id}
              index={i}
              total={logos.length}
              expanded={expandedId === logo.id}
              onToggle={() => setExpandedId((prev) => (prev === logo.id ? null : logo.id))}
              onMove={(dir) => handleMove(i, dir)}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
              onMessage={setMessage}
            />
          ))}
        </div>

        <button
          onClick={handleAddLogo}
          disabled={adding}
          className="self-start rounded-full font-bold text-[#0C0C0C] px-6 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={{ background: 'linear-gradient(180deg, #00FFBF 0%, #00C99A 100%)' }}
        >
          {adding ? 'Creando…' : '+ Agregar logo nuevo'}
        </button>
      </div>
    </div>
  );
}

function LogoCard({
  logo,
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
  logo: LogoRow;
  siteId: string;
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  onMove: (direction: -1 | 1) => void;
  onSaved: (updated: LogoRow) => void;
  onDeleted: (id: string) => void;
  onMessage: (m: { type: 'success' | 'error'; text: string } | null) => void;
}) {
  const [edits, setEdits] = useState<LogoRow>(logo);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [srcUploading, setSrcUploading] = useState(false);

  // Si `logo` cambia desde afuera (después de guardar), resincroniza el
  // formulario local con el nuevo "original". Ajustado durante el render
  // (patrón recomendado por React para esto) en vez de un efecto, para no
  // disparar un render extra de más.
  const [syncedLogo, setSyncedLogo] = useState(logo);
  if (logo !== syncedLogo) {
    setSyncedLogo(logo);
    setEdits(logo);
  }

  const dirty = useMemo(() => JSON.stringify(edits) !== JSON.stringify(logo), [edits, logo]);

  function updateField<K extends keyof LogoRow>(key: K, value: LogoRow[K]) {
    setEdits((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    onMessage(null);

    const payload = { src: edits.src, alt: edits.alt };

    const { data, error } = await supabase
      .from('client_logos')
      .update(payload)
      .eq('id', logo.id)
      .select(LOGO_COLUMNS)
      .single();

    setSaving(false);

    if (error) {
      onMessage({ type: 'error', text: `Error guardando: ${error.message}` });
      return;
    }

    onSaved(data as unknown as LogoRow);
  }

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar "${logo.alt || 'este logo'}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    onMessage(null);

    const { error } = await supabase.from('client_logos').delete().eq('id', logo.id);
    setDeleting(false);

    if (error) {
      onMessage({ type: 'error', text: `Error eliminando: ${error.message}` });
      return;
    }
    onDeleted(logo.id);
  }

  return (
    <div className="rounded-2xl border border-[#D7E2EA]/10 bg-[#111111] overflow-hidden">
      {/* Header colapsado */}
      <div className="flex items-center gap-3 p-4">
        <button onClick={onToggle} className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer">
          <img
            src={logo.src || undefined}
            alt=""
            className="w-12 h-12 rounded-lg object-contain border border-[#D7E2EA]/15 bg-[#D7E2EA]/5 flex-shrink-0 p-1.5"
          />
          <span className="text-[#D7E2EA] font-medium truncate">{logo.alt || '(sin nombre)'}</span>
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
          <Field label="Logo">
            <ImageUploadField
              value={edits.src ?? ''}
              pathPrefix={`${siteId}/logos/${logo.id}`}
              onUploadingChange={setSrcUploading}
              onChange={(url) => updateField('src', url)}
            />
          </Field>

          <Field label="Texto alternativo (alt)">
            <input value={edits.alt} onChange={(e) => updateField('alt', e.target.value)} className={inputClass} />
          </Field>

          <div className="flex items-center justify-between gap-4 pt-2">
            <span className="text-[#D7E2EA]/40 text-xs">
              {dirty ? 'Cambios sin guardar' : 'Sin cambios pendientes'}
            </span>
            <button
              onClick={handleSave}
              disabled={saving || !dirty || srcUploading}
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
