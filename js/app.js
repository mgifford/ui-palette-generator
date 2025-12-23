document.getElementById('seedPicker').addEventListener('input', function(e) {
  document.documentElement.style.setProperty('--seed', e.target.value);
});

document.getElementById('seedText').addEventListener('change', function(e) {
  document.documentElement.style.setProperty('--seed', e.target.value);
});

document.getElementById('showSamePalette').addEventListener('change', function(e) {
  const showSame = e.target.checked;
  document.querySelector('.palette-dark').style.display = showSame ? 'none' : '';
  document.getElementById('split-container').style.gridTemplateColumns = showSame ? '1fr' : '1fr 1fr';
  document.getElementById('split-container-demo').style.gridTemplateColumns = showSame ? '1fr' : '1fr 1fr';
});
