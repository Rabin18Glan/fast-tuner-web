export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export interface NoteInfo {
    note: string;
    octave: number;
    cents: number;
    frequency: number;
    targetFrequency: number;
}

export function getNote(frequency: number): NoteInfo {
    if (frequency === 0) {
        return { note: "-", octave: 0, cents: 0, frequency: 0, targetFrequency: 0 };
    }

    const A4 = 440;
    const C0 = A4 * Math.pow(2, -4.75);

    const halfStepsFromC0 = Math.round(12 * Math.log2(frequency / C0));
    const octave = Math.floor(halfStepsFromC0 / 12);
    const noteIndex = halfStepsFromC0 % 12;

    const targetFrequency = C0 * Math.pow(2, halfStepsFromC0 / 12);
    const cents = 1200 * Math.log2(frequency / targetFrequency);

    return {
        note: NOTE_NAMES[noteIndex],
        octave,
        cents,
        frequency,
        targetFrequency
    };
}
