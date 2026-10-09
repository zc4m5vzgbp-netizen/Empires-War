import { createClient } from '@supabase/supabase-js';
import { SAVE_FORMAT_VERSION } from './saveFormat.ts';
import { ConflictError, type CloudApi, type SlotMeta } from './saveManager.ts';

// Conexión con Supabase. La clave es PÚBLICA (sb_publishable_…): está pensada para el navegador y solo da
// acceso a lo que permiten las políticas RLS. Nunca se debe poner aquí una clave secreta.
export const SUPABASE_URL = 'https://swwzcrtmmsohgzuzvbec.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_CfLrQ2LO3FQw6G1-dEp7Tw_kpFf5mC9';
export const SITE_URL = 'https://zc4m5vzgbp-netizen.github.io/Empires-War/';

export const cloud = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // «implicit»: el enlace del correo funciona aunque se abra en otro navegador (p. ej. dentro de la app de Gmail).
    flowType: 'implicit',
  },
});

/** Código de PostgreSQL que save_empire usa para «revisión distinta / partida ajena o inexistente». */
const CONFLICT_CODE = '40001';

function fail(error: { message: string; code?: string } | null, what: string): never {
  if (error?.code === CONFLICT_CODE) throw new ConflictError(error.message);
  throw new Error(`${what}: ${error?.message ?? 'respuesta vacía'}`);
}

export const cloudApi: CloudApi = {
  async list(): Promise<SlotMeta[]> {
    // Solo metadatos: el estado completo se descarga al cargar un imperio concreto.
    const { data, error } = await cloud
      .from('game_saves')
      .select('id,title,revision,updated_at')
      .order('updated_at', { ascending: false });
    if (error) fail(error, 'No se pudo listar los imperios');
    return (data ?? []).map((r) => ({ id: r.id as string, title: r.title as string, revision: Number(r.revision), updatedAt: r.updated_at as string }));
  },
  async fetch(id) {
    const { data, error } = await cloud.from('game_saves').select('id,title,revision,updated_at,state').eq('id', id).maybeSingle();
    if (error) fail(error, 'No se pudo descargar el imperio');
    if (!data) return null;
    return {
      id: data.id as string,
      title: data.title as string,
      revision: Number(data.revision),
      updatedAt: data.updated_at as string,
      data: JSON.stringify(data.state),
    };
  },
  async save(id, expectedRevision, title, serialized) {
    const { data, error } = await cloud.rpc('save_empire', {
      p_id: id,
      p_expected_revision: expectedRevision,
      p_title: title,
      p_save_format: SAVE_FORMAT_VERSION,
      p_state: JSON.parse(serialized),
    });
    if (error) fail(error, 'La nube rechazó el guardado');
    const row = (data as { save_id: string; new_revision: number | string; saved_at: string }[] | null)?.[0];
    if (!row) throw new Error('La nube no confirmó el guardado.');
    return { id: row.save_id, revision: Number(row.new_revision), savedAt: row.saved_at };
  },
};

/** Envía el correo de acceso (enlace y, si la plantilla lo incluye, código de 6 dígitos). */
export async function emailLogin(email: string): Promise<void> {
  const { error } = await cloud.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: SITE_URL } });
  if (error) throw new Error(error.message);
}
export async function verifyEmailCode(email: string, token: string): Promise<void> {
  const { error } = await cloud.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'email' });
  if (error) throw new Error(error.message);
}
export async function logout(): Promise<void> {
  // scope 'local': cierra la sesión en este dispositivo aunque no haya red.
  const { error } = await cloud.auth.signOut({ scope: 'local' });
  if (error) throw new Error(error.message);
}
