import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyB1abopKY7kxr4pqIATBiVvbLVYXiB5RA0',
  authDomain: 'costume-coordinator.firebaseapp.com',
  projectId: 'costume-coordinator',
  storageBucket: 'costume-coordinator.firebasestorage.app',
  messagingSenderId: '196312911489',
  appId: '1:196312911489:web:5935bd27e91fa45390c780',
  measurementId: 'G-WTCEQVKJ1G',
  databaseURL: 'https://costume-coordinator-default-rtdb.firebaseio.com',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getDatabase(app)
export const storage = getStorage(app)

export default app
