export default function Card({ children, style, padding = '20px' }) {
  return (
    <div style={{ ...styles.card, padding, ...style }}>
      {children}
    </div>
  )
}

const styles = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
  },
}
