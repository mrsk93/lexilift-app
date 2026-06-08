import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockListBuckets, mockCreateBucket, mockUpload, mockGetPublicUrl, mockRemove } = vi.hoisted(() => ({
  mockListBuckets: vi.fn(),
  mockCreateBucket: vi.fn(),
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
  mockRemove: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    storage: {
      listBuckets: mockListBuckets,
      createBucket: mockCreateBucket,
      from: () => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
        remove: mockRemove,
      }),
    },
  }),
}))

import { SupabaseStorageAdapter } from './supabase'

describe('SupabaseStorageAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://x/y' } })
    mockUpload.mockResolvedValue({ data: { path: 'p' }, error: null })
    mockRemove.mockResolvedValue({ data: null, error: null })
  })

  it('creates the bucket on first upload if it does not exist', async () => {
    mockListBuckets.mockResolvedValue({ data: [], error: null })
    mockCreateBucket.mockResolvedValue({ data: { name: 'documents' }, error: null })

    const storage = new SupabaseStorageAdapter()
    const url = await storage.uploadFile('org/x.txt', new Blob(['hi']) as unknown as File)

    expect(mockCreateBucket).toHaveBeenCalledWith(
      'documents',
      expect.objectContaining({ public: true })
    )
    expect(url).toBe('https://x/y')
  })

  it('skips createBucket when bucket already exists', async () => {
    mockListBuckets.mockResolvedValue({ data: [{ name: 'documents' }, { name: 'other' }], error: null })

    const storage = new SupabaseStorageAdapter()
    await storage.uploadFile('org/x.txt', new Blob(['hi']) as unknown as File)

    expect(mockCreateBucket).not.toHaveBeenCalled()
  })

  it('surfaces upload errors with context', async () => {
    mockListBuckets.mockResolvedValue({ data: [{ name: 'documents' }], error: null })
    mockUpload.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    const storage = new SupabaseStorageAdapter()
    await expect(storage.uploadFile('org/x.txt', new Blob(['hi']) as unknown as File)).rejects.toThrow(
      /Storage upload failed.*permission denied/
    )
  })

  it('caches the ensureBucket promise across calls (idempotent)', async () => {
    mockListBuckets.mockResolvedValue({ data: [], error: null })
    mockCreateBucket.mockResolvedValue({ data: { name: 'documents' }, error: null })

    const storage = new SupabaseStorageAdapter()
    await storage.uploadFile('a.txt', new Blob(['1']) as unknown as File)
    await storage.uploadFile('b.txt', new Blob(['2']) as unknown as File)
    await storage.deleteFile('a.txt')

    expect(mockListBuckets).toHaveBeenCalledTimes(1)
    expect(mockCreateBucket).toHaveBeenCalledTimes(1)
  })
})
