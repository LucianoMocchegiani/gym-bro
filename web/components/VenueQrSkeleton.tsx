export function VenueQrSkeleton({ size = 280 }: { size?: number }) {
  return (
    <div className="venue-qr">
      <div
        className="venue-qr-skeleton"
        style={{ '--qr-size': `${size}px` } as React.CSSProperties}
        aria-label="Generando QR"
      />
      <p className="muted small venue-qr-token">Generando QR…</p>
    </div>
  );
}