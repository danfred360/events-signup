// Crawler-facing metadata for link previews. Must stay in sync with event configs.
// Scaffold script appends to this file — do not remove the // OG_END marker.
export const eventOgData: Record<string, { name: string; description: string }> = {
  'example-event': {
    name: 'Example Event',
    description: 'Sign up for our upcoming event.',
  },
  'dan-surprise-50th-birthday': {
    name: "Dan's Surprise 50th Birthday 🎂",
    description: 'Join us for a surprise 50th birthday celebration on July 19, 2026 in New Holland, PA!',
  },
  'july-house-party-on-west-end-ave': {
    name: 'July House Party on West End Ave 🎉',
    description: 'Summer house party on July 24th, 2026. RSVP and add your song picks for the playlist!',
  },
  // OG_END
};
