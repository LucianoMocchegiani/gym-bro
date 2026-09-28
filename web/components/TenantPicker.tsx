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
import { listPlatformTenants } from '@/lib/api/tenants';
import type { PlatformTenantSummary } from '@/lib/api/tenants';

type TenantPickerProps = {
  value: string;
  onChange: (tenantId: string) => void;
  onSelect?: (tenant: PlatformTenantSummary) => void;
  displayLabel?: string;
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
};

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

export function TenantPicker({
  value,
  onChange,
  onSelect,
  displayLabel,
  label,
  placeholder = 'Buscar por nombre o slug…',
  autoFocus = false,
}: TenantPickerProps) {
  const [query, setQuery] = useState('');
  const [labelText, setLabelText] = useState(
    value && displayLabel ? displayLabel : '',
  );
  const [prevValue, setPrevValue] = useState(value);
  const [prevDisplayLabel, setPrevDisplayLabel] = useState(displayLabel);
  if (value !== prevValue || displayLabel !== prevDisplayLabel) {
    setPrevValue(value);
    setPrevDisplayLabel(displayLabel);
    if (value === '') {
      setLabelText('');
    } else if (displayLabel) {
      setLabelText(displayLabel);
    }
  }
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PlatformTenantSummary[]>([]);
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
        const res = await listPlatformTenants({
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
            : 'No se pudo buscar gyms',
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
      void runSearch(query || labelText, 1, false);
    }
  }

  function handleSelect(t: PlatformTenantSummary) {
    onChange(t.id);
    setLabelText(t.name?.trim() || t.slug);
    setQuery('');
    setResults([]);
    setOpen(false);
    inputRef.current?.blur();
    onSelect?.(t);
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
      const t = results[highlight];
      if (t) {
        e.preventDefault();
        handleSelect(t);
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
          {error ? (
            <p className="muted small member-picker-note">{error}</p>
          ) : null}
          {results.length === 0 && !loading && !error ? (
            <p className="muted small member-picker-note">Sin resultados</p>
          ) : null}
          {results.map((t, i) => (
            <button
              key={t.id}
              type="button"
              role="option"
              aria-selected={i === highlight}
              className={`member-picker-item${i === highlight ? ' highlighted' : ''}`}
              onClick={() => handleSelect(t)}
            >
              <span className="member-picker-name">
                {t.name?.trim() || t.slug}
              </span>
              {t.name?.trim() ? (
                <span className="muted small member-picker-email">
                  {t.slug} · {t.status}
                </span>
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