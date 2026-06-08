'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, FileText, X } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/ui/toast'

export function UploadDropzone({ orgId }: { orgId: string }) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<{ [key: string]: number }>({})

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    }
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    setUploading(true)

    // Simulate upload for now
    for (const file of files) {
      setProgress(prev => ({ ...prev, [file.name]: 0 }))
      
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('orgId', orgId)
        
        // Basic progress simulation since fetch doesn't support upload progress natively
        // In a real app we might use XMLHttpRequest for real progress
        setProgress(prev => ({ ...prev, [file.name]: 50 }))
        
        const response = await fetch('/api/ingest', { 
          method: 'POST', 
          body: formData 
        })
        
        if (!response.ok) {
          // Surface the server's actual error message so users (and logs) see the cause
          const detail = await response.text().catch(() => '')
          throw new Error(detail || `Upload failed (${response.status})`)
        }

        setProgress(prev => ({ ...prev, [file.name]: 100 }))
        notify.success(`Uploaded ${file.name}`)
      } catch (error) {
        console.error('Failed to upload file:', file.name, error)
        notify.error(`Failed to upload ${file.name}`)
        setProgress(prev => ({ ...prev, [file.name]: -1 }))
      }
    }

    setUploading(false)
    setFiles([])
    setProgress({})
    // Trigger refresh of document list
  }

  return (
    <div className="w-full">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="bg-primary/10 p-4 rounded-full">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-medium">Click or drag and drop files here</p>
            <p className="text-sm text-muted-foreground mt-1">Supports PDF, DOCX, TXT, and MD files</p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-4">
          <h4 className="text-sm font-medium font-mono uppercase tracking-wider text-muted-foreground">Files to upload</h4>
          <div className="space-y-3">
            {files.map((file, index) => (
              <div key={index} className="flex flex-col bg-card border border-border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  {!uploading && (
                    <Button variant="ghost" size="icon" onClick={() => removeFile(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {uploading && progress[file.name] !== undefined && (
                  <div className="mt-3">
                    <Progress value={progress[file.name]} className="h-1.5" aria-label={`Upload progress for ${file.name}`} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Files'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
