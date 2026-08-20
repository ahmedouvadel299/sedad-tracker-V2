import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyAGeUF_UlQURE-YLLd1KbXfRUdoVtuCLoo',
  authDomain: 'sedad-tracker-v3.firebaseapp.com',
  databaseURL: 'https://sedad-tracker-v3-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'sedad-tracker-v3',
  storageBucket: 'sedad-tracker-v3.firebasestorage.app',
  messagingSenderId: '718217519772',
  appId: '1:718217519772:web:7e7decad09f9326f7b4359',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getDatabase(app)
