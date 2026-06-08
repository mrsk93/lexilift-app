export default function GoodbyePage() {
  return (
    <div className="mx-auto max-w-md space-y-3 p-8">
      <h1 className="text-xl font-semibold">Your account is scheduled for deletion</h1>
      <p className="text-sm text-gray-600">
        All your data will be permanently removed within 30 days. If you change your mind, sign
        back in within that window and cancel the deletion from Settings.
      </p>
    </div>
  )
}
