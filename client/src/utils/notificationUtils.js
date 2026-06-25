/**
 * client/src/utils/notificationUtils.js
 *
 * Client-side utility functions to manage native browser push notifications.
 */

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notifications.");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

export const showPushNotification = (title, body) => {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "/favicon.ico", // Fallback path to index icon
      });
    } catch (err) {
      console.error("Failed to display native notification:", err);
    }
  }
};
