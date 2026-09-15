// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GithubAuthProvider, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey:import.meta.env.VITE_FIREBASE_API_KEY ,
  authDomain: "mulgents-ai-44f76.firebaseapp.com",
  projectId: "mulgents-ai-44f76",
  storageBucket: "mulgents-ai-44f76.firebasestorage.app",
  messagingSenderId: "539631957567",
  appId: "1:539631957567:web:7e6b630479782ae3962a8a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth=getAuth(app)
export const googleProvider =
  new GoogleAuthProvider();

export const githubProvider =
  new GithubAuthProvider();