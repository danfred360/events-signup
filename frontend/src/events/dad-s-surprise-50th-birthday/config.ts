import type { EventConfig } from '../types';

export const config: EventConfig = {
  slug: 'dan-surprise-50th-birthday',
  name: "Dan's Surprise 50th Birthday 🎂",
  description: "A surprise celebration for a very special 50th!",
  date: 'Saturday, July 19, 2026',
  fields: [
    { name: 'fullName', label: 'Full Name', type: 'text', required: true },
    { name: 'email', label: 'Email Address', type: 'email', required: true },
    { name: 'guests', label: 'Number of Guests', type: 'number', required: false },
    { name: 'notes', label: 'Notes or Questions', type: 'textarea', required: false },
  ],
};
