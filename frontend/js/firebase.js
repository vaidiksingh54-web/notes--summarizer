import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  getDocFromServer
} from 'firebase/firestore';

// Configuration loaded from provisioned firebase-applet-config.json
const firebaseConfig = {
  projectId: "indigo-patrol-xpthm",
  appId: "1:275081692120:web:7e4ba2d561332ade3a28ad",
  apiKey: "AIzaSyBX8eB10NdM_GWttu-v1SEhYQRUzO1LXig",
  authDomain: "indigo-patrol-xpthm.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-cognistudyaismar-aea82854-2e05-4c37-9250-dc7aca6343d0",
  storageBucket: "indigo-patrol-xpthm.firebasestorage.app",
  messagingSenderId: "275081692120",
  measurementId: "",
  oAuthClientId: "275081692120-04kni4mqjk0ja50bjss89i5gddtgsk96.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (_error) {
    // Non-blocking check: app operates smoothly with local SQLite backend
  }
}
testConnection();

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const firebaseService = {
  auth,
  db,
  getCurrentUser() {
    return auth.currentUser;
  },

  async signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userRef = doc(db, 'users', user.uid);
      let userSnap = null;
      try {
        userSnap = await getDoc(userRef);
      } catch (firestoreErr) {
        console.warn("Firestore user profile fetch warning:", firestoreErr);
      }

      const profile = {
        id: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Student',
        email: user.email || '',
        phone: user.phoneNumber || '',
        college: '',
        course: '',
        age: 18,
        bio: 'Google Verified Student',
        avatar: (user.displayName || 'S').slice(0, 2).toUpperCase(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (!userSnap || !userSnap.exists()) {
        try {
          await setDoc(userRef, profile);
        } catch (err) {
          console.warn("Firestore user profile save warning:", err);
        }
      } else {
        const existingData = userSnap.data();
        profile.college = existingData.college || '';
        profile.course = existingData.course || '';
        profile.phone = existingData.phone || '';
        profile.bio = existingData.bio || profile.bio;
      }

      return { user, profile };
    } catch (error) {
      console.error("Google Sign In Error:", error);
      throw error;
    }
  },

  async signOut() {
    return signOut(auth);
  },

  async saveProfile(profile) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be signed in with Firebase");
    const userRef = doc(db, 'users', user.uid);
    const updated = {
      ...profile,
      id: user.uid,
      email: user.email || profile.email,
      updatedAt: new Date().toISOString()
    };
    try {
      await setDoc(userRef, updated, { merge: true });
      return updated;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  },

  async getProfile() {
    const user = auth.currentUser;
    if (!user) return null;
    const userRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userRef);
      return snap.exists() ? snap.data() : null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    }
  },

  async listItems() {
    const user = auth.currentUser;
    if (!user) return [];
    const itemsCol = collection(db, 'users', user.uid, 'items');
    try {
      const snap = await getDocs(itemsCol);
      return snap.docs.map(d => d.data());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/items`);
    }
  },

  async saveItem(item) {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be signed in with Firebase");
    const cleanId = String(item.id || `item_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const docRef = doc(db, 'users', user.uid, 'items', cleanId);
    const payload = {
      id: cleanId,
      userId: user.uid,
      title: String(item.title || 'Untitled').slice(0, 256),
      type: item.type || 'note',
      date: item.date || new Date().toLocaleDateString(),
      isFavorite: Boolean(item.isFavorite),
      content: item.content || {},
      tags: Array.isArray(item.tags) ? item.tags.slice(0, 10) : [],
      updatedAt: new Date().toISOString()
    };
    try {
      await setDoc(docRef, payload, { merge: true });
      return payload;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/items/${cleanId}`);
    }
  },

  async deleteItem(id) {
    const user = auth.currentUser;
    if (!user) return;
    const cleanId = String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const docRef = doc(db, 'users', user.uid, 'items', cleanId);
    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/items/${cleanId}`);
    }
  },

  async toggleFavorite(id, currentStatus) {
    const user = auth.currentUser;
    if (!user) return !currentStatus;
    const cleanId = String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const docRef = doc(db, 'users', user.uid, 'items', cleanId);
    try {
      await updateDoc(docRef, { isFavorite: !currentStatus });
      return !currentStatus;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/items/${cleanId}`);
    }
  },

  async addActivity(activity) {
    const user = auth.currentUser;
    if (!user) return activity;
    const cleanId = String(activity.id || `act_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const docRef = doc(db, 'users', user.uid, 'activities', cleanId);
    const payload = {
      id: cleanId,
      userId: user.uid,
      type: activity.type || 'info',
      text: String(activity.text || '').slice(0, 500),
      time: activity.time || 'Just now',
      timestamp: Date.now()
    };
    try {
      await setDoc(docRef, payload);
      return payload;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/activities/${cleanId}`);
    }
  },

  async listActivities() {
    const user = auth.currentUser;
    if (!user) return [];
    const colRef = collection(db, 'users', user.uid, 'activities');
    try {
      const snap = await getDocs(colRef);
      return snap.docs.map(d => d.data());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/activities`);
    }
  }
};

window.firebaseService = firebaseService;

// Listen for auth state changes
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("Firebase Auth State: Signed in as", user.email);
    // Notify store if active
    if (window.store && typeof window.store.onFirebaseAuthUser === 'function') {
      await window.store.onFirebaseAuthUser(user);
    }
  } else {
    console.log("Firebase Auth State: Signed out");
    if (window.store && typeof window.store.onFirebaseAuthSignOut === 'function') {
      window.store.onFirebaseAuthSignOut();
    }
  }
  window.dispatchEvent(new CustomEvent('firebase-auth-updated', { detail: { user } }));
});
