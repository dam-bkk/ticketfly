const BASE = "https://ticketfly.damien.asia";
const ADMIN = "1", REQ = "56";
const ROW_T = 'a[href^="/tickets/"]:not([href*="board"]):not([href*="?"])';
const S = [
  { id: "dashboard", url: "/dashboard", p: ADMIN, hs: [['a[href^="/tickets?f=open&group="]', "tickets"], ['a[href="/tickets?f=unassigned"]', "tickets"], ['a[href="/tickets"]', "tickets"], ['a[href="/assets/inventory"]', "inventory"], ['a[href="/journeys/onboarding"]', "onboarding"], ['a[href="/admin"]', "admin"], ['a[href="/reporting"]', "reporting"], ['a[href="/changes"]', "changes"]] },
  { id: "tickets", url: "/tickets", p: ADMIN, hs: [[ROW_T, "ticket"], ['a[href="/tickets/board"]', "board"], ['a[href="/dashboard"]', "dashboard"], ['a[href="/changes"]', "changes"]] },
  { id: "ticket", url: "/tickets", p: ADMIN, before: async (page) => { await page.locator(ROW_T).first().click(); await page.waitForURL(/\/tickets\/\d+$/); await page.waitForLoadState("networkidle"); }, hs: [['a[href="/tickets"]', "tickets"], ['a[href="/assets/inventory"]', "inventory"], ['a[href="/dashboard"]', "dashboard"]] },
  { id: "board", url: "/tickets/board", p: ADMIN, hs: [['a[href="/tickets"]', "tickets"], ['a[href="/dashboard"]', "dashboard"]] },
  { id: "changes", url: "/changes", p: ADMIN, hs: [['main a[href^="/changes/"]:not([href*="calendar"]):not([href*="new"])', "change"], ['a[href="/dashboard"]', "dashboard"]] },
  { id: "change", url: "/changes/1", p: ADMIN, hs: [['a[href="/changes"]', "changes"], ['a[href="/it-ops/status"]', "status"]] },
  { id: "problem", url: "/problems/1", p: ADMIN, hs: [['a[href="/tickets"]', "tickets"], ['a[href="/changes"]', "changes"]] },
  { id: "inventory", url: "/assets/inventory", p: ADMIN, hs: [['main a[href^="/assets/"]:not([href*="inventory"]):not([href*="software"]):not([href*="contracts"]):not([href*="purchase"])', "asset"], ['a[href="/dashboard"]', "dashboard"]] },
  { id: "asset", url: "/assets/1", p: ADMIN, hs: [['a[href="/assets/1?tab=software"]', "asset-software"], ['a[href="/assets/inventory"]', "inventory"]] },
  { id: "asset-software", url: "/assets/1?tab=software", p: ADMIN, hs: [['a[href="/assets/1"]', "asset"], ['a[href="/assets/inventory"]', "inventory"]] },
  { id: "onboarding", url: "/journeys/onboarding", p: ADMIN, hs: [['a[href="/journeys/offboarding"]', "offboarding"], ['main a[href^="/people/"]', "person"], ['a[href="/dashboard"]', "dashboard"]] },
  { id: "offboarding", url: "/journeys/offboarding", p: ADMIN, hs: [['a[href="/journeys/onboarding"]', "onboarding"], ['a[href="/people"]', "people"]] },
  { id: "people", url: "/people", p: ADMIN, hs: [['main a[href^="/people/"]', "person"], ['a[href="/dashboard"]', "dashboard"]] },
  { id: "person", url: "/people/76", p: ADMIN, hs: [['a[href="/people"]', "people"], ['a[href="/journeys/onboarding"]', "onboarding"]] },
  { id: "projects", url: "/projects/1", p: ADMIN, hs: [['a[href="/dashboard"]', "dashboard"]] },
  { id: "solutions", url: "/solutions", p: ADMIN, hs: [['a[href="/dashboard"]', "dashboard"]] },
  { id: "reporting", url: "/reporting", p: ADMIN, hs: [['a[href="/dashboard"]', "dashboard"], ['a[href="/tickets"]', "tickets"]] },
  { id: "status", url: "/it-ops/status", p: ADMIN, hs: [['a[href="/it-ops/alerts"]', "alerts"], ['a[href="/dashboard"]', "dashboard"]] },
  { id: "alerts", url: "/it-ops/alerts", p: ADMIN, hs: [['a[href="/it-ops/status"]', "status"], ['a[href="/tickets"]', "tickets"]] },
  { id: "admin", url: "/admin", p: ADMIN, hs: [['a[href="/admin/activity"]', "activity"], ['a[href="/dashboard"]', "dashboard"]] },
  { id: "activity", url: "/admin/activity", p: ADMIN, hs: [['a[href="/admin"]', "admin"], ['a[href="/dashboard"]', "dashboard"]] },
  { id: "viewas", url: "/dashboard", p: ADMIN, showBar: true, hs: [] },
  { id: "portal", url: "/portal", p: REQ, hs: [['a[href="/portal/new/report-issue"]', "portal-new"], ['a[href="/portal/requests"]', "portal-requests"], ['a[href="/portal/devices"]', "portal-devices"], ['a[href="/portal/help"]', "portal-help"]] },
  { id: "portal-new", url: "/portal/new/report-issue", p: REQ, before: async (page) => { await page.locator("form input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]), form textarea").first().fill("Cannot recall an email I sent in Outlook"); await page.waitForTimeout(1500); }, hs: [['header a[href="/portal"]', "portal"]] },
  { id: "portal-requests", url: "/portal/requests", p: REQ, hs: [['main a[href^="/portal/requests/"]', "portal-request"], ['header a[href="/portal"]', "portal"]] },
  { id: "portal-request", url: "/portal/requests", p: REQ, before: async (page) => { await page.locator('main a[href^="/portal/requests/"]').first().click(); await page.waitForURL(/\/portal\/requests\/\d+/); await page.waitForLoadState("networkidle"); }, hs: [['a[href="/portal/requests"]', "portal-requests"], ['header a[href="/portal"]', "portal"]] },
  { id: "portal-devices", url: "/portal/devices", p: REQ, hs: [['header a[href="/portal"]', "portal"], ['a[href="/portal/requests"]', "portal-requests"]] },
  { id: "portal-help", url: "/portal/help", p: REQ, hs: [['header a[href="/portal"]', "portal"]] },
  { id: "login", url: "/login", p: null, hs: [] },
];
const ONLY = (process.env.ONLY || "").split(",").filter(Boolean);
const AGENT = [['a[href="/dashboard"]', "dashboard"], ['a[href="/tickets"]', "tickets"], ['a[href="/tickets/board"]', "board"], ['a[href="/journeys/onboarding"]', "onboarding"], ['a[href="/journeys/offboarding"]', "offboarding"], ['a[href="/problems"]', "problem"], ['a[href="/changes"]', "changes"], ['a[href="/it-ops/alerts"]', "alerts"], ['a[href="/it-ops/status"]', "status"], ['a[href="/assets/inventory"]', "inventory"], ['a[href="/projects"]', "projects"], ['a[href="/people"]', "people"], ['a[href="/solutions"]', "solutions"], ['a[href="/admin"]', "admin"], ['a[href="/reporting"]', "reporting"]];
const PORTAL = [['header a[href="/portal"]', "portal"], ['header a[href="/portal/requests"]', "portal-requests"], ['header a[href="/portal/devices"]', "portal-devices"], ['header a[href="/portal/help"]', "portal-help"]];
export default async function run(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  const out = [];
  for (const s of S.filter((x) => !ONLY.length || ONLY.includes(x.id))) {
    await page.context().clearCookies();
    if (s.p) await page.context().addCookies([{ name: "tf_persona", value: s.p, domain: "ticketfly.damien.asia", path: "/", secure: true, sameSite: "Lax" }]);
    try {
      await page.goto(BASE + s.url, { waitUntil: "load", timeout: 60000 }); await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => null);
      if (s.before) await s.before(page);
      await page.addStyleTag({ content: `nextjs-portal{display:none!important} ${s.showBar ? "" : '[aria-live="polite"].fixed{display:none!important}'} *{caret-color:transparent!important}` });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `shots/${s.id}.png` });
      const hs = [];
      const seen = new Set();
      const common = s.id === "login" || s.id === "viewas" ? [] : s.p === REQ ? PORTAL : AGENT;
      for (const [sel, to] of [...s.hs, ...common]) {
        if (to === s.id) continue;
        const key = sel + ">" + to; if (seen.has(key)) continue; seen.add(key);
        for (const el of await page.$$(sel)) {
          const b = await el.boundingBox().catch(() => null);
          if (b && b.width > 4 && b.height > 4 && b.y >= 0 && b.y < 900) { hs.push({ to, x: +(b.x / 14.4).toFixed(2), y: +(b.y / 9).toFixed(2), w: +(b.width / 14.4).toFixed(2), h: +(b.height / 9).toFixed(2) }); break; }
        }
      }
      out.push({ id: s.id, url: page.url().replace(BASE, ""), hs });
    } catch (e) { out.push({ id: s.id, error: String(e).slice(0, 200) }); }
  }
  return out;
}
