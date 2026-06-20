export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={styles.wrap}>
      {Icon && (
        <div style={styles.iconWrap}>
          <Icon size={24} style={{ color: 'var(--text-3)' }} />
        </div>
      )}
      <div style={styles.title}>{title}</div>
      {description && <div style={styles.desc}>{description}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}

const styles = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    gap: 8,
    textAlign: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: 'var(--bg-hover)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-2)',
  },
  desc: {
    fontSize: 12,
    color: 'var(--text-3)',
    maxWidth: 280,
    lineHeight: 1.6,
  },
}
