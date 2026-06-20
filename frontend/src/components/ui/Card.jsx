export default function Card({ children, className = '', style }) {
  return (
    <div className={`bg-card border border-border rounded p-5 ${className}`} style={style}>
      {children}
    </div>
  )
}
