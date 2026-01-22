import { useState, useEffect } from 'react';
import api from '../api';

const playNotificationSound = (type = 'info') => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;

    if (type === 'success') {
      // Upward chirp
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'error') {
      // Low buzz
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'warning') {
      // Double beep
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.setValueAtTime(0, now + 0.1);
      gain.gain.setValueAtTime(0.05, now + 0.15);
      gain.gain.setValueAtTime(0, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      // Default sine blip
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch (e) {
    // Ignore audio errors (e.g. user didn't interact yet)
  }
};

const NotificationDropdown = ({ socket, userId, muted }) => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        setNotifications(res.data);
      } catch (err) {
        console.error('Failed to fetch notifications');
      }
    };

    if (userId) {
      fetchNotifications();
      socket.emit('join-user', userId);
      
      socket.on('notification', (newNotification) => {
        setNotifications(prev => [newNotification, ...prev]);
        
        let soundType = 'info';
        if (newNotification.type === 'task_assigned') soundType = 'success';
        if (newNotification.type === 'nudge') soundType = 'warning';
        
        if (!muted) {
          playNotificationSound(soundType);
        }
      });
    }

    return () => socket.off('notification');
  }, [socket, userId, muted]);

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b dark:border-gray-700 font-bold text-gray-700 dark:text-gray-200">Notifications</div>
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">No notifications</div>
          ) : (
            notifications.map(n => (
              <div 
                key={n._id} 
                onClick={() => handleMarkRead(n._id)}
                className={`p-3 border-b dark:border-gray-700 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${!n.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
              >
                <p className="text-gray-800 dark:text-gray-200">{n.message}</p>
                <span className="text-xs text-gray-400">{new Date(n.timestamp).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;