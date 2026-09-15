// Detect the image format from the FILE BYTES, never from the client's
// declared mimetype or filename -- both are trivially forged. Each entry
// checks the format's magic-number header.

export interface DetectedImageType {
    mimetype: string;
    extension: string;
}

interface ImageSignature extends DetectedImageType {
    matches: (data: Buffer) => boolean;
}

const IMAGE_SIGNATURES: ImageSignature[] = [
    {
        mimetype: 'image/jpeg',
        extension: '.jpg',
        matches: (data) => data.length > 2
            && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff,
    },
    {
        mimetype: 'image/png',
        extension: '.png',
        matches: (data) => data.length > 7 && data
            .subarray(0, 8)
            .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    },
    {
        mimetype: 'image/gif',
        extension: '.gif',
        matches: (data) => data.length > 3
            && data.subarray(0, 4).toString('latin1') === 'GIF8',
    },
    {
        mimetype: 'image/webp',
        extension: '.webp',
        matches: (data) => data.length > 11
            && data.subarray(0, 4).toString('latin1') === 'RIFF'
            && data.subarray(8, 12).toString('latin1') === 'WEBP',
    },
    {
        mimetype: 'image/bmp',
        extension: '.bmp',
        matches: (data) => data.length > 1
            && data[0] === 0x42 && data[1] === 0x4d,
    },
];

export function detectImageType(data: Buffer): DetectedImageType | null {
    const signature = IMAGE_SIGNATURES.find((candidate) => candidate.matches(data));
    return signature ? { mimetype: signature.mimetype, extension: signature.extension } : null;
}
