import { formatMoney } from '@/lib/cash-labels';

export type CartLineItem = {
  key: string;
  label: string;
  sub: string;
  price: number;
};

/**
 * Líneas de un carrito con quitar y total (Caja del staff y carrito del socio).
 */
export function CartLineList({
  items,
  total,
  onRemove,
}: {
  items: CartLineItem[];
  total: number;
  onRemove: (key: string) => void;
}) {
  return (
    <>
      <ul className="plain-list">
        {items.map((item) => (
          <li key={item.key} className="cart-line">
            <div>
              <p className="cart-name">{item.label}</p>
              {item.sub ? <p className="muted small">{item.sub}</p> : null}
              <p className="small">
                {item.price === 0 ? (
                  <span className="muted">Sin precio</span>
                ) : (
                  formatMoney(item.price)
                )}
              </p>
            </div>
            <button
              type="button"
              className="cart-remove"
              title="Quitar del carrito"
              aria-label={`Quitar ${item.label} del carrito`}
              onClick={() => onRemove(item.key)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="cart-total">
        <span>Total</span>
        <strong>{formatMoney(total)}</strong>
      </div>
    </>
  );
}
