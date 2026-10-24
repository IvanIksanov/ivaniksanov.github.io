# Google Tag Manager

Container: `GTM-NXXP6DGH`.

All HTML pages load `google-tag-manager.shared.js` immediately after the charset
declaration in `<head>`. Keep this include identical in main and staging.
The shared loader requests Google's container only over HTTPS on `qatodev.ru`
or `www.qatodev.ru`, excluding `/test` and all its descendants. Local files,
localhost, GitHub Pages preview hosts, and other domains do not load GTM.
The site is static, so the browser identifies production by URL, not Git branch.

The loader preserves the existing analytics opt-out:

- `?disableMetrics=1` disables analytics in this browser and stores the choice.
- `?disableMetrics=0` enables it again.
- The existing `metrikaOptOut` local-storage key is shared with Yandex Metrica.

Yandex Metrica remains connected separately. Do not add a second Metrica
counter with the same ID through GTM, because that would duplicate hits.

## Finish setting up Google Analytics

Installing GTM alone does not create Google Analytics reports.

1. Create or select a GA4 property and a Web data stream for `https://qatodev.ru`.
   Copy its measurement ID (`G-...`), not the GTM container ID.
2. In container `GTM-NXXP6DGH`, create a **Google tag**, using that `G-...` ID.
3. For additional protection, use an **Initialization** trigger with **Some
   Initialization Events** and both conditions:
   - **Page Hostname** matches RegEx `^(www\.)?qatodev\.ru$`;
   - **Page Path** does not match RegEx `^/test(/|$)` (ignore case).
   Enable these built-in variables if they are not visible.
4. Use **Preview** with the production URL, confirm that the Google tag fires,
   and check GA4 Realtime. `/test/` intentionally will not connect to this GTM
   container. If analytics was disabled in your browser, open production with
   `?disableMetrics=0` before checking.
5. **Submit → Publish** the container so the tag runs for normal visitors.

No GA4 ID is hardcoded in this repository; tag configuration stays in GTM.
Do not add a separate gtag.js installation alongside the GTM Google tag.
The existing custom Metrica goals are not automatically GA4 events.

## About the supplied noscript iframe

The direct `googletagmanager.com/ns.html` iframe is intentionally omitted.
Without JavaScript, identical static HTML cannot conditionally include that
external iframe only on production while excluding `/test/` and localhost.
Creating a noscript iframe with JavaScript would not provide a real fallback.
GA4 collection requires JavaScript; the normal GTM loader handles it.

Official setup: https://support.google.com/tagmanager/answer/9442095?hl=ru
