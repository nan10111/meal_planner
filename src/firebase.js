import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDHfQdYQdxYnE7LGcqA5Hy53bIJDCdGHCY",
  authDomain: "meal-planner-4c8f7.firebaseapp.com",
  projectId: "meal-planner-4c8f7",
  storageBucket: "meal-planner-4c8f7.firebasestorage.app",
  messagingSenderId: "742051818512",
  appId: "1:742051818512:web:61584936ff0aad7d7a6e95",
  measurementId: "G-8YH7QC3C9M"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
