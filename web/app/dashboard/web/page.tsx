'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { RequireStaff } from '@/components/RequireStaff';
import { SkeletonForm } from '@/components/Skeleton';
import { SiteEditor } from '@/components/site-editor/SiteEditor';
import { ApiClientError } from '@/lib/api/client';
import { listActivePacks, type PackSummary } from '@/lib/api/packs';
import { getTenantSite, type TenantSiteDetail } from '@/lib/api/tenant-site';
import { useAuth } from '@/lib/auth/AuthProvider';
import { hasAnyPermission } from '@/lib/nav-permissions';

/**
 * Sistema → Web del gym: portada y sliders de la web pública (RN-CTA-010).
 */
export default function WebDelGymPage() {
  return (
    <RequireStaff>
      <WebDelGymInner />
    </RequireStaff>
  );
}

function WebDelGymInner() {
  const { session } = useAuth();
  const canWrite = hasAnyPermission(session?.permissionCodes, [
    'tenant.settings.write',
  ]);
  const [detail, setDetail] = useState<TenantSiteDetail | null>(null);
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [site, packList] = await Promise.all([
          getTenantSite(),
          listActivePacks().catch(() => null),
        ]);
        if (!cancelled) {
          setDetail(site);
          setPacks(packList?.items ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof ApiClientError
              ? err.message
              : 'No se pudo cargar la web del gym',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminShell
      title="Web del gym"
      actions={
        <a className="btn ghost" href="/" target="_blank" rel="noreferrer">
          Ver mi web
        </a>
      }
    >
      {loadError ? <p className="error">{loadError}</p> : null}
      {notice ? <p className="ok-msg">{notice}</p> : null}
      {!detail && !loadError ? <SkeletonForm fields={4} /> : null}
      {detail ? (
        <SiteEditor
          key={version}
          detail={detail}
          packs={packs}
          canWrite={canWrite}
          onSaved={(saved, message) => {
            setDetail(saved);
            setNotice(message);
            setVersion((v) => v + 1);
          }}
        />
      ) : null}
    </AdminShell>
  );
}
