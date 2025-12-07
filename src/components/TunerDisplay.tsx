import React, { useMemo, useState } from 'react';
import styles from './TunerDisplay.module.css';
import { getNote } from '@/utils/note';

interface TunerDisplayProps {
  pitch: number;
  isListening: boolean;
  audioState?: AudioContextState;
}

const TunerDisplay: React.FC<TunerDisplayProps> = ({ pitch, isListening, audioState }) => {
  const { note, octave, cents, frequency } = useMemo(() => getNote(pitch), [pitch]);

  // Determine status
  let statusClass = '';
  let statusColor = 'text-gray-500';
  let guidance = 'READY';

  if (isListening && pitch > 0) {
    if (Math.abs(cents) < 5) {
      statusClass = styles.inTune;
      statusColor = 'text-green-400';
      guidance = 'PERFECT';
    } else if (cents < 0) {
      statusClass = styles.flat;
      statusColor = 'text-amber-400';
      guidance = 'TUNE UP';
    } else {
      statusClass = styles.sharp;
      statusColor = 'text-red-500';
      guidance = 'TUNE DOWN';
    }
  } else if (isListening) {
     guidance = 'LISTENING...';
  }

  // Gauge rotation: -50 cents = -90deg, +50 cents = +90deg
  const rotation = Math.max(-90, Math.min(90, cents * 1.8));

  return (
    <div className={styles.container}>
      <div className={styles.grid} />
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Main Tuner Circle */}
        <div className={`${styles.tunerCircle} ${statusClass}`}>
          {isListening && pitch > 0 ? (
            <>
               {/* Note Display */}
              <div className="flex flex-col items-center justify-center h-full relative z-20">
                <div className={`${styles.note} ${statusColor} transition-colors duration-200`}>
                  {note}
                  <span className={styles.octave}>{octave}</span>
                </div>
              </div>
              
              {/* Gauge Needle/Ring */}
              <div 
                className={styles.gauge} 
                style={{ 
                  transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                  color: 'inherit'
                }} 
              />
            </>
          ) : (
             <div className="flex flex-col items-center justify-center h-full opacity-30">
                <div className="text-4xl font-light tracking-widest uppercase text-center">
                    Play String
                </div>
             </div>
          )}
        </div>

        {/* Guidance Text Below */}
        <div className={`mt-12 text-3xl font-bold tracking-[0.5em] ${statusColor} transition-all duration-300 h-10`}>
            {guidance}
        </div>
      </div>
    </div>
  );
};

export default TunerDisplay;
