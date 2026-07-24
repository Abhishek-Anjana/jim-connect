export type Club = string;

export type Event = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  club: Exclude<Club, "All">;
  image: string;
  image_data?: string;
  registration_link?: string;
  description: string;
  speakers: string[];
  attachments: string[];
};

export type ArchiveEntry = {
  id: string;
  eventId: string;
  name: string;
  date: string;
  club: Exclude<Club, "All">;
  year: string;
  image: string;
  image_data?: string;
  summary: string;
  driveUrl: string;
};

export type Winner = {
  id: string;
  name: string;
  batch: string;
  award: string;
  category?: string;
  club: Exclude<Club, "All">;
  eventName?: string;
  archiveId?: string;
  portrait?: string;
  image_data?: string;
  champion: boolean;
};

export type Notice = {
  id: string;
  title: string;
  message: string;
  from_office: string;
  priority: "Normal" | "Important" | "Urgent";
  created_at: string;
  is_active: boolean;
};

export const clubs: Club[] = [
  "All",
  "Student Affairs",
  "Marketing Club",
  "Finance Club",
  "HR Club",
  "Cultural Committee"
];

export const upcomingEvents: Event[] = [
  {
    attachments: ["Program schedule", "Speaker note"],
    club: "Media Relations Committee",
    description:
      "A full-day conclave bringing together student leaders, faculty mentors, and industry speakers to explore responsible leadership, campus citizenship, and the opportunities available in the upcoming academic term.",
    endsAt: "2026-08-16T16:00:00+05:30",
    id: "offline-e1",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
    name: "TEAM SPIRIT",
    speakers: ["Dean's Office", "Student Council"],
    startsAt: "2026-08-16T10:00:00+05:30",
    venue: "G Point Circle"
  },
  {
    attachments: ["Case brief", "Judging rubric"],
    club: "Marketing Club",
    description:
      "Student teams will solve a live brand positioning brief and present a campaign direction to a jury of faculty and alumni mentors.",
    endsAt: "2026-08-22T18:00:00+05:30",
    id: "offline-e2",
    image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80",
    name: "Brand Sprint Challenge",
    speakers: ["Marketing Club Faculty Coordinator", "Alumni Jury Panel"],
    startsAt: "2026-08-22T14:00:00+05:30",
    venue: "Seminar Hall 2"
  }
];

export const notices: Notice[] = [
  {
    created_at: "2026-07-24T09:00:00+05:30",
    from_office: "Dean Academics",
    id: "offline-notice-1",
    is_active: true,
    message: "Campus notices from the Dean's Office and student support teams will appear here when the live server is reachable.",
    priority: "Normal",
    title: "Welcome to JIM-Connect"
  }
];

export const archiveEntries: ArchiveEntry[] = [
  {
    club: "Student Affairs",
    date: "2026-04-26",
    driveUrl: "https://drive.google.com/",
    eventId: "past-1",
    id: "offline-a1",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
    name: "Campus Leadership Conclave",
    summary:
      "Campus Leadership Conclave brought student leaders, club representatives, faculty mentors, and the Student Affairs team together for a structured conversation on responsible leadership and campus citizenship. The program included keynote reflections, student council updates, peer learning moments, and a moderated discussion on how clubs can create more inclusive opportunities across the term. Participants explored practical themes such as transparent communication, event ownership, volunteer management, and recognition of student contribution. The archive preserves the event context, photographs, and recognition records so future student leaders can understand how leadership expectations were framed. It also captures the collaborative planning work behind the conclave, including agenda design, speaker coordination, venue management, and post-event documentation.",
    year: "2026"
  },
  {
    club: "Cultural & Creativity Committee",
    date: "2026-04-12",
    driveUrl: "https://drive.google.com/",
    eventId: "past-4",
    id: "offline-a2",
    image: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1200&q=80",
    name: "Jaipuria Talent Night",
    summary:
      "Jaipuria Talent Night brought the campus community together for an evening of music, theatre, dance, and spoken-word performances. Student teams planned the event end to end, from auditions and stage design to hosting and backstage coordination. The program highlighted the confidence, creativity, and collaborative spirit of the batch while giving first-year students a visible platform to participate in campus life. Faculty mentors appreciated the professionalism of the organizing committee, and the event closed with recognition for standout performers across solo and group categories. The archive preserves the event write-up and links to the complete photo repository for future batches. It also records how student volunteers coordinated rehearsals, managed stage transitions, and created a welcoming environment.",
    year: "2026"
  }
];

export const winners: Winner[] = [
  {
    archiveId: "offline-a1",
    award: "Champion of the Year",
    batch: "2025-27",
    category: "Leadership",
    champion: true,
    club: "Finance Club",
    eventName: "Campus Leadership Conclave",
    id: "offline-w1",
    name: "Yash Swarnkar",
    portrait: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80"
  },
  {
    archiveId: "offline-a2",
    award: "Best Performer",
    batch: "2024-26",
    category: "Culture",
    champion: true,
    club: "Cultural & Creativity Committee",
    eventName: "Jaipuria Talent Night",
    id: "offline-w2",
    name: "Garvit Tiwari",
    portrait: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80"
  }
];
