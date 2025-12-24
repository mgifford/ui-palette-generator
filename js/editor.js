(function(){
  function initEditor(rootSelector){
    const root = document.querySelector(rootSelector);
    if (!root) return;
    const toolbar = root.querySelector('.editor-toolbar');
    const editor = root.querySelector('.editor-content');
    if (!toolbar || !editor) return;

    toolbar.addEventListener('click', function(e){
      const btn = e.target.closest('.editor-btn');
      if (!btn) return;
      const cmd = btn.dataset.cmd;
      if (!cmd) return;
      try { document.execCommand(cmd, false, null); } catch(e){}
      updateToolbarState();
      editor.focus();
    });

    function updateToolbarState(){
      toolbar.querySelectorAll('.editor-btn').forEach(button => {
        const cmd = button.dataset.cmd;
        if (!cmd) return;
        let active = false;
        try { active = document.queryCommandState(cmd); } catch(e) { active = false; }
        button.classList.toggle('active', !!active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }

    document.addEventListener('selectionchange', throttle(updateToolbarState, 150));
    editor.addEventListener('keyup', updateToolbarState);
    editor.addEventListener('mouseup', updateToolbarState);

    function throttle(fn, wait){
      let t = null;
      return function(){
        if (t) return;
        t = setTimeout(()=>{ fn(); t = null; }, wait);
      };
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    initEditor('#demo-editor-light');
    initEditor('#demo-editor-dark');
  });
})();
