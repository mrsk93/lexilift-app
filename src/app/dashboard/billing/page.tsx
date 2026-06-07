import { Suspense } from 'react'
import { db } from '@/lib/db/client'
import { organizations, documents, widgetTokens, invoices } from '@/lib/db/schema'
import { and, count, desc, eq, isNull } from 'drizzle-orm'
import { requireAuth, requireOrgAccess } from '@/lib/auth/org-utils'
import { getCurrentOrgId } from '@/lib/auth/current-org'
import { BillingClient } from './BillingClient'
import { InvoiceList } from '@/components/billing/InvoiceList'

export default async function BillingPage() {
  await requireAuth()

  const currentOrgId = await getCurrentOrgId()
  if (!currentOrgId) return null

  await requireOrgAccess(currentOrgId)

  const [org] = await db
    .select({
      plan: organizations.plan,
      queryCount: organizations.queryCount,
      queryLimit: organizations.queryLimit,
    })
    .from(organizations)
    .where(eq(organizations.id, currentOrgId))
    .limit(1)

  const [docsRow] = await db
    .select({ value: count() })
    .from(documents)
    .where(and(eq(documents.orgId, currentOrgId), isNull(documents.deletedAt)))

  const [widgetsRow] = await db
    .select({ value: count() })
    .from(widgetTokens)
    .where(eq(widgetTokens.orgId, currentOrgId))

  const invoiceRows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.orgId, currentOrgId))
    .orderBy(desc(invoices.createdAt))

  const orgData = {
    plan: org?.plan ?? 'starter',
    queryCount: org?.queryCount ?? 0,
    queryLimit: org?.queryLimit ?? 500,
  }

  const mappedInvoices = invoiceRows.map((i) => ({
    id: i.id,
    amountCents: i.amountCents,
    currency: i.currency,
    invoiceStatus: i.invoiceStatus,
    hostedUrl: i.hostedUrl,
    pdfUrl: i.pdfUrl,
    createdAt: i.createdAt,
  }))

  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center p-8 text-muted-foreground">Loading billing...</div>}>
      <div className="space-y-8">
        <BillingClient
          org={orgData}
          documentsUsed={Number(docsRow?.value ?? 0)}
          widgetsUsed={Number(widgetsRow?.value ?? 0)}
        />
        <div>
          <h3 className="text-xl font-heading font-bold mb-4">Invoice History</h3>
          <InvoiceList invoices={mappedInvoices} />
        </div>
      </div>
    </Suspense>
  )
}
