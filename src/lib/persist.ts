// Auto-save code and settings to localStorage, and restore them (or a shared
// program from the URL) on startup.

import { DEFAULT_CODE, useVisualizationStore } from '@/store/visualizationStore';
import type { Granularity } from '@/types';
import { decodeShare, MAX_SHARE_CODE_BYTES } from './share';

const KEY = 'c-it:v2';
const SAVE_DELAY_MS = 500;

interface Saved {
  code: string;
  speed: number;
  granularity: Granularity;
  reduceMotion: boolean;
  breakpoints: number[];
}

function readSaved(): Partial<Saved> | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Saved>;
    return typeof v === 'object' && v ? v : null;
  } catch {
    return null;
  }
}

function sanitize(v: Partial<Saved>): Partial<Saved> {
  const out: Partial<Saved> = {};
  if (typeof v.code === 'string' && v.code.length <= MAX_SHARE_CODE_BYTES) out.code = v.code;
  if (typeof v.speed === 'number' && v.speed >= 50 && v.speed <= 2000) out.speed = v.speed;
  if (v.granularity === 'line' || v.granularity === 'expr') out.granularity = v.granularity;
  if (typeof v.reduceMotion === 'boolean') out.reduceMotion = v.reduceMotion;
  if (Array.isArray(v.breakpoints)) out.breakpoints = v.breakpoints.filter((n) => Number.isInteger(n) && n > 0 && n < 100000).slice(0, 200);
  return out;
}

export async function restoreSession(confirmReplace: (msg: string) => boolean = (m) => window.confirm(m)): Promise<void> {
  const st = useVisualizationStore.getState();
  const saved = sanitize(readSaved() ?? {});
  if (saved.speed) st.setAnimationSpeed(saved.speed);
  if (saved.granularity) st.setGranularity(saved.granularity);
  if (saved.reduceMotion !== undefined) st.setReduceMotion(saved.reduceMotion);
  if (saved.code) st.setCode(saved.code);
  if (saved.breakpoints) st.setBreakpoints(saved.breakpoints);

  const hash = window.location.hash;
  if (hash.startsWith('#code=')) {
    try {
      const shared = await decodeShare(hash);
      if (shared !== null && shared !== useVisualizationStore.getState().code) {
        const current = useVisualizationStore.getState().code;
        const hasOwnWork = current.trim() !== DEFAULT_CODE.trim() && current.trim().length > 0;
        if (!hasOwnWork || confirmReplace('Open the shared program? Your current code in this browser will be replaced.')) {
          st.setCode(shared);
          st.setBreakpoints([]);
        }
      }
    } catch (e) {
      st.setError(`Could not open the share link: ${e instanceof Error ? e.message : 'invalid link'}`);
    }
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const unsub = useVisualizationStore.subscribe((s, prev) => {
    if (
      s.code === prev.code &&
      s.animationSpeed === prev.animationSpeed &&
      s.granularity === prev.granularity &&
      s.reduceMotion === prev.reduceMotion &&
      s.breakpoints === prev.breakpoints
    ) {
      return;
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const data: Saved = {
        code: s.code,
        speed: s.animationSpeed,
        granularity: s.granularity,
        reduceMotion: s.reduceMotion,
        breakpoints: s.breakpoints,
      };
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
      } catch {
        // Storage full or disabled: auto-save is best effort.
      }
    }, SAVE_DELAY_MS);
  });
  return () => {
    if (timer) clearTimeout(timer);
    unsub();
  };
}
