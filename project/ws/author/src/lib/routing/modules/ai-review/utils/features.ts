/**
 * Switches for AI review features that are built but not offered yet.
 *
 * FRAC style: the client does not need it for now (2026-11-11), so the Plain/FRAC choice is
 * hidden and every review runs as Plain. The feature itself is kept whole (the service still
 * reviews in FRAC, with its role check and its D7 accuracy check): set this to true to offer
 * it again; nothing else needs to change.
 */
export const AI_REVIEW_FRAC_ENABLED = false
