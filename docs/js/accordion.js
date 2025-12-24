
document.addEventListener('DOMContentLoaded', function() {
  const accordions = document.querySelectorAll('.usa-accordion__button');
  
  accordions.forEach(function(button) {
    button.addEventListener('click', function() {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      const controls = button.getAttribute('aria-controls');
      const content = document.getElementById(controls);
      
      if (content) {
        button.setAttribute('aria-expanded', !expanded);
        content.hidden = expanded;
      }
    });
  });
});
