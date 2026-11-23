import type { Metadata } from 'next';
import { AdminGrid, Panel } from '@/components/AdminUi';
import { AdminShell } from '@/components/AdminShell';
import { RequireStaff } from '@/components/RequireStaff';
import { StaffCredentialAccess } from '@/components/StaffCredentialAccess';

export const metadata: Metadata = {
  title: 'Mi credencial',
  robots: { index: false, follow: false },
};

export default function StaffCredentialPage() {
  return (
    <RequireStaff>
      <AdminShell title="Mi credencial">
        <AdminGrid>
          <Panel
            title="Credencial de acceso"
            description="Generá tu credencial de staff y guardala en Kuatia Wallet."
          >
            <StaffCredentialAccess />
          </Panel>
        </AdminGrid>
      </AdminShell>
    </RequireStaff>
  );
}
