export const metadata = { title: 'Terms of Service — LexiLift' }

export default function TermsPage() {
  return (
    <div className="prose max-w-2xl mx-auto p-8">
      <h1>Terms of Service</h1>
      <p>Last updated: {new Date().toISOString().slice(0, 10)}</p>
      <h2>1. Acceptance</h2>
      <p>By creating a LexiLift account, you agree to these terms.</p>
      <h2>2. Service</h2>
      <p>LexiLift provides a RAG-as-a-service platform. You retain ownership of your content; we process it solely to provide the service.</p>
      <h2>3. Acceptable use</h2>
      <p>No unlawful content, no attempt to circumvent rate limits, no resale of the service.</p>
      <h2>4. Termination</h2>
      <p>You may delete your account at any time. We may suspend accounts that violate these terms.</p>
      <h2>5. Liability</h2>
      <p>LexiLift is provided &quot;as is&quot; without warranty. Our liability is limited to fees paid in the last 12 months.</p>
      <h2>6. Governing law</h2>
      <p>These terms are governed by the laws of the State of Delaware, USA.</p>
    </div>
  )
}
