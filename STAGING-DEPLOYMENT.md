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

Header branding is selected by URL in header.js: only /test/ and its descendants
activate the blueprint logo, circular clipping, and blue title hover/focus.
All other paths keep the production logo and orange accent. These shared header
files are safe to merge into main; no manual branding restore is needed.
.gitignore does not exclude changes to tracked files and is not a deployment guard.

The browser favicon also switches to a circular blueprint SVG only under /test/.
Production favicon links are left untouched by header.js.

Google Tag Manager is connected by the same google-tag-manager.shared.js include
in both branches. Its URL guard permits only production hosts over HTTPS and
excludes /test and all descendants. Keep this shared code identical across
environments; see ANALYTICS.md for the GTM/GA4 setup and opt-out controls.
