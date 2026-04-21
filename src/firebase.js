import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getFirestore } from 'firebase/firestore'

const firebaseDefaults = {
  apiKey: 'AIzaSyDDJPSWkIqvOb3CWYhqHPvUSFe7eXxHksA',
  authDomain: 'iglesias-app-d4dad.firebaseapp.com',
  projectId: 'iglesias-app-d4dad',
  storageBucket: 'iglesias-app-d4dad.firebasestorage.app',
  messagingSenderId: '1040336104078',
  appId: '1:1040336104078:web:0076dea370482f704177df',
  measurementId: 'G-9CM33VJRVX',
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseDefaults.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseDefaults.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseDefaults.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseDefaults.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseDefaults.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseDefaults.appId,
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseDefaults.measurementId,
}

const requiredFirebaseConfig = {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
}

const hasFirebaseConfig = Object.values(requiredFirebaseConfig).every(Boolean)

const firebaseApp = hasFirebaseConfig
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null

const db = firebaseApp ? getFirestore(firebaseApp) : null
const analyticsPromise = firebaseApp
  ? isSupported().then((supported) => (supported ? getAnalytics(firebaseApp) : null))
  : Promise.resolve(null)

export { analyticsPromise, db, hasFirebaseConfig }