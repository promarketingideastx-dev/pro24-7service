/**
 * Firestore Utilities for robust writes
 */

/**
 * Recursively removes any keys with 'undefined' values from an object.
 * Firestore does not support 'undefined' as a value.
 */
export const sanitizeData = (data: any): any => {
    if (data === null || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map(sanitizeData);

    const sanitized: any = {};
    Object.keys(data).forEach(key => {
        const val = data[key];
        if (val !== undefined) {
            sanitized[key] = sanitizeData(val);
        }
    });
    return sanitized;
};

/**
 * Wraps a promise with a timeout.
 * Rejects if the promise doesn't resolve within the specified milliseconds.
 */
export const withTimeout = <T>(promise: Promise<T>, ms: number, message = 'Timeout exceeded'): Promise<T> => {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(message));
        }, ms);
    });

    return Promise.race([
        promise.then((res) => {
            clearTimeout(timeoutId);
            return res;
        }),
        timeoutPromise
    ]);
};
