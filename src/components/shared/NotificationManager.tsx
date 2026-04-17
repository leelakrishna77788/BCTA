import React, { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db } from '../../firebase/firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import toast from 'react-hot-toast';

const NotificationManager: React.FC = () => {
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const setupNotifications = async () => {
      try {
        // Request permission silently (browsers may block this without a click)
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
          const token = await getToken(messaging, { vapidKey });
          
          if (token) {
            console.log('[NotificationManager] FCM Token acquired:', token);
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
              fcmTokens: arrayUnion(token)
            });
          }
        }
      } catch (err) {
        console.error('[NotificationManager] Notification setup error:', err);
      }
    };

    setupNotifications();

    // Handle foreground messages
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[NotificationManager] Foreground message received:', payload);
      
      // Show visual toast only
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 p-4`}>
          <div className="flex-1 w-0">
            <div className="flex items-start">
              <div className="ml-3 flex-1">
                <p className="text-sm font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">
                  {payload.notification?.title || 'New Alert'}
                </p>
                <p className="text-sm text-slate-700 font-medium leading-tight">
                  {payload.notification?.body}
                </p>
              </div>
            </div>
          </div>
          <div className="ml-4 shrink-0 flex items-center">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="rounded-xl flex items-center justify-center p-2 text-sm font-bold text-slate-400 hover:text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-tighter"
            >
              Close
            </button>
          </div>
        </div>
      ), { duration: 6000 });
    });

    return () => unsubscribe();
  }, [currentUser]);

  return null;
};

export default NotificationManager;
