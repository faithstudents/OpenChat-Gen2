
export default class NotificationHandler {
    public static async Init(): Promise<void> {
        // Check browser support
        // Request permission if needed

        if (!("Notification" in window)) {
            console.warn("This browser does not support notifications!");
            return;
        }

        if (Notification.permission === "default") {
            await Notification.requestPermission();
        }
    }

    public static SendNotification(title: string, body: string, icon?: string): void {
        // Check permission
        // Check document.hidden
        // Create notification

        if (Notification.permission !== "granted") {
            return;
        }

        // // Don't notify if the user is already looking at the chat
        if (!document.hidden) {
            return;
        }

        console.log("Sending notification...");

        new Notification(title, {
            body, icon,
        });
    }
};
