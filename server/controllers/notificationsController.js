const { db } = require('../config/firebaseAdmin');

// Admin: Get all sent notifications
const getNotifications = async (req, res) => {
    try {
        const snaps = await db.collection('notifications').orderBy('sentAt', 'desc').limit(50).get();
        const notifications = [];
        snaps.forEach(doc => notifications.push({ id: doc.id, ...doc.data() }));
        res.status(200).json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

// Admin: Broadcast a notification (Writes to DB, which could trigger FCM cloud functions)
const broadcastNotification = async (req, res) => {
    const { title, body, type } = req.body;
    const uid = req.user.uid;

    if (!title || !body) {
        return res.status(400).json({ error: 'Title and body are required' });
    }

    try {
        const notificationData = {
            title,
            body,
            type: type || 'general',
            sentBy: uid,
            sentAt: new Date(),
            readBy: [],
        };

        const docRef = await db.collection('notifications').add(notificationData);

        // Optional: Add FCM logic here using `admin.messaging().sendMulticast({ ... })`
        // assuming users have `fcmToken` stored in their profiles.

        res.status(201).json({ message: 'Notification broadcasted', id: docRef.id });
    } catch (error) {
        console.error('Error broadcasting notification:', error);
        res.status(500).json({ error: 'Failed to broadcast notification' });
    }
};

module.exports = {
    getNotifications,
    broadcastNotification
};
