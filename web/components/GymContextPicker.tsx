'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/lib/api/client';
import { LoginPending } from '@/components/LoginPending';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  enterGym,
  homeForProfile,
  profileForPath,
  resolveGymProfiles,
  signOutOfGym,
  type GymProfile,
  type GymProfiles,
} from '@/lib/auth/gym-context';
import { useIdentityAuth } from '@/lib/auth/IdentityAuthProvider';

function enterError(err: unknown): string {
  return err instanceof ApiClientError ? err.message : 'No se pudo entrar';
}

type AutoStep =
  | { kind: 'enter'; tenantId: string; profile: GymProfile }
  | { kind: 'redirect'; path: string };

/**
 * Sin elección del usuario: perfil pedido por `?next=` o el único que tiene.
 * Si no es parte del gym y venía a comprar, la compra hace el alta.
 */
function autoStep(
  profiles: GymProfiles | null,
  nextPath: string | null,
): AutoStep | null {
  if (!profiles) {
    return null;
  }
  const preferred = profileForPath(nextPath);
  if (!profiles.tenantId) {
    return preferred === 'MEMBER' && nextPath?.startsWith('/comprar')
      ? { kind: 'redirect', path: nextPath }
      : null;
  }
  const available: GymProfile[] = [];
  if (profiles.staff) available.push('STAFF');
  if (profiles.member) available.push('MEMBER');
  const profile =
    preferred && available.includes(preferred)
      ? preferred
      : available.length === 1
        ? available[0]
        : null;
  return profile ? { kind: 'enter', tenantId: profiles.tenantId, profile } : null;
}

/**
 * Con la cuenta Faciliter ya logueada: staff → panel, socio → portal, ambos →
 * pregunta (como la app).
 */
export function GymContextPicker({
  slug,
  gymName,
  nextPath,
}: {
  slug: string;
  gymName: string;
  nextPath: string | null;
}) {
  const router = useRouter();
  const { session: identity } = useIdentityAuth();
  const [profiles, setProfiles] = useState<GymProfiles | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);
  const auto = useMemo(() => autoStep(profiles, nextPath), [profiles, nextPath]);

  const enterAndGo = useCallback(
    async (tenantId: string, profile: GymProfile) => {
      await enterGym({ slug, tenantId, profile });
      router.replace(
        profileForPath(nextPath) === profile && nextPath
          ? nextPath
          : homeForProfile(profile),
      );
    },
    [slug, nextPath, router],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const found = await resolveGymProfiles(slug);
        if (!cancelled) {
          setProfiles(found);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'No se pudo leer tu cuenta',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!auto) {
      return;
    }
    if (auto.kind === 'redirect') {
      router.replace(auto.path);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await enterAndGo(auto.tenantId, auto.profile);
      } catch (err) {
        if (!cancelled) {
          setError(enterError(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auto, enterAndGo, router]);

  if (error) {
    return (
      <PickerCard slug={slug} gymName={gymName}>
        <p className="error">{error}</p>
        <SwitchAccountButton />
      </PickerCard>
    );
  }

  if (!profiles || auto || entering) {
    return <LoginPending message="Entrando…" />;
  }

  if (!profiles.tenantId) {
    return (
      <PickerCard slug={slug} gymName={gymName}>
        <p className="muted">
          Tu cuenta {identity?.email} todavía no es socia de {gymName}.
        </p>
        <Link className="btn primary" href="/">
          Ver planes
        </Link>
        <SwitchAccountButton />
      </PickerCard>
    );
  }

  const tenantId = profiles.tenantId;
  const choose = (profile: GymProfile) => {
    setEntering(true);
    enterAndGo(tenantId, profile).catch((err: unknown) => {
      setError(enterError(err));
      setEntering(false);
    });
  };
  return (
    <PickerCard slug={slug} gymName={gymName}>
      <p className="muted">¿Cómo querés entrar?</p>
      <button type="button" className="btn primary" onClick={() => choose('STAFF')}>
        Panel del gym (staff)
      </button>
      <button type="button" className="btn" onClick={() => choose('MEMBER')}>
        Mi cuenta de socio
      </button>
      <SwitchAccountButton />
    </PickerCard>
  );
}

function PickerCard({
  slug,
  gymName,
  children,
}: {
  slug: string;
  gymName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="login-page">
      <div className="login-theme-slot">
        <ThemeToggle />
      </div>
      <div className="login-card">
        <p className="brand">{slug}</p>
        <h1>{gymName}</h1>
        {children}
      </div>
    </div>
  );
}

export function SwitchAccountButton() {
  return (
    <p className="muted small">
      <button
        type="button"
        className="linkish"
        onClick={() => void signOutOfGym()}
      >
        Usar otra cuenta
      </button>
    </p>
  );
}
