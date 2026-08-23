import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const IMAGE_BUCKET = 'site-images';
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Sube un archivo al bucket 'site-images' bajo `<pathPrefix>/<timestamp>.<ext>`
 * (nombre único, nunca pisa una subida anterior) y devuelve la URL pública,
 * o `null` si falla (el motivo queda en `error`).
 *
 * Mismo bucket y mismo límite de 5MB en todos los lugares que suben
 * imágenes (editor de contenido, editor de proyectos). El llamador es
 * responsable de que `pathPrefix` incluya el site_id cuando corresponda,
 * para no mezclar archivos de distintos sitios bajo el mismo prefijo.
 */
export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File, pathPrefix: string): Promise<string | null> {
    setError(null);

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError(`La imagen no debe superar 5MB (seleccionaste ${(file.size / 1024 / 1024).toFixed(1)}MB).`);
      return null;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${pathPrefix}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
      return data.publicUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error subiendo la imagen');
      return null;
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading, error };
}
