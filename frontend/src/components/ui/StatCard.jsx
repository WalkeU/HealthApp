import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function StatCard({ label, value, unit, trend, sub }) {
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus
  const trendColor = trend > 0 ? 'var(--accent)' : trend < 0 ? 'var(--danger)' : 'var(--text-3)'

  return (
    <div style={styles.card}>
      <div style={styles.label}>{label}</div>
      <div style={styles.valueRow}>
        <span style={styles.value}>{value ?? '—'}</span>
        {unit && <span style={styles.unit}>{unit}</span>}
      </div>
      <div style={styles.meta}>
        {trend != null && (
          <span style={{ ...styles.trend, color: trendColor }}>
            <TrendIcon size={11} />
          </span>
        )}
        {sub && <span style={styles.sub}>{sub}</span>}
      </div>
    </div>
  )
}

const styles = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-3)',
    marginBottom: 4,
  },
  valueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--text)',
    lineHeight: 1,
    letterSpacing: '-0.02em',
  },
  unit: {
    fontSize: 11,
    color: 'var(--text-2)',
    fontWeight: 500,
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  trend: {
    display: 'flex',
    alignItems: 'center',
  },
  sub: {
    fontSize: 11,
    color: 'var(--text-3)',
  },
}
