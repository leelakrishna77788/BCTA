const { auth, db } = require('./config/firebaseAdmin');

async function checkUser() {
    try {
        const user = await auth.getUserByEmail('superadmin@bcta.com');
        console.log('Auth User UID:', user.uid);

        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists) {
            console.log('Firestore User Profile:', JSON.stringify(doc.data(), null, 2));
        } else {
            console.log('Firestore User Profile: NOT FOUND');
        }
    } catch (err) {
        console.error('Error checking user:', err);
    }
}

checkUser();
