import React, { useState } from 'react';
import { shareUrl } from '@/lib/share';
import { useVisualizationStore } from '@/store/visualizationStore';

const ShareButton: React.FC = () => {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');
  const setError = useVisualizationStore((s) => s.setError);

  const share = async () => {
    try {
      const url = await shareUrl(useVisualizationStore.getState().code);
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        window.prompt('Copy this link:', url);
      }
      setState('copied');
    } catch (e) {
      setState('error');
      setError(`Could not create a share link: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
    setTimeout(() => setState('idle'), 2000);
  };

  return (
    <button
      onClick={share}
      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      title="Copy a link that opens this program"
      aria-live="polite"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
      {state === 'copied' ? 'Link copied' : 'Share'}
    </button>
  );
};

export default ShareButton;
