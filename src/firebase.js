// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// This is the object from your screenshot
const firebaseConfig = {
  apiKey: "AIzaSyBaoN5G5ERVDk15vSWfYWx5uBUJTFijIRQ",
  authDomain: "memory-orbit.firebaseapp.com",
  projectId: "memory-orbit",
  storageBucket: "memory-orbit.firebasestorage.app",
  messagingSenderId: "212452853757",
  appId: "1:212452853757:web:d7650492df9104644bfb94"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services you'll need in other files
export const auth = getAuth(app);
export const db = getFirestore(app);