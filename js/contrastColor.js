import chroma from 'chroma-js';

// Returns either black or white depending on which has better contrast with the given background color
export function contrastColor(bgColor, minContrast = 4.5) {
  // Accepts any CSS color string
  let color;
  try {
    color = chroma(bgColor);
  } catch (e) {
    return '#000'; // fallback
  }
  const whiteContrast = chroma.contrast(color, 'white');
  const blackContrast = chroma.contrast(color, 'black');
  // Prefer white if both are above minContrast and white is higher
  if (whiteContrast >= minContrast && whiteContrast > blackContrast) return '#fff';
  if (blackContrast >= minContrast) return '#000';
  // Otherwise, return whichever is higher
  return whiteContrast > blackContrast ? '#fff' : '#000';
}
