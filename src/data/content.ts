export type Club = string;

export type Event = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  club: Exclude<Club, "All">;
  image: string;
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
  summary: string;
  driveUrl: string;
};

export type Winner = {
  id: string;
  name: string;
  batch: string;
  award: string;
  category: string;
  club: Exclude<Club, "All">;
  eventName: string;
  archiveId: string;
  portrait: string;
  champion: boolean;
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
    id: "e1",
    name: "Campus Leadership Conclave",
    startsAt: "2026-05-18T10:00:00+05:30",
    endsAt: "2026-05-18T16:00:00+05:30",
    venue: "Main Auditorium",
    club: "Student Affairs",
    image:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
    description:
      "A full-day conclave bringing together student leaders, faculty mentors, and industry speakers to explore responsible leadership, campus citizenship, and the opportunities available in the upcoming academic term.",
    speakers: ["Dr. Rekha Attri", "Dean's Office", "Student Council"],
    attachments: ["Program schedule", "Speaker note"]
  },
  {
    id: "e2",
    name: "Brand Sprint Challenge",
    startsAt: "2026-05-22T14:00:00+05:30",
    endsAt: "2026-05-22T18:00:00+05:30",
    venue: "Seminar Hall 2",
    club: "Marketing Club",
    image:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80",
    description:
      "Student teams will solve a live brand positioning brief and present a campaign direction to a jury of faculty and alumni mentors.",
    speakers: ["Marketing Club Faculty Coordinator", "Alumni Jury Panel"],
    attachments: ["Case brief", "Judging rubric"]
  },
  {
    id: "e3",
    name: "FinQuest Simulation Day",
    startsAt: "2026-05-28T11:30:00+05:30",
    endsAt: "2026-05-28T15:30:00+05:30",
    venue: "Finance Lab",
    club: "Finance Club",
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80",
    description:
      "An applied finance simulation where students analyze market signals, balance risk, and defend portfolio choices across timed rounds.",
    speakers: ["Finance Club Core Team"],
    attachments: ["Simulation rules"]
  }
];

export const archiveEntries: ArchiveEntry[] = [
  {
    id: "a1",
    eventId: "past-1",
    name: "Campus Leadership Conclave",
    date: "2026-04-26",
    club: "Student Affairs",
    year: "2026",
    image:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
    driveUrl: "https://drive.google.com/",
    summary:
      "Campus Leadership Conclave brought student leaders, club representatives, faculty mentors, and the Student Affairs team together for a structured conversation on responsible leadership and campus citizenship. The program included keynote reflections, student council updates, peer learning moments, and a moderated discussion on how clubs can create more inclusive opportunities across the term. Participants explored practical themes such as transparent communication, event ownership, volunteer management, and recognition of student contribution. The archive preserves the event context, photographs, and recognition records so future student leaders can understand how leadership expectations were framed. It also captures the collaborative planning work behind the conclave, including agenda design, speaker coordination, venue management, and post-event documentation."
  },
  {
    id: "a4",
    eventId: "past-4",
    name: "Jaipuria Talent Night",
    date: "2026-04-12",
    club: "Cultural Committee",
    year: "2026",
    image:
      "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1200&q=80",
    driveUrl: "https://drive.google.com/",
    summary:
      "Jaipuria Talent Night brought the campus community together for an evening of music, theatre, dance, and spoken-word performances. Student teams planned the event end to end, from auditions and stage design to hosting and backstage coordination. The program highlighted the confidence, creativity, and collaborative spirit of the batch while giving first-year students a visible platform to participate in campus life. Faculty mentors appreciated the professionalism of the organizing committee, and the event closed with recognition for standout performers across solo and group categories. The archive preserves the event write-up and links to the complete photo repository for future batches. It also records how student volunteers coordinated rehearsals, managed stage transitions, and created a welcoming environment for participants from different specializations."
  },
  {
    id: "a2",
    eventId: "past-2",
    name: "HR Case Colloquium",
    date: "2026-03-14",
    club: "HR Club",
    year: "2026",
    image:
      "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
    driveUrl: "https://drive.google.com/",
    summary:
      "The HR Case Colloquium invited student teams to examine workplace culture, conflict resolution, and employee engagement through a contemporary case format. Participants worked under time constraints, presented diagnosis frameworks, and responded to faculty questions on feasibility and ethics. The event strengthened practical understanding of people management while encouraging clear communication and evidence-based recommendations. Several teams demonstrated strong analytical depth and maturity in handling sensitive organizational issues. The archive entry records the event context, winning teams, and a verified Google Drive folder containing photographs and supporting material shared by the organizing club. It also captures the learning value of peer review, faculty feedback, and structured case analysis for students preparing for management roles."
  },
  {
    id: "a3",
    eventId: "past-3",
    name: "Market Minds Quiz",
    date: "2025-11-22",
    club: "Marketing Club",
    year: "2025",
    image:
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80",
    driveUrl: "https://drive.google.com/",
    summary:
      "Market Minds Quiz tested students across brand history, consumer behavior, advertising recall, digital campaigns, and Indian market trends. The event used multiple rounds, including rapid-fire questions, visual clues, and strategy-based tie breakers. The format kept the audience engaged while rewarding preparation, speed, and teamwork. Club leaders used the event to create a lively academic competition that was accessible to juniors and seniors alike. This archive entry keeps the institutional record intact with a detailed summary, associated award references, and a one-tap link to the full image repository maintained externally on Google Drive. It also documents the role of quizmasters, scorekeepers, and faculty observers in keeping the competition transparent and energetic."
  }
];

export const winners: Winner[] = [
  {
    id: "w1",
    name: "Aarav Mehta",
    batch: "2025-27",
    award: "Champion of the Year",
    category: "Leadership",
    club: "Student Affairs",
    eventName: "Campus Leadership Conclave",
    archiveId: "a1",
    portrait:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
    champion: true
  },
  {
    id: "w2",
    name: "Nisha Rao",
    batch: "2024-26",
    award: "Best Performer",
    category: "Culture",
    club: "Cultural Committee",
    eventName: "Jaipuria Talent Night",
    archiveId: "a4",
    portrait:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
    champion: true
  },
  {
    id: "w3",
    name: "Kabir Sethi",
    batch: "2024-26",
    award: "Case Winner",
    category: "HR",
    club: "HR Club",
    eventName: "HR Case Colloquium",
    archiveId: "a2",
    portrait:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80",
    champion: false
  },
  {
    id: "w4",
    name: "Meera Kulkarni",
    batch: "2025-27",
    award: "Quiz Winner",
    category: "Marketing",
    club: "Marketing Club",
    eventName: "Market Minds Quiz",
    archiveId: "a3",
    portrait:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
    champion: false
  }
];
