import { TAXONOMY } from './taxonomy';

/**
 * Normalizes text by removing accents and converting to lowercase.
 * e.g., "Mecánica" -> "mecanica"
 */
export const normalizeText = (text: string): string => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

/**
 * Token-based search matching.
 * Returns true if ALL tokens in the search term are found in the target text.
 * @param target The text to search within (e.g., business name + tags).
 * @param searchTerm The user's input.
 */
export const matchesSearch = (target: string, searchTerm: string): boolean => {
    const normalizedTarget = normalizeText(target);
    const normalizedSearch = normalizeText(searchTerm);

    const searchTokens = normalizedSearch.split(/\s+/).filter(t => t.length > 0);

    // Strict AND matching: ALL tokens must be present
    return searchTokens.every(token => normalizedTarget.includes(token));
};

/**
 * Calculates Levenshtein distance between two strings.
 * Used for fuzzy matching suggestions.
 */
const levenshteinDistance = (a: string, b: string): number => {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

/**
 * Finds a suggestion from the Taxonomy based on the search term.
 * @param searchTerm User input
 * @returns Best match string or null
 */
export const findSuggestion = (searchTerm: string): string | null => {
    const normalizedSearch = normalizeText(searchTerm);
    if (normalizedSearch.length < 3) return null; // Too short

    let bestMatch: string | null = null;
    let minDistance = Infinity;

    // Collect all candidate terms from Taxonomy
    const candidates = new Set<string>();

    Object.values(TAXONOMY).forEach(category => {
        candidates.add(category.label.es);
        candidates.add(category.label.en);
        category.subcategories.forEach(sub => {
            candidates.add(sub.label.es);
            candidates.add(sub.label.en);
            sub.specialties.forEach(spec => {
                // spec is now {es, en, pt} object
                if (typeof spec === 'string') {
                    candidates.add(spec);
                } else {
                    Object.values(spec).forEach(v => candidates.add(v as string));
                }
            });
        });
    });

    // Check distance for each candidate
    candidates.forEach(candidate => {
        const normalizedCandidate = normalizeText(candidate);

        // Optimization: If difference in length is too big, skip
        if (Math.abs(normalizedCandidate.length - normalizedSearch.length) > 3) return;

        const distance = levenshteinDistance(normalizedSearch, normalizedCandidate);

        // Threshold: Allow up to 3 edits, but it must be close relative to length
        const threshold = Math.min(3, Math.floor(normalizedCandidate.length / 3) + 1);

        if (distance <= threshold && distance < minDistance) {
            minDistance = distance;
            bestMatch = candidate;
        }
    });

    return bestMatch;
};
