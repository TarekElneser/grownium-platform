/**
 * Deriva un slug legible de un texto (nombre de proyecto, nombre de
 * persona, etc.). Usado en las pantallas de la plataforma para
 * identificadores estables que el usuario nunca escribe a mano — se
 * recalcula en cada guardado, así que renombrar el registro también
 * actualiza su slug.
 */
export function slugify(text: string, fallback = 'item'): string {
  const base = text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // quita acentos (tildes) tras normalizar
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || fallback;
}
