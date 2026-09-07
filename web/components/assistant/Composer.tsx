'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';

/**
 * Composer del asistente. Sin abort (C7).
 */
export function Composer({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState('');

  function submit(): void {
    const trimmed = text.trim();
    if (!trimmed || disabled) {
      return;
    }
    onSend(trimmed);
    setText('');
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
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
        disabled={disabled}
        rows={2}
        maxLength={8000}
        placeholder="Preguntá por un afiliado, la caja, una sesión…"
        aria-label="Mensaje para el asistente"
      />
      <button type="submit" className="btn" disabled={disabled || !text.trim()}>
        Enviar
      </button>
    </form>
  );
}
