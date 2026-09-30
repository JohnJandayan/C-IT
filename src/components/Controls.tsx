import React, { useMemo, useState } from 'react';
import { StepKind } from '@/engine/protocol';
import { timeline, useVisualizationStore, visibleSteps } from '@/store/visualizationStore';

const Icon: React.FC<{ d: string; fill?: boolean; className?: string }> = ({ d, fill, className = 'w-5 h-5' }) => (
  <svg className={className} fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
);

const btn =
  'p-2 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400';

export const SHORTCUTS: [string, string][] = [
  ['Ctrl+Enter', 'Run / visualize'],
  ['Space', 'Play / pause'],
  ['→ / ←', 'Next / previous step'],
  ['Shift+→ / Shift+←', 'Next / previous expression step'],
  ['Home / End', 'First / last step'],
  ['F5', 'Continue to next breakpoint'],
  ['F9', 'Toggle breakpoint (in editor)'],
];

const Controls: React.FC = () => {
  const s = useVisualizationStore();
  const [showHelp, setShowHelp] = useState(false);
  const running = s.status === 'running' || s.status === 'compiling' || s.status === 'input';
  const hasTrace = s.stepCount > 0 && s.cursor >= 0;

  // Position among visible steps (recomputed as the trace grows).
  const { position, total, marks } = useMemo(() => {
    const vis = visibleSteps(s.granularity);
    let pos = 0;
    let lo = 0;
    let hi = vis.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (vis[mid] <= s.cursor) {
        pos = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    // Scrubber ticks for breakpoints and errors (sampled for long traces).
    const m: { at: number; kind: 'bp' | 'err' }[] = [];
    if (vis.length > 1) {
      const bp = new Set(s.breakpoints);
      let lastBpPct = -1;
      for (let i = 0; i < vis.length; i++) {
        const st = timeline.steps[vis[i]];
        const pct = (i / (vis.length - 1)) * 100;
        if (st.k === StepKind.Error) m.push({ at: pct, kind: 'err' });
        else if (bp.has(st.l) && st.k === StepKind.Stmt && pct - lastBpPct > 0.5) {
          m.push({ at: pct, kind: 'bp' });
          lastBpPct = pct;
        }
      }
    }
    return { position: pos, total: vis.length, marks: m.slice(0, 400) };
  }, [s.cursor, s.stepCount, s.granularity, s.breakpoints]);

  const atStart = position <= 0;
  const atEnd = position >= total - 1 && (s.status === 'done' || s.status === 'error');

  const onScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vis = visibleSteps(s.granularity);
    const idx = vis[Number(e.target.value)];
    if (idx !== undefined) {
      s.pause();
      s.seek(idx);
    }
  };

  return (
    <div className="bg-gray-800 border-t border-gray-700 px-6 py-3" role="toolbar" aria-label="Execution controls">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Run / Stop */}
        {running ? (
          <button
            onClick={s.stopExecution}
            className="px-6 py-2 rounded-lg font-semibold transition-all bg-red-600 hover:bg-red-700 text-white shadow-lg flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            title="Stop the running program"
          >
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {s.status === 'input' ? 'Waiting for input… Stop' : 'Stop'}
          </button>
        ) : (
          <button
            onClick={s.executeCode}
            className="px-6 py-2 rounded-lg font-semibold transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            title="Compile and visualize (Ctrl+Enter)"
          >
            Execute Code
          </button>
        )}

        {/* Playback */}
        <div className="flex items-center gap-2">
          <button onClick={s.reset} disabled={!hasTrace || atStart} className={btn} title="First step (Home)" aria-label="First step">
            <Icon d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </button>
          <button onClick={s.previousStep} disabled={!hasTrace || atStart} className={btn} title="Previous step (←)" aria-label="Previous step">
            <Icon d="M15 19l-7-7 7-7" className="w-6 h-6" />
          </button>
          {s.isPlaying ? (
            <button
              onClick={s.pause}
              className="p-3 rounded-full bg-yellow-600 hover:bg-yellow-700 text-white transition-all shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
              title="Pause (Space)"
              aria-label="Pause"
            >
              <Icon d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" fill className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={s.play}
              disabled={!hasTrace}
              className="p-3 rounded-full bg-green-600 hover:bg-green-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
              title="Play (Space)"
              aria-label="Play"
            >
              <Icon d="M8 5v14l11-7z" fill className="w-6 h-6" />
            </button>
          )}
          <button onClick={s.nextStep} disabled={!hasTrace || atEnd} className={btn} title="Next step (→)" aria-label="Next step">
            <Icon d="M9 5l7 7-7 7" className="w-6 h-6" />
          </button>
          <button onClick={s.last} disabled={!hasTrace || atEnd} className={btn} title="Last step (End)" aria-label="Last step">
            <Icon d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </button>
          <button
            onClick={s.continueToBreakpoint}
            disabled={!hasTrace || s.breakpoints.length === 0}
            className={btn}
            title={s.breakpoints.length ? 'Continue to next breakpoint (F5)' : 'Click the editor gutter to add breakpoints'}
            aria-label="Continue to next breakpoint"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 5v14l9-7z" fill="currentColor" />
              <circle cx="18" cy="12" r="3" fill="#ef4444" />
            </svg>
          </button>
        </div>

        {/* Timeline scrubber */}
        <div className="flex-1 min-w-[160px] relative flex items-center">
          <input
            type="range"
            min={0}
            max={Math.max(total - 1, 0)}
            value={Math.min(position, Math.max(total - 1, 0))}
            onChange={onScrub}
            disabled={!hasTrace}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed accent-blue-500"
            aria-label="Timeline"
            aria-valuetext={`Step ${position + 1} of ${total}`}
          />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-3">
            {marks.map((m, i) => (
              <span
                key={i}
                className={`absolute w-0.5 h-3 ${m.kind === 'err' ? 'bg-red-500' : 'bg-red-400/70'}`}
                style={{ left: `calc(${m.at}% - 1px)` }}
              />
            ))}
          </div>
        </div>

        {/* Granularity + speed */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-md overflow-hidden border border-gray-600 text-xs" role="group" aria-label="Step granularity">
            {(['line', 'expr'] as const).map((g) => (
              <button
                key={g}
                onClick={() => s.setGranularity(g)}
                aria-pressed={s.granularity === g}
                className={`px-2.5 py-1 font-semibold transition-colors ${
                  s.granularity === g ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title={g === 'line' ? 'Step one statement at a time' : 'Step through each sub-expression'}
              >
                {g === 'line' ? 'Line' : 'Expr'}
              </button>
            ))}
          </div>
          <label className="text-sm text-gray-400" htmlFor="cit-speed">Speed:</label>
          <input
            id="cit-speed"
            type="range"
            min="50"
            max="2000"
            step="50"
            value={2050 - s.animationSpeed}
            onChange={(e) => s.setAnimationSpeed(2050 - Number(e.target.value))}
            className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            aria-valuetext={`${(s.animationSpeed / 1000).toFixed(2)} seconds per step`}
          />
          <span className="text-sm text-gray-400 w-12 text-right font-mono">{(s.animationSpeed / 1000).toFixed(2)}s</span>
          <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer" title="Reduce animations">
            <input type="checkbox" checked={s.reduceMotion} onChange={(e) => s.setReduceMotion(e.target.checked)} className="accent-blue-500" />
            Less motion
          </label>
        </div>

        {/* Counter + help */}
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-400 font-mono min-w-[90px] text-right" aria-live="polite">
            {hasTrace ? `${position + 1} / ${total}${s.status === 'running' ? '+' : ''}` : '— / —'}
          </div>
          <div className="relative">
            <button
              onClick={() => setShowHelp((v) => !v)}
              className="w-7 h-7 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              aria-label="Keyboard shortcuts"
              aria-expanded={showHelp}
            >
              ?
            </button>
            {showHelp && (
              <div className="absolute bottom-full right-0 mb-2 w-72 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 z-50 text-sm">
                <div className="font-semibold text-blue-400 mb-2">Keyboard shortcuts</div>
                <table className="w-full">
                  <tbody>
                    {SHORTCUTS.map(([k, v]) => (
                      <tr key={k}>
                        <td className="pr-3 py-0.5 font-mono text-yellow-300 whitespace-nowrap">{k}</td>
                        <td className="text-gray-300">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;
