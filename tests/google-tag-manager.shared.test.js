const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "google-tag-manager.shared.js"), "utf8");

function environment(url, { optedOut = false, storageBlocked = false, consent = "granted" } = {}) {
  const scripts = [];
  const storage = new Map(optedOut ? [["metrikaOptOut", "1"]] : []);
  const window = { location: new URL(url), QAtoDevAnalyticsConsent: consent };
  Object.defineProperty(window, "localStorage", {
    get() {
      if (storageBlocked) throw new Error("Storage blocked");
      return {
        getItem: key => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: key => storage.delete(key)
      };
    }
  });
  const firstScript = { parentNode: { insertBefore: script => scripts.push(script) } };
  const document = {
    getElementById: id => scripts.find(script => script.id === id),
    createElement: tag => {
      assert.equal(tag, "script");
      return {};
    },
    getElementsByTagName: () => [firstScript]
  };
  const context = vm.createContext({ window, document, URLSearchParams });
  return { window, scripts, storage, run: () => vm.runInContext(source, context) };
}

test("production loads the supplied GTM container asynchronously and preserves dataLayer", () => {
  for (const host of ["qatodev.ru", "www.qatodev.ru"]) {
    const env = environment(`https://${host}/course.html?chapter=4`);
    const queue = [{ event: "existing-event" }];
    env.window.dataLayer = queue;
    env.run();
    assert.equal(env.scripts.length, 1);
    assert.equal(env.scripts[0].src, "https://www.googletagmanager.com/gtm.js?id=GTM-NXXP6DGH");
    assert.equal(env.scripts[0].async, true);
    assert.strictEqual(env.window.dataLayer, queue);
    assert.equal(queue[1].event, "gtm.js");
    assert.equal(typeof queue[1]["gtm.start"], "number");
  }
});

test("test, local and preview URLs never load GTM", () => {
  for (const url of [
    "https://qatodev.ru/test", "https://qatodev.ru/test/",
    "https://qatodev.ru/test/index.html?disableMetrics=0",
    "https://www.qatodev.ru/test/course.html", "https://qatodev.ru/TEST/index.html",
    "https://qatodev.ru/t%65st/index.html", "https://qatodev.ru//test/index.html",
    "http://qatodev.ru/", "http://localhost:8765/", "https://localhost/",
    "http://127.0.0.1:8765/", "file:///project/index.html",
    "https://ivaniksanov.github.io/", "https://ivaniksanov.github.io/test/",
    "https://test.qatodev.ru/", "https://qatodev.ru.example.com/"
  ]) {
    const env = environment(url, { optedOut: true });
    env.run();
    assert.equal(env.scripts.length, 0, url);
    assert.equal(env.window.dataLayer, undefined, url);
    assert.equal(env.storage.get("metrikaOptOut"), "1", url);
  }
});

test("a production page whose name starts with test is still tracked", () => {
  const env = environment("https://qatodev.ru/test-design.html");
  env.run();
  assert.equal(env.scripts.length, 1);
});

test("GTM stays unloaded without an explicit analytics choice", () => {
  for (const consent of [null, "denied"]) {
    const env = environment("https://qatodev.ru/", { consent });
    env.run();
    assert.equal(env.scripts.length, 0);
  }
});

test("both the saved and URL analytics opt-outs disable GTM", () => {
  const saved = environment("https://qatodev.ru/", { optedOut: true });
  saved.run();
  assert.equal(saved.scripts.length, 0);
  const disabled = environment("https://qatodev.ru/?disableMetrics=1");
  disabled.run();
  assert.equal(disabled.scripts.length, 0);
  assert.equal(disabled.storage.get("metrikaOptOut"), "1");
  const enabled = environment("https://qatodev.ru/?disableMetrics=0", { optedOut: true });
  enabled.run();
  assert.equal(enabled.scripts.length, 1);
  assert.equal(enabled.storage.has("metrikaOptOut"), false);
});

test("blocked storage does not break initialization or the URL opt-out", () => {
  const enabled = environment("https://qatodev.ru/", { storageBlocked: true });
  enabled.run();
  assert.equal(enabled.scripts.length, 1);
  const disabled = environment("https://qatodev.ru/?disableMetrics=1", { storageBlocked: true });
  disabled.run();
  assert.equal(disabled.scripts.length, 0);
});

test("loading the shared file twice does not load the container twice", () => {
  const env = environment("https://qatodev.ru/");
  env.run();
  env.run();
  assert.equal(env.scripts.length, 1);
  assert.equal(env.window.dataLayer.length, 1);
});

test("all site pages use one shared loader at the start of head", () => {
  const pages = fs.readdirSync(root).filter(name => name.endsWith(".html"));
  assert.ok(pages.length > 0);
  for (const name of pages) {
    const html = fs.readFileSync(path.join(root, name), "utf8");
    assert.equal((html.match(/google-tag-manager\.shared\.js/g) || []).length, 1, name);
    assert.match(html, /<script src="analytics-consent\.shared\.js\?v=1"><\/script>\s*<script src="google-tag-manager\.shared\.js\?v=20261027-1"><\/script>/i, name);
    assert.doesNotMatch(html, /googletagmanager\.com\/ns\.html/, name);
    assert.doesNotMatch(html, /mc\.yandex\.ru\/watch\/99129194/, name);
  }
});
