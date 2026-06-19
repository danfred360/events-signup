// IMPORTS_START
import { config as exampleEventConfig } from './example-event/config';
import ExampleEventForm from './example-event/Form';
import { config as danSurprise50thBirthdayConfig } from './dad-s-surprise-50th-birthday/config';
import DadSSurprise50thBirthdayForm from './dad-s-surprise-50th-birthday/Form';
import { config as julyHousePartyOnWestEndAveConfig } from './july-house-party-on-west-end-ave/config';
import JulyHousePartyOnWestEndAveForm from './july-house-party-on-west-end-ave/Form';
// IMPORTS_END

export type { EventConfig, EventField } from './types';

export const events = [
  // EVENTS_START
  { config: exampleEventConfig, Form: ExampleEventForm },
  { config: danSurprise50thBirthdayConfig, Form: DadSSurprise50thBirthdayForm },
  { config: julyHousePartyOnWestEndAveConfig, Form: JulyHousePartyOnWestEndAveForm },
  // EVENTS_END
] as const;

export type EventEntry = (typeof events)[number];
