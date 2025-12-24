import re

def get_checkbox_block(suffix):
    return f'''<div class="checkboxes">
          <div class="usa-checkbox">
            <input class="usa-checkbox__input" id="check-1-{suffix}" type="checkbox" name="check-1-{suffix}" value="respond" data-uses-token="accentNonContentStrong">
            <label class="usa-checkbox__label" for="check-1-{suffix}" data-uses-token="neutralContentStrong">Respond to comment <a href="#">#129</a> from Jake</label>
          </div>
          <div class="usa-checkbox">
            <input class="usa-checkbox__input" id="check-2-{suffix}" type="checkbox" name="check-2-{suffix}" value="invite" data-uses-token="accentNonContentStrong">
            <label class="usa-checkbox__label" for="check-2-{suffix}" data-uses-token="neutralContentStrong">Invite <a href="#">John McClane</a> to Nakatomi Plaza</label>
          </div>
          <div class="usa-checkbox">
            <input class="usa-checkbox__input" id="check-3-{suffix}" type="checkbox" name="check-3-{suffix}" value="tps" data-uses-token="accentNonContentStrong">
            <label class="usa-checkbox__label" for="check-3-{suffix}" data-uses-token="neutralContentStrong">Create TPS report <a href="#">requested</a> by Bill Lumbergh</label>
          </div>
          <div class="usa-checkbox usa-checkbox--struckout">
            <input class="usa-checkbox__input" id="check-4-{suffix}" type="checkbox" name="check-4-{suffix}" value="layoff" checked data-uses-token="accentNonContentStrong">
            <label class="usa-checkbox__label" for="check-4-{suffix}" data-uses-token="neutralContentStrong">Lay off 62 employees</label>
          </div>
          <div class="usa-checkbox usa-checkbox--struckout">
            <input class="usa-checkbox__input" id="check-5-{suffix}" type="checkbox" name="check-5-{suffix}" value="contract" checked data-uses-token="accentNonContentStrong">
            <label class="usa-checkbox__label" for="check-5-{suffix}" data-uses-token="neutralContentStrong">Review Robert Johnson's contract</label>
          </div>
        </div>'''

with open('docs/index.html', 'r') as f:
    content = f.read()

# Regex to match the existing checkboxes block
pattern = re.compile(r'<div>\s*<input type="checkbox">\s*<input type="checkbox" checked>\s*<input type="radio">\s*<input type="radio" checked>\s*<input type="checkbox" role="switch">\s*<input type="checkbox" role="switch" checked>\s*</div>', re.DOTALL)

# We expect 2 matches (light and dark)
matches = list(pattern.finditer(content))

if len(matches) != 2:
    print(f"Error: Expected 2 matches, found {len(matches)}")
    if len(matches) == 0:
        print("Trying looser regex...")
        pattern = re.compile(r'<div>\s*<input type="checkbox">.*?<input type="checkbox" role="switch" checked>\s*</div>', re.DOTALL)
        matches = list(pattern.finditer(content))
        print(f"Found {len(matches)} matches with looser regex.")

if len(matches) == 2:
    # We need to replace from last to first to not mess up indices
    # Second match is Dark (based on file structure)
    start_dark, end_dark = matches[1].span()
    content = content[:start_dark] + get_checkbox_block('dark') + content[end_dark:]
    
    # First match is Light
    start_light, end_light = matches[0].span()
    content = content[:start_light] + get_checkbox_block('light') + content[end_light:]

    with open('docs/index.html', 'w') as f:
        f.write(content)
    print("Successfully updated checkboxes.")
else:
    print("Could not safely update checkboxes. Please check the file content.")
