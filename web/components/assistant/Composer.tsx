'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';

/**
 * Composer del asistente. En stream, Enviar pasa a Parar (abort).
 */
export function Composer({
  disabled,
  streaming,
  onSend,
  onStop,
}: {
  disabled: boolean;
  streaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
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

  return (
    <form className="assistant-composer" onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || streaming}
        rows={2}
        maxLength={8000}
        placeholder="Preguntá por un afiliado, la caja, una sesión…"
        aria-label="Mensaje para el asistente"
      />
      {streaming ? (
        <button type="button" className="btn ghost" onClick={onStop}>
          Parar
        </button>
      ) : (
        <button type="submit" className="btn" disabled={disabled || !text.trim()}>
          Enviar
        </button>
      )}
    </form>
  );
}
