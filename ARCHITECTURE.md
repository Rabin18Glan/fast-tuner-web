# Architecture & Implementation Guide

This document details how the **Guitar Tuner Pro** app was built, explaining the technology stack, core algorithms, and optimization strategies.

## 1. Technology Stack

- **Core Engine**: Rust (compiled to WebAssembly)
- **Frontend Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + CSS Modules
- **Audio**: Web Audio API
- **PWA**: `next-pwa` (Service Workers, Manifest)

## 2. Core Logic: Pitch Detection (Rust + WASM)

The heart of the tuner is a high-performance pitch detection algorithm written in **Rust**.

### Why Rust & WASM?
JavaScript is fast, but for real-time signal processing (FFT, autocorrelation) at 60fps, **WebAssembly (WASM)** provides near-native performance with consistent execution times (no garbage collection pauses).

### The Algorithm
We use **Autocorrelation** refined by **FFT (Fast Fourier Transform)**.

1.  **Input**: A buffer of audio samples (Float32Array) from the microphone.
2.  **FFT**: Convert time-domain signal to frequency domain.
3.  **Power Spectrum**: Calculate magnitude squared of complex numbers.
4.  **IFFT**: Inverse FFT to get the autocorrelation function.
5.  **Peak Picking**: Find the first major peak in the autocorrelation result. The lag (index) of this peak corresponds to the fundamental period of the wave.
6.  **Refinement**: Use parabolic interpolation to estimate the true peak position between samples for sub-Hz accuracy.

**Source**: `tuner-wasm/src/lib.rs`

## 3. Frontend Implementation

### Audio Capture (`useTuner.ts`)
- Uses `navigator.mediaDevices.getUserMedia` to access the microphone.
- Creates an `AudioContext` and an `AnalyserNode`.
- **Zero-Allocation Loop**: We pre-allocate a single `Float32Array` buffer and reuse it every frame. This prevents garbage collection stutter.
- **Smoothing**: A rolling average window (size 5) smooths out jittery pitch detection results for a stable UI.

### Visuals (`TunerDisplay.tsx`)
- **Reactive Design**: The UI changes color (Green/Yellow/Red) based on pitch accuracy.
- **Hardware Acceleration**: All animations (gauge rotation, grid movement) use CSS `transform` which runs on the GPU.
- **Tailwind v4**: Used for layout and typography utility classes.
- **CSS Modules**: Used for complex, specific visual effects like the glowing reactor core.

## 4. PWA (Progressive Web App)

- **Service Worker**: Caches assets for offline use.
- **Manifest**: Allows installation on home screens.
- **Config**: `next.config.ts` is configured to generate the service worker via `next-pwa`.

## 5. Build Process

1.  **Rust**: `wasm-pack build --target web` compiles Rust to `.wasm`.
2.  **Next.js**:
    - `npm run dev`: Runs the dev server (with PWA enabled).
    - `npm run build`: Bundles the React app and static assets.

## 6. Optimization Checklist

- [x] **WASM**: Heavy math offloaded to Rust.
- [x] **RequestAnimationFrame**: Audio processing synced with screen refresh rate.
- [x] **Typed Arrays**: Used for all audio data transfer.
- [x] **CSS Transforms**: GPU-accelerated animations.
- [x] **PWA**: Offline capability and instant loading.
