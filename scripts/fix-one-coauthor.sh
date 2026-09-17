#!/usr/bin/env bash
set -euo pipefail
export PATH="/c/Program Files/Git/mingw64/bin:/c/Program Files/Git/bin:$PATH"
cd /d/site-av4

BAD=$(git log --format="%H %s" | grep -i "Co-authored-by" | awk '{print $1}' | head -n1)
if [ -z "${BAD:-}" ]; then
  echo "nothing to fix"
  git log -3 --format="%h %s"
  exit 0
fi

echo "fixing $BAD"
TREE=$(git rev-parse "${BAD}^{tree}")
PARENT=$(git rev-parse "${BAD}^")
export GIT_AUTHOR_NAME=$(git log -1 --format=%an "$BAD")
export GIT_AUTHOR_EMAIL=$(git log -1 --format=%ae "$BAD")
export GIT_AUTHOR_DATE=$(git log -1 --format=%aI "$BAD")
export GIT_COMMITTER_NAME=$(git log -1 --format=%cn "$BAD")
export GIT_COMMITTER_EMAIL=$(git log -1 --format=%ce "$BAD")
export GIT_COMMITTER_DATE=$(git log -1 --format=%cI "$BAD")

MSG_FILE=$(mktemp)
git log -1 --format=%B "$BAD" | python /d/site-av4/scripts/strip-coauthor-msg.py > "$MSG_FILE"
echo "new message:"
cat "$MSG_FILE"

NEW=$(git commit-tree "$TREE" -p "$PARENT" -F "$MSG_FILE")
rm -f "$MSG_FILE"
echo "new commit: $NEW"

# Rebuild tip (BAD's children) onto NEW. Currently BAD has one child: HEAD tip.
TIP=$(git rev-parse HEAD)
TIP_TREE=$(git rev-parse "${TIP}^{tree}")
export GIT_AUTHOR_NAME=$(git log -1 --format=%an "$TIP")
export GIT_AUTHOR_EMAIL=$(git log -1 --format=%ae "$TIP")
export GIT_AUTHOR_DATE=$(git log -1 --format=%aI "$TIP")
export GIT_COMMITTER_NAME=$(git log -1 --format=%cn "$TIP")
export GIT_COMMITTER_EMAIL=$(git log -1 --format=%ce "$TIP")
export GIT_COMMITTER_DATE=$(git log -1 --format=%cI "$TIP")
TIP_MSG=$(mktemp)
git log -1 --format=%B "$TIP" > "$TIP_MSG"
NEWTIP=$(git commit-tree "$TIP_TREE" -p "$NEW" -F "$TIP_MSG")
rm -f "$TIP_MSG"

git update-ref refs/heads/av4 "$NEWTIP"
echo "updated av4 -> $NEWTIP"
git log -5 --format="%h %s"
if git log --format="%B%n%s" | grep -i "Co-authored-by" >/dev/null; then
  echo STILL_PRESENT
  git log --format="%h %s" --grep="Co-authored-by" -i
  exit 1
fi
echo CLEAN
