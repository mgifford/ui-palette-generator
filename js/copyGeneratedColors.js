function collectCssVariables() {
  let cssVariables = [];
  let themeStyles = document.querySelectorAll('style[data-theme]');

  themeStyles.forEach(styleElement => {
    let theme = styleElement.getAttribute('data-theme');
    let cssRules = styleElement.sheet.cssRules;

    let selector = theme === 'light' ? ':root' : `[data-theme="${theme}"]`;
    cssVariables.push(`${selector} {`);

    Array.from(cssRules).forEach(rule => {
      if (rule.selectorText !== `[data-theme="${theme}"]`) return;
      // extract the variable from the rule -> '[data-theme="dark"] { --color-seed: black; }'
      // first remove selector, and then remove parenthesis around the variable

      let cssText = rule.cssText.replace(`[data-theme="${theme}"]`, '');
      let variable = cssText.replace(/[{}]/g, '').trim()
      cssVariables.push(variable);
    });
    cssVariables.push('}');
  });

  return cssVariables.join('\n');
}

export function copyCssVariables() {
  const cssText = collectCssVariables();
  const copyBtn = document.getElementById('copyBtn');
  const originalText = copyBtn ? copyBtn.textContent : '';

  return navigator.clipboard.writeText(cssText).then(() => {
    if (copyBtn) {
      copyBtn.textContent = 'Copied';
      setTimeout(() => { copyBtn.textContent = originalText; }, 1000); // Display original text after 1 second
    }
  }).catch(err => {
    console.error('Failed to copy: ', err);
    throw err;
  });
}
