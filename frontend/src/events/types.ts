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
