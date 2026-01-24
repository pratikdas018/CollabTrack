const DB_NAME = 'ProjectTrackerDB';
const STORE_NAME = 'notifications';
const DB_VERSION = 1;

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: '_id' });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
};

export const saveNotificationsToDB = async (notifications) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    notifications.forEach(n => store.put(n));
  } catch (err) {
    console.error('DB Save Error:', err);
  }
};

export const getNotificationsFromDB = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        // Sort descending by timestamp
        const sorted = (request.result || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        resolve(sorted);
      };
      request.onerror = () => resolve([]);
    });
  } catch (err) {
    return [];
  }
};

export const addNotificationToDB = async (notification) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(notification);
  } catch (err) {
    console.error('DB Add Error:', err);
  }
};

export const markNotificationReadInDB = async (id) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      const data = req.result;
      if (data) {
        data.read = true;
        store.put(data);
      }
    };
  } catch (err) {
    console.error('DB Update Error:', err);
  }
};

export const markAllNotificationsReadInDB = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const notifications = req.result;
      notifications.forEach(n => {
        if (!n.read) {
          n.read = true;
          store.put(n);
        }
      });
    };
  } catch (err) {
    console.error('DB Mark All Error:', err);
  }
};