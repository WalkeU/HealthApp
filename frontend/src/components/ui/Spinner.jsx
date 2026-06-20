export default function Spinner({ size = 20 }) {
  return (
    <div className="flex items-center justify-center p-6">
      <div
        className="rounded-full border-2 border-border border-t-accent animate-spin"
        style={{ width: size, height: size }}
      />
    </div>
  )
}
