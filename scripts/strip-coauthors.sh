#!/usr/bin/env bash
set -euo pipefail
export PATH="/c/Program Files/Git/mingw64/bin:/c/Program Files/Git/bin:$PATH"
export FILTER_BRANCH_SQUELCH_WARNING=1
cd /d/site-av4

git filter-branch -f --msg-filter "python /d/site-av4/scripts/strip-coauthor-msg.py" av4

echo "--- subjects ---"
git log --format="%H %s" --grep="Co-authored-by" -i || true
echo "--- bodies ---"
if git log --format="%B" | grep -i "^Co-authored-by:" >/dev/null; then
  echo BODY_BAD
  exit 1
fi
echo BODY_OK
git log -5 --format="%h %s"
