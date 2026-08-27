import fs from "node:fs";
const BASE = "https://ticketfly.damien.asia";
const NAME = process.env.NAME || "admin", PERSONA = process.env.PERSONA || "1", START = process.env.START || "/dashboard";
const MAX = +(process.env.MAX || 1500), BATCH = +(process.env.BATCH || 200);
const FILE = `state-${NAME}.json`;
const skip = (h) => {
  if (!h.startsWith("/") || h.startsWith("//") || /^\/(api|login|fs|_next)/.test(h) || /\.csv|sort=|dir=|density|logout|#/.test(h)) return true;
  if (/^\/problems\/new\?ticket=/.test(h)) return true;                       // one prefilled form is enough
  const at = h.match(/^\/assets\/(\d+)\?tab=/); if (at && +at[1] > 40) return true; // asset tabs only for the first 40 assets
  if (/^\/admin\/activity\?page=(\d+)/.test(h) && +h.match(/page=(\d+)/)[1] > 5) return true;
  return false;
};
const norm = (h) => { const u = new URL(h, BASE); return u.pathname + (u.search || ""); };
export default async function run(page) {
  const st = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : { queue: [START], pages: {}, css: null, assets: {}, truncated: [] };
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.context().addCookies([{ name: "tf_persona", value: PERSONA, domain: "ticketfly.damien.asia", path: "/", secure: true, sameSite: "Lax" }]);
  for (const [k, v] of Object.entries(st.pages)) if (v.status === -1) { delete st.pages[k]; st.queue.unshift(k); }
  st.queue = st.queue.filter((p, i, a) => !skip(p) && a.indexOf(p) === i);
  let n = 0;
  while (st.queue.length && n < BATCH) {
    const path = st.queue.shift();
    if (st.pages[path]) continue;
    if (Object.keys(st.pages).length >= MAX) { st.truncated.push(path); continue; }
    try {
      const r = await page.goto(BASE + path, { waitUntil: "load", timeout: 45000 });
      await page.waitForLoadState("networkidle", { timeout: 1500 }).catch(() => null);
      await page.waitForTimeout(150);
      const finalPath = norm(page.url());
      const res = await page.evaluate(() => {
        const d = document.documentElement.cloneNode(true);
        d.querySelectorAll("script, link[rel=preload], link[rel=modulepreload], nextjs-portal, next-route-announcer, [aria-live='polite'].fixed").forEach((x) => x.remove());
        const links = Array.from(document.querySelectorAll("a[href]")).map((a) => a.getAttribute("href"));
        const imgs = Array.from(document.querySelectorAll("img[src], link[rel=icon]")).map((x) => x.getAttribute("src") || x.getAttribute("href"));
        return { html: "<!doctype html>" + d.outerHTML, links, imgs, title: document.title };
      });
      if (!st.css) {
        const hrefs = await page.evaluate(() => Array.from(document.styleSheets).map((s) => s.href).filter((h) => h && h.includes("/_next/")));
        let css = "";
        for (const h of hrefs) css += await page.evaluate((u) => fetch(u).then((r) => r.text()), h) + "\n";
        const fonts = [...new Set([...css.matchAll(/url\((\/_next\/static\/media\/[^)"']+)\)/g)].map((m) => m[1]))];
        for (const f of fonts) {
          const b64 = await page.evaluate((u) => fetch(u).then((r) => r.arrayBuffer()).then((b) => btoa(String.fromCharCode(...new Uint8Array(b)))), f);
          const mime = f.endsWith(".woff2") ? "font/woff2" : f.endsWith(".woff") ? "font/woff" : "application/octet-stream";
          css = css.split(f).join(`data:${mime};base64,${b64}`);
        }
        st.css = css;
      }
      for (const src of res.imgs) if (src && src.startsWith("/") && !st.assets[src]) {
        st.assets[src] = await page.evaluate((u) => fetch(u).then((r) => r.arrayBuffer().then((b) => ({ t: r.headers.get("content-type"), b: btoa(String.fromCharCode(...new Uint8Array(b))) }))), src).catch(() => null);
      }
      st.pages[path] = { html: res.html, title: res.title, status: r ? r.status() : 0, at: finalPath };
      if (finalPath !== path && !st.pages[finalPath]) st.pages[finalPath] = st.pages[path];
      for (const l of res.links) { if (!l || skip(l)) continue; const p = norm(l); if (!st.pages[p] && !st.queue.includes(p)) st.queue.push(p); }
    } catch (e) { st.pages[path] = { html: "", title: "", status: -1, error: String(e).slice(0, 160) }; }
    n++;
    if (n % 20 === 0) fs.writeFileSync(FILE, JSON.stringify(st));
  }
  fs.writeFileSync(FILE, JSON.stringify(st));
  const errs = Object.values(st.pages).filter((p) => p.status === -1).length;
  return { name: NAME, done: Object.keys(st.pages).length, remaining: st.queue.length, errors: errs, truncated: st.truncated.length, batch: n };
}
