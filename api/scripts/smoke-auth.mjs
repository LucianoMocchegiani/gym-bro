const base = process.env.API_BASE ?? 'http://127.0.0.1:3001';

async function post(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error(path, json);
    process.exit(1);
  }
  return json;
}

async function main() {
  const superLogin = await post('/api/auth/super/login', {
    email: 'super@faciliter.xyz',
    password: 'ChangeMe123!',
  });
  const staffLogin = await post('/api/auth/staff/login', {
    tenantId: '00000000-0000-4000-8000-000000000001',
    email: 'admin@gymdeprueba.com',
    password: 'ChangeMe123!',
  });
  const memberLogin = await post('/api/auth/member/login', {
    tenantId: '00000000-0000-4000-8000-000000000001',
    email: 'socio@gymdeprueba.com',
    password: 'ChangeMe123!',
  });

  const meRes = await fetch(`${base}/api/auth/me`, {
    headers: { Authorization: `Bearer ${superLogin.accessToken}` },
  });
  const me = await meRes.json();
  if (!meRes.ok) {
    console.error('/api/auth/me', me);
    process.exit(1);
  }

  const refreshed = await post('/api/auth/refresh', {
    refreshToken: staffLogin.refreshToken,
  });
  await post('/api/auth/logout', { refreshToken: refreshed.refreshToken });

  console.log('OK', {
    super: superLogin.profileType,
    staff: staffLogin.profileType,
    member: memberLogin.profileType,
    me: me.email,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
