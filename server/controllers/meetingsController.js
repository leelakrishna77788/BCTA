const { db } = require('../config/firebaseAdmin');

// Get all meetings (Admin only typically, or active ones for members)
const getMeetings = async (req, res) => {
    try {
        const meetingsSnap = await db.collection('meetings').orderBy('createdAt', 'desc').get();
        const meetings = [];
        meetingsSnap.forEach(doc => {
            meetings.push({ id: doc.id, ...doc.data() });
        });
        res.status(200).json(meetings);
    } catch (error) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({ error: 'Failed to fetch meetings' });
    }
};

// Create a new meeting (Admin only)
const createMeeting = async (req, res) => {
    const { topic, description, date, startTime, endTime, location, gpsLink, qrDuration } = req.body;

    if (!topic || !date || !startTime) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const meetingData = {
            topic,
            description: description || '',
            date: new Date(date),
            startTime,
            endTime: endTime || '',
            location: location || '',
            gpsLink: gpsLink || '',
            qrToken: null,
            qrExpiresAt: null,
            qrDuration: Number(qrDuration) || 30, // Default 30 minutes
            status: 'upcoming',
            createdBy: req.user.uid,
            createdAt: new Date(),
        };

        const docRef = await db.collection('meetings').add(meetingData);
        res.status(201).json({ message: 'Meeting created successfully', id: docRef.id, ...meetingData });
    } catch (error) {
        console.error('Error creating meeting:', error);
        res.status(500).json({ error: 'Failed to create meeting' });
    }
};

// Start meeting QR (Admin only)
const startMeetingQR = async (req, res) => {
    const { id } = req.params;
    const { qrToken, qrExpiresAt } = req.body; // Passed from Admin frontend after generating token

    if (!qrToken || !qrExpiresAt) {
        return res.status(400).json({ error: 'Missing qrToken or qrExpiresAt' });
    }

    try {
        await db.collection('meetings').doc(id).update({
            status: 'active',
            qrToken,
            qrExpiresAt: new Date(qrExpiresAt)
        });

        res.status(200).json({ message: 'Meeting QR started' });
    } catch (error) {
        console.error('Error starting meeting QR:', error);
        res.status(500).json({ error: 'Failed to start meeting QR' });
    }
};

// Stop meeting QR (Admin only)
const stopMeetingQR = async (req, res) => {
    const { id } = req.params;

    try {
        await db.collection('meetings').doc(id).update({
            status: 'expired',
            qrToken: null,
            qrExpiresAt: null
        });

        res.status(200).json({ message: 'Meeting QR stopped and expired' });
    } catch (error) {
        console.error('Error stopping meeting QR:', error);
        res.status(500).json({ error: 'Failed to stop meeting QR' });
    }
};

// Mark attendance (Member)
const markAttendance = async (req, res) => {
    const { meetingId, token } = req.body;
    const memberUID = req.user.uid;

    if (!meetingId || !token) {
        return res.status(400).json({ error: 'Missing meetingId or token' });
    }

    try {
        const meetingDoc = await db.collection('meetings').doc(meetingId).get();
        if (!meetingDoc.exists) return res.status(404).json({ error: 'Meeting not found' });

        const meeting = meetingDoc.data();

        // 1. Check Token Match
        if (meeting.qrToken !== token) {
            return res.status(400).json({ error: 'Invalid or expired QR token' });
        }

        // 2. Check Expiry
        if (meeting.qrExpiresAt && new Date() > meeting.qrExpiresAt.toDate()) {
            return res.status(400).json({ error: 'Meeting QR has expired' });
        }

        // 3. Check member status
        const userDoc = await db.collection('users').doc(memberUID).get();
        if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
        const userData = userDoc.data();

        if (userData.status === 'blocked') {
            return res.status(403).json({ error: 'You are blocked from attending meetings' });
        }

        // 4. Check duplicate scan
        const dupCheck = await db.collection('attendance')
            .where('meetingId', '==', meetingId)
            .where('memberUID', '==', memberUID)
            .get();

        if (!dupCheck.empty) {
            return res.status(400).json({ error: 'Attendance already marked', success: true, alreadyScanned: true });
        }

        // 5. Mark Attendance
        await db.collection('attendance').add({
            meetingId,
            memberId: userData.memberId,
            memberUID,
            memberName: `${userData.name} ${userData.surname}`.trim(),
            scannedAt: new Date(),
            status: 'present'
        });

        // 6. Increment user attendance count
        await db.collection('users').doc(memberUID).update({
            attendanceCount: (userData.attendanceCount || 0) + 1
        });

        res.status(200).json({ message: 'Attendance marked successfully', success: true });

    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({ error: 'Failed to mark attendance' });
    }
};

module.exports = {
    getMeetings,
    createMeeting,
    startMeetingQR,
    stopMeetingQR,
    markAttendance
};
