const { auth, db } = require('./config/firebaseAdmin');
const fs = require('fs');

async function debugData() {
    let output = '';
    const log = (msg) => { output += msg + '\n'; console.log(msg); };

    try {
        log('--- USERS ---');
        const usersSnap = await db.collection('users').get();
        usersSnap.forEach(doc => {
            log(`${doc.id} => ${JSON.stringify(doc.data(), null, 2)}`);
        });

        log('\n--- MEETINGS ---');
        const meetingsSnap = await db.collection('meetings').get();
        meetingsSnap.forEach(doc => {
            log(`${doc.id} => ${JSON.stringify(doc.data(), null, 2)}`);
        });

        log('\n--- AUTH USERS ---');
        const listUsersResult = await auth.listUsers(10);
        listUsersResult.users.forEach((userRecord) => {
            log(`User: ${JSON.stringify(userRecord.toJSON(), null, 2)}`);
        });

        fs.writeFileSync('debug_report.json', output, 'utf8');
        console.log('Report written to debug_report.json');

    } catch (err) {
        console.error('Debug Error:', err);
    }
}

debugData();
