'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { IconSend, IconStop } from '@/components/assistant/icons';
import styles from '@/components/assistant/assistant.module.css';

/**
 * Composer del asistente. En stream, Enviar pasa a Parar (abort).
 */
export function Composer({
  disabled,
  streaming,
  onSend,
  onStop,
  placeholder = 'Preguntame',
  ariaLabel = 'Mensaje para el asistente',
}: {
  disabled: boolean;
  streaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [text, setText] = useState('');

  function submit(): void {
    const trimmed = text.trim();
    if (!trimmed || disabled || streaming) {
      return;
    }
    onSend(trimmed);
    setText('');
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    if (streaming) {
      onStop();
      return;
    }
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  const canSend = !disabled && text.trim().length > 0;

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <div className={styles.pill}>
        <textarea
          className={styles.field}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || streaming}
          rows={1}
          maxLength={8000}
          placeholder={placeholder}
          aria-label={ariaLabel}
        />
        {streaming ? (
          <button
            type="button"
            className={`${styles.send} ${styles.sendReady}`}
            onClick={onStop}
            aria-label="Parar"
          >
            <IconStop />
          </button>
        ) : (
          <button
            type="submit"
            className={`${styles.send} ${canSend ? styles.sendReady : ''}`}
            disabled={!canSend}
            aria-label="Enviar"
          >
            <IconSend />
          </button>
        )}
      </div>
    </form>
  );
}
