import { Html, Heading, Text, Button, Section, Container } from '@react-email/components'

export interface InviteEmailProps {
  orgName: string
  inviterName: string
  acceptUrl: string
}

export function InviteEmail({ orgName, inviterName, acceptUrl }: InviteEmailProps) {
  return (
    <Html>
      <Container>
        <Heading>Join {orgName} on LexiLift</Heading>
        <Text>{inviterName} invited you to collaborate on their workspace.</Text>
        <Section>
          <Button href={acceptUrl}>Accept Invitation</Button>
        </Section>
        <Text>This link expires in 7 days.</Text>
      </Container>
    </Html>
  )
}
