export interface EventField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'checkbox' | 'textarea';
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
  // EVENTS_END
];

export function getEvent(slug: string): EventConfig | undefined {
  return eventRegistry.find(e => e.slug === slug);
}
