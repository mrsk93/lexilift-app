'use client'
import { formatAmount } from '@/lib/billing/invoice'
import { ExternalLink, FileText } from 'lucide-react'

export interface Invoice {
  id: string
  amountCents: number
  currency: string
  invoiceStatus: string
  hostedUrl: string | null
  pdfUrl: string | null
  createdAt: string | Date
}

const statusColors: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700',
  open: 'bg-amber-100 text-amber-700',
  void: 'bg-gray-100 text-gray-700',
  uncollectible: 'bg-red-100 text-red-700',
}

export function InvoiceList({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8 border rounded-lg">
        No invoices yet. Upgrade to a paid plan to see invoices here.
      </div>
    )
  }
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Date</th>
            <th className="text-left px-4 py-2 font-medium">Amount</th>
            <th className="text-left px-4 py-2 font-medium">Status</th>
            <th className="text-left px-4 py-2 font-medium">Receipt</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={i.id} className="border-t">
              <td className="px-4 py-2">{new Date(i.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-2 font-mono">{formatAmount(i.amountCents, i.currency)}</td>
              <td className="px-4 py-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[i.invoiceStatus] ?? 'bg-gray-100 text-gray-700'}`}>
                  {i.invoiceStatus}
                </span>
              </td>
              <td className="px-4 py-2">
                {i.hostedUrl ? (
                  <a className="text-emerald-600 underline inline-flex items-center gap-1" href={i.hostedUrl} target="_blank" rel="noreferrer">
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                ) : i.pdfUrl ? (
                  <a className="text-emerald-600 underline inline-flex items-center gap-1" href={i.pdfUrl} target="_blank" rel="noreferrer">
                    PDF <FileText className="w-3 h-3" />
                  </a>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
