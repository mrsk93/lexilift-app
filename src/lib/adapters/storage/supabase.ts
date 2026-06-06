import { StorageAdapter } from './interface'
import { createAdminClient } from '@/lib/supabase/admin'

export class SupabaseStorageAdapter implements StorageAdapter {
  private supabase

  constructor() {
    this.supabase = createAdminClient()
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
