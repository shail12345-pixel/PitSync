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
//
// The row-level `opacity` compounds with every color inside that row (it
// dims the whole subtree, not just a tint) — WCAG AA needs the compounded
// result to still clear 4.5:1 against the page background, not just the
// undimmed color in isolation. 0.88/0.80 here (was 0.62/0.48) is the
// smallest dimming that leaves labelColor/statusColor's own 0.62 white
// legible once multiplied through; the label/status/shimmer treatments
// already carry the "still in transit" signal, so the row itself doesn't
// need to fade much further on top of that.
export function noteStyle(note, categories = CATEGORIES) {
  const cat = getCategory(note.category, categories);
  const sending = note.status === 'sending';
  const queued = note.status === 'queued';
  return {
    cat,
    label: cat.label,
    labelColor: sending || queued ? 'rgba(255,255,255,0.62)' : cat.color,
    tick: queued ? 'rgba(255,255,255,0.16)' : sending ? 'rgba(255,255,255,0.3)' : cat.color,
    opacity: sending ? 0.88 : queued ? 0.8 : 1,
    statusText: sending ? 'sending' : queued ? 'queued · offline' : '',
    statusColor: queued ? AMBER : 'rgba(255,255,255,0.62)',
    shimmer: sending,
  };
}
 
// Buckets notes into their categories, newest-first within each, dropping
// empty categories. Shared by any "accumulated picture" view — TeamNotes
// (one team) and Driver's team-grouped default view (every team this
// session, each using this same per-team grouping underneath).
export function groupNotesByCategory(notes, categories = CATEGORIES) {
  return categories.map((cat) => ({ cat, items: notes.filter((n) => n.category === cat.id) })).filter((g) => g.items.length > 0);
}

// connection: 'good' | 'spotty' | 'offline'
export function connectionStyle(connection) {
  if (connection === 'offline') return { color: RED, width: '18%', label: 'offline · queueing' };
  if (connection === 'spotty') return { color: AMBER, width: '46%', label: 'weak signal' };
  return { color: GREEN, width: '100%', label: 'live' };
}
 