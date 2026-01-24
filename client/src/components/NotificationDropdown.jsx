import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { playNotificationSound } from './soundUtils';
import { 
  saveNotificationsToDB, 
  getNotificationsFromDB, 
  addNotificationToDB, 
  markNotificationReadInDB, 
  markAllNotificationsReadInDB 
} from './notificationDb';

const NotificationDropdown = ({ socket, userId, muted }) => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const dropdownRef = useRef(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        setNotifications(res.data);
        saveNotificationsToDB(res.data); // Sync to local DB
      } catch (err) {
        console.error('Failed to fetch notifications');
        const offlineData = await getNotificationsFromDB(); // Fallback to local DB
        setNotifications(offlineData);
      }
    };

    if (userId) {
      fetchNotifications();
      socket.emit('join-user', userId);
      
      socket.on('notification', (newNotification) => {
        setNotifications(prev => [newNotification, ...prev]);
        addNotificationToDB(newNotification); // Save new notification locally
        
        let soundType = 'info';
        if (newNotification.type === 'task_assigned') soundType = 'success';
        if (newNotification.type === 'nudge') soundType = 'warning';
        
        if (!muted && document.hidden) {
          playNotificationSound(soundType);
        }

        // Trigger animation
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500); // Animation duration
      });
    }

    return () => socket.off('notification');
  }, [socket, userId, muted]);

  const handleMarkRead = async (id) => {
    // Optimistically update UI and Local DB
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    markNotificationReadInDB(id);

    try {
      await api.put(`/notifications/${id}/read`);
    } catch (err) {
      console.error("Failed to mark read on server (offline?)", err);
    }
  };

  const handleMarkAllRead = async () => {
    // Optimistically update UI and Local DB
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    markAllNotificationsReadInDB();

    try {
      // Send single request to mark all as read
      await api.put('/notifications/read-all');
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  // Update document title when unreadCount changes
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) New Notifications`;
    } else {
      document.title = 'Your App Name'; // Or whatever your default title is
    }
  }, [unreadCount]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className={`relative p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 ${isShaking ? 'shake' : ''}`}>
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b dark:border-gray-700 font-bold text-gray-700 dark:text-gray-200 flex justify-between items-center">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-normal"
              >
                Mark all read
              </button>
            )}
          </div>
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