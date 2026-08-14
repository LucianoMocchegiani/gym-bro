'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { ApiClientError } from '@/lib/api/client';
import { listRoles } from '@/lib/api/roles';
import type { RoleDetail } from '@/lib/api/roles';
import {
  getStaff,
  issueStaffCredentialOffer,
  listStaffCredentialOffers,
  setStaffRoles,
} from '@/lib/api/staff';
import type {
  StaffCredentialOfferItem,
  StaffUserDetail,
} from '@/lib/api/staff';

/**
 * Ficha staff: roles + credencial de acceso molinete (OID4VCI).
 *
 * @remarks CU-ROL-004. Emisión offer: `staff.write`. Sin fichaje en este slice.
 */
export default function StaffDetailPage() {
  return (
    <RequireStaff>
      <DetailInner />
    </RequireStaff>
  );
}

function DetailInner() {
  const params = useParams();
  const staffId = String(params.id);

  const [staff, setStaff] = useState<StaffUserDetail | null>(null);
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const [offer, setOffer] = useState<StaffCredentialOfferItem | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerOk, setOfferOk] = useState<string | null>(null);
  const [offerBusy, setOfferBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function loadOffer() {
    try {
      const result = await listStaffCredentialOffers(staffId, {
        pageSize: 1,
        order: 'desc',
      });
      setOffer(result.items[0] ?? null);
      setOfferError(null);
    } catch (err) {
      setOffer(null);
      setOfferError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cargar la credencial de acceso',
      );
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [s, rs] = await Promise.all([
          getStaff(staffId),
          listRoles({ pageSize: 100 }),
        ]);
        if (cancelled) {
          return;
        }
        setStaff(s);
        setRoles(rs.items);
        setRoleIds(s.roles.map((r) => r.id));
        setLoadError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar el staff',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [staffId]);

  useEffect(() => {
    void loadOffer();
  }, [staffId]);

  function toggleRole(id: string) {
    setRoleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const updated = await setStaffRoles(staffId, roleIds);
      setStaff(updated);
      setRoleIds(updated.roles.map((r) => r.id));
      setSaveOk(true);
    } catch (err) {
      setSaveError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudieron guardar los roles',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onIssueOffer() {
    setOfferBusy(true);
    setOfferError(null);
    setOfferOk(null);
    try {
      const issued = await issueStaffCredentialOffer(staffId, true);
      setOffer(issued);
      if (issued.status === 'FAILED') {
        setOfferError(
          issued.lastError ?? 'Kuatia no emitió el offer (soft-fail)',
        );
      } else {
        setOfferOk('Offer listo. Copiá el URI para la wallet del staff.');
      }
    } catch (err) {
      setOfferError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo emitir la credencial',
      );
    } finally {
      setOfferBusy(false);
    }
  }

  async function copyOfferUri() {
    if (!offer?.offerUri) {
      return;
    }
    try {
      await navigator.clipboard.writeText(offer.offerUri);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setOfferError('No se pudo copiar el URI');
    }
  }

  return (
    <AdminShell
      title={staff?.name ?? staff?.email ?? 'Staff'}
      actions={
        <Link href="/staff" className="btn ghost">
          Volver
        </Link>
      }
    >
      {loadError ? <p className="error">{loadError}</p> : null}
      {!staff && !loadError ? <p className="muted">Cargando…</p> : null}

      {staff ? (
        <>
          <Panel title="Roles asignados" className="form-panel">
            <p className="muted small">
              {staff.email}
              {!staff.active ? ' · inactivo' : ''}
            </p>
            <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
              <fieldset className="perm-checklist">
                <legend>Roles</legend>
                <p className="muted small">
                  Al guardar se reemplaza el set completo (puede quedar vacío).
                </p>
                {roles.map((r) => (
                  <label key={r.id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={roleIds.includes(r.id)}
                      onChange={() => toggleRole(r.id)}
                    />
                    {r.name}
                    <span className="muted small"> ({r.slug})</span>
                  </label>
                ))}
              </fieldset>

              {saveError ? <p className="error">{saveError}</p> : null}
              {saveOk ? <p className="ok-msg">Guardado.</p> : null}

              <button type="submit" className="primary" disabled={busy}>
                {busy ? 'Guardando…' : 'Guardar roles'}
              </button>
            </form>
          </Panel>

          <Panel
            title="Credencial de acceso (molinete)"
            description="VC de vínculo staff → misma puerta OID4VP. Roles se leen en DB al verificar. Sin fichaje aún."
            className="form-panel"
          >
            {offer ? (
              <ul className="plain-list">
                <li>
                  Estado: <strong>{offer.status}</strong>
                  {' · '}
                  {new Date(offer.updatedAt).toLocaleString('es-AR')}
                </li>
                {offer.lastError ? (
                  <li className="error">Error: {offer.lastError}</li>
                ) : null}
              </ul>
            ) : (
              <p className="muted">Sin offer todavía.</p>
            )}

            {offer?.offerUri ? (
              <div className="admin-stack">
                <label>
                  Offer URI
                  <input readOnly value={offer.offerUri} />
                </label>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => void copyOfferUri()}
                >
                  {copied ? 'Copiado' : 'Copiar URI'}
                </button>
              </div>
            ) : null}

            {offerError ? <p className="error">{offerError}</p> : null}
            {offerOk ? <p className="ok-msg">{offerOk}</p> : null}

            <button
              type="button"
              className="primary"
              disabled={offerBusy || !staff.active}
              onClick={() => void onIssueOffer()}
            >
              {offerBusy
                ? 'Emitiendo…'
                : offer
                  ? 'Re-emitir credencial'
                  : 'Emitir credencial'}
            </button>
          </Panel>
        </>
      ) : null}
    </AdminShell>
  );
}
