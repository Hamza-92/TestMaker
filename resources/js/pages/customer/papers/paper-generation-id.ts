let fallbackSequence = 0;

export function createPaperGenerationId(): string {
    const webCrypto = globalThis.crypto;

    if (typeof webCrypto?.randomUUID === 'function') {
        return `paper_${webCrypto.randomUUID()}`;
    }

    if (typeof webCrypto?.getRandomValues === 'function') {
        const bytes = webCrypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, (byte) =>
            byte.toString(16).padStart(2, '0'),
        ).join('');

        return `paper_${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    fallbackSequence += 1;

    return `paper_${Date.now().toString(36)}_${fallbackSequence.toString(36)}_${Math.random().toString(36).slice(2)}`;
}
