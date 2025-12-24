document.addEventListener('DOMContentLoaded', () => {
  const tabLists = document.querySelectorAll('[role="tablist"]');
  
  tabLists.forEach(tabList => {
    const tabs = tabList.querySelectorAll('[role="tab"]');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', changeTab);
      tab.addEventListener('keydown', handleKeydown);
    });
  });

  function changeTab(e) {
    e.preventDefault();
    const targetTab = e.target;
    const tabList = targetTab.closest('[role="tablist"]');
    const tabs = tabList.querySelectorAll('[role="tab"]');
    
    // Deselect all
    tabs.forEach(t => {
      t.setAttribute('aria-selected', 'false');
      t.setAttribute('tabindex', '-1');
      t.parentElement.classList.remove('selected');
      
      const panelId = t.getAttribute('aria-controls');
      const panel = document.getElementById(panelId);
      if (panel) {
        panel.hidden = true;
      }
    });

    // Select target
    targetTab.setAttribute('aria-selected', 'true');
    targetTab.setAttribute('tabindex', '0');
    targetTab.parentElement.classList.add('selected');
    targetTab.focus();

    const panelId = targetTab.getAttribute('aria-controls');
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.hidden = false;
    }
  }

  function handleKeydown(e) {
    const tabList = e.target.closest('[role="tablist"]');
    const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
    const index = tabs.indexOf(e.target);
    
    let newIndex = null;
    
    if (e.key === 'ArrowLeft') {
      newIndex = index - 1;
      if (newIndex < 0) newIndex = tabs.length - 1;
    } else if (e.key === 'ArrowRight') {
      newIndex = index + 1;
      if (newIndex >= tabs.length) newIndex = 0;
    }
    
    if (newIndex !== null) {
      e.preventDefault();
      tabs[newIndex].click();
      tabs[newIndex].focus();
    }
  }
});
