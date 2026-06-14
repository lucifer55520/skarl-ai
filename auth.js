// auth.js
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { initializeApp } from "firebase/app";

// আপনার কনফিগারেশন এখানে পেস্ট করুন
const firebaseConfig = {
  apiKey: "AIzaSyB65GFRDmzgxKuC9coyqOlARLdA7CZwYSY",
  authDomain: "skarl-ai.firebaseapp.com",
  projectId: "skarl-ai",
  storageBucket: "skarl-ai.firebasestorage.app",
  messagingSenderId: "21596213609",
  appId: "1:21596213609:web:6c503608530d5a9010adf8",
  measurementId: "G-9EQ6D8NB43"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// রেজিস্ট্রেশন (Signup)
export async function signUp(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        throw error;
    }
}

// লগইন (Login)
export async function login(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        throw error;
    }
}

// লগআউট
export async function logout() {
    await signOut(auth);
}