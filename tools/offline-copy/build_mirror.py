"""Bundle a crawled persona into one self-contained HTML file with an in-browser test sandbox.

usage: build_mirror.py <state-name> "<Display Name>" <role> <start-path> <out-file>
"""
import base64, gzip, json, os, re, sys, html as H, subprocess

name, person, role, start, out_name = sys.argv[1:6]
W = os.path.dirname(os.path.abspath(__file__))
st = json.load(open(f"{W}/state-{name}.json"))
CAPTURED = "27 Aug 2026"

# ---- assets referenced by <img>/<link rel=icon>
assets = {}
for src, a in (st.get("assets") or {}).items():
    if a and a.get("b"):
        assets[src] = f"data:{a['t'].split(';')[0]};base64,{a['b']}"

# ---- pages (repeated SVG icons and sidebars go into dictionaries; gzip's 32 KB window cannot dedupe them across pages)
SVG_RE = re.compile(r"<svg[^>]*>.*?</svg>", re.S)
ASIDE_RE = re.compile(r"<aside[^>]*>.*?</aside>", re.S)
svg_dict, aside_dict = {}, {}
pages, alias = {}, {}
for path, p in st["pages"].items():
    if not p.get("html") or p.get("status", 0) >= 400:
        continue
    h = p["html"]
    h = re.sub(r'<link[^>]+rel="stylesheet"[^>]*>', "", h)
    h = re.sub(r'<link[^>]+href="/_next/[^"]*"[^>]*>', "", h)
    h = re.sub(r'<link[^>]+rel="icon"[^>]*>', "", h)          # the shell carries the favicon; never per page
    for src, uri in assets.items():                            # real images only
        h = re.sub(r'(<img[^>]+src=")' + re.escape(H.escape(src, quote=True)) + '"', r'\1' + uri.replace("\\", "\\\\") + '"', h)
    h = SVG_RE.sub(lambda m: "\u2983" + str(svg_dict.setdefault(m.group(0), len(svg_dict))) + "\u2984", h)
    h = ASIDE_RE.sub(lambda m: "\u2985" + str(aside_dict.setdefault(m.group(0), len(aside_dict))) + "\u2986", h)
    pages[path] = [h, p.get("title") or "Service Desk"]
    if p.get("at") and p["at"] != path:
        alias[path] = p["at"]

# ---- fonts: url(../media/x.woff2) relative to the CSS file → embed from the live site
os.makedirs(f"{W}/fonts", exist_ok=True)
css = st["css"]
for m in sorted(set(re.findall(r'url\((?:\.\./|/_next/static/)media/([^)"\']+)\)', css))):
    fp = f"{W}/fonts/{m}"
    if not os.path.exists(fp):
        subprocess.run(["curl", "-sfA", "Mozilla/5.0", "-o", fp, f"https://ticketfly.damien.asia/_next/static/media/{m}"], check=True)
    uri = "data:font/woff2;base64," + base64.b64encode(open(fp, "rb").read()).decode()
    css = css.replace(f"url(../media/{m})", f"url({uri})").replace(f"url(/_next/static/media/{m})", f"url({uri})")

# ---- sandbox templates + next ticket number
def pick_ticket_template():
    best = None
    for k, (h, _) in pages.items():
        if not re.match(r"^/tickets/\d+$", k) or "Next: <!-- -->assign an agent" not in h:
            continue
        n = h.count('<li class="relative flex gap-4">')
        if best is None or n < best[1]:
            best = (k, n)
    return best[0] if best else next((k for k in pages if re.match(r"^/tickets/\d+$", k)), None)

tpl_ticket = pick_ticket_template()
tpl_portal = next((k for k in pages if re.match(r"^/portal/requests/\d+$", k)), None)
nums = [int(n) for h, _ in pages.values() for n in re.findall(r"(?:INC|SR)-(\d{6})", h)]
seq = (max(nums) if nums else 229190) + 1
print(f"templates: ticket={tpl_ticket} portal={tpl_portal} next#={seq}")

payload = json.dumps({"pages": pages, "alias": alias, "css": css, "svg": [k for k, _ in sorted(svg_dict.items(), key=lambda x: x[1])], "aside": [k for k, _ in sorted(aside_dict.items(), key=lambda x: x[1])], "tpl": {"ticket": tpl_ticket, "portal": tpl_portal}, "seq": seq}, ensure_ascii=False).encode("utf-8")
blob = base64.b64encode(gzip.compress(payload, 9)).decode()
favicon = assets.get(next((k for k in assets if k.startswith("/icon.svg")), ""), "")

# ---- script injected into every page (inside the iframe)
INJECT = r'''(function(){
  var C=window.__sd||{}; var KEY='sd-sbx-'+C.bundle;
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null')||{seq:C.seq,tickets:{},extra:{}}}catch(e){return {seq:C.seq,tickets:{},extra:{}}}}
  function save(S){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
  var S=load(); if(!S.seq)S.seq=C.seq;
  var T=null;function toast(m){if(!T){T=document.createElement('div');T.style.cssText='position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:2147483647;background:#141a2b;color:#fff;font:500 13px/1.4 Geist,system-ui,sans-serif;padding:10px 14px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:80vw;opacity:0;transition:opacity .15s;pointer-events:none';document.body.appendChild(T)}T.textContent=m;T.style.opacity='1';clearTimeout(T._t);T._t=setTimeout(function(){T.style.opacity='0'},2800)}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function initials(n){return n.split(/\s+/).filter(Boolean).slice(0,2).map(function(w){return w[0].toUpperCase()}).join('')}
  function nowLabel(d){d=d?new Date(d):new Date();return d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'})+', '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
  function rel(d){var m=Math.round((Date.now()-new Date(d).getTime())/60000);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' hours ago':Math.round(m/1440)+' days ago'}
  function setText(el,t){if(el)el.textContent=t}
  var path=C.path||'/', isPortal=C.role==='requester';
  var sbxId=(path.match(/^\/(?:tickets|portal\/requests)\/(sbx\d+)$/)||[])[1];
  var extraKey=sbxId?null:path.replace(/\?.*$/,'');

  // ---------- 1. new request forms (/portal/new/<slug>) ----------
  var slug=(path.match(/^\/portal\/new\/([^?]+)/)||[])[1];
  var form=slug&&document.querySelector('main form, form');
  if(form){
    form.setAttribute('data-sbx','');
    form.addEventListener('submit',function(ev){
      ev.preventDefault();ev.stopPropagation();
      var subject='',lines=[];
      form.querySelectorAll('input,textarea,select').forEach(function(f){
        if(!f.name||f.type==='hidden'||f.type==='file')return;
        var v=f.type==='checkbox'?(f.checked?'Yes':'No'):f.value;
        if(!v)return;
        var lab=(form.querySelector('label[for="'+f.id+'"]')||f.closest('label'))||null;
        var labEl=lab&&(lab.querySelector('span')||lab);
        var label=labEl?(labEl.firstChild&&labEl.firstChild.nodeType===3?labEl.firstChild.textContent:labEl.textContent).replace(/\*/g,'').trim():(f.placeholder||f.name);
        if(!subject&&(f.tagName==='TEXTAREA'||f.type==='text'||!f.type))subject=v.split('\n')[0].slice(0,90);
        lines.push(label+': '+v);
      });
      if(!subject){toast('Fill in the first field to send.');return}
      var kind=slug==='report-issue'?'INC':'SR', ref=kind+'-'+S.seq, id='sbx'+Date.now();
      var h1=document.querySelector('h1'); var service=h1?h1.textContent.trim():slug;
      S.tickets[id]={id:id,ref:ref,kind:kind,subject:subject,body:lines.join('\n'),service:service,status:'Open',createdAt:new Date().toISOString(),requester:C.person,msgs:[]};
      S.seq++;save(S);
      toast('Test entry '+ref+' created (offline, this browser only).');
      setTimeout(function(){parent.postMessage({go:isPortal?'/portal/requests/'+id:'/tickets/'+id},'*')},350);
    },true);
  }

  // ---------- 2. lists: prepend sandbox tickets ----------
  var list=Object.keys(S.tickets).map(function(k){return S.tickets[k]}).sort(function(a,b){return a.createdAt<b.createdAt?1:-1});
  if(list.length&&/^\/tickets(\?|$)/.test(path)){
    var row=document.querySelector('li.row a[href^="/tickets/"]');
    if(row){var ul=row.closest('ul');list.slice().reverse().forEach(function(t){
      var li=row.closest('li').cloneNode(true), a=li.querySelector('a');a.setAttribute('href','/tickets/'+t.id);
      var subj=a.querySelector('.font-medium.text-ink');setText(subj,t.subject);
      var m=a.querySelector('.font-mono');setText(m,'#'+t.ref);
      var st=m&&m.parentElement.querySelector('.font-medium');setText(st,'Test entry');
      var cells=a.querySelectorAll(':scope > span');var req=cells[2];if(req){setText(req.children[0],t.requester);setText(req.children[1],'Offline test')}
      var pr=cells[0];if(pr){pr.className='inline-flex items-center gap-1 text-ink-3';pr.title='Medium priority';pr.innerHTML='<span aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide size-3.5"><path d="M5 12h14"></path></svg></span><span class="sr-only">Medium priority</span>'}
      var pill=a.querySelector('.rounded-md.bg-surface-2');if(pill){pill.lastChild.textContent='Open';var dot=pill.querySelector('span');if(dot)dot.className='inline-block size-1.5 shrink-0 rounded-full bg-accent'}
      var sla=a.querySelector('.tnum.inline-flex');if(sla){sla.className='tnum inline-flex items-center gap-1 whitespace-nowrap rounded-md text-[12.5px] font-medium text-ok bg-ok-soft h-[22px] px-1.5';sla.textContent='4h left'}
      var av=a.querySelector('.flex.justify-center');if(av)av.innerHTML='<span class="inline-block rounded-full border border-dashed border-line-strong size-[22px]" title="Unassigned"></span>';
      var tm=a.querySelector('.text-right');if(tm){tm.textContent=rel(t.createdAt);tm.title='Created '+nowLabel(t.createdAt)}
      ul.insertBefore(li,ul.firstChild);
    })}
  }
  if(list.length&&/^\/portal\/requests(\?|$)/.test(path)){
    var pr=document.querySelector('main a[href^="/portal/requests/"]');
    if(pr){var pul=pr.closest('ul');list.slice().reverse().forEach(function(t){
      var li=pr.closest('li').cloneNode(true),a=li.querySelector('a');a.setAttribute('href','/portal/requests/'+t.id);
      var s=a.querySelectorAll('span.block');setText(s[0],t.subject);setText(s[1],'Open · '+t.ref+' · test entry');
      var tm=a.querySelector('span.text-\\[12px\\]');setText(tm,rel(t.createdAt));
      var dot=a.querySelector('span[aria-hidden]');if(dot)dot.className='inline-block size-2 shrink-0 rounded-full bg-accent';
      pul.insertBefore(li,pul.firstChild);
    })}
  }

  // ---------- 3. synthetic detail page for a sandbox ticket ----------
  var t=sbxId&&S.tickets[sbxId];
  if(sbxId&&!t){toast('This test entry no longer exists in this browser.')}
  var msgs=t?t.msgs:((S.extra[extraKey]||{}).msgs||[]);
  var ol=document.querySelector('ol.relative.space-y-5');
  var pmsgs=isPortal?Array.from(document.querySelectorAll('main .flex.gap-3')).filter(function(d){return d.querySelector('.rounded-2xl')}):[];
  var portalThread=pmsgs[0]||null, lastMsg=pmsgs[pmsgs.length-1]||null;
  function agentMsg(who,role,when,body,tpl){
    var li=tpl.cloneNode(true);
    var av=li.querySelector('span[aria-hidden]');setText(av,initials(who));
    var head=li.querySelector('.flex.items-baseline');
    if(head){setText(head.children[0],who);setText(head.children[1],role);var tm=head.querySelector('.ml-auto');if(tm){tm.textContent=rel(when);tm.title=nowLabel(when)}
      var bodyEl=head.nextElementSibling;if(bodyEl)bodyEl.innerHTML='<p>'+esc(body).replace(/\n/g,'<br>')+'</p>'}
    li.querySelectorAll('.bg-warn-soft,.bg-info-soft').forEach(function(x){x.classList.remove('bg-warn-soft','bg-info-soft')});
    return li;
  }
  function portalMsg(who,when,body,mine,tpl){
    var d=tpl.cloneNode(true);
    d.className='flex gap-3'+(mine?' flex-row-reverse':'');
    var av=d.querySelector('span');setText(av,initials(who));
    var box=d.children[1];if(box){box.className='max-w-[80%] rounded-2xl px-4 py-3 '+(mine?'rounded-tr-md bg-accent-soft':'rounded-tl-md bg-surface hairline');
      var p=box.querySelector('p');if(p){p.innerHTML='<span class="font-medium text-ink">'+esc(who)+'</span>'+(mine?'':'<span class="text-ink-3">IT</span>')+'<span class="text-ink-3">'+esc(rel(when))+'</span>';p.className='flex items-baseline gap-2 text-[12px]'}
      var body_=p&&p.nextElementSibling;if(body_)body_.innerHTML='<p>'+esc(body).replace(/\n/g,'<br>')+'</p>'}
    return d;
  }
  if(t){
    document.title=t.ref+' · '+t.subject;
    if(!isPortal&&ol){
      setText(document.querySelector('main span.font-mono, .font-mono'),t.ref);
      setText(document.querySelector('h1'),t.subject);
      document.querySelectorAll('span').forEach(function(s){if(/^Opened\s/.test(s.textContent))s.textContent='Opened '+nowLabel(t.createdAt)});
      var tpl=ol.querySelector('li');ol.innerHTML='';ol.appendChild(agentMsg(t.requester,'Requester · test entry',t.createdAt,t.body,tpl));
      var dep=document.querySelector('input[readonly], input[disabled]');if(dep&&/Department|Automation|Compliance/.test(dep.value))dep.value='Offline test';
      document.querySelectorAll('.bg-warn-soft.text-warn, .text-crit.bg-crit-soft').forEach(function(x){if(/over|Breached/.test(x.textContent)){x.className=x.className.replace('text-crit bg-crit-soft','text-ok bg-ok-soft').replace('bg-warn-soft text-warn','bg-ok-soft text-ok');x.textContent=x.textContent.replace(/Breached/,'On track').replace(/.*over$/,'4h left')}});
    }
    if(isPortal&&portalThread){
      var meta=document.querySelector('main p.font-mono');setText(meta,t.ref+' · raised '+nowLabel(t.createdAt));
      setText(document.querySelector('h1'),t.subject);
      var wrap=portalThread.parentElement, anchor=lastMsg.nextSibling, first=portalThread.cloneNode(true);
      pmsgs.forEach(function(x){x.remove()});
      lastMsg=portalMsg(t.requester,t.createdAt,t.body,true,first); wrap.insertBefore(lastMsg,anchor);
      var step=document.querySelector('main ol.grid');
      if(step)Array.from(step.children).forEach(function(li,i){if(i>0){li.querySelectorAll('.bg-accent').forEach(function(b){b.classList.remove('bg-accent');b.classList.add('bg-line')});var sub=li.querySelector('.text-ink-3');if(sub)sub.textContent=''}});
      var eb=Array.from(document.querySelectorAll('main .eyebrow')).find(function(x){return /handled by/i.test(x.textContent)});
      if(eb){var card=eb.closest('.panel, .rounded-xl, .rounded-2xl')||eb.parentElement.parentElement;var nm=card.querySelector('.font-medium');if(nm)nm.textContent='Service Desk team';var av2=card.querySelector('span[aria-hidden]');if(av2)av2.textContent='SD';card.querySelectorAll('.text-ink-3:not(.eyebrow)').forEach(function(x,i){x.textContent=i===0?'Waiting to be picked up':''});Array.from(card.querySelectorAll('span')).filter(function(x){return /^On it$|^Picked up$|^In progress$/.test(x.textContent.trim())}).forEach(function(x){x.textContent='Waiting'});}
      var note=document.querySelector('.bg-ok-soft');if(note&&/Sent\./.test(note.textContent))note.innerHTML='Test entry — exists only in this browser. Reference <span class="font-mono font-medium">'+esc(t.ref)+'</span>.';
    }
  }
  // persisted replies (sandbox tickets and real captured pages alike)
  if(msgs.length){
    if(!isPortal&&ol){var tplLi=ol.querySelector('li');msgs.forEach(function(m){ol.appendChild(agentMsg(m.who,m.role,m.at,m.body,tplLi))})}
    if(isPortal&&portalThread){msgs.forEach(function(m){var d=portalMsg(m.who,m.at,m.body,true,portalThread);lastMsg.after(d);lastMsg=d})}
  }

  // ---------- 4. composer: add a reply/note ----------
  var ta=document.querySelector('textarea[name="body"], textarea[name="message"], main textarea');
  var cform=ta&&ta.closest('form');
  if(cform&&(ol||portalThread)){
    cform.setAttribute('data-sbx','');
    cform.addEventListener('submit',function(ev){
      ev.preventDefault();ev.stopPropagation();
      var txt=ta.value.trim();if(!txt){toast('Write something first.');return}
      var internal=!!cform.querySelector('[aria-pressed="true"], input[name="internal"]:checked');
      var m={who:C.person,role:internal?'Internal note':C.roleLabel,at:new Date().toISOString(),body:txt};
      if(t){t.msgs.push(m)}else{S.extra[extraKey]=S.extra[extraKey]||{msgs:[],fields:{}};S.extra[extraKey].msgs.push(m)}
      save(S);
      if(!isPortal&&ol){var li=agentMsg(m.who,m.role,m.at,m.body,ol.querySelector('li'));ol.appendChild(li);li.scrollIntoView({block:'end'})}
      if(isPortal&&portalThread){var d=portalMsg(m.who,m.at,m.body,true,portalThread);lastMsg.after(d);lastMsg=d;d.scrollIntoView({block:'end'})}
      ta.value='';toast('Added (offline test — stays in this browser).');
    },true);
    cform.addEventListener('keydown',function(ev){if((ev.metaKey||ev.ctrlKey)&&ev.key==='Enter'){ev.preventDefault();cform.dispatchEvent(new Event('submit',{cancelable:true}))}});
  }

  // ---------- 5. property selects remember their value ----------
  var fields=t?(t.fields||{}):((S.extra[extraKey]||{}).fields||{});
  document.querySelectorAll('select').forEach(function(sel,idx){
    var key=sel.name||('sel'+idx);
    if(fields[key]!=null&&Array.from(sel.options).some(function(o){return o.value===fields[key]}))sel.value=fields[key];
    sel.addEventListener('change',function(){
      if(t){t.fields=t.fields||{};t.fields[key]=sel.value}else{S.extra[extraKey]=S.extra[extraKey]||{msgs:[],fields:{}};S.extra[extraKey].fields[key]=sel.value}
      save(S);toast('Saved (offline test — this browser only).');
    });
  });

  // ---------- generic: links navigate, everything else explains itself ----------
  document.addEventListener('click',function(ev){
    var a=ev.target.closest('a[href]');
    if(a){var h=a.getAttribute('href');if(h&&h.charAt(0)==='/'){ev.preventDefault();ev.stopPropagation();parent.postMessage({go:h},'*');return}
      if(h&&/^https?:/.test(h)){a.target='_blank';a.rel='noopener';return}
      ev.preventDefault();return}
    if(ev.target.closest('form[data-sbx]'))return;
    var b=ev.target.closest('button,[role=button],[role=menuitem],[role=tab],[role=switch],input[type=submit]');
    if(b){ev.preventDefault();ev.stopPropagation();toast('Offline copy — this action only works in the live Service Desk.')}
  },true);
  document.addEventListener('submit',function(ev){if(ev.target.closest('form[data-sbx]'))return;ev.preventDefault();toast('Offline copy — sending is disabled here.')},true);
  document.addEventListener('keydown',function(ev){if((ev.metaKey||ev.ctrlKey)&&ev.key==='k'){ev.preventDefault();toast('Search is not available in the offline copy.')}},true);
})();'''

role_label = {"admin": "Admin", "agent": "Agent", "requester": "Requester", "hr": "HR", "manager": "Manager"}[role]
shell = f'''<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Service Desk</title>
{f'<link rel="icon" href="{favicon}">' if favicon else ''}
<style>
html,body{{margin:0;height:100%;background:#f4f5f9;color:#141a2b;font-family:system-ui,sans-serif}}
iframe{{border:0;width:100%;height:100%;display:block;background:#f4f5f9}}
#boot{{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;font-size:14px;color:#66708a;background:#f4f5f9}}
#boot.hide{{display:none}}
#note{{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:9;background:#141a2b;color:#fff;font:500 13px/1.4 system-ui,sans-serif;padding:10px 14px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:80vw;opacity:0;transition:opacity .2s;pointer-events:none}}
#note.on{{opacity:1}}
@media (prefers-color-scheme:dark){{html,body,#boot,iframe{{background:#0e1220;color:#e9ecf4}}}}
</style>
</head>
<body>
<div id="boot">Opening Service Desk…</div>
<iframe id="app" title="Service Desk"></iframe>
<div id="note"></div>
<script type="text/plain" id="data">{blob}</script>
<script>
(async function(){{
  var CFG={json.dumps({"bundle": name, "person": person, "role": role, "roleLabel": role_label})}, START={json.dumps(start)}, INJECT={json.dumps(INJECT).replace('</', '<\\/')};
  var boot=document.getElementById('boot'), fr=document.getElementById('app'), note=document.getElementById('note');
  function say(m,ms){{note.textContent=m;note.classList.add('on');clearTimeout(say.t);say.t=setTimeout(function(){{note.classList.remove('on')}},ms||3000)}}
  if(!('DecompressionStream' in window)){{boot.textContent='This file needs a current browser (Edge, Chrome, Safari 16.4+ or Firefox 113+).';return}}
  var b64=document.getElementById('data').textContent.trim();
  var bin=atob(b64), bytes=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  var text=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  var D=JSON.parse(text), pendingCfg=null;
  fr.addEventListener('load',function(){{
    var w=fr.contentWindow; if(!w||!pendingCfg)return;
    try{{w.__sd=pendingCfg; w.eval(INJECT)}}catch(e){{console.error('sandbox',e)}}
  }});
  function find(p){{
    var s=p.match(/^\\/(tickets|portal\\/requests)\\/sbx\\d+$/);
    if(s)return s[1]==='tickets'?D.tpl.ticket:D.tpl.portal;
    if(D.pages[p])return p; if(D.alias[p]&&D.pages[D.alias[p]])return D.alias[p];
    var q=p.indexOf('?');if(q>0&&D.pages[p.slice(0,q)])return p.slice(0,q);
    return null;
  }}
  function render(p){{
    var k=find(p);
    if(!k){{say('That page is not included in this offline copy.');return false}}
    pendingCfg=Object.assign({{path:p,seq:D.seq}},CFG);
    var pg=D.pages[k];
    var html=pg[0].replace(/\u2985(\\d+)\u2986/g,function(m,i){{return D.aside[+i]}}).replace(/\u2983(\\d+)\u2984/g,function(m,i){{return D.svg[+i]}});
    fr.srcdoc=html.replace('<head>','<head><style>'+D.css+'</style>'); document.title=pg[1]||'Service Desk'; return true;
  }}
  function go(p,replace){{
    var h='#'+p; if(location.hash===h){{render(p);return}}
    if(replace){{history.replaceState(null,'',h);render(p)}}else location.hash=p;
  }}
  window.addEventListener('hashchange',function(){{render(location.hash.slice(1)||START)}});
  window.addEventListener('message',function(ev){{if(ev.data&&ev.data.go)go(ev.data.go)}});
  var first=location.hash.slice(1)||START;
  if(!render(first))go(START,true);
  boot.classList.add('hide');
  say('Offline copy of Service Desk as '+CFG.person+' ('+CFG.roleLabel+'), captured {CAPTURED}. You can create test requests and replies — they stay in this browser only.',7000);
}})();
</script>
</body>
</html>
'''
out = os.path.expanduser(f"~/Desktop/{out_name}")
open(out, "w", encoding="utf-8").write(shell)
print(out, round(os.path.getsize(out) / 1e6, 2), "MB", len(pages), "pages", len(alias), "aliases")
