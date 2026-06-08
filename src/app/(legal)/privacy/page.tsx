export const metadata = { title: 'Privacy Policy — LexiLift' }

export default function PrivacyPage() {
  return (
    <div className="prose max-w-2xl mx-auto p-8">
      <h1>Privacy Policy</h1>
      <p>Last updated: {new Date().toISOString().slice(0, 10)}</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account email, name, and auth provider (Supabase Auth).</li>
        <li>Documents you upload and chat messages you send.</li>
        <li>Usage telemetry: API call counts, feature usage, error reports (Sentry), page views (PostHog).</li>
        <li>Billing data managed by Polar.sh — we do not store card numbers.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To provide the service, improve it, and respond to support requests. We do not sell your data.</p>
      <h2>Sub-processors</h2>
      <ul>
        <li>Supabase (Postgres + Auth + Storage)</li>
        <li>Pinecone (vector index)</li>
        <li>Voyage AI, OpenAI, Anthropic, Google (LLM/embeddings — your data is not used to train their models)</li>
        <li>Polar.sh (billing)</li>
        <li>Resend (transactional email)</li>
        <li>Sentry (error monitoring)</li>
        <li>PostHog (product analytics)</li>
        <li>Vercel (hosting)</li>
        <li>Upstash (rate limit)</li>
      </ul>
      <h2>Your rights (GDPR)</h2>
      <p>You can export or delete your data from Settings. Email privacy@lexilift.dev for any other request. We respond within 30 days.</p>
      <h2>Data retention</h2>
      <p>Account data is retained until you delete your account. Soft-deleted accounts are hard-deleted within 30 days.</p>
      <h2>Contact</h2>
      <p>privacy@lexilift.dev</p>
    </div>
  )
}
