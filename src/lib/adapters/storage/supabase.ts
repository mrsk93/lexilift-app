import { StorageAdapter } from './interface'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

export class SupabaseStorageAdapter implements StorageAdapter {
  private supabase

  constructor() {
    this.supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  async uploadFile(path: string, file: File | Buffer): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from('documents')
      .upload(path, file, {
        upsert: true,
      })

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`)
    }

    const { data: { publicUrl } } = this.supabase.storage
      .from('documents')
      .getPublicUrl(path)

    return publicUrl
  }

  async deleteFile(path: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from('documents')
      .remove([path])

    if (error) {
      throw new Error(`Storage delete failed: ${error.message}`)
    }
  }
}

export function getStorage(): StorageAdapter {
  return new SupabaseStorageAdapter()
}
