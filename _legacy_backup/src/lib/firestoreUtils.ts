/**
 * Firestore Utilities for robust writes
 */

/**
 * Recursively removes undefined values from an object or array.
 * Firestore does NOT accept undefined, so this is critical before any write operation.
 * Also handles basic type adjustments if necessary.
 */
export const sanitizeData = (data: any): any => {
    if (data === null || data === undefined) {
        return null; // Convert undefined to null (Firestore accepts null)
    }

    if (Array.isArray(data)) {
        return data
            .map(item => sanitizeData(item))
            .filter(item => item !== undefined); // Remove undefined items from arrays
    }

    if (typeof data === 'object' && !(data instanceof Date)) {
        const sanitized: any = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = sanitizeData(data[key]);
                // Keep the key if value is not undefined (null is okay)
                if (value !== undefined) {
                    sanitized[key] = value;
                }
            }
        }
        return sanitized;
    }

    return data;
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
