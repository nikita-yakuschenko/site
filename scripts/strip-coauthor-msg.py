import re
import sys

msg = sys.stdin.read()
# Trailer lines
msg = re.sub(r"(?im)^Co-authored-by:.*\r?\n?", "", msg)
# Subject junk like "; … git-ship … Co-authored-by"
lines = msg.splitlines()
if lines and re.search(r"(?i)Co-authored-by", lines[0]):
    lines[0] = re.split(r";\s*", lines[0], maxsplit=1)[0].rstrip()
msg = "\n".join(lines)
msg = re.sub(r"\n{3,}", "\n\n", msg)
sys.stdout.write(msg.rstrip() + "\n")
