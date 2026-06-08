import { Body, Container, Head, Heading, Html, Preview, Section, Text, Button } from '@react-email/components'

export function WelcomeEmail({
  dashboardUrl,
  name,
}: {
  dashboardUrl: string
  name?: string | null
}) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to LexiLift — let&apos;s set up your first workspace</Preview>
      <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', padding: '32px', maxWidth: '480px', margin: '0 auto' }}>
          <Heading style={{ fontSize: '24px', marginBottom: '16px' }}>
            Welcome to LexiLift{name ? `, ${name}` : ''}!
          </Heading>
          <Text style={{ fontSize: '14px', color: '#525f7f', marginBottom: '24px' }}>
            You&apos;re all set. Start by uploading a document or pasting a URL — we&apos;ll index it in the background and you can chat with it in seconds.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button
              href={dashboardUrl}
              style={{ backgroundColor: '#006c49', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none' }}
            >
              Open dashboard
            </Button>
          </Section>
          <Text style={{ fontSize: '12px', color: '#8898aa' }}>
            Questions? Reply to this email — we read every one.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
