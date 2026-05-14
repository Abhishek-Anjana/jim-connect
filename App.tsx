import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageBackground,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { RemoteImage } from "./src/components/RemoteImage";
import {
  ArchiveEntry,
  Club,
  Event,
  Winner,
  clubs
} from "./src/data/content";
import { useJimConnectContent } from "./src/hooks/useJimConnectContent";
import { usePushNotifications } from "./src/hooks/usePushNotifications";
import { sortArchiveEntries, sortUpcomingEvents } from "./src/utils/content";
import { formatDate, formatDateTime, getEventTimingLabel } from "./src/utils/date";
import { openExternalUrl } from "./src/utils/links";
import { shareArchiveEntry, shareEvent } from "./src/utils/share";

type Tab = "events" | "archive" | "fame";
type Detail = { type: "event"; item: Event } | { type: "archive"; item: ArchiveEntry } | null;

const palette = {
  ink: "#202124",
  muted: "#6c625a",
  bg: "#f7f3ec",
  panel: "#fffaf2",
  card: "#ffffff",
  line: "#e5d8c7",
  green: "#0f6b57",
  teal: "#1c7c84",
  gold: "#b87910",
  red: "#9d2832"
};

const jaipuriaLogo = require("./assets/jaipuria-logo.png");
const campusImage = require("./assets/jaipuria-campus.jpg");

export default function App() {
  const { archive, error, events, fame, lastUpdated, loading, refresh, refreshing } = useJimConnectContent();
  usePushNotifications();
  const [tab, setTab] = useState<Tab>("events");
  const [club, setClub] = useState<Club>("All");
  const [archiveQuery, setArchiveQuery] = useState("");
  const [winnerBatch, setWinnerBatch] = useState("All");
  const [winnerCategory, setWinnerCategory] = useState("All");
  const [archivePage, setArchivePage] = useState(1);
  const [detail, setDetail] = useState<Detail>(null);

  const visibleEvents = useMemo(
    () =>
      sortUpcomingEvents(events).filter((event) => club === "All" || event.club === club),
    [club, events]
  );

  const visibleArchive = useMemo(() => {
    const query = archiveQuery.trim().toLowerCase();
    return sortArchiveEntries(archive)
      .filter((entry) => {
        const matchesClub = club === "All" || entry.club === club;
        const matchesQuery =
          query.length === 0 ||
          entry.name.toLowerCase().includes(query) ||
          entry.club.toLowerCase().includes(query) ||
          entry.year.includes(query);
        return matchesClub && matchesQuery;
      });
  }, [archive, archiveQuery, club]);

  useEffect(() => {
    setArchivePage(1);
  }, [archiveQuery, club]);

  const batches = ["All", ...Array.from(new Set(fame.map((winner) => winner.batch)))];
  const categories = ["All", ...Array.from(new Set(fame.map((winner) => winner.category)))];

  const visibleWinners = useMemo(
    () =>
      fame.filter((winner) => {
        const matchesClub = club === "All" || winner.club === club;
        const matchesBatch = winnerBatch === "All" || winner.batch === winnerBatch;
        const matchesCategory = winnerCategory === "All" || winner.category === winnerCategory;
        return matchesClub && matchesBatch && matchesCategory;
      }),
    [club, fame, winnerBatch, winnerCategory]
  );

  function openArchiveFromWinner(winner: Winner) {
    const linkedArchive = archive.find((entry) => entry.id === winner.archiveId);
    if (linkedArchive) {
      setDetail({ type: "archive", item: linkedArchive });
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.shell}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image source={jaipuriaLogo} style={styles.logo} resizeMode="contain" />
            <View style={styles.brandText}>
              <Text style={styles.kicker}>Jaipuria Institute of Management</Text>
              <Text style={styles.title}>JIM-Connect</Text>
            </View>
          </View>
          {detail ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close detail view"
              onPress={() => setDetail(null)}
              style={styles.iconButton}
            >
              <Ionicons name="close" size={22} color={palette.ink} />
            </Pressable>
          ) : null}
        </View>
        {!detail && error ? <Text style={styles.offlineBanner}>{error}</Text> : null}
        {!detail && lastUpdated ? <Text style={styles.updatedBanner}>Updated {formatDateTime(lastUpdated)}</Text> : null}

        {detail ? (
          <DetailScreen detail={detail} />
        ) : (
          <>
            <ScrollView
              contentContainerStyle={styles.content}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.green} />}
              showsVerticalScrollIndicator={false}
            >
              {tab === "events" ? (
                <EventsScreen
                  club={club}
                  setClub={setClub}
                  events={visibleEvents}
                  loading={loading}
                  openEvent={(event) => setDetail({ type: "event", item: event })}
                />
              ) : null}
              {tab === "archive" ? (
                <ArchiveScreen
                  club={club}
                  setClub={setClub}
                  query={archiveQuery}
                  setQuery={setArchiveQuery}
                  entries={visibleArchive.slice(0, archivePage * 20)}
                  totalEntries={visibleArchive.length}
                  canLoadMore={visibleArchive.length > archivePage * 20}
                  loadMore={() => setArchivePage((page) => page + 1)}
                  openArchive={(entry) => setDetail({ type: "archive", item: entry })}
                />
              ) : null}
              {tab === "fame" ? (
                <HallOfFameScreen
                  club={club}
                  setClub={setClub}
                  batches={batches}
                  categories={categories}
                  winnerBatch={winnerBatch}
                  setWinnerBatch={setWinnerBatch}
                  winnerCategory={winnerCategory}
                  setWinnerCategory={setWinnerCategory}
                  winners={visibleWinners}
                  openArchive={openArchiveFromWinner}
                />
              ) : null}
            </ScrollView>
            <BottomTabs active={tab} setTab={setTab} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function EventsScreen({
  club,
  setClub,
  events,
  loading,
  openEvent
}: {
  club: Club;
  setClub: (club: Club) => void;
  events: Event[];
  loading: boolean;
  openEvent: (event: Event) => void;
}) {
  return (
    <View>
      <CampusHero />
      <SectionHeading title="Upcoming Events" subtitle="Nearest campus opportunities first" />
      <ClubFilter selected={club} setSelected={setClub} />
      {loading ? (
        <LoadingState />
      ) : events.length === 0 ? (
        <EmptyState icon="calendar-clear-outline" title="No Upcoming Events" text="Published events will appear here as soon as Student Affairs schedules them." />
      ) : (
        events.map((event) => <EventCard key={event.id} event={event} onPress={() => openEvent(event)} />)
      )}
    </View>
  );
}

function ArchiveScreen({
  club,
  setClub,
  query,
  setQuery,
  entries,
  totalEntries,
  canLoadMore,
  loadMore,
  openArchive
}: {
  club: Club;
  setClub: (club: Club) => void;
  query: string;
  setQuery: (query: string) => void;
  entries: ArchiveEntry[];
  totalEntries: number;
  canLoadMore: boolean;
  loadMore: () => void;
  openArchive: (entry: ArchiveEntry) => void;
}) {
  return (
    <View>
      <SectionHeading title="Archive" subtitle="Campus memory, write-ups, and photo links" />
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={palette.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by event, club, or year"
          placeholderTextColor={palette.muted}
          style={styles.searchInput}
        />
      </View>
      <ClubFilter selected={club} setSelected={setClub} />
      <Text style={styles.resultCount}>{totalEntries} archive entries</Text>
      {entries.length === 0 ? (
        <EmptyState icon="library-outline" title="No Archive Matches" text="Try another event name, club, or year." />
      ) : (
        entries.map((entry) => (
          <ArchiveCard key={entry.id} entry={entry} onPress={() => openArchive(entry)} />
        ))
      )}
      {canLoadMore ? (
        <Pressable onPress={loadMore} style={styles.secondaryButton} accessibilityRole="button" accessibilityLabel="Load more archive entries">
          <Text style={styles.secondaryButtonText}>Load 20 More</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function HallOfFameScreen({
  club,
  setClub,
  batches,
  categories,
  winnerBatch,
  setWinnerBatch,
  winnerCategory,
  setWinnerCategory,
  winners: visibleWinners,
  openArchive
}: {
  club: Club;
  setClub: (club: Club) => void;
  batches: string[];
  categories: string[];
  winnerBatch: string;
  setWinnerBatch: (batch: string) => void;
  winnerCategory: string;
  setWinnerCategory: (category: string) => void;
  winners: Winner[];
  openArchive: (winner: Winner) => void;
}) {
  const champions = visibleWinners.filter((winner) => winner.champion);
  return (
    <View>
      <SectionHeading title="Hall of Fame" subtitle="A permanent record of student excellence" />
      {champions.length > 0 ? (
        <View style={styles.highlight}>
          <Text style={styles.highlightLabel}>Champions of the Year</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {champions.map((winner) => (
              <WinnerCard key={winner.id} winner={winner} featured onPress={() => openArchive(winner)} />
            ))}
          </ScrollView>
        </View>
      ) : null}
      <ClubFilter selected={club} setSelected={setClub} />
      <Text style={styles.filterLabel}>Batch</Text>
      <PillRow values={batches} selected={winnerBatch} setSelected={setWinnerBatch} />
      <Text style={styles.filterLabel}>Award Category</Text>
      <PillRow values={categories} selected={winnerCategory} setSelected={setWinnerCategory} />
      {visibleWinners.length === 0 ? (
        <EmptyState icon="trophy-outline" title="No Winners Match" text="Try a different batch, award category, or club filter." />
      ) : (
        <View style={styles.winnerGrid}>
          {visibleWinners.map((winner) => (
            <WinnerCard key={winner.id} winner={winner} onPress={() => openArchive(winner)} />
          ))}
        </View>
      )}
    </View>
  );
}

function CampusHero() {
  return (
    <ImageBackground source={campusImage} style={styles.campusHero} imageStyle={styles.campusHeroImage}>
      <View style={styles.campusOverlay}>
        <Image source={jaipuriaLogo} style={styles.heroLogo} resizeMode="contain" />
        <Text style={styles.heroTitle}>Jaipuria Indore Campus Connect</Text>
        <Text style={styles.heroSubtitle}>Events, archives, and student achievements in one place.</Text>
      </View>
    </ImageBackground>
  );
}

function DetailScreen({ detail }: { detail: Detail }) {
  const [driveError, setDriveError] = useState<string | null>(null);

  if (!detail) return null;
  if (detail.type === "event") {
    const event = detail.item;
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <RemoteImage
          accessibilityLabel={`${event.name} banner`}
          fallbackIcon={<Ionicons name="image-outline" size={32} color={palette.green} />}
          fallbackText={event.name}
          style={styles.detailImage}
          uri={event.image}
        />
        <Text style={styles.detailTitle}>{event.name}</Text>
        <Text style={styles.timingBadge}>{getEventTimingLabel(event.startsAt, event.endsAt)}</Text>
        <Meta icon="time-outline" text={formatDateTime(event.startsAt)} />
        <Meta icon="location-outline" text={event.venue} />
        <Meta icon="people-outline" text={event.club} />
        <Text style={styles.bodyText}>{event.description}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Share ${event.name}`}
          onPress={() => shareEvent(event)}
          style={styles.secondaryButton}
        >
          <Ionicons name="share-social-outline" size={19} color={palette.green} />
          <Text style={styles.secondaryButtonText}>Share Event</Text>
        </Pressable>
        <Text style={styles.subhead}>Speakers and Participants</Text>
        {event.speakers.map((speaker) => (
          <Text key={speaker} style={styles.listItem}>- {speaker}</Text>
        ))}
        <Text style={styles.subhead}>Attachments</Text>
        {event.attachments.map((attachment) => (
          <Text key={attachment} style={styles.listItem}>- {attachment}</Text>
        ))}
      </ScrollView>
    );
  }

  const entry = detail.item;
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <RemoteImage
        accessibilityLabel={`${entry.name} archive image`}
        fallbackIcon={<Ionicons name="image-outline" size={32} color={palette.green} />}
        fallbackText={entry.name}
        style={styles.detailImage}
        uri={entry.image}
      />
      <Text style={styles.detailTitle}>{entry.name}</Text>
      <Meta icon="calendar-outline" text={formatDate(entry.date)} />
      <Meta icon="people-outline" text={entry.club} />
      <Text style={styles.bodyText}>{entry.summary}</Text>
      {driveError ? <Text style={styles.formError}>{driveError}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Share ${entry.name}`}
        onPress={() => shareArchiveEntry(entry)}
        style={styles.secondaryButton}
      >
        <Ionicons name="share-social-outline" size={19} color={palette.green} />
        <Text style={styles.secondaryButtonText}>Share Archive Entry</Text>
      </Pressable>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Access full photo repository"
        onPress={async () => {
          setDriveError(null);
          try {
            await openExternalUrl(entry.driveUrl);
          } catch {
            setDriveError("The photo repository link needs a valid Google Drive URL.");
          }
        }}
        style={styles.primaryButton}
      >
        <Ionicons name="open-outline" size={19} color="#ffffff" />
        <Text style={styles.primaryButtonText}>Access Full Photo Repository</Text>
      </Pressable>
    </ScrollView>
  );
}

function EventCard({ event, onPress }: { event: Event; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.card} accessibilityRole="button" accessibilityLabel={`Open ${event.name}`}>
      <RemoteImage
        accessibilityLabel={`${event.name} banner`}
        fallbackIcon={<Ionicons name="calendar-outline" size={30} color={palette.green} />}
        fallbackText={event.name}
        style={styles.cardImage}
        uri={event.image}
      />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{event.name}</Text>
        <Meta icon="time-outline" text={formatDateTime(event.startsAt)} />
        <Meta icon="location-outline" text={event.venue} />
        <View style={styles.badgeRow}>
          <Text style={styles.badge}>{event.club}</Text>
          <Text style={styles.timingPill}>{getEventTimingLabel(event.startsAt, event.endsAt)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function ArchiveCard({ entry, onPress }: { entry: ArchiveEntry; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.archiveCard} accessibilityRole="button" accessibilityLabel={`Open archive for ${entry.name}`}>
      <RemoteImage
        accessibilityLabel={`${entry.name} image`}
        fallbackIcon={<Ionicons name="library-outline" size={24} color={palette.green} />}
        fallbackText={entry.name}
        style={styles.archiveThumb}
        uri={entry.image}
      />
      <View style={styles.archiveText}>
        <Text style={styles.cardTitle}>{entry.name}</Text>
        <Text style={styles.metaText}>{formatDate(entry.date)} | {entry.club}</Text>
        <Text numberOfLines={3} style={styles.summary}>{entry.summary}</Text>
      </View>
    </Pressable>
  );
}

function WinnerCard({
  winner,
  featured,
  onPress
}: {
  winner: Winner;
  featured?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={[styles.winnerCard, featured && styles.featuredWinner]}>
      <RemoteImage
        accessibilityLabel={`${winner.name} portrait`}
        fallbackIcon={<Ionicons name="person-outline" size={28} color={palette.green} />}
        fallbackText={winner.name}
        style={styles.portrait}
        uri={winner.portrait}
      />
      <Text style={styles.winnerName}>{winner.name}</Text>
      <Text style={styles.winnerMeta}>{winner.batch}</Text>
      <Text style={styles.awardBadge}>{winner.award}</Text>
      <Text style={styles.winnerEvent}>{winner.eventName}</Text>
      <Pressable onPress={onPress} style={styles.linkButton} accessibilityRole="button" accessibilityLabel={`Open archive for ${winner.eventName}`}>
        <Text style={styles.linkButtonText}>View archive</Text>
        <Ionicons name="chevron-forward" size={16} color={palette.teal} />
      </Pressable>
    </View>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.screenTitle}>{title}</Text>
      <Text style={styles.screenSubtitle}>{subtitle}</Text>
    </View>
  );
}

function ClubFilter({ selected, setSelected }: { selected: Club; setSelected: (club: Club) => void }) {
  return (
    <View>
      <Text style={styles.filterLabel}>Club / Committee</Text>
      <PillRow values={clubs} selected={selected} setSelected={(value) => setSelected(value as Club)} />
    </View>
  );
}

function PillRow({
  values,
  selected,
  setSelected
}: {
  values: string[];
  selected: string;
  setSelected: (value: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
      {values.map((value) => (
        <Pressable
          key={value}
          onPress={() => setSelected(value)}
          style={[styles.pill, selected === value && styles.pillActive]}
          accessibilityRole="button"
          accessibilityLabel={`Filter ${value}`}
        >
          <Text style={[styles.pillText, selected === value && styles.pillTextActive]}>{value}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={16} color={palette.muted} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

function EmptyState({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={42} color={palette.teal} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function LoadingState() {
  return (
    <View style={styles.empty}>
      <Ionicons name="sync-outline" size={42} color={palette.teal} />
      <Text style={styles.emptyTitle}>Loading Campus Content</Text>
      <Text style={styles.emptyText}>Checking the latest published events, archive entries, and winners.</Text>
    </View>
  );
}

function BottomTabs({ active, setTab }: { active: Tab; setTab: (tab: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: "events", label: "Events", icon: "calendar-outline" },
    { id: "archive", label: "Archive", icon: "library-outline" },
    { id: "fame", label: "Hall of Fame", icon: "trophy-outline" }
  ];

  return (
    <View style={styles.tabs}>
      {tabs.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => setTab(item.id)}
          style={styles.tab}
          accessibilityRole="tab"
          accessibilityState={{ selected: active === item.id }}
        >
          <Ionicons name={item.icon} size={22} color={active === item.id ? palette.red : palette.muted} />
          <Text style={[styles.tabText, active === item.id && styles.tabTextActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.bg
  },
  shell: {
    alignSelf: "center",
    flex: 1,
    backgroundColor: palette.bg,
    maxWidth: 720,
    width: "100%"
  },
  header: {
    alignItems: "center",
    borderBottomColor: palette.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14
  },
  brandRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12
  },
  brandText: {
    flex: 1
  },
  logo: {
    height: 44,
    width: 134
  },
  offlineBanner: {
    backgroundColor: "#fff1cb",
    borderBottomColor: "#ead19c",
    borderBottomWidth: 1,
    color: palette.gold,
    fontSize: 13,
    fontWeight: "800",
    paddingHorizontal: 18,
    paddingVertical: 8
  },
  updatedBanner: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 18,
    paddingTop: 8
  },
  kicker: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "600"
  },
  title: {
    color: palette.ink,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  content: {
    padding: 18,
    paddingBottom: 112
  },
  campusHero: {
    borderRadius: 8,
    marginBottom: 18,
    minHeight: 210,
    overflow: "hidden"
  },
  campusHeroImage: {
    borderRadius: 8
  },
  campusOverlay: {
    backgroundColor: "rgba(32, 33, 36, 0.48)",
    flex: 1,
    justifyContent: "flex-end",
    padding: 18
  },
  heroLogo: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 6,
    height: 52,
    marginBottom: 14,
    width: 210
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 30
  },
  heroSubtitle: {
    color: "#fff4d8",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
    marginTop: 4
  },
  sectionHeading: {
    marginBottom: 12
  },
  screenTitle: {
    color: palette.ink,
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: 0
  },
  screenSubtitle: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4
  },
  filterLabel: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 12
  },
  pills: {
    gap: 8,
    paddingBottom: 10
  },
  pill: {
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  pillActive: {
    backgroundColor: palette.green,
    borderColor: palette.green
  },
  pillText: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "700"
  },
  pillTextActive: {
    color: "#ffffff"
  },
  card: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    overflow: "hidden"
  },
  cardImage: {
    aspectRatio: 2,
    width: "100%"
  },
  cardBody: {
    padding: 14
  },
  cardTitle: {
    color: palette.ink,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 24,
    marginBottom: 8
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#eaf4ef",
    borderRadius: 6,
    color: palette.green,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  badgeRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  timingPill: {
    alignSelf: "flex-start",
    backgroundColor: "#f6e8e9",
    borderRadius: 6,
    color: palette.red,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  meta: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    marginTop: 5
  },
  metaText: {
    color: palette.muted,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 12
  },
  searchInput: {
    color: palette.ink,
    flex: 1,
    fontSize: 15,
    minHeight: 48
  },
  archiveCard: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    padding: 10
  },
  archiveThumb: {
    borderRadius: 6,
    height: 108,
    width: 96
  },
  archiveText: {
    flex: 1
  },
  summary: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6
  },
  resultCount: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2
  },
  highlight: {
    backgroundColor: "#fff4d8",
    borderColor: "#ead19c",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    padding: 12
  },
  highlightLabel: {
    color: palette.gold,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
    textTransform: "uppercase"
  },
  winnerGrid: {
    gap: 12,
    marginTop: 2
  },
  winnerCard: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 12,
    padding: 14,
    width: "100%"
  },
  featuredWinner: {
    width: 190
  },
  portrait: {
    aspectRatio: 1,
    borderRadius: 52,
    height: 104,
    marginBottom: 10,
    width: 104
  },
  winnerName: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center"
  },
  winnerMeta: {
    color: palette.muted,
    fontSize: 13,
    marginTop: 3
  },
  awardBadge: {
    backgroundColor: "#fff1cb",
    borderRadius: 6,
    color: palette.gold,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 9,
    paddingHorizontal: 9,
    paddingVertical: 5,
    textAlign: "center"
  },
  winnerEvent: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    textAlign: "center"
  },
  linkButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    minHeight: 44,
    marginTop: 6
  },
  linkButtonText: {
    color: palette.teal,
    fontSize: 14,
    fontWeight: "800"
  },
  detailImage: {
    aspectRatio: 16 / 10,
    borderRadius: 8,
    marginBottom: 16,
    width: "100%"
  },
  detailTitle: {
    color: palette.ink,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 36,
    marginBottom: 8
  },
  timingBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f6e8e9",
    borderRadius: 6,
    color: palette.red,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  bodyText: {
    color: palette.ink,
    fontSize: 16,
    lineHeight: 25,
    marginTop: 18
  },
  formError: {
    color: palette.red,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 14
  },
  subhead: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 20
  },
  listItem: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 6
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: palette.red,
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 22,
    minHeight: 50,
    paddingHorizontal: 16
  },
  primaryButtonText: {
    color: "#ffffff",
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "900"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 48
  },
  secondaryButtonText: {
    color: palette.green,
    fontSize: 15,
    fontWeight: "900"
  },
  empty: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 18,
    padding: 28
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 12
  },
  emptyText: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    textAlign: "center"
  },
  tabs: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderTopColor: palette.line,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    left: 0,
    paddingBottom: 12,
    paddingTop: 8,
    position: "absolute",
    right: 0
  },
  tab: {
    alignItems: "center",
    gap: 3,
    minHeight: 56,
    justifyContent: "center",
    minWidth: 86
  },
  tabText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  tabTextActive: {
    color: palette.red
  }
});
