/**
 * BCTA Super Admin Setup Script
 * 
 * Run this ONCE after creating your first user in Firebase Console:
 * 1. Go to Firebase Console → Authentication → Add user
 *    Email: leelakrishna77788@gmail.com
 *    Set a password
 * 2. Copy the UID of the created user from Firebase Console
 * 3. Run this script in your browser console at http://localhost:5173
 *    OR use Firebase Console → Firestore → Add document manually
 *
 * MANUAL STEPS IN FIREBASE CONSOLE (Recommended):
 * ─────────────────────────────────────────────────
 * 1. Firebase Console → Firestore Database → users collection
 * 2. Add document with Document ID = <YOUR UID>
 * 3. Fields:
 *    uid: <YOUR UID>
 *    name: "Leela Krishna"
 *    surname: "Admin"
 *    email: "leelakrishna77788@gmail.com"
 *    role: "superadmin"
 *    status: "active"
 *    memberId: "BCTA-2024-000"
 *    bloodGroup: "O+"
 *    gender: "Male"
 *    age: 30
 *    aadhaarLast4: "0000"
 *    attendanceCount: 0
 *    paymentStatus: "paid"
 *    photoURL: ""
 *    shopAddress: "Admin Office, Bhimavaram"
 *    nomineeDetails: { name: "", relation: "", phone: "" }
 *    createdAt: (timestamp - current)
 */

// OR run this in your browser's developer console at http://localhost:5173:
// import { db } from './src/firebase/firebase';
// import { doc, setDoc } from 'firebase/firestore';
// await setDoc(doc(db, 'users', 'YOUR_UID_HERE'), { ... });
console.log("See SETUP.md for Super Admin setup instructions");
