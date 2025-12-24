// Minimal script to drive the CSS-First color seed (docs copy)
document.addEventListener('DOMContentLoaded', function() {
  var seedPicker = document.getElementById('seedPicker');
  if (!seedPicker) return;

  seedPicker.addEventListener('input', function() {
    document.documentElement.style.setProperty('--seed', this.value);
  });

  var seedText = document.getElementById('seedText');
  if (seedText) {
    seedText.addEventListener('change', function() {
      document.documentElement.style.setProperty('--seed', this.value);
    });
  }
});
