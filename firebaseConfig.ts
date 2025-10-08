// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBAua-OZ9P9EH-FMDAgHGv88q6d566fOqY",
  authDomain: "jain-saint-locator.firebaseapp.com",
  projectId: "jain-saint-locator",
  storageBucket: "jain-saint-locator.firebasestorage.app",
  messagingSenderId: "52072527582",
  appId: "1:52072527582:web:5256cbd339fff708da744f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
