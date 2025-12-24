document.getElementById('seedPicker').addEventListener('input', function(e) {
  document.documentElement.style.setProperty('--seed', e.target.value);
});

document.getElementById('seedText').addEventListener('change', function(e) {
  document.documentElement.style.setProperty('--seed', e.target.value);
});
