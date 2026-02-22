const { auth, db } = require('../config/firebaseAdmin');

async function seedAdmin() {
    const email = "admin@bcta.com";
    const password = "adminpassword123!"; // Stonger password for testing

    try {
        let user;
        try {
            user = await auth.getUserByEmail(email);
            console.log("Admin user already exists in Auth");
            // Delete and recreate to ensure password
            await auth.deleteUser(user.uid);
            user = await auth.createUser({
                email,
                password,
                displayName: "System Admin"
            });
            console.log("Deleted and recreated Admin Auth");
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                user = await auth.createUser({
                    email,
                    password,
                    displayName: "System Admin"
                });
                console.log("Created Admin Auth");
            } else {
                throw e;
            }
        }

        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            name: "System",
            surname: "Admin",
            email: email,
            role: "admin",
            status: "active",
            createdAt: new Date(),
        });
        console.log("Created Admin Firestore Document");
        console.log(`Login: ${email} | Password: ${password}`);

    } catch (error) {
        console.error("Error seeding config:", error);
    }
}

seedAdmin().then(() => process.exit(0));
