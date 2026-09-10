/**
 * Lista con checks en acento (mismo patrón que Kuatia CheckList).
 */
export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="mkt-checks">
      {items.map((item) => (
        <li key={item}>
          <span className="mkt-check" aria-hidden="true">
            ✓
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
