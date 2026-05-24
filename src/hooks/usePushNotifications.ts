import { useEffect } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { config } from "../config/env";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

type NotificationHandler = (target: { eventId?: string; screen: string }) => void;

export function usePushNotifications(onNotification?: NotificationHandler) {
  useEffect(() => {
    async function register() {
      if (!config.apiBaseUrl || Platform.OS === "web" || !Device.isDevice) return;

      const currentPermission = await Notifications.getPermissionsAsync();
      const finalPermission =
        currentPermission.status === "granted"
          ? currentPermission
          : await Notifications.requestPermissionsAsync();

      if (finalPermission.status !== "granted") return;

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      await fetch(`${config.apiBaseUrl}/push/register`, {
        body: JSON.stringify({ platform: Platform.OS, token }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
    }

    register().catch(() => {
      // Push registration should never block read-only campus content.
    });
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (typeof data?.screen !== "string") return;
      onNotification?.({
        eventId: typeof data.eventId === "string" ? data.eventId : undefined,
        screen: data.screen
      });
    });

    return () => {
      subscription.remove();
    };
  }, [onNotification]);
}
