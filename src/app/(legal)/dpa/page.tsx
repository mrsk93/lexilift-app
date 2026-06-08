export const metadata = { title: 'Data Processing Addendum — LexiLift' }

export default function DpaPage() {
  return (
    <div className="prose max-w-2xl mx-auto p-8">
      <h1>Data Processing Addendum</h1>
      <p>This DPA supplements our Terms of Service and reflects our GDPR Art. 28 obligations as a processor.</p>
      <h2>1. Roles</h2>
      <p>You are the Controller. We are the Processor.</p>
      <h2>2. Subject matter</h2>
      <p>Processing of Customer Content (documents, chat messages) to provide the LexiLift service.</p>
      <h2>3. Duration</h2>
      <p>For the term of the agreement plus 30 days for deletion.</p>
      <h2>4. Nature and purpose</h2>
      <p>Embedding, indexing, retrieval-augmented generation, and storage of Customer Content.</p>
      <h2>5. Categories of data</h2>
      <p>Any text or document content the Customer chooses to upload. No special categories of personal data are knowingly processed.</p>
      <h2>6. Sub-processors</h2>
      <p>See Privacy Policy. We notify Customers of new sub-processors 30 days in advance.</p>
      <h2>7. Security</h2>
      <p>Encryption in transit (TLS 1.2+). Encryption at rest (Supabase). RLS on all data. Sentry scrubbing of PII. Annual SOC 2 review target (Q3 2026).</p>
      <h2>8. Assistance</h2>
      <p>We assist with data subject requests via the in-app export/delete tools and via privacy@lexilift.dev.</p>
      <h2>9. Standard Contractual Clauses</h2>
      <p>For transfers outside the EEA, the EU Commission&apos;s 2021 SCCs apply.</p>
    </div>
  )
}
