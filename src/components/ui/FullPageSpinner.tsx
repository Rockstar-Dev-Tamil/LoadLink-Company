export function FullPageSpinner() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Spinning indigo ring — pure CSS, no libraries */}
      <div style={{
        width: 40, height: 40,
        border: '3px solid rgba(99,102,241,0.2)',
        borderTopColor: '#6366F1',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
