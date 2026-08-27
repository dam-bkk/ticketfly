# Offline copy (one HTML per user)

Crawls the live app as one persona and bundles every page into a single self-contained HTML
(gzip+base64 pages, CSS + fonts embedded, hash router in an iframe) with an in-browser test
sandbox: new requests, replies and property changes are stored in the tester's localStorage and
rendered back into lists and detail pages. Nothing reaches a server.

```sh
cd tools/offline-copy
./runone.sh admin 1 /dashboard        # <state-name> <people.id> <start path>; repeat per persona
./runone.sh requester 56 /portal
python3 build_mirror.py admin "Nada Haddad" admin /dashboard Service-Desk-Admin.html   # → ~/Desktop
```

`crawl.mjs` runs through the browser-automation skill (patchright); `skip()` prunes query-param
explosions (asset tabs beyond id 40, per-ticket "raise a problem" forms). Pages that error are
requeued on the next batch. Change `BASE` in `crawl.mjs` and the font host in `build_mirror.py`
when the app moves to Azure.
