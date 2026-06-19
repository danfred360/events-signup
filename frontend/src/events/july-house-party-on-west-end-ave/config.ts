import type { EventConfig } from '../types';

export const config: EventConfig = {
  slug: 'july-house-party-on-west-end-ave',
  name: 'July House Party on West End Ave',
  description: 'Summer house party on July 24th, 2026. RSVP to let us know you\'re coming!',
  date: 'Friday, July 24, 2026',
  fields: [
    { name: 'fullName', label: 'Full Name', type: 'text', required: true },
    { name: 'additionalGuests', label: 'Additional Guests', type: 'number', required: true },
    { name: 'phone', label: 'Phone Number', type: 'tel', required: true },
    { name: 'songRecommendations', label: 'Song Recommendations', type: 'song-recommendations', required: false },
  ],
};
