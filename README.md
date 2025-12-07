# Guitar Tuner

A high-performance guitar tuner built with Next.js and Rust (WASM).

## Prerequisites

- Node.js
- Rust and Cargo
- wasm-pack (`cargo install wasm-pack`)

## Development

1.  **Build the WASM module:**

    ```bash
    cd tuner-wasm
    wasm-pack build --target web
    ```

2.  **Copy the artifacts (if changed):**

    ```bash
    # Copy the .wasm file to public/wasm/
    cp tuner-wasm/pkg/tuner_wasm_bg.wasm public/wasm/
    
    # Copy the JS bindings to src/lib/wasm/
    cp tuner-wasm/pkg/tuner_wasm.js src/lib/wasm/
    cp tuner-wasm/pkg/tuner_wasm.d.ts src/lib/wasm/
    ```
    
    *Note: You may need to manually update `src/lib/wasm/tuner_wasm.js` to remove the default URL resolution if you re-generate the bindings.*

3.  **Run the Next.js app:**

    ```bash
    npm run dev
    ```

## Architecture

- **Core Logic**: Rust (FFT-based autocorrelation) compiled to WebAssembly.
- **Frontend**: Next.js (React) with Hooks.
- **Audio**: Web Audio API (`AnalyserNode`) + `requestAnimationFrame`.
- **Visuals**: CSS Modules + Tailwind CSS v4.
- **PWA**: Offline-capable with Service Workers and Web Manifest.
# fast-tuner-web
# fast-tuner-web
