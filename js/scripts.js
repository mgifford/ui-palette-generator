// Minimal script to drive the CSS-First color seed
document.addEventListener('DOMContentLoaded', function() {
  var seedPicker = document.getElementById('seedPicker');
  if (!seedPicker) return;

  seedPicker.addEventListener('input', function() {
    document.documentElement.style.setProperty('--seed', this.value);
  });

  // If there's a text field fallback
  var seedText = document.getElementById('seedText');
  if (seedText) {
    seedText.addEventListener('change', function() {
      document.documentElement.style.setProperty('--seed', this.value);
    });
  }
});
