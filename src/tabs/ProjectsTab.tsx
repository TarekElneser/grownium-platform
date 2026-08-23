import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { slugify } from '../lib/slugify';
import ImageUploadField from '../components/ImageUploadField';
import { Field, inputClass } from '../components/AdminFormControls';
import type { TabProps } from './types';

interface Metric {
  numero: string;
  label: string;
}

interface ProjectRow {
  id: string;
  slug: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  resumen: string;
  imagen_url: string | null;
  url: string | null;
  logo: string | null;
  mejoras: Metric[];
  que_se_hizo: string[];
  sort_order: number;
}

const PROJECT_COLUMNS =
  'id, slug, nombre, categoria, descripcion, resumen, imagen_url, url, logo, mejoras, que_se_hizo, sort_order';

const emptyMetrics = (): Metric[] => [
  { numero: '', label: '' },
  { numero: '', label: '' },
  { numero: '', label: '' },
];
const emptyHighlights = (): string[] => ['', '', '', ''];

export default function ProjectsTab({ session, site }: TabProps) {
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('projects')
      .select(PROJECT_COLUMNS)
      .eq('site_id', site.id)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setLoadError(error.message);
          return;
        }
        setProjects((data ?? []) as unknown as ProjectRow[]);
      });

    return () => {
      cancelled = true;
    };
  }, [site.id]);

  async function handleAddProject() {
    if (!projects) return;
    setAdding(true);
    setMessage(null);

    const nextSortOrder = projects.length > 0 ? Math.max(...projects.map((p) => p.sort_order)) + 1 : 0;
    const placeholder = {
      site_id: site.id,
      // Slug único-por-ahora (timestamp) para no chocar con otro proyecto
      // nuevo sin nombre todavía; se reemplaza por uno limpio en el primer
      // "Guardar cambios".
      slug: `nuevo-proyecto-${Date.now()}`,
      nombre: 'Nuevo proyecto',
      categoria: '',
      descripcion: '',
      resumen: '',
      imagen_url: null,
      url: null,
      logo: null,
      mejoras: emptyMetrics(),
      que_se_hizo: emptyHighlights(),
      sort_order: nextSortOrder,
    };

    const { data, error } = await supabase.from('projects').insert(placeholder).select(PROJECT_COLUMNS).single();
    setAdding(false);

    if (error || !data) {
      setMessage({ type: 'error', text: `Error creando el proyecto: ${error?.message ?? 'desconocido'}` });
      return;
    }

    const created = data as unknown as ProjectRow;
    setProjects((prev) => [...(prev ?? []), created]);
    setExpandedId(created.id);
  }

  async function handleMove(index: number, direction: -1 | 1) {
    if (!projects) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= projects.length) return;

    const a = projects[index];
    const b = projects[targetIndex];

    const [r1, r2] = await Promise.all([
      supabase.from('projects').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('projects').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
    if (r1.error || r2.error) {
      setMessage({ type: 'error', text: 'Error moviendo el proyecto.' });
      return;
    }

    setProjects((prev) => {
      if (!prev) return prev;
      const next = prev.map((p) => {
        if (p.id === a.id) return { ...p, sort_order: b.sort_order };
        if (p.id === b.id) return { ...p, sort_order: a.sort_order };
        return p;
      });
      return [...next].sort((x, y) => x.sort_order - y.sort_order);
    });
  }

  function handleSaved(updated: ProjectRow) {
    setProjects((prev) => (prev ?? []).map((p) => (p.id === updated.id ? updated : p)));
    setMessage({ type: 'success', text: `✓ "${updated.nombre}" guardado.` });
  }

  function handleDeleted(id: string) {
    setProjects((prev) => (prev ?? []).filter((p) => p.id !== id));
    setExpandedId((prev) => (prev === id ? null : prev));
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center px-5 py-20">
        <p className="text-red-400">Error cargando proyectos: {loadError}</p>
      </div>
    );
  }

  if (!projects) {
    return (
      <div className="flex items-center justify-center px-5 py-20">
        <p className="text-[#D7E2EA]/50">Cargando proyectos…</p>
      </div>
    );
  }

  return (
    <div className="px-5 sm:px-8 md:px-10 py-10 pb-16">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <header>
          <h1 className="text-[#D7E2EA] font-extrabold text-2xl">Proyectos</h1>
          <p className="text-[#D7E2EA]/50 font-light text-sm mt-1">Conectado como {session.user.email}</p>
        </header>

        {message && (
          <p className={`text-sm ${message.type === 'success' ? 'text-[#00F3B6]' : 'text-red-400'}`}>
            {message.text}
          </p>
        )}

        <div className="flex flex-col gap-4">
          {projects.map((project, i) => (
            <ProjectCard
              key={project.id}
              project={project}
              siteId={site.id}
              index={i}
              total={projects.length}
              expanded={expandedId === project.id}
              onToggle={() => setExpandedId((prev) => (prev === project.id ? null : project.id))}
              onMove={(dir) => handleMove(i, dir)}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
              onMessage={setMessage}
            />
          ))}
        </div>

        <button
          onClick={handleAddProject}
          disabled={adding}
          className="self-start rounded-full font-bold text-[#0C0C0C] px-6 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={{ background: 'linear-gradient(180deg, #00FFBF 0%, #00C99A 100%)' }}
        >
          {adding ? 'Creando…' : '+ Agregar proyecto nuevo'}
        </button>
      </div>
    </div>
  );
}

function ProjectCard({
  project,
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
  project: ProjectRow;
  siteId: string;
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  onMove: (direction: -1 | 1) => void;
  onSaved: (updated: ProjectRow) => void;
  onDeleted: (id: string) => void;
  onMessage: (m: { type: 'success' | 'error'; text: string } | null) => void;
}) {
  const [edits, setEdits] = useState<ProjectRow>(project);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imagenUploading, setImagenUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  // Si `project` cambia desde afuera (después de guardar), resincroniza el
  // formulario local con el nuevo "original". Ajustado durante el render
  // (patrón recomendado por React para esto) en vez de un efecto, para no
  // disparar un render extra de más.
  const [syncedProject, setSyncedProject] = useState(project);
  if (project !== syncedProject) {
    setSyncedProject(project);
    setEdits(project);
  }

  const dirty = useMemo(() => JSON.stringify(edits) !== JSON.stringify(project), [edits, project]);
  const imageBusy = imagenUploading || logoUploading;

  function updateField<K extends keyof ProjectRow>(key: K, value: ProjectRow[K]) {
    setEdits((prev) => ({ ...prev, [key]: value }));
  }

  function updateMetric(i: number, key: keyof Metric, value: string) {
    setEdits((prev) => {
      const mejoras = [...prev.mejoras];
      mejoras[i] = { ...mejoras[i], [key]: value };
      return { ...prev, mejoras };
    });
  }

  function updateHighlight(i: number, value: string) {
    setEdits((prev) => {
      const que_se_hizo = [...prev.que_se_hizo];
      que_se_hizo[i] = value;
      return { ...prev, que_se_hizo };
    });
  }

  async function handleSave() {
    setSaving(true);
    onMessage(null);

    const slug = slugify(edits.nombre, 'proyecto');
    const payload = {
      slug,
      nombre: edits.nombre,
      categoria: edits.categoria,
      descripcion: edits.descripcion,
      resumen: edits.resumen,
      url: edits.url?.trim() ? edits.url.trim() : null,
      imagen_url: edits.imagen_url,
      logo: edits.logo,
      mejoras: edits.mejoras,
      que_se_hizo: edits.que_se_hizo,
    };

    const { data, error } = await supabase
      .from('projects')
      .update(payload)
      .eq('id', project.id)
      .select(PROJECT_COLUMNS)
      .single();

    setSaving(false);

    if (error) {
      const friendly =
        error.code === '23505'
          ? `ya existe un proyecto con un nombre muy parecido (el slug "${slug}" está en uso) — cambia el nombre un poco.`
          : error.message;
      onMessage({ type: 'error', text: `Error guardando: ${friendly}` });
      return;
    }

    onSaved(data as unknown as ProjectRow);
  }

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar "${project.nombre}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    onMessage(null);

    const { error } = await supabase.from('projects').delete().eq('id', project.id);
    setDeleting(false);

    if (error) {
      onMessage({ type: 'error', text: `Error eliminando: ${error.message}` });
      return;
    }
    onDeleted(project.id);
  }

  return (
    <div className="rounded-2xl border border-[#D7E2EA]/10 bg-[#111111] overflow-hidden">
      {/* Header colapsado */}
      <div className="flex items-center gap-3 p-4">
        <button onClick={onToggle} className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer">
          <img
            src={project.imagen_url || undefined}
            alt=""
            className="w-12 h-12 rounded-lg object-cover border border-[#D7E2EA]/15 bg-[#D7E2EA]/5 flex-shrink-0"
          />
          <span className="text-[#D7E2EA] font-medium truncate">{project.nombre || '(sin nombre)'}</span>
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
            <input value={edits.nombre} onChange={(e) => updateField('nombre', e.target.value)} className={inputClass} />
          </Field>

          <Field label="Categoría">
            <input value={edits.categoria} onChange={(e) => updateField('categoria', e.target.value)} className={inputClass} />
          </Field>

          <Field label="Descripción (frase corta)">
            <textarea
              rows={2}
              value={edits.descripcion}
              onChange={(e) => updateField('descripcion', e.target.value)}
              className={`${inputClass} resize-y`}
            />
          </Field>

          <Field label="Resumen (párrafo largo)">
            <textarea
              rows={3}
              value={edits.resumen}
              onChange={(e) => updateField('resumen', e.target.value)}
              className={`${inputClass} resize-y`}
            />
          </Field>

          <Field label="URL del sitio (opcional)">
            <input
              value={edits.url ?? ''}
              onChange={(e) => updateField('url', e.target.value)}
              placeholder="https://…"
              className={inputClass}
            />
          </Field>

          <Field label="Foto del proyecto">
            <ImageUploadField
              value={edits.imagen_url ?? ''}
              pathPrefix={`${siteId}/projects/${project.slug}`}
              onUploadingChange={setImagenUploading}
              onChange={(url) => updateField('imagen_url', url)}
            />
          </Field>

          <Field label="Logo del cliente">
            <ImageUploadField
              value={edits.logo ?? ''}
              pathPrefix={`${siteId}/logos/${project.slug}`}
              onUploadingChange={setLogoUploading}
              onChange={(url) => updateField('logo', url)}
            />
          </Field>

          <div className="flex flex-col gap-2">
            <span className="text-[#D7E2EA]/40 uppercase tracking-widest font-medium text-xs">Métricas (3)</span>
            {edits.mejoras.map((m, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <input
                  value={m.numero}
                  onChange={(e) => updateMetric(i, 'numero', e.target.value)}
                  placeholder="Número (ej. +500)"
                  className={inputClass}
                />
                <input
                  value={m.label}
                  onChange={(e) => updateMetric(i, 'label', e.target.value)}
                  placeholder="Label (ej. Estudiantes)"
                  className={inputClass}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[#D7E2EA]/40 uppercase tracking-widest font-medium text-xs">Qué se hizo (4 bullets)</span>
            {edits.que_se_hizo.map((h, i) => (
              <input
                key={i}
                value={h}
                onChange={(e) => updateHighlight(i, e.target.value)}
                placeholder={`Bullet ${i + 1}`}
                className={inputClass}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <span className="text-[#D7E2EA]/40 text-xs">
              {dirty ? 'Cambios sin guardar' : 'Sin cambios pendientes'}
            </span>
            <button
              onClick={handleSave}
              disabled={saving || !dirty || imageBusy}
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
