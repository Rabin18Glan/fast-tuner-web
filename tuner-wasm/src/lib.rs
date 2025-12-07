use wasm_bindgen::prelude::*;
use rustfft::{FftPlanner, num_complex::Complex, num_traits::Zero};

#[wasm_bindgen]
pub struct PitchDetector {
    sample_rate: f32,
    fft_planner: FftPlanner<f32>,
    buffer: Vec<Complex<f32>>,
    scratch: Vec<Complex<f32>>,
}

#[wasm_bindgen]
impl PitchDetector {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32, buffer_size: usize) -> PitchDetector {
        console_error_panic_hook::set_once();
        let padded_len = buffer_size * 2;
        PitchDetector {
            sample_rate,
            fft_planner: FftPlanner::new(),
            buffer: vec![Complex::zero(); padded_len],
            scratch: vec![Complex::zero(); padded_len],
        }
    }

    pub fn detect(&mut self, audio_data: &[f32]) -> f32 {
        let n = audio_data.len();
        if n == 0 { return 0.0; }

        let padded_len = n * 2;
        
        // Resize buffers if necessary (though we expect fixed size)
        if self.buffer.len() != padded_len {
            self.buffer = vec![Complex::zero(); padded_len];
            self.scratch = vec![Complex::zero(); padded_len];
        }

        // 1. Prepare buffer
        for (i, &x) in audio_data.iter().enumerate() {
            self.buffer[i] = Complex { re: x, im: 0.0 };
        }
        for i in n..padded_len {
            self.buffer[i] = Complex::zero();
        }

        let fft = self.fft_planner.plan_fft_forward(padded_len);
        let ifft = self.fft_planner.plan_fft_inverse(padded_len);

        // 2. FFT
        fft.process_with_scratch(&mut self.buffer, &mut self.scratch);

        // 3. Power Spectrum
        for c in self.buffer.iter_mut() {
            let mag_sq = c.re * c.re + c.im * c.im;
            *c = Complex { re: mag_sq, im: 0.0 };
        }

        // 4. IFFT (Autocorrelation)
        ifft.process_with_scratch(&mut self.buffer, &mut self.scratch);

        // 5. Peak picking
        // We only care about the real part of the first half (lags 0 to n)
        // And we need to normalize? Not strictly necessary for peak finding, but good for thresholding.
        // Let's just find the max peak.

        let mut max_val = -1.0;
        let mut max_lag = -1;

        // Search range: 
        // Min freq ~60Hz -> lag = sample_rate / 60
        // Max freq ~1200Hz -> lag = sample_rate / 1200
        
        let min_lag = (self.sample_rate / 1200.0) as usize; 
        let max_lag_search = (self.sample_rate / 60.0) as usize;
        
        let search_end = max_lag_search.min(n - 1);

        if min_lag >= search_end { return 0.0; }

        // Simple peak finding: look for global max in the valid lag range
        // Note: Autocorrelation at 0 is always max, we skip it.
        // We also need to ensure we are picking a peak, not just a slope.
        
        for i in min_lag..search_end {
            let val = self.buffer[i].re;
            if val > max_val {
                // Check if it's a local peak
                if val > self.buffer[i-1].re && val > self.buffer[i+1].re {
                    max_val = val;
                    max_lag = i as i32;
                }
            }
        }
        
        // Refine with parabolic interpolation
        if max_lag > 0 {
            let lag = max_lag as usize;
            let y1 = self.buffer[lag - 1].re;
            let y2 = self.buffer[lag].re;
            let y3 = self.buffer[lag + 1].re;
            
            let d = (y3 - y1) / (2.0 * (2.0 * y2 - y1 - y3));
            let true_lag = max_lag as f32 + d;
            
            return self.sample_rate / true_lag;
        }

        0.0
    }
}
