import { useEffect } from 'react';
import { useVisualizationStore } from '@/store/visualizationStore';

/** True when the key event belongs to a text field or the code editor. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('.monaco-editor')) return true;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (target as HTMLInputElement).type;
    return type !== 'range' && type !== 'checkbox' && type !== 'button';
  }
  return (target as HTMLElement).isContentEditable === true;
}

export function handleShortcut(e: KeyboardEvent): boolean {
  const st = useVisualizationStore.getState();
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    st.executeCode();
    return true;
  }
  if (e.key === 'F5') {
    st.continueToBreakpoint();
    return true;
  }
  if (isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return false;
  switch (e.key) {
    case ' ':
      st.togglePlay();
      return true;
    case 'ArrowRight':
      st.pause();
      if (e.shiftKey) st.stepAny(1);
      else st.nextStep();
      return true;
    case 'ArrowLeft':
      st.pause();
      if (e.shiftKey) st.stepAny(-1);
      else st.previousStep();
      return true;
    case 'Home':
      st.pause();
      st.first();
      return true;
    case 'End':
      st.pause();
      st.last();
      return true;
    default:
      return false;
  }
}

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (handleShortcut(e)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
