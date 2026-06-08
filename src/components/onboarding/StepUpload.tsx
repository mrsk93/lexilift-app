'use client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FileUp } from 'lucide-react'

export function StepUpload({ onNext }: { onNext: () => void }) {
  const router = useRouter()
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-heading font-bold">Upload your first document</h2>
        <p className="text-sm text-muted-foreground mt-1">
          PDFs, DOCX, TXT, or paste a URL. We&apos;ll process it in the background.
        </p>
      </div>
      <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/30">
        <FileUp className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          You&apos;ll upload from the Documents page.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={() => router.push('/dashboard/documents')}>
          Go to Documents
        </Button>
        <Button variant="ghost" onClick={onNext}>
          Skip for now
        </Button>
      </div>
    </div>
  )
}
