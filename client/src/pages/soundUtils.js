export const playNotificationSound = (type = 'info') => {
  const audio = new Audio(`${process.env.PUBLIC_URL}/sounds/notification-${type}.mp3`);
  audio.play();
};

export const playUndoSound = () => {
    const audio = new Audio(`${process.env.PUBLIC_URL}/sounds/undo.mp3`);
    audio.play();
};

// You can add more sound-related functions here as needed.

// Ensure your build process correctly copies the sounds directory to the public directory.
