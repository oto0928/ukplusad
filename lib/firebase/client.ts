import { initializeApp, getApps, FirebaseApp, deleteApp } from 'firebase/app';
import { getAuth, Auth, createUserWithEmailAndPassword, updateProfile, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore, Firestore, doc, setDoc, Timestamp } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { UserRole } from '@/lib/types';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let analytics: Analytics | null = null;

const hasValidConfig = 
  firebaseConfig.apiKey && 
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'your-api-key';

if (typeof window !== 'undefined' && hasValidConfig) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  
  if (process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) {
    analytics = getAnalytics(app);
  }
}

/**
 * セカンダリFirebaseアプリでユーザーを作成する。
 * メインアプリの認証状態（管理者のログイン）に影響しない。
 */
export async function createUserWithoutSignIn(
  email: string,
  password: string,
  displayName: string,
  role: UserRole,
) {
  if (!db) throw new Error('Firestore is not initialized');

  const secondaryApp = initializeApp(firebaseConfig, 'user-creation');
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const newUser = userCredential.user;

    await updateProfile(newUser, { displayName });

    await setDoc(doc(db, 'users', newUser.uid), {
      id: newUser.uid,
      role,
      displayName,
      email,
      photoURL: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await firebaseSignOut(secondaryAuth);
    return newUser.uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}

export { app, auth, db, storage, analytics };
