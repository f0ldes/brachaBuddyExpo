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
