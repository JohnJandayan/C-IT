import React, { useEffect, useRef } from 'react';
import { useVisualizationStore } from '@/store/visualizationStore';

const Controls: React.FC = () => {
  const {
    isPlaying,
    currentStep,
    trace,
    animationSpeed,
    play,
    pause,
    nextStep,
    previousStep,
    reset,
    setAnimationSpeed,
    executeCode,
    isLoading,
  } = useVisualizationStore();

  const intervalRef = useRef<number | null>(null);

  // Auto-play logic
  useEffect(() => {
    if (isPlaying && trace && trace.steps.length > 0) {
      intervalRef.current = window.setInterval(() => {
        nextStep();
      }, animationSpeed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, animationSpeed, nextStep, trace]);

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const speed = parseInt(e.target.value);
    setAnimationSpeed(speed);
  };

  const isAtStart = currentStep === 0;
  const isAtEnd = trace ? currentStep >= trace.steps.length - 1 : true;
  const hasTrace = trace && trace.steps.length > 0;

  return (
    <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Execute Button */}
        <button
          onClick={executeCode}
          disabled={isLoading}
          className={`px-6 py-2 rounded-lg font-semibold transition-all ${
            isLoading
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Executing...
            </span>
          ) : (
            'Execute Code'
          )}
        </button>

        {/* Playback Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            disabled={!hasTrace || isAtStart}
            className="p-2 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
            title="Reset to start"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
          </button>

          <button
            onClick={previousStep}
            disabled={!hasTrace || isAtStart}
            className="p-2 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
            title="Previous step"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {isPlaying ? (
            <button
              onClick={pause}
              disabled={!hasTrace}
              className="p-3 rounded-full bg-yellow-600 hover:bg-yellow-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all shadow-lg"
              title="Pause"
            >
              <svg
                className="w-6 h-6"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={play}
              disabled={!hasTrace || isAtEnd}
              className="p-3 rounded-full bg-green-600 hover:bg-green-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all shadow-lg"
              title="Play"
            >
              <svg
                className="w-6 h-6"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          )}

          <button
            onClick={nextStep}
            disabled={!hasTrace || isAtEnd}
            className="p-2 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
            title="Next step"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-3 min-w-[200px]">
          <label className="text-sm text-gray-400">Speed:</label>
          <input
            type="range"
            min="100"
            max="3000"
            step="100"
            value={animationSpeed}
            onChange={handleSpeedChange}
            disabled={!hasTrace}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          />
          <span className="text-sm text-gray-400 w-12 text-right">
            {(animationSpeed / 1000).toFixed(1)}s
          </span>
        </div>

        {/* Step Counter */}
        {hasTrace && (
          <div className="text-sm text-gray-400 font-mono">
            {currentStep + 1} / {trace.steps.length}
          </div>
        )}
      </div>
    </div>
  );
};

export default Controls;
