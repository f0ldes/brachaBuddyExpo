import {
  AuthCredential,
  EmailAuthProvider,
  UserCredential,
  createUserWithEmailAndPassword,
  linkWithCredential,
  signInWithCredential,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Upgrades the current anonymous guest to a real account while PRESERVING the
 * Firebase uid, so server-side credits/history stay attached. Falls back to a
 * normal sign-in when the credential already belongs to an existing account.
 *
 * Used for federated providers (Google, Apple).
 */
export async function upgradeOrSignInWithCredential(
  credential: AuthCredential,
): Promise<UserCredential> {
  const current = auth.currentUser;
  if (current?.isAnonymous) {
    try {
      // Links the new provider onto the SAME uid — credits carry over and the
      // backend grants the signup bonus on first sight of the real account.
      return await linkWithCredential(current, credential);
    } catch (e: any) {
      // The credential is already attached to a different existing account →
      // just sign into that one (its own server-side credits apply).
      if (
        e?.code === 'auth/credential-already-in-use' ||
        e?.code === 'auth/email-already-in-use'
      ) {
        return await signInWithCredential(auth, credential);
      }
      throw e;
    }
  }
  return await signInWithCredential(auth, credential);
}

/**
 * Email/password signup that upgrades an anonymous guest in place. If the
 * email is already registered, signs into that account instead.
 */
export async function upgradeOrCreateEmail(
  email: string,
  password: string,
): Promise<UserCredential> {
  const current = auth.currentUser;
  if (current?.isAnonymous) {
    const credential = EmailAuthProvider.credential(email, password);
    try {
      return await linkWithCredential(current, credential);
    } catch (e: any) {
      if (e?.code === 'auth/email-already-in-use') {
        return await signInWithEmailAndPassword(auth, email, password);
      }
      throw e;
    }
  }
  return await createUserWithEmailAndPassword(auth, email, password);
}
