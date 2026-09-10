/**
 * Mock del home de la app afiliado (wireframe §1), para el hero.
 */
export function AppHomeMock() {
  return (
    <div className="mkt-app-mock">
      <header className="mkt-app-mock-head">
        <p className="mkt-app-mock-gym">Studio Norte</p>
        <p className="mkt-app-mock-hi">Hola, Ana</p>
      </header>
      <div className="mkt-app-mock-card">
        <p className="muted small">Estado de cuenta</p>
        <p className="mkt-app-mock-pack">Mensual full</p>
        <p className="muted">Vence 30/09 · al día</p>
        <p className="mkt-app-mock-credits">8 créditos</p>
      </div>
      <div className="mkt-app-mock-actions">
        <span>Reservar</span>
        <span className="is-accent">Mi QR</span>
        <span>Pagar</span>
      </div>
      <nav className="mkt-app-mock-nav" aria-hidden="true">
        <span className="is-on">Inicio</span>
        <span>Acceso</span>
        <span>Ajustes</span>
      </nav>
    </div>
  );
}
