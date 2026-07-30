/**
 * Tipos de respuestas de la API usadas por el panel Admin.
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

export type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

export type MemberDetail = {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  phone: string | null;
  document: string | null;
  branchId: string | null;
  status: MemberStatus;
  createdAt: string;
  updatedAt: string;
};

/** Alias usado por pase manual. */
export type MemberSummary = MemberDetail;

export type CreateMemberInput = {
  email: string;
  password: string;
  name: string;
  phone?: string;
  document?: string;
};

export type UpdateMemberInput = {
  email?: string;
  name?: string;
  phone?: string | null;
  document?: string | null;
};

export type ContractCreditBalance = {
  id?: string;
  serviceId: string;
  serviceName: string;
  remaining: number;
  initialAmount?: number;
};

export type ContractDetail = {
  id: string;
  packId: string;
  packName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
  startsAt: string;
  endsAt: string | null;
  hasAccessLibre: boolean;
  creditBalances: ContractCreditBalance[];
};

export type MemberAccountDetail = {
  member: MemberDetail;
  summary: {
    activeContracts: number;
    hasAccessLibre: boolean;
    totalCreditsRemaining: number;
  };
  debt: {
    amount: number;
    status: 'AL_DIA' | 'EN_DEUDA';
  };
  contracts: ContractDetail[];
  recentPayments: {
    id: string;
    amount: number;
    status: string;
    method: string;
    packId: string | null;
    createdAt: string;
  }[];
  reservations: {
    id: string;
    sessionId: string;
    serviceName: string;
    startsAt: string;
    endsAt: string;
    status: string;
    coverage: string;
  }[];
};

export type ApiErrorBody = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};
