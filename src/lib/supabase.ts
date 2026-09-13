/**
 * ─── SUPABASE CLIENT ─────────────────────────────────────────────────────────
 * One shared client for the whole app. The URL and the anon key are public by
 * design: every table is protected by row level security (see supabase/04_rls.sql),
 * so the key alone grants nothing beyond what the signed-in user is allowed.
 *
 * Both values can be overridden with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 * when deploying against a different project.
 */
import { createClient } from '@supabase/supabase-js';

const env = (import.meta as any).env || {};

export const SUPABASE_URL: string =
  env.VITE_SUPABASE_URL || 'https://gnpcmmjhhgcwltkkkvgo.supabase.co';

export const SUPABASE_ANON_KEY: string =
  env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImducGNtbWpoaGdjd2x0a2trdmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMjU0NDksImV4cCI6MjEwNDkwMTQ0OX0.mbMzQs4TJ0Lrc6eDZblDn7zWVP9Z2-kfSwAu1oX31Bk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'bijouterie-auth',
  },
});

/** Storage buckets created by supabase/05_storage.sql. */
export const BUCKETS = {
  logos:    'store-logos',
  products: 'product-images',
  offers:   'offer-images',
  orders:   'order-images',
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

/**
 * Uploads a file and returns its public URL.
 * Images used to be inlined as base64 in the record itself; they now live in a
 * bucket and the table keeps only this URL.
 */
export const uploadImage = async (bucket: BucketName, file: File): Promise<string> => {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

/** Removes an image previously returned by uploadImage. Never throws. */
export const deleteImage = async (bucket: BucketName, publicUrl?: string | null): Promise<void> => {
  if (!publicUrl) return;
  const marker = `/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;                       // a base64 leftover or a foreign URL
  const path = publicUrl.slice(idx + marker.length);
  try { await supabase.storage.from(bucket).remove([path]); } catch { /* best effort */ }
};

/** True when a string is one of the legacy inline base64 images. */
export const isInlineImage = (v?: string | null): boolean => !!v && v.startsWith('data:');
