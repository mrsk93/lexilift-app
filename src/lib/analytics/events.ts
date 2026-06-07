export const EVENTS = {
  Signup: 'user.signup',
  WorkspaceCreated: 'workspace.created',
  DocumentUploaded: 'document.uploaded',
  DocumentFailed: 'document.failed',
  ChatStarted: 'chat.started',
  MessageSent: 'chat.message.sent',
  FeedbackGiven: 'chat.feedback',
  WidgetTokenCreated: 'widget.token.created',
  UpgradeClicked: 'billing.upgrade_clicked',
} as const

export type EventName = (typeof EVENTS)[keyof typeof EVENTS]
