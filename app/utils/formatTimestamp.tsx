import type { Timestamp } from 'firebase/firestore';

export function formatTimestamp(ts?: Timestamp | { seconds?: number; nanoseconds?: number } | null) {
  if (!ts) return 'Not available';
  // preferred: firestore Timestamp
  if ((ts as any)?.toDate) {
    try { return (ts as any).toDate().toLocaleString(); } catch {}
  }
  // fallback: {seconds, nanoseconds}
  if (typeof ts === 'object' && typeof (ts as any).seconds === 'number') {
    const ms = (ts as any).seconds * 1000 + Math.round(((ts as any).nanoseconds ?? 0) / 1_000_000);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? 'Invalid date' : d.toLocaleString();
  }
  return String(ts);
}
