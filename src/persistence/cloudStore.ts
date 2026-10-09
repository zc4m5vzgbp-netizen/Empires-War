import { createClient } from '@supabase/supabase-js';
import { SAVE_FORMAT_VERSION } from './saveFormat.ts';

const url = 'https://swwzcrtmmsohgzuzvbec.supabase.co';
const key = 'sb_publishable_CfLrQ2LO3FQw6G1-dEp7Tw_kpFf5mC9';
export const cloud = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

export type CloudSlot = { id: string; title: string; revision: number; updated_at: string; state: unknown };
export async function signedIn() {
  const { data, error } = await cloud.auth.getUser();
  if (error) return null;
  return data.user;
}
export async function login(provider: 'google' | 'apple') {
  const { error } = await cloud.auth.signInWithOAuth({
    provider, options: { redirectTo: 'https://zc4m5vzgbp-netizen.github.io/Empires-War/' },
  });
  if (error) throw error;
}
export async function logout() {
  const { error } = await cloud.auth.signOut();
  if (error) throw error;
}
export async function listCloudSaves(): Promise<CloudSlot[]> {
  const { data, error } = await cloud.from('game_saves')
    .select('id,title,revision,updated_at,state').order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CloudSlot[];
}
export async function saveCloud(id: string | null, revision: number, title: string, serialized: string) {
  const { data, error } = await cloud.rpc('save_empire', {
    p_id: id, p_expected_revision: revision, p_title: title,
    p_save_format: SAVE_FORMAT_VERSION, p_state: JSON.parse(serialized),
  });
  if (error) throw error;
  const result = (data as { save_id: string; new_revision: number; saved_at: string }[] | null)?.[0];
  if (!result) throw new Error('La nube no confirmó el guardado.');
  return result;
}

export async function emailLogin(email: string): Promise<void> {
  const { error } = await cloud.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: 'https://zc4m5vzgbp-netizen.github.io/Empires-War/' },
  });
  if (error) throw error;
}
export async function verifyEmailCode(email: string, token: string): Promise<void> {
  const { error } = await cloud.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'email' });
  if (error) throw error;
}
