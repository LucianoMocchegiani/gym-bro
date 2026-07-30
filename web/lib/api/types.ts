/**
 * Tipos de respuestas de la API usadas por el panel Admin (puerta).
 */

export type StaffLoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  profileType: 'STAFF' | 'SUPER' | 'MEMBER';
  user: {
    id: string;
    email: string;
    name: string | null;
    tenantId?: string;
  };
};

export type AccessScanMode = 'gym_scans_member' | 'member_scans_gym';

export type AccessAttemptDetail = {
  id: string;
  tenantId: string;
  memberId: string | null;
  credentialRef: string | null;
  result: 'ALLOWED' | 'DENIED';
  reasonCode: string;
  scanMode: string;
  reservationId: string | null;
  sessionId: string | null;
  manualPass: boolean;
  motiveCode: string | null;
  note: string | null;
  actorStaffId: string | null;
  createdAt: string;
};

export type AccessVerifyResult = {
  allowed: boolean;
  reasonCode: string;
  memberId: string | null;
  reservationId: string | null;
  sessionId: string | null;
  checkedInAt: string | null;
  attempt: AccessAttemptDetail;
};

export type ManualPassMotive =
  | 'deuda'
  | 'olvido_celular'
  | 'cortesia'
  | 'otro';

export type MemberSummary = {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
};

export type ApiErrorBody = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};
