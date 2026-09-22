interface SessionData {
  email: string;
  name: string | null;
  googleSub: string;
  createdAt: number;
}

const sessions = new Map<string, SessionData>();
const SESSION_TTL = 15 * 60 * 1000; // 15 min

export async function createSession(
  sessionId: string,
  data: Omit<SessionData, 'createdAt'>
): Promise<void> {
  sessions.set(sessionId, {
    ...data,
    createdAt: Date.now(),
  });

  setTimeout(() => {
    sessions.delete(sessionId);
  }, SESSION_TTL);
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_TTL) {
    sessions.delete(sessionId);
    return null;
  }
  return session;
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  return sessions.delete(sessionId);
}
