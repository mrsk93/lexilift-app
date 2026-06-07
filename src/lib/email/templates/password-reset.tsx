import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text, Button } from '@react-email/components'

export function PasswordResetEmail({ resetUrl, expiresInMinutes = 60 }: { resetUrl: string; expiresInMinutes?: number }) {
  return (
    <Html>
      <Head />
      <Preview>Reset your LexiLift password</Preview>
      <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', padding: '32px', maxWidth: '480px', margin: '0 auto' }}>
          <Heading style={{ fontSize: '24px', marginBottom: '16px' }}>Reset your LexiLift password</Heading>
          <Text style={{ fontSize: '14px', color: '#525f7f', marginBottom: '24px' }}>
            We received a request to reset the password for your LexiLift account. Click the button below to choose a new password. This link expires in {expiresInMinutes} minutes.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={resetUrl} style={{ backgroundColor: '#006c49', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none' }}>
              Reset password
            </Button>
          </Section>
          <Text style={{ fontSize: '12px', color: '#8898aa' }}>
            If the button doesn&apos;t work, paste this URL into your browser:
            <br />
            <Link href={resetUrl} style={{ color: '#006c49' }}>{resetUrl}</Link>
          </Text>
          <Text style={{ fontSize: '12px', color: '#8898aa', marginTop: '24px' }}>
            If you didn&apos;t request this, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
