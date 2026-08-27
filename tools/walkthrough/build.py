import base64, json, html, os
W = os.path.dirname(os.path.abspath(__file__))
meta = {m["id"]: m for m in json.load(open(f"{W}/meta.json"))}

# order, chapter, title, url label, what you see, replaces in Freshservice, try it
CH_AGENT, CH_PORTAL, CH_FOUND = "Agent workspace", "Requester portal", "Foundations"
SCREENS = [
 ("dashboard", CH_AGENT, "Dashboard", "Per-team unresolved tiles, per-agent workload, and one KPI row that links straight into the filtered ticket list. Every number on the page comes from a single definition of “open”, so the sidebar, the tiles and the list always agree.", "Dashboard widgets (Service Desk – Unresolved, Current Unresolved – Infra, My Pending Approvals).", "Click a team tile or the KPI row."),
 ("tickets", CH_AGENT, "Tickets list", "Freshservice’s list, with the same tabs and filter pane, but readable at laptop width: sortable headers, a compact/comfortable density switch, saved views, and INC-/SR- numbering continued from the last Freshservice ticket (#229190).", "Tickets → List, filter pane, saved views.", "Click the first row to open it, or the Board link in the sidebar."),
 ("ticket", CH_AGENT, "Ticket detail", "The conversation on the left, the properties rail on the right — same fields as today. Two improvements: every property autosaves (one “Saved · time” line, no Save button), and a “Next:” banner tells the agent the one thing to do now.", "Ticket page: properties, custom fields, service level, tasks, canned responses (Templates) and scenario automations.", "Use the sidebar to go back to the list."),
 ("board", CH_AGENT, "Board", "The nine-column Kanban with one overdue signal per card, no duplicate status chips.", "Tickets → Board view.", None),
 ("changes", CH_AGENT, "Changes", "Change requests with approval state, windows and the calendar link.", "Change Management list.", "Open the first change."),
 ("change", CH_AGENT, "Change approval", "An approver sees Approve / Request changes right in the rail, and the banner says who still has to decide. Once approved, “Start implementation” moves the change and flips the affected service on the status page.", "Change approvals + Planning / Implementation / Review tabs.", "Follow the link to the Service status page."),
 ("problem", CH_AGENT, "Problem record", "Root cause, impact and symptoms in one panel with a single Save; linked incidents; Resolve is the primary action.", "Problem Management.", None),
 ("inventory", CH_AGENT, "Asset inventory", "Every device with state, user, location and last-seen — no 1,000-asset cap. Filters match the Freshservice sidebar; export to CSV in one click.", "Assets → Inventory (Freshservice lists stop at 1,000).", "Open the first asset."),
 ("asset", CH_AGENT, "Asset detail", "The familiar tab rail (Overview, Relationships, Software, Components, Contracts…). Fields are edited in place — click a value, change it, it saves — instead of a duplicate edit form.", "Asset page with the same tabs and properties.", "Try the Software tab."),
 ("asset-software", CH_AGENT, "Installed software", "What Intune reports on the device, with a managed / in review / ignored status per title — the base for a software asset management view.", "Asset → Software tab + Software Asset Management.", "Back to Overview."),
 ("onboarding", CH_AGENT, "Onboarding", "One New-starter request from HR fans out to every team. Each card counts down to day one; a late task flips the joiner to “At risk”. Accounts and licences are due five working days before day one, laptop three.", "Employee Onboarding module, plus the RFI and COPE forms that lived outside the tool.", "Switch to Offboarding, or open the person record."),
 ("offboarding", CH_AGENT, "Offboarding", "Scheduled from the last day: sign-in disabled, every grant on the person record revoked in reverse, devices recalled, HR alerted if anything is still active 24 hours later.", "Employee Offboarding module.", None),
 ("people", CH_AGENT, "People", "Every person with devices, access grants, monthly cost and open tickets — the record that onboarding fills and offboarding empties.", "Requesters + Departments.", "Open a person."),
 ("person", CH_AGENT, "Person record", "Devices, access grants (with what each costs), tickets and journey history in one place. “Same access as X” clones from here.", "Requester profile (Freshservice has no grants or cost view).", None),
 ("projects", CH_AGENT, "Projects grid", "A Smartsheet-style grid with inline status, owner and dates, plus a Gantt tab — so QVI tracking moves into the same tool.", "Smartsheet (QVI).", None),
 ("solutions", CH_AGENT, "Solutions", "The knowledge base with folders, review dates and usage. The same articles power the live suggestions on the portal request form.", "Solutions.", None),
 ("reporting", CH_AGENT, "Reporting", "SLA attainment, volume by category and channel, first-reply and resolution medians — built-in, exportable, no Analytics add-on.", "Analytics / Reports.", None),
 ("status", CH_AGENT, "Service status", "What staff see on the portal’s “Good to know”. Owners flip a service here; a change with a maintenance window does it automatically.", "Announcements.", "Go to Alerts."),
 ("alerts", CH_AGENT, "Alerts", "Signals from Defender, Intune and Azure Monitor land here, deduplicated, and can be turned into an incident in one click.", "Alert Management.", None),
 ("admin", CH_AGENT, "Admin hub", "The Freshservice admin layout — General, Service Management, Automation, Channels — so nothing has to be re-learned. Unbuilt items are marked “Coming soon”.", "Admin.", "Open the Activity log."),
 ("activity", CH_AGENT, "Activity log", "Every write in the system: timestamp, who, what changed (old → new), IP and release. Exportable as CSV. Requesters’ own actions are logged too.", "Audit log (Freshservice keeps 90 days; this keeps everything).", None),
 ("viewas", CH_FOUND, "View as", "Admins can look at the app as any role or person — the bottom bar switches, and every action taken that way is logged as “Nada (viewing as Ken)”.", "Not available in Freshservice.", None),
 ("portal", CH_PORTAL, "Portal home", "The requester side: three ways in (report an issue, request something, ask), what’s in progress, and “Good to know” with the live service status. Reached from the QI Hub launchpad.", "Support portal home.", "Try Report an issue, My requests, My devices or Guides."),
 ("portal-new", CH_PORTAL, "Report an issue", "Three fields and a promise (“first reply within 4 business hours”). As the person types, matching guides appear — many issues never become a ticket.", "Service catalogue item form (typically 8–12 fields).", "Back to the portal home."),
 ("portal-requests", CH_PORTAL, "My requests", "In progress and done, with who is handling each and the ticket reference.", "My tickets.", "Open the first request."),
 ("portal-request", CH_PORTAL, "Request conversation", "The thread, who is handling it, a paperclip to attach files, and — new — the requester can close it themselves: “This is fixed — close it”.", "Ticket conversation on the portal.", "Back to My requests."),
 ("portal-devices", CH_PORTAL, "My devices", "Requesters see the devices assigned to them, acknowledge a new one, and flag one as returned — which feeds the asset record.", "Not available to requesters in Freshservice.", None),
 ("portal-help", CH_PORTAL, "Guides", "Published Solutions articles, searchable, with “was this helpful”.", "Solutions on the portal.", None),
 ("admin", None, None, None, None, None),  # placeholder ignored
 ("login", CH_FOUND, "Sign-in", "In production sign-in is Entra ID single sign-on. The demo uses a persona picker so you can try each role without an account.", "Freshservice SSO.", None),
]
SCREENS = [s for s in SCREENS if s[1]]

def data_uri(sid):
    return "data:image/avif;base64," + base64.b64encode(open(f"{W}/avif/{sid}.avif", "rb").read()).decode()

QI = '<svg viewBox="0 0 114 114" width="28" height="28" aria-hidden="true">' + open(f"{W}/qi-paths.svg").read() + "</svg>"

chapters = {CH_AGENT: [], CH_PORTAL: [], CH_FOUND: []}
for s in SCREENS:
    chapters[s[1]].append(s)
SCREENS = [s for ch in chapters.values() for s in ch]

def e(x): return html.escape(x, quote=True)

# ---------- rail ----------
rail = ['<a class="item cover-link" href="#cover" data-go="cover"><span class="n">–</span><span>Start here</span></a>']
idx = 0
for ch, items in chapters.items():
    rail.append(f'<p class="chapter">{e(ch)}</p>')
    for s in items:
        idx += 1
        rail.append(f'<a class="item" href="#{s[0]}" data-go="{s[0]}"><span class="n">{idx:02d}</span><span>{e(s[2])}</span></a>')
rail_html = "\n".join(rail)

# ---------- screens ----------
order = ["cover"] + [s[0] for s in SCREENS] + ["next"]
screens_html = []
for i, s in enumerate(SCREENS, 1):
    sid, ch, title, what, repl, tryit = s
    m = meta[sid]
    hs = "".join(f'<button class="hs" data-go="{h["to"]}" style="left:{h["x"]}%;top:{h["y"]}%;width:{h["w"]}%;height:{h["h"]}%" title="Go to {e(next((t[2] for t in SCREENS if t[0]==h["to"]), h["to"]))}" aria-label="Go to {e(h["to"])}"></button>' for h in m["hs"])
    tryline = f'<div><p class="k">Try it</p><p>{e(tryit)}</p></div>' if tryit else '<div><p class="k">Try it</p><p>Use the arrows to move on.</p></div>'
    screens_html.append(f'''
<section class="screen" id="{sid}" data-title="{e(title)}" data-chapter="{e(ch)}" data-url="{e(m["url"])}" hidden>
  <figure class="frame">
    <div class="chrome" aria-hidden="true"><span></span><span></span><span></span><i>ticketfly.damien.asia{e(m["url"])}</i></div>
    <div class="stage"><img src="{data_uri(sid)}" alt="{e(title)} — screenshot of the Service Desk MVP" width="1440" height="900" loading="lazy" decoding="async">{hs}</div>
  </figure>
  <div class="notes">
    <div><p class="k">What you are looking at</p><p>{e(what)}</p></div>
    <div><p class="k">Replaces in Freshservice</p><p>{e(repl)}</p></div>
    {tryline}
  </div>
</section>''')

cover = '''
<section class="screen cover" id="cover" data-title="Service Desk" data-chapter="Start here" data-url="">
  <div class="hero">
    <p class="eyebrow">IT QI Group · MVP walkthrough · v0.6.1 · 27 August 2026</p>
    <h1>Service Desk, rebuilt in-house.</h1>
    <p class="lede">One tool for tickets, assets, onboarding and offboarding — the Freshservice structure people already know, with the complicated parts taken out, and the Smartsheet grids folded in.</p>
    <dl class="stats">
      <div><dt>Tickets in the database</dt><dd>374</dd></div>
      <div><dt>Freshservice references migrated</dt><dd>210</dd></div>
      <div><dt>Assets tracked</dt><dd>144</dd></div>
      <div><dt>People with grants &amp; devices</dt><dd>78</dd></div>
      <div><dt>Access grants costed</dt><dd>232</dd></div>
      <div><dt>Audit entries so far</dt><dd>503</dd></div>
    </dl>
    <div class="cols">
      <div><p class="k">What the MVP proves</p><ul>
        <li>All old Freshservice ticket references are back in our own database and searchable by number.</li>
        <li>Assets, installed software and people are one record — no 1,000-asset cap, requesters see their own devices.</li>
        <li>Onboarding and offboarding run end to end from a single HR request, with every grant recorded and reversed.</li>
        <li>Every write is in an audit log; every build is versioned and unit-tested.</li></ul></div>
      <div><p class="k">Deliberately not in this demo</p><ul>
        <li>Entra ID single sign-on (persona picker instead).</li>
        <li>Live Intune / Defender / Azure Monitor feeds (seeded signals).</li>
        <li>Email-to-ticket and the Freshservice API import (seeded history).</li>
        <li>Production hosting on Azure — this runs on a demo server.</li></ul></div>
      <div><p class="k">How to read this</p><ul>
        <li>Use <kbd>→</kbd> and <kbd>←</kbd> or the list on the left.</li>
        <li>Highlighted areas are clickable — they open the screen the real button opens. Press <kbd>H</kbd> to show them all.</li>
        <li>Names and tickets are seeded demo data.</li></ul></div>
    </div>
    <button class="start" data-go="dashboard">Start the tour</button>
  </div>
</section>'''

nextp = '''
<section class="screen cover" id="next" data-title="What happens next" data-chapter="Start here" data-url="" hidden>
  <div class="hero">
    <p class="eyebrow">After the walkthrough</p>
    <h1>What happens next.</h1>
    <div class="cols">
      <div><p class="k">To go live we need</p><ul>
        <li>An Entra ID app registration for sign-in.</li>
        <li>A Freshservice API key to import the full ticket history, attachments included.</li>
        <li>An Azure resource group — the deployment pipeline is already written.</li>
        <li>Intune and Defender read access for live device and security signals.</li></ul></div>
      <div><p class="k">What is already built</p><ul>
        <li>Tickets, board, problems, changes with approvals, releases, tasks.</li>
        <li>Asset inventory, software, contracts, purchase orders, relationships.</li>
        <li>Onboarding, offboarding, people records with grants and cost.</li>
        <li>Portal, knowledge base with live suggestions, service status, alerts.</li>
        <li>Workspaces, saved views, custom fields, automation rules, activity log, CSV exports.</li></ul></div>
      <div><p class="k">Cost</p><ul>
        <li>Freshservice today: about USD 100k a year.</li>
        <li>Target run cost on Azure: under USD 1,000 a month.</li>
        <li>No per-agent licences — every IT person can be an agent.</li></ul></div>
    </div>
    <button class="start" data-go="cover">Back to the start</button>
  </div>
</section>'''

CSS = r'''
:root{--ground:#f4f5f9;--surface:#fff;--surface-2:#eceef5;--ink:#141a2b;--ink-2:#49536b;--ink-3:#66708a;--line:#e2e5ee;--line-2:#cfd4e2;--navy:#283A6A;--navy-ink:#283A6A;--navy-soft:#e9edf8;--red:#EB2A31;--shadow:0 1px 2px rgba(20,26,43,.06),0 8px 24px rgba(20,26,43,.08)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--ground:#0e1220;--surface:#171c2c;--surface-2:#1f2537;--ink:#e9ecf4;--ink-2:#b5bccd;--ink-3:#8f98ad;--line:#262c3f;--line-2:#343b52;--navy:#6f86c9;--navy-ink:#a9b8e6;--navy-soft:#1e2640;--red:#ff6b62;--shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.35)}}
:root[data-theme="dark"]{--ground:#0e1220;--surface:#171c2c;--surface-2:#1f2537;--ink:#e9ecf4;--ink-2:#b5bccd;--ink-3:#8f98ad;--line:#262c3f;--line-2:#343b52;--navy:#6f86c9;--navy-ink:#a9b8e6;--navy-soft:#1e2640;--red:#ff6b62;--shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.35)}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:var(--ground);color:var(--ink);font-family:"Geist",-apple-system,"Segoe UI",system-ui,sans-serif;font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
kbd,.chrome i,.url{font-family:"Geist Mono",ui-monospace,SFMono-Regular,Menlo,monospace}
.app{display:grid;grid-template-columns:272px minmax(0,1fr);min-height:100dvh}
.rail{position:sticky;top:0;height:100dvh;overflow-y:auto;background:var(--surface);border-right:1px solid var(--line);padding:20px 14px 24px}
.brand{display:flex;align-items:center;gap:10px;padding:0 8px 18px;border-bottom:1px solid var(--line);margin-bottom:12px}
.brand b{display:block;font-weight:600;font-size:14px;letter-spacing:-.01em}
.brand small{display:block;color:var(--ink-3);font-size:11.5px}
.chapter{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin:16px 8px 6px;font-weight:600}
.item{display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:8px;color:var(--ink-2);text-decoration:none;font-size:13px}
.item .n{font-variant-numeric:tabular-nums;color:var(--ink-3);font-size:11.5px;width:20px}
.item:hover{background:var(--surface-2);color:var(--ink)}
.item.active{background:var(--navy-soft);color:var(--navy-ink);font-weight:500}
.item.active .n{color:var(--navy-ink)}
.item:focus-visible,.btn:focus-visible,.hs:focus-visible,.start:focus-visible{outline:2px solid var(--navy);outline-offset:2px}
.main{min-width:0;padding:20px 28px 40px}
.top{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.top h2{margin:0;font-size:20px;font-weight:600;letter-spacing:-.015em;text-wrap:balance}
.top .ch{color:var(--ink-3);font-size:12.5px}
.url{font-size:11.5px;color:var(--ink-3);background:var(--surface-2);padding:3px 8px;border-radius:6px}
.top .sp{flex:1}
.count{font-variant-numeric:tabular-nums;color:var(--ink-3);font-size:12.5px}
.btn{height:32px;padding:0 12px;border-radius:8px;border:1px solid var(--line-2);background:var(--surface);color:var(--ink);font:inherit;font-size:13px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.btn:hover{background:var(--surface-2)}
.btn[aria-pressed="true"]{background:var(--navy);border-color:var(--navy);color:#fff}
.btn:disabled{opacity:.4;cursor:default}
.frame{margin:0;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);overflow:hidden}
.chrome{display:flex;align-items:center;gap:6px;height:34px;padding:0 12px;border-bottom:1px solid var(--line);background:var(--surface-2)}
.chrome span{width:10px;height:10px;border-radius:50%;background:var(--line-2)}
.chrome i{font-style:normal;font-size:11.5px;color:var(--ink-3);margin-left:10px;background:var(--surface);border-radius:6px;padding:3px 10px;flex:1;max-width:520px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stage{position:relative;aspect-ratio:1440/900;background:var(--surface-2)}
.stage img{display:block;width:100%;height:100%;max-width:100%}
.hs{position:absolute;border:1.5px solid var(--navy);border-radius:6px;background:transparent;padding:0;cursor:pointer;opacity:0;transition:opacity .15s,background .15s}
.hs::after{content:"";position:absolute;top:-5px;right:-5px;width:10px;height:10px;border-radius:50%;background:var(--red);box-shadow:0 0 0 2px var(--surface)}
.stage:hover .hs,.show-hs .hs{opacity:.9}
.hs:hover{background:rgba(40,58,106,.10);opacity:1}
@media (prefers-reduced-motion:no-preference){.show-hs .hs::after{animation:pulse 1.6s ease-out infinite}@keyframes pulse{0%{box-shadow:0 0 0 2px var(--surface),0 0 0 0 rgba(235,42,49,.5)}100%{box-shadow:0 0 0 2px var(--surface),0 0 0 12px rgba(235,42,49,0)}}}
.notes{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:24px;padding:18px 4px 0;max-width:1240px}
.notes p{margin:0}
.k{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);font-weight:600;margin-bottom:4px!important}
.notes p:not(.k){color:var(--ink-2);font-size:13.5px;max-width:60ch}
.hero{max-width:980px;padding:36px 8px 20px}
.eyebrow{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);font-weight:600;margin:0 0 14px}
.hero h1{font-size:40px;line-height:1.08;letter-spacing:-.025em;font-weight:600;margin:0 0 14px;text-wrap:balance}
.lede{font-size:17px;color:var(--ink-2);max-width:62ch;margin:0 0 28px}
.stats{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin:0 0 30px}
.stats div{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:14px 14px 12px}
.stats dt{font-size:11.5px;color:var(--ink-3);order:2}
.stats dd{margin:0 0 2px;font-size:26px;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--navy-ink)}
.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-bottom:28px}
.cols ul{margin:0;padding-left:18px;color:var(--ink-2);font-size:13.5px}
.cols li{margin-bottom:6px}
kbd{font-size:11px;background:var(--surface-2);border:1px solid var(--line-2);border-bottom-width:2px;border-radius:5px;padding:1px 6px}
.start{height:40px;padding:0 18px;border-radius:9px;border:0;background:var(--navy);color:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.start:hover{filter:brightness(1.08)}
.menu{display:none}
@media (max-width:980px){.app{grid-template-columns:1fr}.rail{display:none}.main{padding:14px}.menu{display:block;margin-bottom:10px;width:100%;height:36px;border-radius:8px;border:1px solid var(--line-2);background:var(--surface);color:var(--ink);font:inherit}.notes,.cols{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}.hero h1{font-size:30px}.stage:hover .hs{opacity:.9}}
'''

JS = r'''
(function(){
  var order=%ORDER%;
  var screens={};order.forEach(function(id){screens[id]=document.getElementById(id)});
  var title=document.getElementById('t'),ch=document.getElementById('c'),url=document.getElementById('u'),count=document.getElementById('n');
  var prev=document.getElementById('prev'),next=document.getElementById('next-btn'),hsBtn=document.getElementById('hs'),sel=document.getElementById('menu');
  var cur='cover';
  function show(id,push){
    if(!screens[id])id='cover';
    order.forEach(function(k){screens[k].hidden=k!==id});
    cur=id;var s=screens[id];
    title.textContent=s.dataset.title;ch.textContent=s.dataset.chapter;
    url.textContent=s.dataset.url;url.hidden=!s.dataset.url;
    var i=order.indexOf(id);count.textContent=(i===0||i===order.length-1)?'':i+' / '+(order.length-2);
    prev.disabled=i===0;next.disabled=i===order.length-1;
    document.querySelectorAll('.item').forEach(function(a){a.classList.toggle('active',a.dataset.go===id)});
    if(sel)sel.value=id;
    if(push!==false){try{history.replaceState(null,'','#'+id)}catch(e){}}
    window.scrollTo({top:0});
  }
  document.addEventListener('click',function(ev){var t=ev.target.closest('[data-go]');if(!t)return;ev.preventDefault();show(t.dataset.go)});
  prev.addEventListener('click',function(){show(order[Math.max(0,order.indexOf(cur)-1)])});
  next.addEventListener('click',function(){show(order[Math.min(order.length-1,order.indexOf(cur)+1)])});
  function setHs(on){document.body.classList.toggle('show-hs',on);hsBtn.setAttribute('aria-pressed',on?'true':'false');try{localStorage.setItem('sd-hs',on?'1':'0')}catch(e){}}
  hsBtn.addEventListener('click',function(){setHs(!document.body.classList.contains('show-hs'))});
  var saved=null;try{saved=localStorage.getItem('sd-hs')}catch(e){}
  setHs(saved===null?true:saved==='1');
  if(sel)sel.addEventListener('change',function(){show(sel.value)});
  document.addEventListener('keydown',function(ev){
    if(ev.target.tagName==='SELECT')return;
    if(ev.key==='ArrowRight')next.click();else if(ev.key==='ArrowLeft')prev.click();else if(ev.key==='h'||ev.key==='H')hsBtn.click();
  });
  window.addEventListener('hashchange',function(){show(location.hash.slice(1)||'cover',false)});
  show(location.hash.slice(1)||'cover',false);
})();
'''

menu_opts = "".join(f'<option value="{s[0]}">{e(s[2])}</option>' for s in SCREENS)
body = f'''
<title>Service Desk Walkthrough</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap">
<style>{CSS}</style>
<div class="app">
  <nav class="rail" aria-label="Screens">
    <div class="brand">{QI}<div><b>Service Desk</b><small>MVP walkthrough · IT QI Group</small></div></div>
    {rail_html}
  </nav>
  <main class="main">
    <select id="menu" class="menu" aria-label="Go to screen"><option value="cover">Start here</option>{menu_opts}<option value="next">What happens next</option></select>
    <div class="top">
      <div><h2 id="t">Service Desk</h2><div class="ch" id="c">Start here</div></div>
      <span class="url" id="u" hidden></span>
      <span class="sp"></span>
      <span class="count" id="n"></span>
      <button class="btn" id="hs" aria-pressed="true" title="Show clickable areas (H)">Hotspots</button>
      <button class="btn" id="prev" aria-label="Previous screen">←</button>
      <button class="btn" id="next-btn" aria-label="Next screen">→</button>
    </div>
    {cover}
    {"".join(screens_html)}
    {nextp}
  </main>
</div>
<script>{JS.replace("%ORDER%", json.dumps(order))}</script>
'''
open(f"{W}/walkthrough-body.html", "w").write(body)
full = '<!doctype html>\n<html lang="en-GB">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="color-scheme" content="light dark">\n</head>\n<body>\n' + body + '\n</body>\n</html>\n'
out = os.path.expanduser("~/Desktop/Service-Desk-walkthrough.html")
open(out, "w").write(full)
print(out, round(os.path.getsize(out) / 1e6, 2), "MB")
