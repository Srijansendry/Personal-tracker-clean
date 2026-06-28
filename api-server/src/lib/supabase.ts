import { createClient, SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";
import fs from "fs";
import path from "path";

let _client: SupabaseClient | null = null;
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.log("[supabase] Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from process.env");
    return null;
  }
  if (!_client) {
    console.log(`[supabase] Connecting client to URL: ${url}`);
    _client = createClient(url, key, {
      auth: { persistSession: false },
      realtime: { transport: ws } as any,
    });
  }
  return _client;
}


export function isStorageAvailable() {
  return true;
}

export const BUCKET = "note-attachments";

export async function ensureBucket() {
  const supabase = getSupabase();
  if (!supabase) {
    try {
      fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
    } catch (err: any) {
    }
    return;
  }
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === BUCKET);
    if (!exists) {
      await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 20971520,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"],
      });
    }
  } catch (err: any) {
    console.warn(`[supabase] Storage init info: ${err?.message}`);
  }
}

export async function uploadFile(
  buffer: Buffer,
  mimeType: string,
  folder: string,
  filename: string,
): Promise<string> {
  const supabase = getSupabase();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileNameWithTimestamp = `${Date.now()}-${safe}`;

  if (!supabase) {
    const targetDir = path.join(LOCAL_UPLOADS_DIR, folder);
    fs.mkdirSync(targetDir, { recursive: true });
    const filePath = path.join(targetDir, fileNameWithTimestamp);
    fs.writeFileSync(filePath, buffer);
    return `/api/uploads/${folder}/${fileNameWithTimestamp}`;
  }

  const storagePath = `${folder}/${fileNameWithTimestamp}`;
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function deleteFile(publicUrl: string) {
  const supabase = getSupabase();
  if (!supabase) {
    try {
      if (publicUrl.startsWith("/api/uploads/")) {
        const relativePath = publicUrl.replace("/api/uploads/", "");
        const filePath = path.join(LOCAL_UPLOADS_DIR, relativePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch {
    }
    return;
  }
  try {
    const url = new URL(publicUrl);
    const parts = url.pathname.split(`/${BUCKET}/`);
    if (parts.length < 2) return;
    const storagePath = parts[1];
    await supabase.storage.from(BUCKET).remove([storagePath]);
  } catch {
  }
}
