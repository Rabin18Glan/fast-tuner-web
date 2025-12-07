'use client';

import { useTuner } from '@/hooks/useTuner';
import TunerDisplay from '@/components/TunerDisplay';

export default function Home() {
  const { pitch, isListening, startTuner, stopTuner, wasmReady, audioState } = useTuner();

  return (
    <main className="min-h-screen bg-black overflow-hidden">
      {wasmReady ? (
        <TunerDisplay 
          pitch={pitch} 
          isListening={isListening} 
          audioState={audioState}
        />
      ) : (
        <div className="flex items-center justify-center min-h-screen text-white animate-pulse">
          Loading Tuner Engine...
        </div>
      )}
    </main>
  );
}
