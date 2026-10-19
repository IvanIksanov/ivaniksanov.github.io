# Staging deployment

Production: https://qatodev.ru/ (origin/main).
Test: https://qatodev.ru/test/ (staging-pages/staging).

Before updating staging, fetch and integrate both origin/staging and
staging-pages/staging. Preserve staging snapshots when bringing main into staging.
Never force-push either remote.

All staging HTML pages have a static robots noindex tag; staging sitemap is empty.
These environment settings must not enter production when merging staging into main.
On main, restore production robots.txt and sitemap.xml and keep noindex only on
hwois.html, start.html, and osi_model.html. Preserve main snapshots:
over/questions_db_snapshot.json and over/public_ai_append_snapshot.json.
Verify these settings before every production push.

Staging header.css uses img/QAtoDev_Blueprint.png for the header logo.
Production keeps img/QAtoDev_(Flappy_Bird_style).png. Preserve this difference
when merging staging into main; do not copy the test header asset selection.

Staging header title hover/focus accent is blue (#0879E8); production stays orange.
