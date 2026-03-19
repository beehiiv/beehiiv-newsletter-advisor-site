#!/bin/bash

BATCH_SIZE=2000
BATCH_NUM=20

cd /Users/stevenvan/very-good-ads

rebuild_index() {
  echo "Rebuilding git index..."
  rm -f .git/index.lock .git/gc.log 2>/dev/null
  rm -f .git/index
  git reset --no-refresh 2>/dev/null
  git reset 2>/dev/null
  sleep 1
}

while true; do
  rm -f .git/index.lock .git/gc.log 2>/dev/null

  # Get untracked HTML files
  FILES=$(git status --short 2>/dev/null | grep '^?? public/emails/' | head -n $BATCH_SIZE | awk '{print $2}')

  if [ -z "$FILES" ]; then
    # Double check - might need index rebuild
    rebuild_index
    FILES=$(git status --short 2>/dev/null | grep '^?? public/emails/' | head -n $BATCH_SIZE | awk '{print $2}')
    if [ -z "$FILES" ]; then
      echo "All files committed and pushed!"
      break
    fi
  fi

  COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
  echo "=== Batch $BATCH_NUM: Adding $COUNT files ==="

  # Try to add and commit, rebuild index if it fails
  if ! echo "$FILES" | xargs git add 2>/dev/null; then
    echo "git add failed, rebuilding index..."
    rebuild_index
    FILES=$(git status --short 2>/dev/null | grep '^?? public/emails/' | head -n $BATCH_SIZE | awk '{print $2}')
    if [ -z "$FILES" ]; then continue; fi
    COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
    echo "Retrying batch $BATCH_NUM with $COUNT files..."
    if ! echo "$FILES" | xargs git add 2>/dev/null; then
      echo "git add still failing, aborting"
      exit 1
    fi
  fi

  if ! git commit -m "Add imported newsletter emails batch $BATCH_NUM ($COUNT files)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>" 2>/dev/null; then
    echo "commit failed, rebuilding index and retrying..."
    rebuild_index
    continue
  fi

  echo "Pushing batch $BATCH_NUM..."
  PUSHED=0
  for i in 1 2 3 4 5; do
    rm -f .git/index.lock 2>/dev/null
    git fetch origin main 2>/dev/null
    if git push origin main 2>&1; then
      echo "Batch $BATCH_NUM pushed successfully!"
      PUSHED=1
      break
    else
      echo "Push attempt $i failed, fetching and retrying in 3s..."
      sleep 3
    fi
  done

  if [ $PUSHED -eq 0 ]; then
    echo "Failed to push batch $BATCH_NUM after 5 attempts, aborting"
    exit 1
  fi

  BATCH_NUM=$((BATCH_NUM + 1))
  sleep 1
done
