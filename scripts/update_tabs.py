
import os

file_path = 'docs/index.html'

with open(file_path, 'r') as f:
    content = f.read()

old_block = """                <div class="col">
	
  <ul class="nav nav-tabs">
    <li class="selected"><a href="#">Jello</a></li>
    <li><a href="#">East Bay</a></li>
    <li><a href="#">Klaus</a></li>
    <li><a href="#">D.H.</a></li>
  </ul>

  <div class="card">

    <div class="avatars">
      <span class="avatar">
        <img src="images/clem_fandango.webp" alt="Avatar">
      </span>
      <span class="avatar avatar-one-letter avatar-solid avatar-subdued">V</span>
      <span class="avatar avatar-two-letter avatar-solid avatar-subdued">BG</span>
      <span class="avatar avatar-icon avatar-solid avatar-subdued">
        <span class="material-symbols-rounded">group</span>
      </span>
      <span class="avatar avatar-icon avatar-solid avatar-strong">
        <span class="material-symbols-rounded">group</span>
      </span>
    </div>

    <div class="avatars">
      <span class="avatar">
        <img src="images/clem_fandango.webp" alt="Avatar">
      </span>
      <span class="avatar avatar-one-letter avatar-soft avatar-subdued">V</span>
      <span class="avatar avatar-two-letter avatar-soft avatar-subdued">BG</span>
      <span class="avatar avatar-icon avatar-soft avatar-subdued">
        <span class="material-symbols-rounded">group</span>
      </span>
      <span class="avatar avatar-icon avatar-soft avatar-strong">
        <span class="material-symbols-rounded">group</span>
      </span>
    </div>

    <hr>

    <blockquote>
      Reginald Poppycock is an eccentric <a href="#">inventor</a> and professional cheese sculptor, who designed the <a href="#">world’s first steam-powered teapot</a> capable of reciting <a href="#">Shakespearean sonnets</a> while brewing Earl Grey, from 1884 to 1885.
    </blockquote>

    <div class="checkboxes">
      <div class="form-check">
      <input type="checkbox">
      <label>Respond to comment <a href="#">#129</a> from Jake</label>
      </div>
      <div class="form-check">
      <input type="checkbox">
      <label>Invite <a href="#">John McClane</a> to Nakatomi Plaza</label>
      </div>
      <div class="form-check">
      <input type="checkbox">
      <label>Create TPS report <a href="#">requested</a> by Bill Lumbergh</label>
      </div>
      <div class="form-check form-check-struckout">
      <input type="checkbox" checked>
      <label>Lay off 62 employees</label>
      </div>
      <div class="form-check form-check-struckout">
      <input type="checkbox" checked>
      <label>Review Robert Johnson's contract</label>
      </div>
    </div>

  </div>

</div>"""

new_block_light = """                <div class="col">
	
  <div class="tabs-container">
    <ul class="nav nav-tabs" role="tablist">
      <li role="presentation" class="selected"><a href="#tab-team-light" role="tab" aria-selected="true" aria-controls="tab-team-light" id="tab-team-light-trigger">Team</a></li>
      <li role="presentation"><a href="#tab-tasks-light" role="tab" aria-selected="false" aria-controls="tab-tasks-light" id="tab-tasks-light-trigger" tabindex="-1">Tasks</a></li>
      <li role="presentation"><a href="#tab-notes-light" role="tab" aria-selected="false" aria-controls="tab-notes-light" id="tab-notes-light-trigger" tabindex="-1">Notes</a></li>
    </ul>

    <div class="card tab-content">

      <div id="tab-team-light" role="tabpanel" aria-labelledby="tab-team-light-trigger" class="tab-pane">
        <div class="avatars">
          <span class="avatar"><img src="images/avatar-alice.svg" alt="Alice" data-name="Alice"></span>
          <span class="avatar"><img src="images/avatar-bob.svg" alt="Bob" data-name="Bob"></span>
          <span class="avatar"><img src="images/avatar-charlie.svg" alt="Charlie" data-name="Charlie"></span>
          <span class="avatar"><img src="images/avatar-dave.svg" alt="Dave" data-name="Dave"></span>
          <span class="avatar"><img src="images/avatar-eve.svg" alt="Eve" data-name="Eve"></span>
        </div>
        <div class="avatars" style="margin-top: 1rem;">
          <span class="avatar avatar-one-letter avatar-solid avatar-subdued">V</span>
          <span class="avatar avatar-two-letter avatar-solid avatar-subdued">BG</span>
          <span class="avatar avatar-icon avatar-solid avatar-subdued">
            <span class="material-symbols-rounded">group</span>
          </span>
          <span class="avatar avatar-icon avatar-solid avatar-strong">
            <span class="material-symbols-rounded">group</span>
          </span>
        </div>
      </div>

      <div id="tab-tasks-light" role="tabpanel" aria-labelledby="tab-tasks-light-trigger" class="tab-pane" hidden>
        <div class="checkboxes">
          <div class="form-check">
            <input type="checkbox">
            <label>Respond to comment <a href="#">#129</a> from Jake</label>
          </div>
          <div class="form-check">
            <input type="checkbox">
            <label>Invite <a href="#">John McClane</a> to Nakatomi Plaza</label>
          </div>
          <div class="form-check">
            <input type="checkbox">
            <label>Create TPS report <a href="#">requested</a> by Bill Lumbergh</label>
          </div>
          <div class="form-check form-check-struckout">
            <input type="checkbox" checked>
            <label>Lay off 62 employees</label>
          </div>
          <div class="form-check form-check-struckout">
            <input type="checkbox" checked>
            <label>Review Robert Johnson's contract</label>
          </div>
        </div>
      </div>

      <div id="tab-notes-light" role="tabpanel" aria-labelledby="tab-notes-light-trigger" class="tab-pane" hidden>
        <blockquote>
          Reginald Poppycock is an eccentric <a href="#">inventor</a> and professional cheese sculptor, who designed the <a href="#">world’s first steam-powered teapot</a> capable of reciting <a href="#">Shakespearean sonnets</a> while brewing Earl Grey, from 1884 to 1885.
        </blockquote>
      </div>

    </div>
  </div>

</div>"""

new_block_dark = """                <div class="col">
	
  <div class="tabs-container">
    <ul class="nav nav-tabs" role="tablist">
      <li role="presentation" class="selected"><a href="#tab-team-dark" role="tab" aria-selected="true" aria-controls="tab-team-dark" id="tab-team-dark-trigger">Team</a></li>
      <li role="presentation"><a href="#tab-tasks-dark" role="tab" aria-selected="false" aria-controls="tab-tasks-dark" id="tab-tasks-dark-trigger" tabindex="-1">Tasks</a></li>
      <li role="presentation"><a href="#tab-notes-dark" role="tab" aria-selected="false" aria-controls="tab-notes-dark" id="tab-notes-dark-trigger" tabindex="-1">Notes</a></li>
    </ul>

    <div class="card tab-content">

      <div id="tab-team-dark" role="tabpanel" aria-labelledby="tab-team-dark-trigger" class="tab-pane">
        <div class="avatars">
          <span class="avatar"><img src="images/avatar-alice.svg" alt="Alice" data-name="Alice"></span>
          <span class="avatar"><img src="images/avatar-bob.svg" alt="Bob" data-name="Bob"></span>
          <span class="avatar"><img src="images/avatar-charlie.svg" alt="Charlie" data-name="Charlie"></span>
          <span class="avatar"><img src="images/avatar-dave.svg" alt="Dave" data-name="Dave"></span>
          <span class="avatar"><img src="images/avatar-eve.svg" alt="Eve" data-name="Eve"></span>
        </div>
        <div class="avatars" style="margin-top: 1rem;">
          <span class="avatar avatar-one-letter avatar-solid avatar-subdued">V</span>
          <span class="avatar avatar-two-letter avatar-solid avatar-subdued">BG</span>
          <span class="avatar avatar-icon avatar-solid avatar-subdued">
            <span class="material-symbols-rounded">group</span>
          </span>
          <span class="avatar avatar-icon avatar-solid avatar-strong">
            <span class="material-symbols-rounded">group</span>
          </span>
        </div>
      </div>

      <div id="tab-tasks-dark" role="tabpanel" aria-labelledby="tab-tasks-dark-trigger" class="tab-pane" hidden>
        <div class="checkboxes">
          <div class="form-check">
            <input type="checkbox">
            <label>Respond to comment <a href="#">#129</a> from Jake</label>
          </div>
          <div class="form-check">
            <input type="checkbox">
            <label>Invite <a href="#">John McClane</a> to Nakatomi Plaza</label>
          </div>
          <div class="form-check">
            <input type="checkbox">
            <label>Create TPS report <a href="#">requested</a> by Bill Lumbergh</label>
          </div>
          <div class="form-check form-check-struckout">
            <input type="checkbox" checked>
            <label>Lay off 62 employees</label>
          </div>
          <div class="form-check form-check-struckout">
            <input type="checkbox" checked>
            <label>Review Robert Johnson's contract</label>
          </div>
        </div>
      </div>

      <div id="tab-notes-dark" role="tabpanel" aria-labelledby="tab-notes-dark-trigger" class="tab-pane" hidden>
        <blockquote>
          Reginald Poppycock is an eccentric <a href="#">inventor</a> and professional cheese sculptor, who designed the <a href="#">world’s first steam-powered teapot</a> capable of reciting <a href="#">Shakespearean sonnets</a> while brewing Earl Grey, from 1884 to 1885.
        </blockquote>
      </div>

    </div>
  </div>

</div>"""

# Replace first occurrence
content = content.replace(old_block, new_block_light, 1)

# Replace second occurrence (which is now the first occurrence of the old block remaining)
content = content.replace(old_block, new_block_dark, 1)

with open(file_path, 'w') as f:
    f.write(content)

print("Successfully updated tabs in docs/index.html")
