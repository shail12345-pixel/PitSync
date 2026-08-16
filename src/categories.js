// Category list + colors. Import as-is, or pass your own array with the same
// shape into any PitSync component's `categories` prop.
export const CATEGORIES = [
  { id: 'auton',    label: 'AUTON',      color: 'oklch(0.76 0.09 252)' },
  { id: 'defense',  label: 'DEFENSE',    color: 'oklch(0.72 0.10 32)'  },
  { id: 'scoring',  label: 'SCORING',    color: 'oklch(0.78 0.09 152)' },
  { id: 'drive',    label: 'DRIVETRAIN', color: 'oklch(0.80 0.09 88)'  },
  { id: 'other',    label: 'OTHER',      color: 'oklch(0.75 0.06 310)' },
];
 
export const AMBER = 'oklch(0.80 0.09 88)';
export const GREEN = 'oklch(0.78 0.09 152)';
export const RED = 'oklch(0.68 0.10 32)';
 
export const getCategory = (id, categories = CATEGORIES) =>
  categories.find((c) => c.id === id) || categories[categories.length - 1];
 
// Visual treatment for a note's delivery state.
// note.status: 'sending' | 'queued' | 'sent'
export function noteStyle(note, categories = CATEGORIES) {
  const cat = getCategory(note.category, categories);
  const sending = note.status === 'sending';
  const queued = note.status === 'queued';
  return {
    cat,
    label: cat.label,
    labelColor: sending || queued ? 'rgba(255,255,255,0.42)' : cat.color,
    tick: queued ? 'rgba(255,255,255,0.16)' : sending ? 'rgba(255,255,255,0.3)' : cat.color,
    opacity: sending ? 0.62 : queued ? 0.48 : 1,
    statusText: sending ? 'sending' : queued ? 'queued · offline' : '',
    statusColor: queued ? AMBER : 'rgba(255,255,255,0.35)',
    shimmer: sending,
  };
}
 
// connection: 'good' | 'spotty' | 'offline'
export function connectionStyle(connection) {
  if (connection === 'offline') return { color: RED, width: '18%', label: 'offline · queueing' };
  if (connection === 'spotty') return { color: AMBER, width: '46%', label: 'weak signal' };
  return { color: GREEN, width: '100%', label: 'live' };
}
 