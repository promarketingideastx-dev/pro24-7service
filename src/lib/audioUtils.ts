/**
 * iOS-compatible notification sound using Web Audio API.
 *
 * Safari on iOS blocks HTMLAudioElement.play() unless triggered by a direct
 * user gesture. Web Audio API with an unlocked AudioContext works correctly.
 *
 * Usage:
 *   // In a component, call unlockAudio() on any user interaction (click, touch)
 *   // Then call playNotificationSound() to play the sound.
 */

let ctx: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let unlocked = false;

/** Call this on the FIRST user interaction (click / touchend) to unlock iOS audio */
export function unlockAudio() {
    if (unlocked) return;
    try {
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        // Play a silent buffer to unlock
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        unlocked = true;
        // Preload the notification sound
        _loadSound('/sounds/notification.mp3');
    } catch { /* silent fallback */ }
}

async function _loadSound(url: string) {
    if (!ctx || audioBuffer) return;
    try {
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    } catch { /* silent */ }
}

/** Play the notification sound — iOS-safe */
export async function playNotificationSound() {
    // Fallback for desktop (non-iOS)
    if (!ctx || !unlocked) {
        try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.6;
            await audio.play();
            return;
        } catch { return; }
    }

    if (!audioBuffer) {
        await _loadSound('/sounds/notification.mp3');
    }

    if (!ctx || !audioBuffer) return;

    try {
        if (ctx.state === 'suspended') await ctx.resume();
        const src = ctx.createBufferSource();
        src.buffer = audioBuffer;
        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.6;
        src.connect(gainNode);
        gainNode.connect(ctx.destination);
        src.start(0);
    } catch { /* silent */ }
}
