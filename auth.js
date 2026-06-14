// Frontend/auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// Export these so script.js can use them
export { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut };
