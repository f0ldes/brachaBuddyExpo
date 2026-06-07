import { auth } from '../config/firebase';

const API_BASE_URL = 'https://nestjs-app-749460609316.us-central1.run.app';

export async function authenticatedFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const user = auth.currentUser;

  // If no user (guest mode), make an unauthenticated request
  if (!user) {
    return fetch(`${API_BASE_URL}${path}`, options);
  }

  // getIdToken() returns cached token if valid, auto-refreshes if expired
  const idToken = await user.getIdToken();

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${idToken}`);

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
}

export interface CreditsInfo {
  credits: number;
  lifetime: boolean;
  isAnonymous: boolean;
}

/** Fetches the current user's credit balance from the backend. */
export async function getCredits(): Promise<CreditsInfo> {
  const response = await authenticatedFetch('/credits', { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Failed to fetch credits: ${response.status}`);
  }
  return response.json();
}

/** Shape of the backend's HTTP 402 "out of credits" body. */
export interface NoCreditsBody {
  reason: 'NO_CREDITS';
  credits: number;
  canWatchAd: boolean;
  message?: string;
}

/**
 * Parses a 402 response body, tolerating non-JSON. Returns null when the
 * response isn't a recognizable out-of-credits payload.
 */
export async function parseNoCredits(
  response: Response,
): Promise<NoCreditsBody | null> {
  if (response.status !== 402) return null;
  try {
    const body = await response.clone().json();
    if (body?.reason === 'NO_CREDITS') return body as NoCreditsBody;
  } catch {
    // fall through
  }
  return { reason: 'NO_CREDITS', credits: 0, canWatchAd: true };
}
