#!/bin/zsh
cd "$(dirname "$0")"
name=$1 persona=$2 start=$3
for i in {1..40}; do
  out=$(NAME=$name PERSONA=$persona START=$start BATCH=55 node /Users/damien/.claude/skills/browser-automation/browser.mjs https://ticketfly.damien.asia/login --script ./crawl.mjs 2>&1 | sed -n '/^script/,/^console/p' | tr -d '\n')
  echo "$(date +%H:%M) $out" >> crawl.log
  echo "$out" | grep -q '"remaining": 0' && break
done
echo "$(date +%H:%M) DONE $name" >> crawl.log
