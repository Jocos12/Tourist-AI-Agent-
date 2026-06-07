/**
 * Replace em dashes (— U+2014 and the horizontal bar ― U+2015) with
 * conversational punctuation, so model output doesn't read as machine-written.
 *
 * Applied to all LLM-sourced text before it reaches the UI. The prompt also
 * asks the model to avoid them, but models do it anyway — this is the guarantee.
 *
 *  - A spaced dash ("tapas — 0.4 km away") becomes a comma ("tapas, 0.4 km away").
 *  - A tight dash ("9—5", "open—closed") becomes a hyphen.
 *  - Line breaks are preserved (we only collapse spaces/tabs around the dash).
 */
export function stripEmDashes(text: string): string {
  if (!text) return text
  return text
    .replace(/[ \t]+[—―][ \t]+/g, ', ')
    .replace(/[—―]/g, '-')
}
