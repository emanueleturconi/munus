
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, addDoc, onSnapshot, query, where, orderBy } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAr5Uyxja_hb4Of07J8DU-Xd1yLCDfn7TM",
  authDomain: "munus-ai.firebaseapp.com",
  projectId: "munus-ai",
  storageBucket: "munus-ai.firebasestorage.app",
  messagingSenderId: "915760550098",
  appId: "1:915760550098:web:0f34fbd4abc94c724d1d0b",
  measurementId: "G-XPBSYD9WWJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configurazione provider Google per forzare la selezione dell'account
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { signInWithPopup, signOut, onAuthStateChanged, collection, doc, setDoc, getDoc, updateDoc, addDoc, onSnapshot, query, where, orderBy };
