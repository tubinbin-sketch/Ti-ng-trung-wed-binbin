/**
 * Lazy access to Firebase.
 *
 * The Firebase SDK (auth + firestore, ~170 kB gzip) used to be part of the
 * first download, delaying the first screen for every visitor — including the
 * many who only study offline. The app shell now renders first and loads
 * Firebase in the background; code that needs it awaits `loadFirebase()`, and
 * synchronous checks use `getLoadedFirebase()` / `currentFirebaseUid()`
 * (null until the SDK has loaded, which is also the "not signed in yet" case).
 */
type FirebaseModule = typeof import('./firebase');

let loaded: FirebaseModule | null = null;
let loading: Promise<FirebaseModule> | null = null;

export function loadFirebase(): Promise<FirebaseModule> {
  if (loaded) return Promise.resolve(loaded);
  if (!loading) {
    loading = import('./firebase')
      .then((mod) => {
        loaded = mod;
        return mod;
      })
      .catch((err) => {
        // Allow a later retry (e.g. the network came back).
        loading = null;
        throw err;
      });
  }
  return loading;
}

/** The Firebase module if it has finished loading, otherwise null. */
export function getLoadedFirebase(): FirebaseModule | null {
  return loaded;
}

/** UID of the signed-in Firebase user, or null (not signed in / SDK not loaded yet). */
export function currentFirebaseUid(): string | null {
  return loaded?.auth.currentUser?.uid ?? null;
}

export function hasFirebaseUser(): boolean {
  return Boolean(loaded?.auth.currentUser);
}
