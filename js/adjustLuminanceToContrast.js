import chroma from 'chroma-js';

export function adjustLuminanceToContrast(fgColor, bgColor, targetContrast, fgLuminanceDirection) {

  const bgLuminance = chroma(bgColor).luminance(); // Get background luminance
  let fgLuminance = chroma(fgColor).luminance(); // Get foreground luminance
  let stepSize = 0.0001; // Size and direction of luminance adjustment
  let precision = stepSize * 500; // targetContrast precision
  const MIN_L = 0.0001;
  const MAX_L = 0.9999;

  // console.log(fgColor, bgColor, targetContrast);

  // Function to calculate contrast ratio
  const getContrast = (fgLuminance) => {
    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);
    return (lighter + 0.05) / (darker + 0.05);
  };

  // Determine appropriate luminance direction
  if (fgLuminanceDirection === undefined) {
    const currentContrast = getContrast(fgLuminance);
    const targetAboveCurrent = targetContrast > currentContrast;
    const bgIsLighter = bgLuminance >= fgLuminance;
    // If we need more contrast, move away from bg; if less, move toward bg.
    const shouldMoveAway = targetAboveCurrent;
    const moveAwayDirection = bgIsLighter ? "decrease" : "increase";
    const moveTowardDirection = bgIsLighter ? "increase" : "decrease";
    fgLuminanceDirection = shouldMoveAway ? moveAwayDirection : moveTowardDirection;
  }

  if (fgLuminanceDirection === "decrease") {
    stepSize = -stepSize; // Decrease luminance via negative steps
  }

  // Adjust fgLuminance until fgContrast gets as close to targetContrast as possible
  var fgContrast = getContrast(fgLuminance); // Get fgColor's contrast
  var adjustedLuminance = fgLuminance; // Start with fgColor's luminance
  var adjustedFgColor;
  var iteration = 0;
  var maxIterations = 999999;
  while (Math.abs(fgContrast - targetContrast) > precision && iteration != maxIterations) {
    // console.log(`fgContrast: ${fgContrast} contrastDiff: ${Math.abs(fgContrast - targetContrast)}`);
    adjustedLuminance += stepSize;
    if (adjustedLuminance <= MIN_L || adjustedLuminance >= MAX_L) {
      adjustedLuminance = Math.min(Math.max(adjustedLuminance, MIN_L), MAX_L);
      break; // further movement will not improve contrast meaningfully
    }
    // console.log(`adjustedLuminance: ${adjustedLuminance}`);
    fgContrast = getContrast(adjustedLuminance);
    iteration++;
    // console.log(fgContrast, iteration);
  }

  // Return the color with the adjusted luminance
  // console.log(chroma(fgColor).luminance(adjustedLuminance).hex().toUpperCase());
  return chroma(fgColor).luminance(adjustedLuminance).hex().toUpperCase();

}