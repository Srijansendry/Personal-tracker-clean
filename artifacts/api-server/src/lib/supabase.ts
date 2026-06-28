import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
        realtime: { transport: ws } as any,
      })
    : null;

export const BUCKET = "note-attachments";

export async function ensureBucket() {
  if (!supabase) return;
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 20971520,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"],
    });
    if (error) throw new Error(`Failed to create bucket: ${error.message}`);
  }
}

export async function uploadFile(
  buffer: Buffer,
  mimeType: string,
  folder: string,
  filename: string,
): Promise<string> {
  if (!supabase) throw new Error("File uploads are unavailable: Supabase is not configured");
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(publicUrl: string) {
  if (!supabase) return;
  try {
    const url = new URL(publicUrl);
    const parts = url.pathname.split(`/${BUCKET}/`);
    if (parts.length < 2) return;
    const path = parts[1];
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
  }
}
