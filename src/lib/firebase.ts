import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot 
} from "firebase/firestore";
import { SkinType } from "../types";

// Read Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBixMGgfSOMLscYB9MOTWzaxe6DrPYB1w8",
  authDomain: "gen-lang-client-0036581697.firebaseapp.com",
  projectId: "gen-lang-client-0036581697",
  storageBucket: "gen-lang-client-0036581697.firebasestorage.app",
  messagingSenderId: "174280920444",
  appId: "1:174280920444:web:5fa4c5ef1bea872575e8f9"
};

const databaseId = "ai-studio-015788b1-7d82-4a81-9a69-d048d3d46829";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, databaseId);

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  sugars: number;
  unlockedSkins: SkinType[];
  purchasedPremiumSkins: string[]; // skins purchased with USD (e.g. 'astronaut', 'emperor')
  balanceUSD: number; // simulated card balance / wallet funds for in-game purchases
  dailyCasesLeft?: number;
  lastCasesReset?: string;
  telegramLinkedId?: string | null;
  telegramLinkCode?: string;
  createdAt: any;
}

// -----------------------------------------------------------------------------
// FIRESTORE ERROR HANDLING PROTOCOL (Satisfying firebase-integration skill)
// -----------------------------------------------------------------------------
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
// -----------------------------------------------------------------------------

// Signs in with Google
export async function signInWithGoogle(): Promise<User | null> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    const result = await signInWithPopup(auth, provider);
    if (result.user) {
      await checkAndCreateProfile(result.user);
      return result.user;
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("auth/cancelled-popup-request")) {
      console.warn("Google sign-in popup cancelled by the user.");
    } else {
      console.error("Error signing in with Google:", error);
    }
  }
  return null;
}

// Sign out
export async function logOut() {
  await signOut(auth);
}

// Check and initialize user profile
export async function checkAndCreateProfile(user: User): Promise<UserProfile> {
  const userDocRef = doc(db, "users", user.uid);
  const todayStr = new Date().toISOString().split('T')[0];
  const generateLinkCode = () => Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
      // Read local storage as base
      const localSugars = parseInt(localStorage.getItem("fly_game_sugars") || "0", 10);
      let localSkins: SkinType[] = ["classic"];
      try {
        const saved = localStorage.getItem("fly_game_unlocked_skins");
        if (saved) localSkins = JSON.parse(saved);
      } catch (e) {}

      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "Легендарная Муха",
        photoURL: user.photoURL || "",
        sugars: Math.max(localSugars, 50), // give a 50 sugar welcome bonus!
        unlockedSkins: localSkins,
        purchasedPremiumSkins: [],
        balanceUSD: 15.00, // Pre-fund with $15.00 of simulated demo money!
        dailyCasesLeft: 3,
        lastCasesReset: todayStr,
        telegramLinkedId: null,
        telegramLinkCode: generateLinkCode(),
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(userDocRef, newProfile);
      } catch (writeErr) {
        console.warn("Could not write new profile to Firestore (probably offline):", writeErr);
      }
      return newProfile;
    }

    const data = docSnap.data() as UserProfile;
    let needsMigration = false;
    const updates: any = {};

    // Auto-migrate old profiles
    if (data.dailyCasesLeft === undefined) {
      updates.dailyCasesLeft = 3;
      data.dailyCasesLeft = 3;
      needsMigration = true;
    }
    if (data.lastCasesReset === undefined) {
      updates.lastCasesReset = todayStr;
      data.lastCasesReset = todayStr;
      needsMigration = true;
    }
    if (data.telegramLinkCode === undefined) {
      updates.telegramLinkCode = generateLinkCode();
      data.telegramLinkCode = updates.telegramLinkCode;
      needsMigration = true;
    }
    if (data.telegramLinkedId === undefined) {
      updates.telegramLinkedId = null;
      data.telegramLinkedId = null;
      needsMigration = true;
    }

    // Check for daily reset
    if (data.lastCasesReset !== todayStr) {
      updates.dailyCasesLeft = 3;
      updates.lastCasesReset = todayStr;
      data.dailyCasesLeft = 3;
      data.lastCasesReset = todayStr;
      needsMigration = true;
    }

    if (needsMigration) {
      try {
        await updateDoc(userDocRef, updates);
      } catch (e) {
        console.warn("Migration updateDoc failed:", e);
      }
    }

    return data;
  } catch (err) {
    console.warn("Firestore getDoc failed (offline or container limitations), providing beautiful local fallback profile instead:", err);
    
    const localSugars = parseInt(localStorage.getItem("fly_game_sugars") || "0", 10);
    let localSkins: SkinType[] = ["classic"];
    try {
      const saved = localStorage.getItem("fly_game_unlocked_skins");
      if (saved) localSkins = JSON.parse(saved);
    } catch (e) {}

    return {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "Легендарная Муха",
      photoURL: user.photoURL || "",
      sugars: Math.max(localSugars, 50),
      unlockedSkins: localSkins,
      purchasedPremiumSkins: [],
      balanceUSD: 15.00,
      dailyCasesLeft: 3,
      lastCasesReset: todayStr,
      telegramLinkedId: null,
      telegramLinkCode: generateLinkCode(),
      createdAt: new Date().toISOString(),
    };
  }
}

// Generate new Telegram Link Code on demand
export async function generateNewTelegramLinkCode(uid: string): Promise<string> {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const userDocRef = doc(db, "users", uid);
    await updateDoc(userDocRef, { telegramLinkCode: code });
    return code;
  } catch (error) {
    console.error("Failed to generate new telegram link code:", error);
    throw error;
  }
}

// Update profile sugars
export async function syncSugarsToCloud(uid: string, amount: number) {
  try {
    const userDocRef = doc(db, "users", uid);
    await updateDoc(userDocRef, { sugars: amount });
  } catch (error) {
    console.warn("Failed to sync sugars to cloud (possibly offline):", error);
  }
}

// Update profile unlocked skins
export async function syncUnlockedSkinsToCloud(uid: string, skins: SkinType[]) {
  try {
    const userDocRef = doc(db, "users", uid);
    await updateDoc(userDocRef, { unlockedSkins: skins });
  } catch (error) {
    console.warn("Failed to sync skins to cloud (possibly offline):", error);
  }
}

// Buy Sugars with Simulated USD
export async function buySugarsWithUSD(uid: string, sugarsCount: number, priceUSD: number): Promise<boolean> {
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) return false;

    const data = docSnap.data() as UserProfile;
    if (data.balanceUSD < priceUSD) {
      return false; // insufficient funds
    }

    const updatedBalance = parseFloat((data.balanceUSD - priceUSD).toFixed(2));
    const updatedSugars = data.sugars + sugarsCount;

    await updateDoc(userDocRef, {
      sugars: updatedSugars,
      balanceUSD: updatedBalance
    });

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

// Buy Premium Skin with Simulated USD
export async function buyPremiumSkinWithUSD(uid: string, skinId: string, priceUSD: number): Promise<boolean> {
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) return false;

    const data = docSnap.data() as UserProfile;
    if (data.balanceUSD < priceUSD) {
      return false; // insufficient funds
    }

    const updatedBalance = parseFloat((data.balanceUSD - priceUSD).toFixed(2));
    const updatedPremiumSkins = [...(data.purchasedPremiumSkins || [])];
    if (!updatedPremiumSkins.includes(skinId)) {
      updatedPremiumSkins.push(skinId);
    }

    await updateDoc(userDocRef, {
      purchasedPremiumSkins: updatedPremiumSkins,
      balanceUSD: updatedBalance
    });

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

// Add simulated wallet funds
export async function addWalletFunds(uid: string, amount: number) {
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as UserProfile;
      const updatedBalance = parseFloat((data.balanceUSD + amount).toFixed(2));
      await updateDoc(userDocRef, { balanceUSD: updatedBalance });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Open / buy case cloud database helper
export async function openCaseCloud(uid: string, isPaid: boolean): Promise<{ success: boolean; skinUnlocked: SkinType | null; sugarsEarned: number; error?: string }> {
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) {
      return { success: false, skinUnlocked: null, sugarsEarned: 0, error: "Профиль не найден" };
    }

    const data = docSnap.data() as UserProfile;
    const currentSugars = data.sugars ?? 0;
    const dailyCases = data.dailyCasesLeft ?? 0;

    if (!isPaid) {
      if (dailyCases <= 0) {
        return { success: false, skinUnlocked: null, sugarsEarned: 0, error: "У вас больше нет бесплатных кейсов на сегодня!" };
      }
    } else {
      if (currentSugars < 100) {
        return { success: false, skinUnlocked: null, sugarsEarned: 0, error: "Недостаточно сахара! Кейс стоит 100 сахара." };
      }
    }

    // Unlocked skins list
    const currentlyUnlocked = data.unlockedSkins || ["classic"];
    
    // Pool of obtainable skins from cases
    const caseSkinsPool: SkinType[] = [
      "cool", "gentleman", "cyber", "ninja", "golden", 
      "spider", "hulk", "zombie", "pirate"
    ];

    const lockedSkins = caseSkinsPool.filter(s => !currentlyUnlocked.includes(s));

    let skinUnlocked: SkinType | null = null;
    let sugarsEarned = 0;

    // Roll reward: 60% chance for a locked skin (if any available), otherwise sugar prizes
    const roll = Math.random();
    if (roll < 0.6 && lockedSkins.length > 0) {
      skinUnlocked = lockedSkins[Math.floor(Math.random() * lockedSkins.length)];
    } else {
      const sugarPrizes = [30, 50, 100, 150, 200, 300, 500];
      sugarsEarned = sugarPrizes[Math.floor(Math.random() * sugarPrizes.length)];
    }

    // Build update payload
    const updates: any = {};
    if (!isPaid) {
      updates.dailyCasesLeft = Math.max(0, dailyCases - 1);
    } else {
      updates.sugars = Math.max(0, currentSugars - 100);
    }

    if (skinUnlocked) {
      updates.unlockedSkins = [...currentlyUnlocked, skinUnlocked];
    } else {
      updates.sugars = (updates.sugars !== undefined ? updates.sugars : currentSugars) + sugarsEarned;
    }

    await updateDoc(userDocRef, updates);
    return { success: true, skinUnlocked, sugarsEarned };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return { success: false, skinUnlocked: null, sugarsEarned: 0, error: "Ошибка подключения к серверу" };
  }
}
