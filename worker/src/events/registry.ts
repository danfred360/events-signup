export interface EventField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'checkbox' | 'textarea' | 'song-recommendations';
  required: boolean;
  options?: readonly string[];
}

export interface EventConfig {
  slug: string;
  name: string;
  description: string;
  date: string;
  fields: readonly EventField[];
}

export const eventRegistry: EventConfig[] = [
  {
    slug: 'example-event',
    name: 'Example Event',
    description: 'This is an example event.',
    date: 'TBD',
    fields: [
      { name: 'fullName', label: 'Full Name', type: 'text', required: true },
      { name: 'email', label: 'Email Address', type: 'email', required: true },
      { name: 'phone', label: 'Phone Number', type: 'tel', required: false },
      { name: 'guests', label: 'Number of Guests', type: 'number', required: false },
      { name: 'notes', label: 'Notes', type: 'textarea', required: false },
    ],
  },
  {
    slug: 'dan-surprise-50th-birthday',
    name: "Dan's Surprise 50th Birthday",
    description: "A surprise celebration for a very special 50th!",
    date: 'July 19, 2026',
    fields: [
      { name: 'fullName', label: 'Full Name', type: 'text', required: true },
      { name: 'email', label: 'Email Address', type: 'email', required: true },
      { name: 'guests', label: 'Additional Guests', type: 'number', required: false },
      { name: 'notes', label: 'Notes or Questions', type: 'textarea', required: false },
    ],
  },
  {
    slug: 'july-house-party-on-west-end-ave',
    name: 'July House Party on West End Ave',
    description: "Summer house party on July 24th, 2026. RSVP to let us know you're coming!",
    date: 'Friday, July 24, 2026',
    fields: [
      { name: 'fullName', label: 'Full Name', type: 'text', required: true },
      { name: 'additionalGuests', label: 'Additional Guests', type: 'number', required: true },
      { name: 'phone', label: 'Phone Number', type: 'tel', required: true },
      { name: 'songRecommendations', label: 'Song Recommendations', type: 'song-recommendations', required: false },
    ],
  },
  // EVENTS_END
];

export function getEvent(slug: string): EventConfig | undefined {
  return eventRegistry.find(e => e.slug === slug);
}
