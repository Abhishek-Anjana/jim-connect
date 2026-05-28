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
  category: string;
  club: Exclude<Club, "All">;
  eventName: string;
  archiveId: string;
  portrait: string;
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

export const upcomingEvents: Event[] = [];
export const notices: Notice[] = [];
export const archiveEntries: ArchiveEntry[] = [];
export const winners: Winner[] = [];
