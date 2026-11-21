/** Pantalla mientras se verifica la sesión con el servidor */
function PantallaCarga() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--color-text-muted)' }}>
      <p role="status">Cargando…</p>
    </div>
  );
}

export default PantallaCarga;
