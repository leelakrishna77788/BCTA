import React, { useEffect, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db } from '../../firebase/firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import toast from 'react-hot-toast';

const NotificationManager: React.FC = () => {
  const { currentUser } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlocked = useRef(false);
  const hasRequested = useRef(false);

  useEffect(() => {
    // Pre-load notification sound
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.volume = 1.0;
    audioRef.current.load();

    // Browser audio unlock mechanism
    const unlockAudio = () => {
      if (audioRef.current && !audioUnlocked.current) {
        // Play and immediately pause to "unlock" the audio context for this session
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          if (audioRef.current) audioRef.current.currentTime = 0;
          audioUnlocked.current = true;
          console.log('[NotificationManager] Audio context unlocked');
          window.removeEventListener('click', unlockAudio);
          window.removeEventListener('touchstart', unlockAudio);
        }).catch(() => {
          // Still blocked or failed, wait for next interaction
        });
      }
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const handleEnableNotifications = async () => {
      try {
        // 1. Unlock Audio first on this user gesture
        if (audioRef.current && !audioUnlocked.current) {
          await audioRef.current.play();
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioUnlocked.current = true;
          console.log('[NotificationManager] Audio context unlocked via user gesture');
        }

        // 2. Trigger active permission request
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
            toast.success('Notifications enabled successfully!', { id: 'notif-success' });
          }
        } else {
          toast.error('Notification permission denied. Sound may not play.', { id: 'notif-denied' });
        }
      } catch (err) {
        console.error('[NotificationManager] Permission error:', err);
        toast.error('Failed to enable notifications. Check browser settings.');
      } finally {
        toast.dismiss('permission-prompt');
      }
    };

    const showSoftPrompt = () => {
      if (Notification.permission === 'default' && !hasRequested.current) {
        hasRequested.current = true;
        toast.custom((t) => (
          <div
            id="permission-prompt"
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-sm w-full bg-indigo-600 shadow-2xl rounded-2xl pointer-events-auto flex flex-col p-5 border border-indigo-400`}
          >
            <div className="flex items-center mb-3">
              <div className="bg-white/20 p-2 rounded-lg mr-3">
                <span className="text-2xl text-white">🔔</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg leading-tight">Enable Alerts?</h3>
                <p className="text-indigo-100 text-xs">Don't miss important admin notifications and sounds.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleEnableNotifications}
                className="flex-1 bg-white text-indigo-600 font-black py-2.5 rounded-xl text-sm hover:bg-indigo-50 transition-colors shadow-lg active:scale-95"
              >
                ENABLE NOW
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-4 text-white/70 font-bold text-sm hover:text-white transition-colors"
              >
                LATER
              </button>
            </div>
          </div>
        ), { id: 'permission-prompt', duration: Infinity, position: 'bottom-right' });
      }
    };

    // Auto-attempt token retrieval if already granted
    if (Notification.permission === 'granted') {
      const getTokenSilently = async () => {
        try {
          const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
          const token = await getToken(messaging, { vapidKey });
          if (token) {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, { fcmTokens: arrayUnion(token) });
          }
        } catch (e) {
          console.warn('[NotificationManager] Silent token fetch failed:', e);
        }
      };
      getTokenSilently();
    } else if (Notification.permission === 'default') {
      // Show soft prompt after a short delay to ensure user is logged in and ready
      setTimeout(showSoftPrompt, 1500);
    }

    // Handle foreground messages
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[NotificationManager] Foreground message received:', payload);
      
      // Play notification sound
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => {
            console.warn('[NotificationManager] Audio play blocked:', e);
            toast.error("New Message! (Sound blocked by browser - click anywhere to enable sounds)", {
                id: 'sound-blocked',
                duration: 4000
            });
        });
      }

      // Show toast
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
