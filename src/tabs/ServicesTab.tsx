import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { slugify } from '../lib/slugify';
import { Field, inputClass } from '../components/AdminFormControls';
import type { TabProps } from './types';

interface PlanRow {
  id: string;
  name: string;
  tagline: string;
  price: string;
  duration: string;
  includes: string[];
  sort_order: number;
}

interface ServiceRow {
  id: string;
  slug: string;
  tab: string;
  badge: string;
  name: string;
  desc: string;
  sort_order: number;
  service_plans: PlanRow[];
}

const SERVICE_COLUMNS =
  'id, slug, tab, badge, name, desc, sort_order, service_plans(id, name, tagline, price, duration, includes, sort_order)';

function sortPlans(plans: PlanRow[]): PlanRow[] {
  return [...plans].sort((a, b) => a.sort_order - b.sort_order);
}

export default function ServicesTab({ session, site }: TabProps) {
  const [services, setServices] = useState<ServiceRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('services')
      .select(SERVICE_COLUMNS)
      .eq('site_id', site.id)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setLoadError(error.message);
          return;
        }
        const loaded = ((data ?? []) as unknown as ServiceRow[]).map((s) => ({
          ...s,
          service_plans: sortPlans(s.service_plans),
        }));
        setServices(loaded);
      });

    return () => {
      cancelled = true;
    };
  }, [site.id]);

  async function handleAddService() {
    if (!services) return;
    setAdding(true);
    setMessage(null);

    const nextSortOrder = services.length > 0 ? Math.max(...services.map((s) => s.sort_order)) + 1 : 0;
    const placeholder = {
      site_id: site.id,
      slug: `nuevo-servicio-${Date.now()}`,
      tab: 'Nuevo servicio',
      badge: '',
      name: '',
      desc: '',
      sort_order: nextSortOrder,
    };

    const { data, error } = await supabase
      .from('services')
      .insert(placeholder)
      .select('id, slug, tab, badge, name, desc, sort_order')
      .single();
    setAdding(false);

    if (error || !data) {
      setMessage({ type: 'error', text: `Error creando el servicio: ${error?.message ?? 'desconocido'}` });
      return;
    }

    const created: ServiceRow = { ...(data as unknown as Omit<ServiceRow, 'service_plans'>), service_plans: [] };
    setServices((prev) => [...(prev ?? []), created]);
    setExpandedId(created.id);
  }

  async function handleMoveService(index: number, direction: -1 | 1) {
    if (!services) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= services.length) return;

    const a = services[index];
    const b = services[targetIndex];

    const [r1, r2] = await Promise.all([
      supabase.from('services').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('services').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
    if (r1.error || r2.error) {
      setMessage({ type: 'error', text: 'Error moviendo el servicio.' });
      return;
    }

    setServices((prev) => {
      if (!prev) return prev;
      const next = prev.map((s) => {
        if (s.id === a.id) return { ...s, sort_order: b.sort_order };
        if (s.id === b.id) return { ...s, sort_order: a.sort_order };
        return s;
      });
      return [...next].sort((x, y) => x.sort_order - y.sort_order);
    });
  }

  function handleServiceSaved(updated: ServiceRow) {
    setServices((prev) => (prev ?? []).map((s) => (s.id === updated.id ? updated : s)));
    setMessage({ type: 'success', text: `✓ "${updated.tab}" guardado.` });
  }

  function handleServiceDeleted(id: string) {
    setServices((prev) => (prev ?? []).filter((s) => s.id !== id));
    setExpandedId((prev) => (prev === id ? null : prev));
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center px-5 py-20">
        <p className="text-red-400">Error cargando servicios: {loadError}</p>
      </div>
    );
  }

  if (!services) {
    return (
      <div className="flex items-center justify-center px-5 py-20">
        <p className="text-[#D7E2EA]/50">Cargando servicios…</p>
      </div>
    );
  }

  return (
    <div className="px-5 sm:px-8 md:px-10 py-10 pb-16">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <header>
          <h1 className="text-[#D7E2EA] font-extrabold text-2xl">Servicios</h1>
          <p className="text-[#D7E2EA]/50 font-light text-sm mt-1">Conectado como {session.user.email}</p>
        </header>

        {message && (
          <p className={`text-sm ${message.type === 'success' ? 'text-[#00F3B6]' : 'text-red-400'}`}>
            {message.text}
          </p>
        )}

        <div className="flex flex-col gap-4">
          {services.map((service, i) => (
            <ServiceCard
              key={service.id}
              service={service}
              index={i}
              total={services.length}
              expanded={expandedId === service.id}
              onToggle={() => setExpandedId((prev) => (prev === service.id ? null : service.id))}
              onMove={(dir) => handleMoveService(i, dir)}
              onSaved={handleServiceSaved}
              onDeleted={handleServiceDeleted}
              onMessage={setMessage}
            />
          ))}
        </div>

        <button
          onClick={handleAddService}
          disabled={adding}
          className="self-start rounded-full font-bold text-[#0C0C0C] px-6 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={{ background: 'linear-gradient(180deg, #00FFBF 0%, #00C99A 100%)' }}
        >
          {adding ? 'Creando…' : '+ Agregar servicio nuevo'}
        </button>
      </div>
    </div>
  );
}

const emptyServiceFields = (service: ServiceRow) => ({
  tab: service.tab,
  badge: service.badge,
  name: service.name,
  desc: service.desc,
});

function ServiceCard({
  service,
  index,
  total,
  expanded,
  onToggle,
  onMove,
  onSaved,
  onDeleted,
  onMessage,
}: {
  service: ServiceRow;
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  onMove: (direction: -1 | 1) => void;
  onSaved: (updated: ServiceRow) => void;
  onDeleted: (id: string) => void;
  onMessage: (m: { type: 'success' | 'error'; text: string } | null) => void;
}) {
  // Estado local, inicializado UNA sola vez desde `service` (lazy init) y
  // nunca resincronizado por props después — así una acción estructural
  // (agregar/quitar/mover un plan) jamás pisa una edición de texto sin
  // guardar todavía. Cada acción inmediata (agregar/quitar/mover) actualiza
  // `plans` Y `originalPlans` a la vez (queda "limpio"); solo editar campos
  // de texto separa a `plans` de `originalPlans` (eso es lo que "Guardar
  // cambios" detecta y persiste).
  const [fields, setFields] = useState(() => emptyServiceFields(service));
  const [originalFields, setOriginalFields] = useState(() => emptyServiceFields(service));
  const [plans, setPlans] = useState<PlanRow[]>(() => service.service_plans);
  const [originalPlans, setOriginalPlans] = useState<PlanRow[]>(() => service.service_plans);

  const [saving, setSaving] = useState(false);
  const [deletingService, setDeletingService] = useState(false);
  const [addingPlan, setAddingPlan] = useState(false);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);

  const dirty = useMemo(
    () => JSON.stringify(fields) !== JSON.stringify(originalFields) || JSON.stringify(plans) !== JSON.stringify(originalPlans),
    [fields, originalFields, plans, originalPlans]
  );
  const busy = saving || deletingService || addingPlan || busyPlanId !== null;

  function updateField<K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function updatePlanField<K extends keyof PlanRow>(planId: string, key: K, value: PlanRow[K]) {
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, [key]: value } : p)));
  }

  function updateInclude(planId: string, itemIndex: number, value: string) {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        const includes = [...p.includes];
        includes[itemIndex] = value;
        return { ...p, includes };
      })
    );
  }

  function addInclude(planId: string) {
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, includes: [...p.includes, ''] } : p)));
  }

  function removeInclude(planId: string, itemIndex: number) {
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, includes: p.includes.filter((_, i) => i !== itemIndex) } : p))
    );
  }

  async function handleSave() {
    setSaving(true);
    onMessage(null);

    try {
      const slug = slugify(fields.tab, 'servicio');
      const { error: serviceError } = await supabase
        .from('services')
        .update({ slug, tab: fields.tab, badge: fields.badge, name: fields.name, desc: fields.desc })
        .eq('id', service.id);
      if (serviceError) throw serviceError;

      const dirtyPlans = plans.filter((p) => {
        const original = originalPlans.find((op) => op.id === p.id);
        return original && JSON.stringify(original) !== JSON.stringify(p);
      });
      if (dirtyPlans.length > 0) {
        const results = await Promise.all(
          dirtyPlans.map((p) =>
            supabase
              .from('service_plans')
              .update({ name: p.name, tagline: p.tagline, price: p.price, duration: p.duration, includes: p.includes })
              .eq('id', p.id)
          )
        );
        const planError = results.find((r) => r.error)?.error;
        if (planError) throw planError;
      }

      setOriginalFields(fields);
      setOriginalPlans(plans);
      onSaved({ ...service, slug, ...fields, service_plans: plans });
      onMessage({ type: 'success', text: `✓ "${fields.tab}" guardado.` });
    } catch (err) {
      onMessage({
        type: 'error',
        text: `Error guardando: ${err instanceof Error ? err.message : 'error desconocido'}`,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPlan() {
    setAddingPlan(true);
    onMessage(null);

    // service_plans no tiene site_id propio: queda asociado al sitio
    // correcto a través de service_id -> services.site_id, ya scopeado.
    const nextSortOrder = plans.length > 0 ? Math.max(...plans.map((p) => p.sort_order)) + 1 : 0;
    const placeholder = {
      service_id: service.id,
      name: 'Nuevo plan',
      tagline: '',
      price: '',
      duration: '',
      includes: [] as string[],
      sort_order: nextSortOrder,
    };

    const { data, error } = await supabase
      .from('service_plans')
      .insert(placeholder)
      .select('id, name, tagline, price, duration, includes, sort_order')
      .single();
    setAddingPlan(false);

    if (error || !data) {
      onMessage({ type: 'error', text: `Error creando el plan: ${error?.message ?? 'desconocido'}` });
      return;
    }

    const created = data as unknown as PlanRow;
    setPlans((prev) => [...prev, created]);
    setOriginalPlans((prev) => [...prev, created]);
  }

  async function handleDeletePlan(plan: PlanRow) {
    if (!window.confirm(`¿Eliminar el plan "${plan.name || 'sin nombre'}"? Esta acción no se puede deshacer.`)) return;
    setBusyPlanId(plan.id);
    onMessage(null);

    const { error } = await supabase.from('service_plans').delete().eq('id', plan.id);
    setBusyPlanId(null);

    if (error) {
      onMessage({ type: 'error', text: `Error eliminando el plan: ${error.message}` });
      return;
    }
    setPlans((prev) => prev.filter((p) => p.id !== plan.id));
    setOriginalPlans((prev) => prev.filter((p) => p.id !== plan.id));
  }

  async function handleMovePlan(planIndex: number, direction: -1 | 1) {
    const targetIndex = planIndex + direction;
    if (targetIndex < 0 || targetIndex >= plans.length) return;

    const a = plans[planIndex];
    const b = plans[targetIndex];
    setBusyPlanId(a.id);
    onMessage(null);

    const [r1, r2] = await Promise.all([
      supabase.from('service_plans').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('service_plans').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
    setBusyPlanId(null);

    if (r1.error || r2.error) {
      onMessage({ type: 'error', text: 'Error moviendo el plan.' });
      return;
    }

    const swap = (list: PlanRow[]) =>
      [...list]
        .map((p) => {
          if (p.id === a.id) return { ...p, sort_order: b.sort_order };
          if (p.id === b.id) return { ...p, sort_order: a.sort_order };
          return p;
        })
        .sort((x, y) => x.sort_order - y.sort_order);

    setPlans(swap);
    setOriginalPlans(swap);
  }

  async function handleDeleteService() {
    const warning =
      plans.length > 0
        ? `¿Eliminar "${service.tab}"? Esto también va a borrar ${plans.length === 1 ? 'su plan' : `sus ${plans.length} planes`} (on delete cascade). Esta acción no se puede deshacer.`
        : `¿Eliminar "${service.tab}"? Esta acción no se puede deshacer.`;
    if (!window.confirm(warning)) return;

    setDeletingService(true);
    onMessage(null);

    const { error } = await supabase.from('services').delete().eq('id', service.id);
    setDeletingService(false);

    if (error) {
      onMessage({ type: 'error', text: `Error eliminando: ${error.message}` });
      return;
    }
    onDeleted(service.id);
  }

  return (
    <div className="rounded-2xl border border-[#D7E2EA]/10 bg-[#111111] overflow-hidden">
      {/* Header colapsado */}
      <div className="flex items-center gap-3 p-4">
        <button onClick={onToggle} className="flex flex-col flex-1 min-w-0 text-left cursor-pointer">
          <span className="text-[#D7E2EA] font-medium truncate">{service.tab || '(sin nombre)'}</span>
          <span className="text-[#D7E2EA]/40 text-xs truncate">{service.name}</span>
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
            onClick={handleDeleteService}
            disabled={deletingService}
            title="Eliminar servicio"
            className="w-7 h-7 flex items-center justify-center rounded-md text-red-400/60 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-40 cursor-pointer"
          >
            {deletingService ? '…' : '✕'}
          </button>
          <button onClick={onToggle} className="w-7 h-7 flex items-center justify-center text-[#D7E2EA]/40 cursor-pointer">
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Form expandido */}
      {expanded && (
        <div className="border-t border-[#D7E2EA]/10 p-4 flex flex-col gap-4">
          <Field label="Tab (nombre de la pestaña)">
            <input value={fields.tab} onChange={(e) => updateField('tab', e.target.value)} className={inputClass} />
          </Field>

          <Field label="Etiqueta">
            <input value={fields.badge} onChange={(e) => updateField('badge', e.target.value)} className={inputClass} />
          </Field>

          <Field label="Nombre del servicio">
            <input value={fields.name} onChange={(e) => updateField('name', e.target.value)} className={inputClass} />
          </Field>

          <Field label="Descripción">
            <textarea
              rows={3}
              value={fields.desc}
              onChange={(e) => updateField('desc', e.target.value)}
              className={`${inputClass} resize-y`}
            />
          </Field>

          {/* Planes */}
          <div className="flex flex-col gap-3 border-t border-[#D7E2EA]/10 pt-4">
            <span className="text-[#D7E2EA]/40 uppercase tracking-widest font-medium text-xs">
              Planes ({plans.length})
            </span>

            {plans.map((plan, pi) => (
              <PlanEditor
                key={plan.id}
                plan={plan}
                index={pi}
                total={plans.length}
                busy={busyPlanId === plan.id}
                onFieldChange={(key, value) => updatePlanField(plan.id, key, value)}
                onIncludeChange={(i, value) => updateInclude(plan.id, i, value)}
                onAddInclude={() => addInclude(plan.id)}
                onRemoveInclude={(i) => removeInclude(plan.id, i)}
                onMove={(dir) => handleMovePlan(pi, dir)}
                onDelete={() => handleDeletePlan(plan)}
              />
            ))}

            <button
              onClick={handleAddPlan}
              disabled={busy}
              className="self-start rounded-full border border-[#D7E2EA]/15 text-[#D7E2EA] text-sm font-medium px-4 py-2 hover:border-[#00F3B6] transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {addingPlan ? 'Creando…' : '+ Agregar plan'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#D7E2EA]/10">
            <span className="text-[#D7E2EA]/40 text-xs">
              {dirty ? 'Cambios sin guardar' : 'Sin cambios pendientes'}
            </span>
            <button
              onClick={handleSave}
              disabled={busy || !dirty}
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

function PlanEditor({
  plan,
  index,
  total,
  busy,
  onFieldChange,
  onIncludeChange,
  onAddInclude,
  onRemoveInclude,
  onMove,
  onDelete,
}: {
  plan: PlanRow;
  index: number;
  total: number;
  busy: boolean;
  onFieldChange: <K extends keyof PlanRow>(key: K, value: PlanRow[K]) => void;
  onIncludeChange: (itemIndex: number, value: string) => void;
  onAddInclude: () => void;
  onRemoveInclude: (itemIndex: number) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#D7E2EA]/10 bg-[#0C0C0C] p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[#D7E2EA]/50 text-xs font-medium">Plan {index + 1}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onMove(-1)}
            disabled={busy || index === 0}
            title="Mover arriba"
            className="w-6 h-6 flex items-center justify-center rounded text-[#D7E2EA]/50 hover:text-[#D7E2EA] hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer text-xs"
          >
            ↑
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={busy || index === total - 1}
            title="Mover abajo"
            className="w-6 h-6 flex items-center justify-center rounded text-[#D7E2EA]/50 hover:text-[#D7E2EA] hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer text-xs"
          >
            ↓
          </button>
          <button
            onClick={onDelete}
            disabled={busy}
            title="Eliminar plan"
            className="w-6 h-6 flex items-center justify-center rounded text-red-400/60 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-40 cursor-pointer text-xs"
          >
            {busy ? '…' : '✕'}
          </button>
        </div>
      </div>

      <Field label="Nombre del plan">
        <input value={plan.name} onChange={(e) => onFieldChange('name', e.target.value)} className={inputClass} />
      </Field>

      <Field label="Tagline">
        <input value={plan.tagline} onChange={(e) => onFieldChange('tagline', e.target.value)} className={inputClass} />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Precio">
          <input value={plan.price} onChange={(e) => onFieldChange('price', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Duración">
          <input value={plan.duration} onChange={(e) => onFieldChange('duration', e.target.value)} className={inputClass} />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[#D7E2EA]/40 uppercase tracking-widest font-medium text-xs">
          Incluye ({plan.includes.length})
        </span>
        {plan.includes.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(e) => onIncludeChange(i, e.target.value)}
              className={inputClass}
            />
            <button
              onClick={() => onRemoveInclude(i)}
              title="Quitar"
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-400/10 cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={onAddInclude}
          className="self-start text-[#00F3B6] text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity duration-200"
        >
          + Agregar característica
        </button>
      </div>
    </div>
  );
}
