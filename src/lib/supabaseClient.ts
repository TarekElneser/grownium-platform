import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno: define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env.'
  )
}

// Cliente único de Supabase para toda la plataforma.
// Usa la clave pública "anon": es segura para el navegador porque el acceso
// real a los datos se controla con Row Level Security (RLS) en Supabase,
// no con esta clave. Nunca uses aquí la contraseña de Postgres ni la
// "service_role key".
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
