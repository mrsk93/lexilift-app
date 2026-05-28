export interface StorageAdapter {
  uploadFile(path: string, file: File | Buffer): Promise<string>
  deleteFile(path: string): Promise<void>
}
