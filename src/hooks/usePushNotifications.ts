import { useEffect } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { config } from "../config/env";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

type NotificationHandler = (target: { eventId?: string; screen: string }) => void;

async function registerForPushNotificationsAsync() {
  if (Platform.OS === "web") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      importance: Notifications.AndroidImportance.MAX,
      lightColor: "#1A5C38",
      name: "default",
      sound: "default",
      vibrationPattern: [0, 250, 250, 250]
    });
  }

  if (!Device.isDevice) {
    console.log("Must use physical device for push notifications");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Permission not granted");
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  console.log("Push token:", token);

  await fetch(`${config.apiBaseUrl || "https://jim-connect-production.up.railway.app"}/push/register`, {
    body: JSON.stringify({ platform: Platform.OS, token }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });

  return token;
}

export function usePushNotifications(onNotification?: NotificationHandler) {
  useEffect(() => {
    registerForPushNotificationsAsync().catch((error) => {
      console.log("Push registration failed", error);
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
