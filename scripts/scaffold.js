#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function toPascalCase(slug) {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function toVarName(slug) {
  return slug
    .replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/-/g, ''); // remove hyphens before digits (e.g. -50th → 50th)
}

const name = process.argv[2];
if (!name) {
  console.error('Usage: npm run scaffold -- "Event Name"');
  process.exit(1);
}

const slug = slugify(name);
const pascal = toPascalCase(slug);
const varName = toVarName(slug);
const eventDir = path.join(ROOT, 'frontend', 'src', 'events', slug);

if (fs.existsSync(eventDir)) {
  console.error(`Event directory already exists: ${eventDir}`);
  process.exit(1);
}

fs.mkdirSync(eventDir, { recursive: true });

// config.ts
fs.writeFileSync(path.join(eventDir, 'config.ts'), `import type { EventConfig } from '../types';

export const config: EventConfig = {
  slug: '${slug}',
  name: '${name}',
  description: 'Add event description here.',
  date: 'TBD',
  fields: [
    { name: 'fullName', label: 'Full Name', type: 'text', required: true },
    { name: 'email', label: 'Email Address', type: 'email', required: true },
  ],
};
`);

// Form.tsx
fs.writeFileSync(path.join(eventDir, 'Form.tsx'), `import { useState } from 'react';
import { post } from '../../utils/api';
import { config } from './config';

export default function ${pascal}Form() {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await post(\`/events/\${config.slug}/signup\`, fields);
      setStatus('success');
      setMessage("You're signed up! See you there.");
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (status === 'success') {
    return <p className="success-msg">{message}</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {config.fields.map(field => (
        <div key={field.name} className="field">
          <label htmlFor={field.name}>
            {field.label}{field.required && <span aria-hidden="true"> *</span>}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              id={field.name}
              required={field.required}
              value={fields[field.name] ?? ''}
              onChange={e => setFields(f => ({ ...f, [field.name]: e.target.value }))}
            />
          ) : field.type === 'select' && field.options ? (
            <select
              id={field.name}
              required={field.required}
              value={fields[field.name] ?? ''}
              onChange={e => setFields(f => ({ ...f, [field.name]: e.target.value }))}
            >
              <option value="">Select...</option>
              {field.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              id={field.name}
              type={field.type}
              required={field.required}
              value={fields[field.name] ?? ''}
              onChange={e => setFields(f => ({ ...f, [field.name]: e.target.value }))}
            />
          )}
        </div>
      ))}
      {status === 'error' && <p className="error-msg">{message}</p>}
      <button type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Signing up...' : 'Sign Up'}
      </button>
    </form>
  );
}
`);

// Append to frontend/src/events/index.ts
const indexPath = path.join(ROOT, 'frontend', 'src', 'events', 'index.ts');
let indexContent = fs.readFileSync(indexPath, 'utf8');

indexContent = indexContent.replace(
  '// IMPORTS_END',
  `import { config as ${varName}Config } from './${slug}/config';\nimport ${pascal}Form from './${slug}/Form';\n// IMPORTS_END`
);
indexContent = indexContent.replace(
  '  // EVENTS_END',
  `  { config: ${varName}Config, Form: ${pascal}Form },\n  // EVENTS_END`
);
fs.writeFileSync(indexPath, indexContent);

// Append to worker/src/events/registry.ts
const registryPath = path.join(ROOT, 'worker', 'src', 'events', 'registry.ts');
let registryContent = fs.readFileSync(registryPath, 'utf8');

registryContent = registryContent.replace(
  '  // EVENTS_END',
  `  {
    slug: '${slug}',
    name: '${name}',
    description: 'Add event description here.',
    date: 'TBD',
    fields: [
      { name: 'fullName', label: 'Full Name', type: 'text', required: true },
      { name: 'email', label: 'Email Address', type: 'email', required: true },
    ],
  },
  // EVENTS_END`
);
fs.writeFileSync(registryPath, registryContent);

// Append to frontend/src/events/og-metadata.ts
const ogMetaPath = path.join(ROOT, 'frontend', 'src', 'events', 'og-metadata.ts');
let ogMetaContent = fs.readFileSync(ogMetaPath, 'utf8');

ogMetaContent = ogMetaContent.replace(
  '  // OG_END',
  `  '${slug}': {\n    name: '${name}',\n    description: 'Sign up for ${name}.',\n  },\n  // OG_END`
);
fs.writeFileSync(ogMetaPath, ogMetaContent);

console.log(`
Scaffolded event: "${name}" (${slug})

Created:
  frontend/src/events/${slug}/config.ts
  frontend/src/events/${slug}/Form.tsx

Updated:
  frontend/src/events/index.ts
  frontend/src/events/og-metadata.ts
  worker/src/events/registry.ts

Next steps:
  1. Edit frontend/src/events/${slug}/config.ts to update fields
  2. Edit frontend/src/events/${slug}/Form.tsx to customize the form layout
  3. Edit frontend/src/events/og-metadata.ts to write a good preview description
  4. Restart dev servers to pick up the new route
`);
