import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

// ⚠️ عوّض هذه القيم بإعدادات مشروع sedad-tracker-v3 الحقيقية
// (Firebase Console → Project Settings → Your apps → SDK setup and configuration)
const firebaseConfig = {
  apiKey: 'REPLACE_ME',
  authDomain: 'sedad-tracker-v3.firebaseapp.com',
  databaseURL: 'https://sedad-tracker-v3-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'sedad-tracker-v3',
  storageBucket: 'sedad-tracker-v3.appspot.com',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getDatabase(app)
