'use client';

import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { ProposalCard, ProposalOutcome } from '@/lib/chat/proposal';
import styles from '@/components/assistant/assistant.module.css';

export type ProposalDecision = 'confirm' | 'cancel';

const STATUS_TEXT: Record<ProposalOutcome['status'], string> = {
  done: 'Hecho',
  failed: 'No se pudo',
  cancelled: 'Cancelada',
  expired: 'Venció',
};

/**
 * Tarjeta de una propuesta del asistente: datos resueltos + Confirmar / Cancelar.
 *
 * @remarks Nada se escribe sin este clic (RN-ASI-001). Peligrosas: escribir CONFIRMAR.
 * Vence a los 2 minutos; después solo informa.
 */
export function ProposalCardView({
  card,
  outcome,
  busy,
  onDecide,
}: {
  card: ProposalCard;
  outcome?: ProposalOutcome;
  busy: boolean;
  onDecide: (card: ProposalCard, decision: ProposalDecision) => void;
}) {
  const [timedOut, setTimedOut] = useState(false);
  const [askDanger, setAskDanger] = useState(false);

  useEffect(() => {
    if (outcome) {
      return;
    }
    const ms = Math.max(0, Date.parse(card.expiresAt) - Date.now());
    const timer = setTimeout(() => setTimedOut(true), ms);
    return () => clearTimeout(timer);
  }, [card.expiresAt, outcome]);

  const status = outcome?.status ?? (timedOut ? 'expired' : null);
  const message =
    outcome?.message ||
    (status === 'expired' ? 'La propuesta venció (2 minutos). Pedila de nuevo.' : '');

  function confirm(): void {
    if (card.dangerous) {
      setAskDanger(true);
      return;
    }
    onDecide(card, 'confirm');
  }

  return (
    <li className={`${styles.proposal} ${card.dangerous ? styles.proposalDanger : ''}`}>
      <p className={styles.proposalTitle}>{card.title}</p>
      <dl className={styles.proposalLines}>
        {card.lines.map((line, index) => (
          <div key={`${line.label}-${index}`} className={styles.proposalLine}>
            <dt>{line.label}</dt>
            <dd>{line.value}</dd>
          </div>
        ))}
      </dl>
      {status ? (
        <p
          className={`${styles.proposalStatus} ${status === 'done' ? styles.proposalOk : ''} ${status === 'failed' ? styles.proposalErr : ''}`}
        >
          <strong>{STATUS_TEXT[status]}.</strong> {message}
        </p>
      ) : (
        <div className={styles.proposalActions}>
          <button
            type="button"
            className={card.dangerous ? 'btn danger' : 'btn'}
            disabled={busy}
            onClick={confirm}
          >
            Confirmar
          </button>
          <button
            type="button"
            className="btn ghost"
            disabled={busy}
            onClick={() => onDecide(card, 'cancel')}
          >
            Cancelar
          </button>
          <span className={styles.proposalHint}>
            {card.dangerous ? 'Acción sensible: te pide escribir CONFIRMAR.' : 'No se hace nada hasta que confirmes.'}
          </span>
        </div>
      )}
      <ConfirmDialog
        open={askDanger}
        title={card.title}
        description="Es una acción sensible. Revisá los datos de la tarjeta."
        tone="danger"
        confirmWord="CONFIRMAR"
        busy={busy}
        onConfirm={() => {
          setAskDanger(false);
          onDecide(card, 'confirm');
        }}
        onCancel={() => setAskDanger(false)}
      />
    </li>
  );
}
