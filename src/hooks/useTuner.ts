import { useEffect, useRef, useState, useCallback } from 'react';
import init, { PitchDetector } from '@/lib/wasm/tuner_wasm';

// Extend Window interface for our custom properties to avoid 'any'
declare global {
    interface Window {
        pitchHistory?: number[];
        silenceStart?: number;
        isSustaining?: boolean;
        webkitAudioContext?: typeof AudioContext;
    }
}

export const useTuner = () => {
    const [pitch, setPitch] = useState<number>(0);
    const [isListening, setIsListening] = useState(false);
    const [wasmReady, setWasmReady] = useState(false);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const detectorRef = useRef<PitchDetector | null>(null);
    const requestRef = useRef<number>(0);
    const bufferRef = useRef<Float32Array | null>(null);

    const [audioState, setAudioState] = useState<AudioContextState>('suspended');

    // Use refs for state to avoid global window pollution and ensure correct component lifecycle handling
    const isSustainingRef = useRef(false);
    const silenceStartRef = useRef(0);
    const pitchHistoryRef = useRef<number[]>([]);

    useEffect(() => {
        const loadWasm = async () => {
            try {
                await init('/wasm/tuner_wasm_bg.wasm');
                setWasmReady(true);
            } catch (e) {
                console.error('Failed to load WASM', e);
            }
        };
        loadWasm();
    }, []);

    const detectPitch = useCallback(() => {
        if (!analyserRef.current || !detectorRef.current || !bufferRef.current) return;

        // Get time domain data
        // Note: TypeScript might complain about Float32Array mismatch in some envs, 
        // but standard Web Audio API accepts Float32Array. 
        // We cast to 'any' only if strict type checking fails on the specific overload.
        analyserRef.current.getFloatTimeDomainData(bufferRef.current as any);

        // Detect pitch using WASM
        const detectedPitch = detectorRef.current.detect(bufferRef.current as any);

        // Calculate RMS volume for noise gate
        let volume = 0;
        const buffer = bufferRef.current;
        const len = buffer.length;
        for (let i = 0; i < len; i++) {
            volume += buffer[i] * buffer[i];
        }
        volume = Math.sqrt(volume / len);

        // Dynamic Thresholding Logic
        // We use a "Schmitt Trigger" approach:
        // 1. High threshold to DETECT a new note (attack)
        // 2. Low threshold to SUSTAIN the note (decay)

        const ATTACK_THRESHOLD = 0.01;  // Moderate attack needed
        const SUSTAIN_THRESHOLD = 0.001; // Keep tracking even when very quiet

        const activeThreshold = isSustainingRef.current ? SUSTAIN_THRESHOLD : ATTACK_THRESHOLD;

        if (detectedPitch > 0 && volume > activeThreshold) {
            // We are in active mode
            isSustainingRef.current = true;

            // Smoothing logic: Rolling average
            const SMOOTHING_WINDOW = 5;
            const history = pitchHistoryRef.current;
            history.push(detectedPitch);
            if (history.length > SMOOTHING_WINDOW) history.shift();

            const averagePitch = history.reduce((a, b) => a + b, 0) / history.length;
            setPitch(averagePitch);
            silenceStartRef.current = 0;
        } else {
            // Signal dropped below sustain threshold or pitch lost
            const now = Date.now();
            const silenceStart = silenceStartRef.current;

            // If we were sustaining, we allow a short grace period before cutting off
            // This handles slight fluctuations in volume/pitch detection
            if (silenceStart === 0) {
                silenceStartRef.current = now;
            } else if (now - silenceStart > 300) { // 300ms grace period
                pitchHistoryRef.current = [];
                setPitch(0);
                silenceStartRef.current = 0;
                isSustainingRef.current = false; // Reset to require high attack again
            }
        }

        requestRef.current = requestAnimationFrame(detectPitch);
    }, []);

    const startTuner = useCallback(async () => {
        if (!wasmReady) return;
        if (isListening) return;

        try {
            // Create AudioContext first (needs user gesture usually, but we handle that in UI)
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;

            const audioContext = new AudioContextClass();
            audioContextRef.current = audioContext;
            setAudioState(audioContext.state);

            audioContext.onstatechange = () => {
                setAudioState(audioContext.state);
            };

            // Auto-resume context on any user interaction if it starts suspended
            if (audioContext.state === 'suspended') {
                const resume = async () => {
                    await audioContext.resume();
                    if (audioContext.state === 'running') {
                        document.removeEventListener('click', resume);
                        document.removeEventListener('touchstart', resume);
                        document.removeEventListener('keydown', resume);
                    }
                };
                document.addEventListener('click', resume);
                document.addEventListener('touchstart', resume);
                document.addEventListener('keydown', resume);
            }

            // Get Microphone Stream
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    autoGainControl: false,
                    noiseSuppression: false, // We want raw audio for better pitch detection
                    latency: 0
                } as any
            });

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            analyserRef.current = analyser;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            const bufferSize = analyser.fftSize;
            bufferRef.current = new Float32Array(bufferSize);

            // Initialize Rust detector
            detectorRef.current = new PitchDetector(audioContext.sampleRate, bufferSize);

            setIsListening(true);
            requestRef.current = requestAnimationFrame(detectPitch);
        } catch (err) {
            console.error('Error accessing microphone', err);
        }
    }, [wasmReady, isListening, detectPitch]);

    const stopTuner = useCallback(() => {
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
            requestRef.current = 0; // Reset request ID
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (detectorRef.current) {
            detectorRef.current.free();
            detectorRef.current = null;
        }
        setIsListening(false);
        setPitch(0);
        setAudioState('closed');
    }, []);

    useEffect(() => {
        return () => {
            stopTuner();
        };
    }, [stopTuner]);

    useEffect(() => {
        if (wasmReady && !isListening) {
            startTuner();
        }
    }, [wasmReady, startTuner, isListening]);

    return { pitch, isListening, startTuner, stopTuner, wasmReady, audioState };
};