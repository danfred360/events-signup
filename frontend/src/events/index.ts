// IMPORTS_START
import { config as exampleEventConfig } from './example-event/config';
import ExampleEventForm from './example-event/Form';
// IMPORTS_END

export type { EventConfig, EventField } from './types';

export const events = [
  // EVENTS_START
  { config: exampleEventConfig, Form: ExampleEventForm },
  // EVENTS_END
] as const;

export type EventEntry = (typeof events)[number];
