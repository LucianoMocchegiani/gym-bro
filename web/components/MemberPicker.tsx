'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import { ApiClientError } from '@/lib/api/client';
import { listMembers } from '@/lib/api/members';
import type { MemberDetail } from '@/lib/api/members';

type MemberPickerProps = {
  value: string;
  onChange: (memberId: string) => void;
  /** Callback con el detalle del afiliado elegido (sin refetch). */
  onSelect?: (member: MemberDetail) => void;
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
};

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

/**
 * Combobox de afiliados con búsqueda server-side (`q` + paginado) y debounce.
 *
 * @remarks Reemplaza el patrón "cargar 100 y filtrar client-side".
 */
export function MemberPicker({
  value,
  onChange,
  onSelect,
  label,
  placeholder = 'Buscar por nombre o email…',
  autoFocus = false,
}: MemberPickerProps) {
  const [query, setQuery] = useState('');
  const [labelText, setLabelText] = useState('');
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value === '') {
      setLabelText('');
    }
  }
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<MemberDetail[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | undefined>(undefined);
  const searchSeq = useRef(0);
  const rootId = useId();

  const runSearch = useCallback(
    async (q: string, pageToLoad: number, append: boolean) => {
      const seq = ++searchSeq.current;
      setLoading(true);
      setError(null);
      try {
        const res = await listMembers({
          status: 'ACTIVE',
          q: q.trim() || undefined,
          page: pageToLoad,
          pageSize: PAGE_SIZE,
          order: 'asc',
          orderBy: 'name',
        });
        if (seq !== searchSeq.current) {
          return;
        }
        setResults((prev) => (append ? [...prev, ...res.items] : res.items));
        setPage(pageToLoad);
        setHasMore(res.hasMore);
        setTotal(res.total);
      } catch (err) {
        if (seq !== searchSeq.current) {
          return;
        }
        setError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo buscar afiliados',
        );
      } finally {
        if (seq === searchSeq.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(() => {
    return () => {
      if (debounceRef.current !== undefined) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function handleInputChange(text: string) {
    setQuery(text);
    if (text !== labelText) {
      onChange('');
      setLabelText('');
    }
    setOpen(true);
    setHighlight(0);
    if (debounceRef.current !== undefined) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      void runSearch(text, 1, false);
    }, DEBOUNCE_MS);
  }

  function handleFocus() {
    setOpen(true);
    if (results.length === 0 && !loading) {
      void runSearch(query, 1, false);
    }
  }

  function handleSelect(m: MemberDetail) {
    onChange(m.id);
    setLabelText(m.name?.trim() || m.email);
    setQuery('');
    setResults([]);
    setOpen(false);
    // Saca el foco para que no quede el cursor titilando tras elegir.
    inputRef.current?.blur();
    onSelect?.(m);
  }

  function handleLoadMore() {
    void runSearch(query || labelText, page + 1, true);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      const m = results[highlight];
      if (m) {
        e.preventDefault();
        handleSelect(m);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  function handleBlur(e: FocusEvent<HTMLInputElement>) {
    if (
      e.relatedTarget &&
      !rootRef.current?.contains(e.relatedTarget as Node)
    ) {
      setOpen(false);
      // Si el usuario escribió pero no eligió de la lista y hay un único
      // resultado, lo tomamos para no quedar con el cobro deshabilitado.
      if (!labelText && results.length === 1) {
        handleSelect(results[0]);
      }
    }
  }

  const inputNode = (
    <div
      className={`member-picker${value ? ' member-picker--selected' : ''}`}
      ref={rootRef}
    >
      <input
        ref={inputRef}
        className="member-picker-input"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? `${rootId}-list` : undefined}
        aria-autocomplete="list"
        value={labelText || query}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      {value ? (
        <span className="member-picker-check" aria-hidden="true">
          ✓
        </span>
      ) : null}
      {open ? (
        <div
          id={`${rootId}-list`}
          className="member-picker-list"
          role="listbox"
          onMouseDown={(e) => e.preventDefault()}
        >
          {error ? <p className="muted small member-picker-note">{error}</p> : null}
          {results.length === 0 && !loading && !error ? (
            <p className="muted small member-picker-note">Sin resultados</p>
          ) : null}
          {results.map((m, i) => (
            <button
              key={m.id}
              type="button"
              role="option"
              aria-selected={i === highlight}
              className={`member-picker-item${i === highlight ? ' highlighted' : ''}`}
              onClick={() => handleSelect(m)}
            >
              <span className="member-picker-name">{m.name?.trim() || m.email}</span>
              {m.name?.trim() ? (
                <span className="muted small member-picker-email">{m.email}</span>
              ) : null}
            </button>
          ))}
          {loading ? (
            <p className="muted small member-picker-note">Buscando…</p>
          ) : null}
          {hasMore ? (
            <button
              type="button"
              className="linkish member-picker-more"
              onClick={handleLoadMore}
            >
              Cargar más ({total} en total)
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (label) {
    return (
      <label>
        {label}
        {inputNode}
      </label>
    );
  }
  return inputNode;
}