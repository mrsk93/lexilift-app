import { StorageAdapter } from './interface'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET_NAME = 'documents'

export class SupabaseStorageAdapter implements StorageAdapter {
  private supabase
  private bucketEnsured: Promise<void> | null = null

  constructor() {
    this.supabase = createAdminClient()
  }

  /**
   * Idempotently create the storage bucket if it doesn't exist.
   * Safe to call from every upload — caches the promise so only one
   * listBuckets/createBucket round-trip happens per process.
   */
  private async ensureBucket(): Promise<void> {
    if (this.bucketEnsured) return this.bucketEnsured
    this.bucketEnsured = (async () => {
      const { data: buckets } = await this.supabase.storage.listBuckets()
      if (buckets?.some((b) => b.name === BUCKET_NAME)) return
      const { error } = await this.supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 50 * 1024 * 1024, // 50 MB
      })
      // Race: another concurrent request may have created it
      if (error && !/already exists/i.test(error.message)) {
        throw new Error(`Failed to create storage bucket: ${error.message}`)
      }
    })()
    return this.bucketEnsured
  }

  async uploadFile(path: string, file: File | Buffer): Promise<string> {
    await this.ensureBucket()

    const { error } = await this.supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        upsert: true,
      })

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`)
    }

    const { data: { publicUrl } } = this.supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path)

    return publicUrl
  }

  async deleteFile(path: string): Promise<void> {
    await this.ensureBucket()

    const { error } = await this.supabase.storage
      .from(BUCKET_NAME)
      .remove([path])

    if (error) {
      throw new Error(`Storage delete failed: ${error.message}`)
    }
  }
}

export function getStorage(): StorageAdapter {
  return new SupabaseStorageAdapter()
}
