// IMPORTS_START
import { config as exampleEventConfig } from './example-event/config';
import ExampleEventForm from './example-event/Form';
import { config as dadSSurprise50thBirthdayConfig } from './dad-s-surprise-50th-birthday/config';
import DadSSurprise50thBirthdayForm from './dad-s-surprise-50th-birthday/Form';
// IMPORTS_END

export type { EventConfig, EventField } from './types';

export const events = [
  // EVENTS_START
  { config: exampleEventConfig, Form: ExampleEventForm },
  { config: dadSSurprise50thBirthdayConfig, Form: DadSSurprise50thBirthdayForm },
  // EVENTS_END
] as const;

export type EventEntry = (typeof events)[number];
