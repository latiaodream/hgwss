#!/usr/bin/env python3
import re

with open('src/client/XbetClient.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the method and replace it
in_method = False
method_start = -1
brace_count = 0
new_lines = []

for i, line in enumerate(lines):
    if 'async #buildLoginPayload()' in line:
        in_method = True
        method_start = i
        new_lines.append(line)
        continue
    
    if in_method:
        # Count braces to find method end
        brace_count += line.count('{') - line.count('}')
        
        if brace_count < 0:  # Method ended
            # Insert new method body before the closing brace
            new_lines.append('    const did = await this.#ensureDeviceId();\n')
            new_lines.append('    \n')
            new_lines.append('    // Test: only send did and ua like browser does (30 bytes message)\n')
            new_lines.append('    const payload = {\n')
            new_lines.append('      did,\n')
            new_lines.append('      ua: this.userAgent || DEFAULT_USER_AGENT\n')
            new_lines.append('    };\n')
            new_lines.append('\n')
            new_lines.append('    return payload;\n')
            new_lines.append(line)  # Add the closing brace
            in_method = False
            continue
    else:
        new_lines.append(line)

with open('src/client/XbetClient.js', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("✅ Done!")

