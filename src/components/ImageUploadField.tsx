import { useImageUpload } from '../hooks/useImageUpload';

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  pathPrefix: string;
  buttonLabel?: string;
  /** Se llama con true/false al empezar/terminar una subida — útil para que
   * el contenedor (fila de campo, tarjeta de proyecto) deshabilite su
   * propio botón de guardar mientras hay un upload en curso. */
  onUploadingChange?: (uploading: boolean) => void;
}

/** Thumbnail + botón de subida, reutilizado por el editor de contenido
 * (campos type='image') y el editor de proyectos (foto, logo). */
export default function ImageUploadField({
  value,
  onChange,
  pathPrefix,
  buttonLabel = 'Cambiar imagen',
  onUploadingChange,
}: ImageUploadFieldProps) {
  const { upload, uploading, error } = useImageUpload();

  return (
    <div className="flex items-center gap-4">
      <img
        src={value || undefined}
        alt=""
        className="w-16 h-16 rounded-lg border border-[#D7E2EA]/15 object-cover flex-shrink-0 bg-[#D7E2EA]/5"
      />
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <label
          className={`inline-flex items-center gap-2 w-fit rounded-lg border border-[#D7E2EA]/15 px-3 py-2
            text-sm font-medium text-[#D7E2EA] transition-colors duration-200
            ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#00F3B6]'}`}
        >
          {uploading ? 'Subiendo…' : buttonLabel}
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              onUploadingChange?.(true);
              const url = await upload(file, pathPrefix);
              onUploadingChange?.(false);
              if (url) onChange(url);
            }}
          />
        </label>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    </div>
  );
}
