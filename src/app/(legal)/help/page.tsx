import Link from 'next/link'

export const metadata = { title: 'Help — LexiLift' }

export default function HelpPage() {
  return (
    <div className="prose max-w-2xl mx-auto p-8">
      <h1>Help</h1>
      <p>Read the <Link href="https://github.com/mrsk93/lexilift-app/blob/main/docs/user-guide.md" className="underline">user guide</Link> for full documentation.</p>
      <p>Email <a href="mailto:support@lexilift.dev">support@lexilift.dev</a> for assistance.</p>
    </div>
  )
}
