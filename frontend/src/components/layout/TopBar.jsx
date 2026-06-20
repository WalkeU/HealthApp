export default function TopBar({ title, children }) {
  return (
    <div style={styles.bar}>
      <span className="page-title">{title}</span>
      {children && <div style={styles.actions}>{children}</div>}
    </div>
  )
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
}
