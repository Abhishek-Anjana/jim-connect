import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

const priorityStyles = {
  Normal: {
    borderColor: "#3d7edb",
    dotColor: "#3d7edb"
  },
  Important: {
    borderColor: "#d9822b",
    dotColor: "#d9822b"
  },
  Urgent: {
    borderColor: "#9d2832",
    dotColor: "#9d2832"
  }
};

function formatRelativeTime(value) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

async function fetchNotices() {
  console.log("Fetching from:", "https://jim-connect-production.up.railway.app/notices");
  const response = await fetch("https://jim-connect-production.up.railway.app/notices");
  if (!response.ok) throw new Error(`Notice request failed: ${response.status}`);
  const data = await response.json();
  console.log("Response received:", JSON.stringify(data));
  return data;
}

export default function NoticesScreen({ initialNotices = [] }) {
  const [notices, setNotices] = useState(initialNotices);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      setNotices(await fetchNotices());
    } catch {
      setError("Showing latest saved notices");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#0f6b57" />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heading}>
        <Text style={styles.title}>Dean's Notices</Text>
        <Text style={styles.subtitle}>Latest messages from academic and student offices</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notices.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-outline" size={42} color="#1c7c84" />
          <Text style={styles.emptyTitle}>No Active Notices</Text>
          <Text style={styles.emptyText}>Published campus notices will appear here.</Text>
        </View>
      ) : (
        notices.map((notice) => {
          const colors = priorityStyles[notice.priority] ?? priorityStyles.Normal;
          return (
            <View key={notice.id} style={[styles.card, { borderLeftColor: colors.borderColor }]}>
              <View style={styles.cardHeader}>
                <View style={styles.officeBlock}>
                  <Text style={styles.office}>{notice.from_office}</Text>
                  <Text style={styles.time}>{formatRelativeTime(notice.created_at)}</Text>
                </View>
                <View style={styles.priorityRow}>
                  {notice.priority === "Urgent" ? (
                    <View style={[styles.urgentPulse, { backgroundColor: colors.dotColor }]} />
                  ) : null}
                  <Text style={styles.priority}>{notice.priority}</Text>
                </View>
              </View>
              <Text style={styles.noticeTitle}>{notice.title}</Text>
              <Text style={styles.message}>{notice.message}</Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 18,
    paddingBottom: 42
  },
  heading: {
    marginBottom: 12
  },
  title: {
    color: "#202124",
    fontSize: 27,
    fontWeight: "900"
  },
  subtitle: {
    color: "#6c625a",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4
  },
  error: {
    backgroundColor: "#fff1cb",
    borderRadius: 8,
    color: "#b87910",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
    padding: 10
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e5d8c7",
    borderLeftWidth: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 14
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  officeBlock: {
    flex: 1
  },
  office: {
    color: "#0f6b57",
    fontSize: 13,
    fontWeight: "900"
  },
  time: {
    color: "#6c625a",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3
  },
  priorityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  priority: {
    color: "#202124",
    fontSize: 12,
    fontWeight: "900"
  },
  urgentPulse: {
    borderRadius: 6,
    height: 12,
    opacity: 0.9,
    width: 12
  },
  noticeTitle: {
    color: "#202124",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 25,
    marginTop: 12
  },
  message: {
    color: "#202124",
    fontSize: 15,
    lineHeight: 23,
    marginTop: 8
  },
  empty: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e5d8c7",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 18,
    padding: 28
  },
  emptyTitle: {
    color: "#202124",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 12
  },
  emptyText: {
    color: "#6c625a",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    textAlign: "center"
  }
});
