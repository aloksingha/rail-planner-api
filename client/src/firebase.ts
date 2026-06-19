import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBal2DeLxBwT54VExPnK_dcNMBfKEvh0BA",
    authDomain: "rail-planner-pro.firebaseapp.com",
    projectId: "rail-planner-pro",
    storageBucket: "rail-planner-pro.firebasestorage.app",
    messagingSenderId: "792920103893",
    appId: "1:792920103893:web:055adee25bf3a999cfbb5c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
    try {
        connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
        connectFirestoreEmulator(db, 'localhost', 8080);
        console.log('✅ Firebase Emulators linked');
    } catch (e) {
        console.warn('⚠️ Firebase Emulators not reachable, using live production DB for updates.');
    }
}

export default app;
