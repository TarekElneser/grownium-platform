import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import ImageUploadField from '../components/ImageUploadField';
import { Switch } from '../components/ui/switch';
import type { TabProps } from './types';

interface FieldRow {
  id: string;
  field_id: string;
  value: string;
  type: string;
}

// Etiquetas legibles de los campos 'seo.*' — separadas de FIELD_LABELS de
// ContentTab a propósito: esta pestaña filtra esos campos aparte, ya no
// aparecen en el editor de contenido general (ver exclusión en
// ContentTab.tsx, `.not('field_id', 'like', 'seo.%')`).
const SEO_FIELD_LABELS: Record<string, string> = {
  'seo.metaTitle': 'Título para buscadores',
  'seo.metaDescription': 'Descripción para buscadores',
  'seo.ogImage': 'Imagen para compartir en redes',
  'seo.favicon': 'Favicon',
  'seo.noIndex': 'No indexar este sitio (bloquear buscadores)',
  'seo.googleSiteVerification': 'Meta tag de verificación (Google Search Console)',
};

// Orden de aparición en el panel — no alfabético a propósito (alfabético
// pondría metaDescription antes que metaTitle).
const SEO_FIELD_ORDER = [
  'seo.metaTitle',
  'seo.metaDescription',
  'seo.ogImage',
  'seo.favicon',
  'seo.noIndex',
  'seo.googleSiteVerification',
];

function seoFieldOrderIndex(fieldId: string): number {
  const idx = SEO_FIELD_ORDER.indexOf(fieldId);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

// Ninguno de estos 3 campos envuelve texto visible en la página (van al
// <head>), así que —a diferencia de ContentTab— acá no hay tag HTML que
// reportar: solo el nombre humano + el field_id técnico entre paréntesis.
function SeoFieldLabel({ fieldId }: { fieldId: string }) {
  const human = SEO_FIELD_LABELS[fieldId];
  if (!human) {
    return <span className="font-mono">{fieldId}</span>;
  }
  return (
    <>
      {human} <span className="font-mono">({fieldId})</span>
    </>
  );
}

export default function SeoTab({ session, site }: TabProps) {
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
      .like('field_id', 'seo.%')
      .order('field_id')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setLoadError(error.message);
          return;
        }
        const loaded: FieldRow[] = (data ?? [])
          .map((r) => ({
            id: r.id,
            field_id: r.field_id,
            value: r.value ?? r.default_value ?? '',
            type: r.type,
          }))
          .sort((a, b) => seoFieldOrderIndex(a.field_id) - seoFieldOrderIndex(b.field_id));
        setRows(loaded);
        setEdits(Object.fromEntries(loaded.map((r) => [r.id, r.value])));
      });

    return () => {
      cancelled = true;
    };
  }, [site.id]);

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
    // `min-h-full flex flex-col`: a diferencia de ContentTab, acá el
    // contenido (3 campos) casi nunca llena el alto del <main> — con solo
    // `sticky` la barra quedaría flotando debajo de los campos en vez de
    // pegada abajo. El contenido va envuelto en un solo div `flex-1` (no
    // cada bloque suelto como ítem flex): así se lleva todo el alto sobrante
    // y empuja la barra al fondo, sin que `flex` interfiera con el
    // `mx-auto` que centra cada bloque (`max-w-3xl mx-auto` deja de
    // centrarse bien si el propio bloque es un ítem flex). `sticky
    // bottom-0` en la barra se sigue encargando de pegarla cuando el
    // contenido sí llega a hacer scroll.
    <div className="min-h-full flex flex-col">
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 md:px-10 pt-10">
          <header className="pb-10">
            <h1 className="text-[#D7E2EA] font-extrabold text-2xl">SEO</h1>
            <p className="text-[#D7E2EA]/50 font-light text-sm mt-1">
              Conectado como {session.user.email}
            </p>
          </header>
        </div>

        <div className="max-w-3xl mx-auto px-5 sm:px-8 md:px-10 pb-8">
          <div className="flex flex-col gap-4">
            {rows.map((row) => (
              <div key={row.id} className="flex flex-col gap-1.5">
                <label className="text-[#D7E2EA]/40 text-xs">
                  <SeoFieldLabel fieldId={row.field_id} />
                </label>

                {row.type === 'image' ? (
                  <ImageUploadField
                    value={edits[row.id] ?? ''}
                    pathPrefix={`${site.id}/${row.field_id}`}
                    onUploadingChange={(u) => setUploading((prev) => ({ ...prev, [row.id]: u }))}
                    onChange={(url) => setEdits((prev) => ({ ...prev, [row.id]: url }))}
                  />
                ) : row.type === 'boolean' ? (
                  <div className="flex flex-col gap-2">
                    <Switch
                      checked={edits[row.id] === 'true'}
                      onCheckedChange={(checked) =>
                        setEdits((prev) => ({ ...prev, [row.id]: checked ? 'true' : 'false' }))
                      }
                    />
                    {row.field_id === 'seo.noIndex' && edits[row.id] === 'true' && (
                      <p className="text-amber-400 text-xs">
                        ⚠ Este sitio no va a aparecer en buscadores mientras esto esté activado.
                      </p>
                    )}
                  </div>
                ) : (
                  <textarea
                    rows={row.field_id === 'seo.metaDescription' ? 3 : 1}
                    value={edits[row.id] ?? ''}
                    onChange={(e) => setEdits((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    className="bg-[#D7E2EA]/5 border border-[#D7E2EA]/15 rounded-xl px-4 py-2.5 text-[#D7E2EA]
                      outline-none focus:border-[#00F3B6] transition-colors duration-200 resize-y"
                    style={{ fontSize: '0.9375rem' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Barra inferior — guardar cambios. `sticky` (no `fixed`), mismo
          criterio que ContentTab: queda contenida en el ancho del <main>,
          nunca se superpone al sidebar. `h-12`: misma altura que el header
          de la plataforma — el botón se achica a `h-8` para entrar cómodo. */}
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
