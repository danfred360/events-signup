import type { EventConfig } from '../types';

export const config: EventConfig = {
  slug: 'example-event',
  name: 'Example Event',
  description: 'This is an example event. Replace this with your event details.',
  date: 'TBD',
  fields: [
    { name: 'fullName', label: 'Full Name', type: 'text', required: true },
    { name: 'email', label: 'Email Address', type: 'email', required: true },
    { name: 'phone', label: 'Phone Number', type: 'tel', required: false },
    { name: 'guests', label: 'Number of Guests', type: 'number', required: false },
    { name: 'notes', label: 'Notes or Questions', type: 'textarea', required: false },
  ],
};
