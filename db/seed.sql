insert into events (
  id, name, starts_at, ends_at, venue, club, image, description, speakers, attachments, published, reminder_sent
) values
  (
    'e1',
    'TEAM SPRIT',
    '2026-05-16T10:00:00+05:30',
    '2026-05-16T16:00:00+05:30',
    'G PONIT CIRCLE',
    'MEDIA RELATION CLUB',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    'A full-day conclave bringing together student leaders, faculty mentors, and industry speakers to explore responsible leadership, campus citizenship, and the opportunities available in the upcoming academic term.',
    '["Dr. Rekha Attri", "Dean''s Office", "Student Council"]'::jsonb,
    '["Program schedule", "Speaker note"]'::jsonb,
    true,
    false
  ),
  (
    'e2',
    'Brand Sprint Challenge',
    '2026-05-22T14:00:00+05:30',
    '2026-05-22T18:00:00+05:30',
    'Seminar Hall 2',
    'Marketing Club',
    'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80',
    'Student teams will solve a live brand positioning brief and present a campaign direction to a jury of faculty and alumni mentors.',
    '["Marketing Club Faculty Coordinator", "Alumni Jury Panel"]'::jsonb,
    '["Case brief", "Judging rubric"]'::jsonb,
    true,
    false
  ),
  (
    'e3',
    'FinQuest Simulation Day',
    '2026-05-28T11:30:00+05:30',
    '2026-05-28T15:30:00+05:30',
    'Finance Lab',
    'Finance Club',
    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80',
    'An applied finance simulation where students analyze market signals, balance risk, and defend portfolio choices across timed rounds.',
    '["Finance Club Core Team"]'::jsonb,
    '["Simulation rules"]'::jsonb,
    true,
    false
  )
on conflict (id) do nothing;

insert into archive (
  id, event_id, name, date, club, year, image, summary, drive_url
) values
  (
    'a1',
    'past-1',
    'Campus Leadership Conclave',
    '2026-04-26',
    'Student Affairs',
    '2026',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    'Campus Leadership Conclave brought student leaders, club representatives, faculty mentors, and the Student Affairs team together for a structured conversation on responsible leadership and campus citizenship. The program included keynote reflections, student council updates, peer learning moments, and a moderated discussion on how clubs can create more inclusive opportunities across the term.',
    'https://drive.google.com/'
  ),
  (
    'a2',
    'past-2',
    'HR Case Colloquium',
    '2026-03-14',
    'HR Club',
    '2026',
    'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80',
    'The HR Case Colloquium invited student teams to examine workplace culture, conflict resolution, and employee engagement through a contemporary case format. Participants worked under time constraints, presented diagnosis frameworks, and responded to faculty questions on feasibility and ethics while building practical understanding of people management.',
    'https://drive.google.com/'
  ),
  (
    'a3',
    'past-3',
    'Market Minds Quiz',
    '2025-11-22',
    'Marketing Club',
    '2025',
    'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80',
    'Market Minds Quiz tested students across brand history, consumer behavior, advertising recall, digital campaigns, and Indian market trends. The event used rapid-fire questions, visual clues, and strategy-based tie breakers to reward preparation, speed, teamwork, and transparent competition.',
    'https://drive.google.com/'
  )
on conflict (id) do nothing;

insert into hall_of_fame (
  id, name, batch, award, category, club, event_name, archive_id, portrait, champion
) values
  (
    'w1',
    'YASH SWARNKAR',
    '2025-27',
    'Champion of the Year',
    'Leadership',
    'FINANCE CLUB',
    'Campus Leadership Conclave',
    'a1',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
    true
  ),
  (
    'w2',
    'Garvit Tiwari',
    '2024-26',
    'Best Performer',
    'Culture',
    'Cultural Committee',
    'Campus Leadership Conclave',
    'a1',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
    true
  ),
  (
    'w3',
    'Kabir Sethi',
    '2024-26',
    'Case Winner',
    'HR',
    'HR Club',
    'HR Case Colloquium',
    'a2',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80',
    false
  )
on conflict (id) do nothing;

insert into admins (
  id, name, email, role, active, token
) values
  ('admin-1', 'Dr. Rekha Attri', 'rekha.attri@jaipuria.ac.in', 'Super Admin', true, 'jim-admin-dev'),
  ('admin-2', 'Student Affairs Content Manager', 'content.manager@jaipuria.ac.in', 'Content Manager', true, 'jim-content-dev'),
  ('admin-3', 'Read Only Viewer', 'viewer@jaipuria.ac.in', 'Read-Only Viewer', true, 'jim-viewer-dev')
on conflict (id) do nothing;

insert into push_tokens (
  platform, token
) values
  ('ios', 'ExponentPushToken[demo-ios]'),
  ('android', 'ExponentPushToken[demo-android]'),
  ('web', 'local-web-demo-token')
on conflict (token) do nothing;

insert into notifications (
  id, payload, sent_at, status, token_count, error
) values
  (
    'notification-1',
    '{"title": "New Event at JIM! 🎉", "body": "TEAM SPRIT has been added. Tap to view details.", "sound": "default", "data": {"eventId": "e1", "screen": "EventDetail"}}'::jsonb,
    '2026-05-10T10:00:00+05:30',
    'recorded',
    3,
    null
  ),
  (
    'notification-2',
    '{"title": "Starting Soon! ⏰", "body": "Brand Sprint Challenge starts in 1 hour. Don''t miss it!", "sound": "default", "data": {"eventId": "e2", "screen": "EventDetail"}}'::jsonb,
    '2026-05-11T10:00:00+05:30',
    'sent',
    2,
    null
  ),
  (
    'notification-3',
    '{"title": "Starting Soon! ⏰", "body": "FinQuest Simulation Day starts in 1 hour. Don''t miss it!", "sound": "default", "data": {"eventId": "e3", "screen": "EventDetail"}}'::jsonb,
    '2026-05-12T10:00:00+05:30',
    'failed',
    2,
    'Expo push request failed'
  )
on conflict (id) do nothing;

insert into audit_log (
  id, action, id_ref, module, timestamp, "user"
) values
  ('audit-1', 'create', 'e1', 'events', '2026-05-10T09:00:00+05:30', 'rekha.attri@jaipuria.ac.in'),
  ('audit-2', 'update', 'a1', 'archive', '2026-05-10T09:30:00+05:30', 'content.manager@jaipuria.ac.in'),
  ('audit-3', 'notify', 'e1', 'events', '2026-05-10T10:00:00+05:30', 'rekha.attri@jaipuria.ac.in')
on conflict (id) do nothing;
