export const AUTH_COOKIE = "ai_saas_session";

export function getAuthSecret() {
  return process.env.AUTH_SECRET || "local-dev-session-secret";
}

export function createSessionToken(username: string) {
  return `${encodeURIComponent(username)}.${getAuthSecret()}`;
}

export function isValidSession(value?: string) {
  return Boolean(value?.endsWith(`.${getAuthSecret()}`));
}

export function getSessionUsername(value?: string) {
  if (!isValidSession(value)) {
    return null;
  }

  const suffix = `.${getAuthSecret()}`;
  const encodedUsername = value?.slice(0, -suffix.length) || "";

  try {
    return decodeURIComponent(encodedUsername);
  } catch {
    return null;
  }
}
