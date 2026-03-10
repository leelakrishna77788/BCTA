const { db } = require('../config/firebaseAdmin');

const getDashboardStats = async (req, res) => {
    try {
        const [usersSnap, meetingsSnap, complaintsSnap] = await Promise.all([
            db.collection('users').get(),
            db.collection('meetings').orderBy('createdAt', 'desc').get(),
            db.collection('complaints').where('status', '==', 'open').get(),
        ]);

        const users = [];
        usersSnap.forEach(doc => users.push({ id: doc.id, ...doc.data() }));

        const memberUsers = users.filter(u => u.role === 'member');
        const activeMembers = memberUsers.filter(u => u.status === 'active');
        const blockedMembers = memberUsers.filter(u => u.status === 'blocked');
        const pendingPayments = memberUsers.filter(u => u.paymentStatus !== 'paid').length;

        const meetings = [];
        meetingsSnap.forEach(doc => meetings.push({ id: doc.id, ...doc.data() }));

        const recentMembers = [...memberUsers]
            .sort((a, b) => (b.createdAt?._seconds || 0) - (a.createdAt?._seconds || 0))
            .slice(0, 5)
            .map(m => ({
                ...m,
                createdAt: m.createdAt?.toDate ? m.createdAt.toDate().toISOString() : m.createdAt
            }));

        const recentMeetings = meetings.slice(0, 5).map(m => ({
            ...m,
            date: m.date?.toDate ? m.date.toDate().toISOString() : m.date,
            createdAt: m.createdAt?.toDate ? m.createdAt.toDate().toISOString() : m.createdAt
        }));

        // Attendance stats for recent 6 meetings
        const last6Meetings = meetings.slice(0, 6).reverse();
        const attendanceTrends = await Promise.all(last6Meetings.map(async (m) => {
            const attSnap = await db.collection('attendance').where('meetingId', '==', m.id).get();
            return {
                name: m.topic?.slice(0, 12) || 'Meeting',
                attended: attSnap.size
            };
        }));

        res.status(200).json({
            stats: {
                totalMembers: memberUsers.length,
                activeMembers: activeMembers.length,
                blockedMembers: blockedMembers.length,
                totalMeetings: meetings.length,
                openComplaints: complaintsSnap.size,
                pendingPayments,
            },
            recentMembers,
            recentMeetings: meetings.slice(0, 5),
            attendanceTrends
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
};

module.exports = {
    getDashboardStats
};
