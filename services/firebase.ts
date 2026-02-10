
import { initializeApp } from "firebase/app";
// Use direct named imports for the modular Firebase SDK (v9+).
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAr5Uyxja_hb4Of07J8DU-Xd1yLCDfn7TM",
  authDomain: "munus-ai.firebaseapp.com",
  projectId: "munus-ai",
  storageBucket: "munus-ai.firebasestorage.app",
  messagingSenderId: "915760550098",
  appId: "1:915760550098:web:0f34fbd4abc94c724d1d0b",
  measurementId: "G-XPBSYD9WWJ"
};

// Initialize Firebase app instance
const app = initializeApp(firebaseConfig);

// Initialize services and export instances
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configure Google authentication provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Re-export essential functions to be used throughout the application.
export { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy 
};
