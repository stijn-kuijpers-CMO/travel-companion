import { useState, useEffect, useRef, useCallback } from "react";

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "travel-app-v3";
async function loadData() {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
async function saveData(d) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {}
}
function uid() { return Math.random().toString(36).slice(2, 9); }

// ─── Constants ────────────────────────────────────────────────────────────────
const PARTS = [
  { key:"morning",           label:"Morning",             emoji:"🌅", time:"06:00–12:00" },
  { key:"afternoon",         label:"Afternoon",           emoji:"☀️",  time:"12:00–18:00" },
  { key:"evening",           label:"Evening",             emoji:"🌙", time:"18:00–23:00" },
  { key:"morning+afternoon", label:"Morning & Afternoon", emoji:"🌤️", time:"06:00–18:00" },
  { key:"afternoon+evening", label:"Afternoon & Evening", emoji:"🌆", time:"12:00–23:00" },
  { key:"allday",            label:"Full Day",            emoji:"📅", time:"All day" },
];
const PRIORITIES = [
  { key:"must",   label:"Must do",      color:"#B3261E", bg:"#F9DEDC" },
  { key:"should", label:"Should do",    color:"#7D5200", bg:"#FAEDC4" },
  { key:"nice",   label:"Nice to have", color:"#386A20", bg:"#C5EFBB" },
];
const PACKING_CATS = ["Documents","Clothing","Toiletries","Electronics","Activities","Other"];

// ─── Seed data ────────────────────────────────────────────────────────────────
const defaultData = {
  trips:[{
    id:"t1", name:"Côte de Nacre, Normandy", emoji:"🇫🇷",
    destination:"Normandy, France", startDate:"2026-04-23", endDate:"2026-04-27", coverColor:"#6D5B45",
    days:[
      { id:"d1", date:"2026-04-23", label:"Arrival", slots:[
        { part:"afternoon", activities:[{ id:"a1", title:"Check in L'Eclipse sur Nacre", done:true, priority:"must", duration:30, location:"Ver-sur-Mer" }]},
        { part:"evening",   activities:[{ id:"a2", title:"Seafood dinner at local brasserie", done:true, priority:"must", duration:90, location:"" }]},
      ]},
      { id:"d2", date:"2026-04-24", label:"D-Day Sites", slots:[
        { part:"morning",   activities:[{ id:"a3", title:"Omaha Beach & Memorial Museum", done:true, priority:"must", duration:120, location:"Colleville-sur-Mer" }]},
        { part:"afternoon", activities:[
          { id:"a4", title:"Pointe du Hoc", done:true, priority:"must", duration:60, location:"Cricqueville-en-Bessin" },
          { id:"a5", title:"Bayeux Tapestry", done:true, priority:"should", duration:90, location:"Bayeux" },
        ]},
      ]},
      { id:"d3", date:"2026-04-25", label:"Coast & Cheese", slots:[
        { part:"morning",   activities:[{ id:"a6", title:"Fossil hunting at Vaches Noires", done:false, priority:"must", duration:150, location:"Houlgate" }]},
        { part:"afternoon", activities:[{ id:"a7", title:"Fromagerie visit – Camembert tasting", done:false, priority:"nice", duration:60, location:"Vimoutiers" }]},
      ]},
    ],
    packing:[
      { id:"p1", item:"Passports", packed:true, category:"Documents" },
      { id:"p2", item:"Travel insurance", packed:true, category:"Documents" },
      { id:"p3", item:"Rain jackets", packed:true, category:"Clothing" },
      { id:"p4", item:"Disney Lorcana decks", packed:false, category:"Activities" },
    ],
    notes:[
      { id:"n1", title:"Memories", body:"The fossil hunting was the highlight for the kids.", createdAt:"2026-04-27" },
      { id:"n2", title:"Restaurant tips", body:"La Sapinière in Courseulles — great mussels. Book ahead.", createdAt:"2026-04-27" },
    ],
    expenses:[{ id:"e1", label:"Accommodation", amount:680 },{ id:"e2", label:"Museum tickets", amount:54 }],
    budget:{ total:1800, currency:"EUR" },
  },{
    id:"t2", name:"Pairi Daiza with the kids", emoji:"🦁",
    destination:"Brugelette, Belgium", startDate:"2026-07-12", endDate:"2026-07-13", coverColor:"#2E6B3E",
    days:[], packing:[{ id:"p5", item:"Camera", packed:false, category:"Electronics" }],
    notes:[], expenses:[], budget:{ total:400, currency:"EUR" },
  }],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate  = s => s ? new Date(s+"T12:00:00").toLocaleDateString("nl-NL",{day:"numeric",month:"short"}) : "";
const fmtDateL = s => s ? new Date(s+"T12:00:00").toLocaleDateString("nl-NL",{day:"numeric",month:"short",year:"numeric"}) : "";
const tripDur  = (a,b) => { const d=Math.round((new Date(b)-new Date(a))/86400000)+1; return `${d}d`; };
const getStatus= (s,e) => { const n=new Date(); return n<new Date(s+"T00:00:00")?"upcoming":n>new Date(e+"T23:59:59")?"past":"active"; };
const getPart  = k => PARTS.find(p=>p.key===k)||PARTS[0];
const getPri   = k => PRIORITIES.find(p=>p.key===k)||PRIORITIES[2];
const fmtDur   = m => !m?null:m<60?`${m}m`:`${Math.floor(m/60)}h${m%60?` ${m%60}m`:""}`;

// ─── Ripple ───────────────────────────────────────────────────────────────────
function Ripple({ children, onClick, style={}, className="", disabled=false }) {
  const ref = useRef();

  function handleClick(e) {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;
    const r = document.createElement("span");
    r.style.cssText = `position:absolute;border-radius:50%;background:rgba(42,34,24,.12);width:${size}px;height:${size}px;left:${x-size/2}px;top:${y-size/2}px;transform:scale(0);animation:rippleAnim .5s ease-out forwards;pointer-events:none;`;
    el.appendChild(r);
    setTimeout(()=>r.remove(), 600);
    if (onClick) onClick(e);
  }

  return (
    <div ref={ref} className={className}
      style={{ position:"relative", overflow:"hidden", cursor:disabled?"default":"pointer",
               WebkitTapHighlightColor:"transparent", touchAction:"manipulation", ...style }}
      onClick={handleClick}>
      {children}
    </div>
  );
}

// ─── Snackbar ─────────────────────────────────────────────────────────────────
function Snackbar({ message, onUndo, onDismiss }) {
  useEffect(()=>{ const t=setTimeout(onDismiss, 3500); return ()=>clearTimeout(t); },[]);
  return (
    <div style={{ position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)", zIndex:999,
      background:"#2A2218", color:"#F5F0E8", borderRadius:8, padding:"12px 16px",
      display:"flex", alignItems:"center", gap:16, fontSize:14, fontFamily:"'Google Sans',Roboto,sans-serif",
      boxShadow:"0 4px 20px rgba(0,0,0,.35)", minWidth:240, maxWidth:"90vw",
      animation:"snackIn .25s ease" }}>
      <span style={{ flex:1 }}>{message}</span>
      {onUndo && <button onClick={onUndo} style={{ background:"none", border:"none", color:"#8B6F4E", fontWeight:600, fontSize:14, cursor:"pointer", fontFamily:"inherit", padding:0, letterSpacing:".04em" }}>UNDO</button>}
    </div>
  );
}

// ─── Icons (Material-style) ───────────────────────────────────────────────────
const Icon = ({ name, size=24 }) => {
  const p = { width:size, height:size, fill:"none", stroke:"currentColor", strokeWidth:1.7, strokeLinecap:"round", strokeLinejoin:"round" };
  const icons = {
    back:     <svg {...p} viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>,
    plus:     <svg {...p} strokeWidth={2.2} viewBox="0 0 24 24"><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/></svg>,
    check:    <svg {...p} strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
    search:   <svg {...p} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    calendar: <svg {...p} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    bag:      <svg {...p} viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
    wallet:   <svg {...p} viewBox="0 0 24 24"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12h.01"/></svg>,
    note:     <svg {...p} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    trash:    <svg {...p} viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
    edit:     <svg {...p} viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    move:     <svg {...p} viewBox="0 0 24 24"><polyline points="5 9 2 12 5 15"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/></svg>,
    dots:     <svg {...p} viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>,
    chevron:  <svg {...p} viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>,
    globe:    <svg {...p} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
    pin:      <svg {...p} viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    clock:    <svg {...p} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    plane:    <svg {...p} viewBox="0 0 24 24"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19.5 2.5c-1.5-1.5-3.5-1.5-5 0L11 6 2.8 4.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 5.8 6.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"/></svg>,
    filter:   <svg {...p} viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
    down:     <svg {...p} viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>,
    close:    <svg {...p} strokeWidth={2} viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  };
  return icons[name]||null;
};

// ─── Global Styles ────────────────────────────────────────────────────────────
const G = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Google+Sans:wght@400;500;700&display=swap');

    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
    html { -webkit-text-size-adjust:100%; text-size-adjust:100%; }

    body, #root {
      font-family: 'Google Sans', Roboto, 'Noto Sans', sans-serif;
      background: #FFFBF7;
      color: #1C1B1F;
      min-height: 100dvh;
      overscroll-behavior: none;
    }

    .app-shell {
      max-width: 430px;
      margin: 0 auto;
      min-height: 100dvh;
      background: #FFFBF7;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .serif { font-family: 'Cormorant Garamond', serif; }

    /* Ripple keyframe */
    @keyframes rippleAnim { to { transform:scale(1); opacity:0; } }
    @keyframes snackIn { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
    @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
    @keyframes slideRight { from { opacity:0; transform:translateX(28px); } to { opacity:1; transform:none; } }
    @keyframes sheetUp { from { transform:translateY(100%); } to { transform:none; } }
    @keyframes backdropIn { from { opacity:0; } to { opacity:1; } }

    .fade-up { animation: fadeUp .3s cubic-bezier(.2,0,0,1) both; }
    .slide-right { animation: slideRight .28s cubic-bezier(.2,0,0,1) both; }

    /* ── Material 3 Top App Bar ── */
    .top-bar {
      display: flex; align-items: center;
      height: 64px; padding: 0 4px 0 4px;
      background: #FFFBF7;
      position: sticky; top: 0; z-index: 10;
      flex-shrink: 0;
    }
    .top-bar-title {
      flex: 1; font-size: 22px; font-weight: 400;
      color: #1C1B1F; padding: 0 4px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .icon-btn {
      width: 48px; height: 48px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: none; border: none; cursor: pointer;
      color: #49454F; position: relative; overflow: hidden;
      flex-shrink: 0; transition: background .15s;
    }
    .icon-btn:active { background: rgba(28,27,31,.12); }

    /* ── Scrollable content ── */
    .screen-scroll { flex:1; overflow-y:auto; overscroll-behavior:contain; }

    /* ── Material 3 Card (elevation 1 — filled tonal) ── */
    .m3-card {
      background: #F4EFE6;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,.10), 0 1px 2px rgba(0,0,0,.06);
    }
    .m3-card-outlined {
      background: #FFFBF7;
      border: 1px solid #CAC4D0;
      border-radius: 16px; overflow: hidden;
    }

    /* ── Inputs — 16px to suppress Android zoom ── */
    .m3-input {
      width: 100%; background: #ECE6F0;
      border: none; border-radius: 12px 12px 0 0;
      border-bottom: 2px solid #79747E;
      padding: 20px 16px 8px; font-size: 16px;
      font-family: inherit; color: #1C1B1F; outline: none;
      transition: border-color .2s;
    }
    .m3-input:focus { border-bottom-color: #6D5B45; }
    .m3-input::placeholder { color: #79747E; font-size: 14px; }
    textarea.m3-input { resize: vertical; min-height: 100px; line-height: 1.6; }
    select.m3-input { -webkit-appearance: none; appearance: none; cursor: pointer; }

    /* ── List rows — 56px min (Material 3 spec) ── */
    .list-row {
      display: flex; align-items: center; gap: 16px;
      min-height: 56px; padding: 10px 16px;
      position: relative; overflow: hidden;
      cursor: pointer;
    }
    .list-row + .list-row { border-top: 1px solid #EDE8E4; }

    /* ── Bottom navigation (Material 3) ── */
    .bottom-nav {
      display: flex;
      background: #F4EFE6;
      padding-bottom: env(safe-area-inset-bottom, 0px);
      flex-shrink: 0;
      border-top: 1px solid #E6DFDA;
    }
    .nav-item {
      width: 100%; display: flex; flex-direction: column;
      align-items: center; padding: 12px 0 14px;
      border: none; background: none; cursor: pointer;
      color: #49454F; font-family: inherit; font-size: 12px;
      font-weight: 500; letter-spacing: .04em;
      gap: 4px; position: relative; overflow: hidden;
      transition: color .15s;
    }
    .nav-item.active { color: #3C2E1E; }
    /* Pill indicator behind icon */
    .nav-pill {
      position: absolute; top: 8px;
      left: 50%; transform: translateX(-50%);
      width: 64px; height: 32px; border-radius: 16px;
      background: #D8C7B3;
      transition: opacity .2s, transform .2s;
    }
    .nav-item:not(.active) .nav-pill { opacity: 0; transform: translateX(-50%) scaleX(.6); }

    /* ── Extended FAB (Material 3) ── */
    .fab {
      position: fixed; right: 20px;
      background: #6D5B45; color: #FFF8F4;
      border: none; border-radius: 16px;
      padding: 0 20px; height: 56px;
      display: flex; align-items: center; gap: 10px;
      font-family: inherit; font-size: 15px; font-weight: 500;
      letter-spacing: .01em;
      box-shadow: 0 3px 10px rgba(109,91,69,.45);
      cursor: pointer; z-index: 20;
      transition: box-shadow .2s, transform .1s;
      overflow: hidden; position: relative;
    }
    .fab:active { box-shadow: 0 1px 4px rgba(109,91,69,.3); transform: scale(.97); }

    /* ── Bottom sheet ── */
    .sheet-backdrop {
      position: fixed; inset: 0;
      background: rgba(28,27,31,.5);
      z-index: 100; animation: backdropIn .22s ease;
    }
    .sheet {
      position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
      width: 100%; max-width: 430px;
      background: #F4EFE6; border-radius: 28px 28px 0 0;
      padding: 0 0 max(24px, env(safe-area-inset-bottom, 24px));
      z-index: 101; animation: sheetUp .28s cubic-bezier(.2,0,0,1);
      max-height: 90dvh; overflow-y: auto;
    }
    .sheet-handle {
      width: 32px; height: 4px; border-radius: 2px;
      background: #AEA9AF; margin: 12px auto 16px;
    }
    .sheet-title {
      font-size: 24px; font-weight: 400; color: #1C1B1F;
      padding: 0 24px 16px; font-family: 'Cormorant Garamond', serif;
    }

    /* ── Action sheet items ── */
    .action-item {
      display: flex; align-items: center; gap: 16px;
      min-height: 56px; padding: 0 24px;
      background: none; border: none; width: 100%;
      text-align: left; font-family: inherit; font-size: 16px;
      color: #1C1B1F; cursor: pointer;
      position: relative; overflow: hidden;
    }
    .action-item:active { background: rgba(28,27,31,.08); }
    .action-item.danger { color: #B3261E; }

    /* ── Filter chips (Material 3) ── */
    .chip {
      display: inline-flex; align-items: center; gap: 6px;
      height: 32px; padding: 0 14px;
      border: 1.5px solid #79747E; border-radius: 8px;
      background: transparent; color: #1C1B1F;
      font-family: inherit; font-size: 14px; font-weight: 500;
      cursor: pointer; white-space: nowrap;
      transition: background .15s, border-color .15s, color .15s;
      position: relative; overflow: hidden;
    }
    .chip.active {
      background: #D8C7B3; border-color: #D8C7B3; color: #1C1B1F;
    }
    .chip:active { background: rgba(109,91,69,.12); }

    /* ── Badges ── */
    .badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:8px; font-size:12px; font-weight:500; letter-spacing:.02em; }
    .badge-upcoming { background:#C5EFBB; color:#1A4D0E; }
    .badge-active   { background:#FAEDC4; color:#5C3D00; }
    .badge-past     { background:#E6DFDA; color:#5D5660; }

    /* ── Priority chips ── */
    .pri-chip { display:inline-block; padding:2px 10px; border-radius:8px; font-size:12px; font-weight:500; }

    /* ── Progress bar ── */
    .progress-track { height:4px; background:#CAC4D0; border-radius:2px; overflow:hidden; }
    .progress-fill  { height:100%; border-radius:2px; transition:width .4s ease; }

    /* ── Section label ── */
    .section-label { font-size:12px; font-weight:500; letter-spacing:.06em; text-transform:uppercase; color:#6B5E52; padding:20px 20px 8px; display:block; }

    /* ── Checkbox (Material 3) ── */
    .m3-check {
      width:24px; height:24px; border-radius:6px; flex-shrink:0;
      border:2px solid #79747E; display:flex; align-items:center; justify-content:center;
      transition:all .18s; background:transparent;
    }
    .m3-check.on { background:#6D5B45; border-color:#6D5B45; }

    /* ── Search bar ── */
    .search-bar {
      display:flex; align-items:center; gap:12px;
      background:#ECE6F0; border-radius:28px;
      padding:0 20px; height:52px;
      font-family:inherit; font-size:16px; color:#1C1B1F;
    }
    .search-bar input {
      flex:1; background:none; border:none; outline:none;
      font-family:inherit; font-size:16px; color:#1C1B1F;
    }
    .search-bar input::placeholder { color:#79747E; }

    /* ── Day jump strip ── */
    .day-strip { display:flex; gap:8px; padding:0 20px 16px; overflow-x:auto; -webkit-overflow-scrolling:touch; }
    .day-pill {
      display:flex; flex-direction:column; align-items:center;
      min-width:48px; padding:8px 12px; border-radius:12px;
      border:none; background:#ECE6F0; cursor:pointer;
      flex-shrink:0; font-family:inherit;
      transition:background .15s;
    }
    .day-pill.active { background:#6D5B45; }
    .day-pill-num { font-size:16px; font-weight:500; color:#1C1B1F; }
    .day-pill.active .day-pill-num { color:#FFF8F4; }
    .day-pill-label { font-size:11px; color:#6B5E52; margin-top:2px; max-width:52px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .day-pill.active .day-pill-label { color:#E8DDD4; }

    /* ── Home hero ── */
    .hero {
      background: linear-gradient(160deg, #3C2E1E 0%, #6D5B45 100%);
      padding: 20px 20px 28px; color: #FFF8F4;
    }
    .hero-title { font-family:'Cormorant Garamond',serif; font-size:42px; font-weight:300; line-height:1.05; margin-top:8px; }

    /* ── Past trips accordion ── */
    .accordion-toggle {
      display:flex; align-items:center; gap:8px;
      padding:14px 20px; background:none; border:none;
      width:100%; text-align:left; cursor:pointer;
      font-family:inherit; font-size:14px; font-weight:500;
      color:#6B5E52; position:relative; overflow:hidden;
    }
  `}</style>
);

// ─── HOME SCREEN ─────────────────────────────────────────────────────────────
function HomeScreen({ data, onSelectTrip, onAddTrip }) {
  const [query,        setQuery]        = useState("");
  const [showPast,     setShowPast]     = useState(false);
  const [snack,        setSnack]        = useState(null);
  const fabRef = useRef();

  const upcoming = data.trips.filter(t => getStatus(t.startDate, t.endDate) !== "past");
  const past     = data.trips.filter(t => getStatus(t.startDate, t.endDate) === "past");
  const q = query.toLowerCase();
  const filteredUpcoming = upcoming.filter(t => !q || t.name.toLowerCase().includes(q) || t.destination?.toLowerCase().includes(q));
  const filteredPast     = past.filter(t => !q || t.name.toLowerCase().includes(q) || t.destination?.toLowerCase().includes(q));

  // FAB bottom — stays above nav bar. In this artifact we don't have a persistent bottom nav on home,
  // so place it above bottom edge.
  const fabBottom = `calc(env(safe-area-inset-bottom, 0px) + 24px)`;

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div className="screen-scroll fade-up">
        {/* Hero */}
        <div className="hero">
          <p style={{ fontSize:12, letterSpacing:".12em", textTransform:"uppercase", color:"#C4B49A" }}>Your journeys</p>
          <h1 className="hero-title">Travel<br/>Companion</h1>
          <div style={{ display:"flex", gap:32, marginTop:20 }}>
            {[["Trips", data.trips.length],["Upcoming", upcoming.length]].map(([l,v])=>(
              <div key={l}>
                <p style={{ fontSize:28, fontWeight:300 }}>{v}</p>
                <p style={{ fontSize:11, letterSpacing:".1em", textTransform:"uppercase", color:"#C4B49A" }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <div style={{ padding:"16px 20px 4px" }}>
          <div className="search-bar">
            <Icon name="search" size={20}/>
            <input
              placeholder="Search trips…"
              value={query}
              onChange={e=>setQuery(e.target.value)}
            />
            {query && (
              <button className="icon-btn" style={{ width:32, height:32 }} onClick={()=>setQuery("")}>
                <Icon name="close" size={18}/>
              </button>
            )}
          </div>
        </div>

        {/* Upcoming */}
        {filteredUpcoming.length > 0 && (
          <>
            <span className="section-label">Upcoming & Active</span>
            <div style={{ padding:"0 20px", display:"flex", flexDirection:"column", gap:12 }}>
              {filteredUpcoming.map(t=><TripCard key={t.id} trip={t} onClick={()=>onSelectTrip(t.id)}/>)}
            </div>
          </>
        )}

        {/* Past trips — accordion */}
        {filteredPast.length > 0 && (
          <div style={{ marginTop:8 }}>
            <Ripple onClick={()=>setShowPast(v=>!v)}>
              <button className="accordion-toggle">
                <span style={{ flex:1 }}>Past trips ({filteredPast.length})</span>
                <div style={{ transform:showPast?"rotate(180deg)":"none", transition:"transform .2s", color:"#6B5E52" }}>
                  <Icon name="chevron" size={20}/>
                </div>
              </button>
            </Ripple>
            {showPast && (
              <div style={{ padding:"0 20px", display:"flex", flexDirection:"column", gap:12, paddingBottom:12 }}>
                {filteredPast.map(t=><TripCard key={t.id} trip={t} onClick={()=>onSelectTrip(t.id)}/>)}
              </div>
            )}
          </div>
        )}

        {data.trips.length === 0 && (
          <div style={{ padding:"60px 20px", textAlign:"center", color:"#6B5E52" }}>
            <Icon name="globe" size={48}/>
            <p className="serif" style={{ fontSize:26, marginTop:16, fontWeight:300 }}>No trips yet</p>
            <p style={{ fontSize:15, marginTop:8, lineHeight:1.6 }}>Tap + to plan your first adventure</p>
          </div>
        )}

        {/* Spacer for FAB */}
        <div style={{ height:96 }}/>
      </div>

      {/* Extended FAB — bottom right */}
      <div style={{ position:"absolute", bottom:fabBottom, right:20, zIndex:20 }}>
        <Ripple onClick={onAddTrip} style={{ borderRadius:16 }}>
          <div className="fab" style={{ position:"relative" }}>
            <Icon name="plus" size={22}/>
            <span>New trip</span>
          </div>
        </Ripple>
      </div>

      {snack && <Snackbar message={snack.msg} onUndo={snack.undo} onDismiss={()=>setSnack(null)}/>}
    </div>
  );
}

function TripCard({ trip, onClick }) {
  const status = getStatus(trip.startDate, trip.endDate);
  const packing = trip.packing||[];
  const packed  = packing.filter(p=>p.packed).length;
  const pct     = packing.length>0?(packed/packing.length)*100:0;
  return (
    <Ripple onClick={onClick} style={{ borderRadius:16 }}>
      <div className="m3-card">
        <div style={{ height:6, background:trip.coverColor||"#6D5B45", borderRadius:"16px 16px 0 0" }}/>
        <div style={{ padding:"16px 18px 18px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
            <div style={{ flex:1, marginRight:10 }}>
              <span style={{ fontSize:24 }}>{trip.emoji}</span>
              <p className="serif" style={{ fontSize:22, fontWeight:400, lineHeight:1.2, marginTop:4 }}>{trip.name}</p>
              <p style={{ fontSize:13, color:"#6B5E52", marginTop:4 }}>{fmtDateL(trip.startDate)} – {fmtDateL(trip.endDate)} · {tripDur(trip.startDate,trip.endDate)}</p>
            </div>
            <span className={`badge badge-${status}`}>{status}</span>
          </div>
          {packing.length>0&&(
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:12, color:"#6B5E52" }}>Packing</span>
                <span style={{ fontSize:12, color:"#6B5E52" }}>{packed}/{packing.length}</span>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{ width:`${pct}%`, background:trip.coverColor||"#6D5B45" }}/></div>
            </div>
          )}
        </div>
      </div>
    </Ripple>
  );
}

// ─── TRIP DETAIL ──────────────────────────────────────────────────────────────
function TripDetail({ trip, onBack, onUpdate }) {
  const [tab, setTab] = useState("itinerary");
  const tabs = [
    { key:"itinerary", label:"Days",    icon:"calendar" },
    { key:"packing",   label:"Packing", icon:"bag" },
    { key:"budget",    label:"Budget",  icon:"wallet" },
    { key:"notes",     label:"Notes",   icon:"note" },
  ];
  return (
    <div className="slide-right" style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Top App Bar */}
      <div className="top-bar" style={{ borderBottom:"1px solid #E6DFDA" }}>
        <Ripple onClick={onBack} style={{ borderRadius:"50%", width:48, height:48 }}>
          <button className="icon-btn"><Icon name="back" size={24}/></button>
        </Ripple>
        <div style={{ flex:1, display:"flex", alignItems:"center", gap:10, padding:"0 4px", overflow:"hidden" }}>
          <span style={{ fontSize:22 }}>{trip.emoji}</span>
          <div style={{ overflow:"hidden" }}>
            <p className="top-bar-title" style={{ fontSize:18, lineHeight:1.2 }}>{trip.name}</p>
            <p style={{ fontSize:12, color:"#6B5E52" }}>{fmtDateL(trip.startDate)} – {fmtDateL(trip.endDate)}</p>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex:1, overflowY:"auto", overscrollBehavior:"contain" }}>
        {tab==="itinerary" && <ItineraryTab trip={trip} onUpdate={onUpdate}/>}
        {tab==="packing"   && <PackingTab   trip={trip} onUpdate={onUpdate}/>}
        {tab==="budget"    && <BudgetTab    trip={trip} onUpdate={onUpdate}/>}
        {tab==="notes"     && <NotesTab     trip={trip} onUpdate={onUpdate}/>}
      </div>

      {/* Material 3 bottom nav */}
      <div className="bottom-nav">
        {tabs.map(t=>(
          <Ripple key={t.key} onClick={()=>setTab(t.key)} style={{ flex:1, borderRadius:0 }}>
            <button className={`nav-item ${tab===t.key?"active":""}`}>
              <div className="nav-pill"/>
              <span style={{ position:"relative", zIndex:1 }}><Icon name={t.icon} size={22}/></span>
              <span style={{ position:"relative", zIndex:1, fontSize:12 }}>{t.label}</span>
            </button>
          </Ripple>
        ))}
      </div>
    </div>
  );
}

// ─── ITINERARY TAB ────────────────────────────────────────────────────────────
const BLANK_ACT = { title:"", priority:"should", duration:60, location:"" };

function ItineraryTab({ trip, onUpdate }) {
  const [activeDay,   setActiveDay]   = useState(0);
  const [showAddDay,  setShowAddDay]  = useState(false);
  const [editAct,     setEditAct]     = useState(null);
  const [actionSheet, setActionSheet] = useState(null);
  const [moveModal,   setMoveModal]   = useState(null);
  const [snack,       setSnack]       = useState(null);
  const [newDay,      setNewDay]      = useState({date:"",label:"",parts:["morning"]});
  const dayRefs = useRef({});

  const days = trip.days||[];
  const allSlots = days.flatMap(d=>(d.slots||[]).map(s=>({dayId:d.id,dayLabel:d.label,date:d.date,part:s.part})));

  function updateDays(days) { onUpdate({...trip,days}); }

  function scrollToDay(i) {
    setActiveDay(i);
    dayRefs.current[i]?.scrollIntoView({behavior:"smooth", block:"start"});
  }

  function toggleAct(dayId,part,actId) {
    updateDays(days.map(d=>d.id!==dayId?d:{...d,slots:(d.slots||[]).map(s=>s.part!==part?s:{...s,activities:s.activities.map(a=>a.id===actId?{...a,done:!a.done}:a)})}));
  }

  function saveAct(dayId,slotPart,activity) {
    const isEdit=!!activity.id;
    updateDays(days.map(d=>{
      if(d.id!==dayId)return d;
      let slots=d.slots||[];
      if(!slots.find(s=>s.part===slotPart))slots=[...slots,{part:slotPart,activities:[]}];
      return{...d,slots:slots.map(s=>s.part!==slotPart?s:{...s,activities:isEdit?s.activities.map(a=>a.id===activity.id?activity:a):[...s.activities,{...activity,id:uid(),done:false}]})};
    }));
    setEditAct(null);
  }

  function deleteAct(dayId,part,actId) {
    // Save for undo
    const saved = days;
    updateDays(days.map(d=>d.id!==dayId?d:{...d,slots:(d.slots||[]).map(s=>s.part!==part?s:{...s,activities:s.activities.filter(a=>a.id!==actId)})}));
    setSnack({ msg:"Activity deleted", undo:()=>{ updateDays(saved); setSnack(null); } });
  }

  function moveAct(fromDayId,fromPart,actId,toDayId,toPart) {
    let moved;
    const updated=days.map(d=>{
      if(d.id!==fromDayId)return d;
      return{...d,slots:(d.slots||[]).map(s=>{if(s.part!==fromPart)return s;moved=s.activities.find(a=>a.id===actId);return{...s,activities:s.activities.filter(a=>a.id!==actId)};})};
    }).map(d=>{
      if(d.id!==toDayId)return d;
      let slots=d.slots||[];
      if(!slots.find(s=>s.part===toPart))slots=[...slots,{part:toPart,activities:[]}];
      return{...d,slots:slots.map(s=>s.part!==toPart?s:{...s,activities:[...s.activities,moved]})};
    });
    updateDays(updated); setMoveModal(null);
  }

  function addDay() {
    if(!newDay.date||!newDay.parts.length)return;
    const sorted=["morning","afternoon","evening"].filter(p=>newDay.parts.includes(p));
    const label=newDay.label||sorted.map(p=>getPart(p).label).join(" & ");
    updateDays([...days,{id:uid(),date:newDay.date,label,slots:sorted.map(p=>({part:p,activities:[]}))}].sort((a,b)=>a.date.localeCompare(b.date)));
    setNewDay({date:"",label:"",parts:["morning"]}); setShowAddDay(false);
  }

  const baseParts=PARTS.filter(p=>["morning","afternoon","evening"].includes(p.key));

  return (
    <div style={{ paddingBottom:24 }}>
      {/* Day jump strip */}
      {days.length>0 && (
        <div style={{ padding:"12px 20px 0" }}>
          <div className="day-strip" style={{ padding:"0 0 12px" }}>
            {days.map((d,i)=>{
              const allActs=(d.slots||[]).flatMap(s=>s.activities||[]);
              const done=allActs.filter(a=>a.done).length;
              return (
                <Ripple key={d.id} onClick={()=>scrollToDay(i)} style={{ borderRadius:12 }}>
                  <div className={`day-pill ${activeDay===i?"active":""}`}>
                    <span className="day-pill-num">D{i+1}</span>
                    <span className="day-pill-label">{d.label}</span>
                    {allActs.length>0&&<span style={{ fontSize:10, color:activeDay===i?"#E8DDD4":"#9C8A74", marginTop:1 }}>{done}/{allActs.length}</span>}
                  </div>
                </Ripple>
              );
            })}
            {/* Add day pill */}
            <Ripple onClick={()=>setShowAddDay(true)} style={{ borderRadius:12 }}>
              <div className="day-pill" style={{ background:"transparent", border:"1px dashed #AEA9AF", minWidth:48 }}>
                <Icon name="plus" size={18}/>
                <span style={{ fontSize:11, color:"#6B5E52" }}>Day</span>
              </div>
            </Ripple>
          </div>
        </div>
      )}

      {days.length===0 && (
        <div style={{ padding:"60px 20px", textAlign:"center", color:"#6B5E52" }}>
          <p className="serif" style={{ fontSize:22, fontWeight:300 }}>No days planned yet</p>
          <p style={{ fontSize:14, marginTop:8 }}>Tap + Day to get started</p>
          <div style={{ marginTop:20 }}>
            <Ripple onClick={()=>setShowAddDay(true)} style={{ display:"inline-flex", borderRadius:12 }}>
              <div className="fab" style={{ position:"relative" }}><Icon name="plus" size={20}/>Add first day</div>
            </Ripple>
          </div>
        </div>
      )}

      {days.map((day,i)=>{
        const allActs=(day.slots||[]).flatMap(s=>s.activities||[]);
        const done=allActs.filter(a=>a.done).length;
        return (
          <div key={day.id} ref={el=>dayRefs.current[i]=el} style={{ margin:"0 20px 20px" }}>
            {/* Day header */}
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, padding:"4px 0" }}>
              <div style={{ width:36, height:36, background:"#6D5B45", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ color:"#FFF8F4", fontSize:14, fontWeight:600 }}>{i+1}</span>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:16, fontWeight:500 }}>{day.label}</p>
                <p style={{ fontSize:13, color:"#6B5E52" }}>{fmtDateL(day.date)} · {done}/{allActs.length} done</p>
              </div>
            </div>

            {(day.slots||[]).map(slot=>{
              const part=getPart(slot.part);
              return (
                <div key={slot.part} className="m3-card" style={{ marginBottom:10 }}>
                  {/* Slot header */}
                  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", background:"rgba(109,91,69,.08)", borderBottom:"1px solid #E6DFDA" }}>
                    <span style={{ fontSize:18 }}>{part.emoji}</span>
                    <span style={{ fontSize:14, fontWeight:500, color:"#3C2E1E" }}>{part.label}</span>
                    <span style={{ fontSize:12, color:"#6B5E52", marginLeft:"auto" }}>{part.time}</span>
                  </div>

                  {slot.activities.map(act=>{
                    const pri=getPri(act.priority);
                    return (
                      <Ripple key={act.id} onClick={()=>toggleAct(day.id,slot.part,act.id)}>
                        <div className="list-row" style={{ alignItems:"flex-start" }}>
                          <div className={`m3-check ${act.done?"on":""}`} style={{ marginTop:3, flexShrink:0 }}>
                            {act.done&&<Icon name="check" size={14}/>}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:15, textDecoration:act.done?"line-through":"none", color:act.done?"#79747E":"#1C1B1F", lineHeight:1.4 }}>{act.title}</p>
                            <div style={{ marginTop:5, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                              <span className="pri-chip" style={{ background:pri.bg, color:pri.color, fontSize:11 }}>{pri.label}</span>
                              {act.duration>0&&<span style={{ fontSize:12, color:"#6B5E52", display:"flex", alignItems:"center", gap:3 }}><Icon name="clock" size={13}/>{fmtDur(act.duration)}</span>}
                              {act.location&&<span style={{ fontSize:12, color:"#6B5E52", display:"flex", alignItems:"center", gap:3 }}><Icon name="pin" size={13}/><span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:140 }}>{act.location}</span></span>}
                            </div>
                          </div>
                          {/* Single ⋯ — 48×48 tap zone */}
                          <Ripple onClick={e=>{e.stopPropagation&&e.stopPropagation?.();setActionSheet({dayId:day.id,part:slot.part,activity:act});}} style={{ borderRadius:"50%", width:48, height:48, display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <button className="icon-btn" style={{ pointerEvents:"none" }}><Icon name="dots" size={20}/></button>
                          </Ripple>
                        </div>
                      </Ripple>
                    );
                  })}

                  {/* Add activity row */}
                  <Ripple onClick={()=>setEditAct({dayId:day.id,part:slot.part,activity:{...BLANK_ACT}})}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", color:"#6B5E52", minHeight:48, borderTop:slot.activities.length>0?"1px solid #EDE8E4":"none" }}>
                      <Icon name="plus" size={18}/><span style={{ fontSize:14 }}>Add activity</span>
                    </div>
                  </Ripple>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* ── Activity action sheet ── */}
      {actionSheet&&(
        <div className="sheet-backdrop" onClick={()=>setActionSheet(null)}>
          <div className="sheet" onClick={e=>e.stopPropagation()}>
            <div className="sheet-handle"/>
            <p className="sheet-title">{actionSheet.activity.title}</p>
            <button className="action-item" onClick={()=>{setActionSheet(null);setEditAct({dayId:actionSheet.dayId,part:actionSheet.part,activity:{...actionSheet.activity}});}}>
              <Icon name="edit" size={22}/>Edit activity
            </button>
            <button className="action-item" onClick={()=>{const a=actionSheet;setActionSheet(null);setMoveModal({activity:a.activity,fromDayId:a.dayId,fromPart:a.part});}}>
              <Icon name="move" size={22}/>Move to another slot
            </button>
            <button className="action-item danger" onClick={()=>{const a=actionSheet;setActionSheet(null);deleteAct(a.dayId,a.part,a.activity.id);}}>
              <Icon name="trash" size={22}/>Delete
            </button>
          </div>
        </div>
      )}

      {/* ── Add Day sheet ── */}
      {showAddDay&&(
        <div className="sheet-backdrop" onClick={()=>setShowAddDay(false)}>
          <div className="sheet" onClick={e=>e.stopPropagation()} style={{ padding:"0 0 max(28px,env(safe-area-inset-bottom,28px))" }}>
            <div className="sheet-handle"/>
            <p className="sheet-title">Add a day</p>
            <div style={{ padding:"0 24px", display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <label style={{ fontSize:12, color:"#6B5E52", marginBottom:6, display:"block", letterSpacing:".05em", textTransform:"uppercase" }}>Date</label>
                <input type="date" className="m3-input" value={newDay.date} onChange={e=>setNewDay({...newDay,date:e.target.value})}/>
              </div>
              <div>
                <label style={{ fontSize:12, color:"#6B5E52", marginBottom:6, display:"block", letterSpacing:".05em", textTransform:"uppercase" }}>Label (optional)</label>
                <input className="m3-input" placeholder='e.g. "Arrival", "Museum day"' value={newDay.label} onChange={e=>setNewDay({...newDay,label:e.target.value})}/>
              </div>
              <div>
                <label style={{ fontSize:12, color:"#6B5E52", marginBottom:10, display:"block", letterSpacing:".05em", textTransform:"uppercase" }}>Parts of day</label>
                <div style={{ display:"flex", gap:10 }}>
                  {baseParts.map(p=>{
                    const sel=newDay.parts.includes(p.key);
                    return (
                      <Ripple key={p.key} onClick={()=>setNewDay(nd=>{const has=nd.parts.includes(p.key);return{...nd,parts:has?nd.parts.filter(x=>x!==p.key):[...nd.parts,p.key]};})} style={{ flex:1, borderRadius:12 }}>
                        <div style={{ minHeight:64, padding:"10px 6px", border:"1.5px solid", borderColor:sel?"#6D5B45":"#CAC4D0", background:sel?"#D8C7B3":"transparent", borderRadius:12, display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor:"pointer" }}>
                          <span style={{ fontSize:22 }}>{p.emoji}</span>
                          <span style={{ fontSize:13, fontWeight:500, color:sel?"#3C2E1E":"#49454F" }}>{p.label}</span>
                        </div>
                      </Ripple>
                    );
                  })}
                </div>
              </div>
              <div style={{ display:"flex", gap:12, marginTop:4 }}>
                <Ripple onClick={()=>setShowAddDay(false)} style={{ flex:1, borderRadius:50 }}>
                  <div style={{ height:48, display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid #CAC4D0", borderRadius:50, color:"#49454F", fontSize:15, fontWeight:500 }}>Cancel</div>
                </Ripple>
                <Ripple onClick={addDay} style={{ flex:1, borderRadius:50 }}>
                  <div style={{ height:48, display:"flex", alignItems:"center", justifyContent:"center", background:"#6D5B45", borderRadius:50, color:"#FFF8F4", fontSize:15, fontWeight:500 }}>Add day</div>
                </Ripple>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit/Add Activity sheet ── */}
      {editAct&&(
        <ActivitySheet
          initial={editAct.activity}
          defaultPart={editAct.part}
          dayId={editAct.dayId}
          onSave={saveAct}
          onClose={()=>setEditAct(null)}
        />
      )}

      {/* ── Move sheet ── */}
      {moveModal&&(
        <div className="sheet-backdrop" onClick={()=>setMoveModal(null)}>
          <div className="sheet" onClick={e=>e.stopPropagation()}>
            <div className="sheet-handle"/>
            <p className="sheet-title">Move activity</p>
            <p style={{ padding:"0 24px 16px", fontSize:14, color:"#6B5E52", fontStyle:"italic" }}>"{moveModal.activity.title}"</p>
            <div style={{ overflow:"auto", maxHeight:"55dvh" }}>
              {allSlots.filter(s=>!(s.dayId===moveModal.fromDayId&&s.part===moveModal.fromPart)).map(s=>{
                const part=getPart(s.part);
                return (
                  <Ripple key={`${s.dayId}-${s.part}`} onClick={()=>moveAct(moveModal.fromDayId,moveModal.fromPart,moveModal.activity.id,s.dayId,s.part)}>
                    <button className="action-item">
                      <span style={{ fontSize:22 }}>{part.emoji}</span>
                      <div>
                        <p style={{ fontSize:15, fontWeight:500 }}>{s.dayLabel}</p>
                        <p style={{ fontSize:13, color:"#6B5E52" }}>{fmtDateL(s.date)} · {part.label}</p>
                      </div>
                    </button>
                  </Ripple>
                );
              })}
              {allSlots.filter(s=>!(s.dayId===moveModal.fromDayId&&s.part===moveModal.fromPart)).length===0&&(
                <p style={{ padding:"20px 24px", color:"#6B5E52", fontSize:14 }}>No other slots available. Add more days first.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {snack&&<Snackbar message={snack.msg} onUndo={snack.undo} onDismiss={()=>setSnack(null)}/>}
    </div>
  );
}

// ─── ACTIVITY SHEET ───────────────────────────────────────────────────────────
function ActivitySheet({ initial, defaultPart, dayId, onSave, onClose }) {
  const [form, setForm] = useState({ ...BLANK_ACT, part:defaultPart, ...initial });
  const isEdit = !!initial?.id;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()} style={{ padding:"0 0 max(28px,env(safe-area-inset-bottom,28px))" }}>
        <div className="sheet-handle"/>
        <p className="sheet-title">{isEdit?"Edit activity":"New activity"}</p>
        <div style={{ padding:"0 24px", display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <label style={{ fontSize:12, color:"#6B5E52", marginBottom:6, display:"block", letterSpacing:".05em", textTransform:"uppercase" }}>Title *</label>
            <input className="m3-input" placeholder="What are you doing?" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
          </div>
          <div>
            <label style={{ fontSize:12, color:"#6B5E52", marginBottom:10, display:"block", letterSpacing:".05em", textTransform:"uppercase" }}>Priority</label>
            <div style={{ display:"flex", gap:8 }}>
              {PRIORITIES.map(p=>(
                <Ripple key={p.key} onClick={()=>setForm({...form,priority:p.key})} style={{ flex:1, borderRadius:8 }}>
                  <div style={{ padding:"10px 4px", textAlign:"center", border:"1.5px solid", borderColor:form.priority===p.key?p.color:"#CAC4D0", background:form.priority===p.key?p.bg:"transparent", borderRadius:8, cursor:"pointer" }}>
                    <span style={{ fontSize:12, fontWeight:600, color:form.priority===p.key?p.color:"#49454F" }}>{p.label}</span>
                  </div>
                </Ripple>
              ))}
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ fontSize:12, color:"#6B5E52", marginBottom:6, display:"block", letterSpacing:".05em", textTransform:"uppercase" }}>Duration (min)</label>
              <input type="number" className="m3-input" inputMode="numeric" placeholder="60" value={form.duration||""} onChange={e=>setForm({...form,duration:parseInt(e.target.value)||0})}/>
            </div>
            <div>
              <label style={{ fontSize:12, color:"#6B5E52", marginBottom:6, display:"block", letterSpacing:".05em", textTransform:"uppercase" }}>Part of day</label>
              <select className="m3-input" value={form.part||defaultPart} onChange={e=>setForm({...form,part:e.target.value})}>
                {PARTS.map(p=><option key={p.key} value={p.key}>{p.emoji} {p.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize:12, color:"#6B5E52", marginBottom:6, display:"block", letterSpacing:".05em", textTransform:"uppercase" }}>Location</label>
            <input className="m3-input" placeholder="Place name or address" value={form.location||""} onChange={e=>setForm({...form,location:e.target.value})}/>
            {form.location&&(
              <a href={`https://maps.google.com/?q=${encodeURIComponent(form.location)}`} target="_blank" rel="noreferrer"
                style={{ fontSize:13, color:"#6D5B45", display:"inline-flex", alignItems:"center", gap:4, marginTop:8, textDecoration:"none", minHeight:40, padding:"4px 0" }}>
                <Icon name="pin" size={14}/> Open in Google Maps ↗
              </a>
            )}
          </div>
          <div style={{ display:"flex", gap:12, marginTop:4 }}>
            <Ripple onClick={onClose} style={{ flex:1, borderRadius:50 }}>
              <div style={{ height:48, display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid #CAC4D0", borderRadius:50, color:"#49454F", fontSize:15, fontWeight:500 }}>Cancel</div>
            </Ripple>
            <Ripple onClick={()=>{if(form.title)onSave(dayId,form.part||defaultPart,form);}} style={{ flex:1, borderRadius:50 }}>
              <div style={{ height:48, display:"flex", alignItems:"center", justifyContent:"center", background:"#6D5B45", borderRadius:50, color:"#FFF8F4", fontSize:15, fontWeight:500 }}>{isEdit?"Save":"Add"}</div>
            </Ripple>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PACKING TAB ──────────────────────────────────────────────────────────────
function PackingTab({ trip, onUpdate }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({item:"",category:"Documents"});
  const [filter,  setFilter]  = useState("All");
  const [snack,   setSnack]   = useState(null);
  const packing = trip.packing||[];
  const cats = ["All",...PACKING_CATS];
  const items = filter==="All"?packing:packing.filter(p=>p.category===filter);
  const packed = packing.filter(p=>p.packed).length;

  function toggle(id){ onUpdate({...trip,packing:packing.map(p=>p.id===id?{...p,packed:!p.packed}:p)}); }
  function add(){ if(!newItem.item)return; onUpdate({...trip,packing:[...packing,{id:uid(),...newItem,packed:false}]}); setNewItem({item:"",category:"Documents"}); setShowAdd(false); }
  function remove(id){
    const saved=packing;
    onUpdate({...trip,packing:packing.filter(p=>p.id!==id)});
    setSnack({msg:"Item removed", undo:()=>{onUpdate({...trip,packing:saved});setSnack(null);}});
  }

  return (
    <div style={{ paddingBottom:24 }}>
      <div style={{ padding:"16px 20px 8px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span className="section-label" style={{ padding:0 }}>{packed}/{packing.length} packed</span>
        <Ripple onClick={()=>setShowAdd(true)} style={{ borderRadius:50 }}>
          <div style={{ height:40, padding:"0 16px", display:"flex", alignItems:"center", gap:8, background:"#6D5B45", borderRadius:50, color:"#FFF8F4", fontSize:14, fontWeight:500 }}>
            <Icon name="plus" size={18}/>Add item
          </div>
        </Ripple>
      </div>
      <div style={{ padding:"0 20px 12px" }}>
        <div className="progress-track"><div className="progress-fill" style={{ width:`${packing.length>0?(packed/packing.length)*100:0}%`, background:"#6D5B45" }}/></div>
      </div>

      {/* Filter chips */}
      <div style={{ padding:"0 20px 14px", display:"flex", gap:8, overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
        {cats.map(c=>(
          <Ripple key={c} onClick={()=>setFilter(c)} style={{ borderRadius:8 }}>
            <div className={`chip ${filter===c?"active":""}`}>
              {filter===c&&<Icon name="check" size={14}/>}
              {c}
            </div>
          </Ripple>
        ))}
      </div>

      <div style={{ margin:"0 20px" }} className="m3-card">
        {items.map(p=>(
          <Ripple key={p.id} onClick={()=>toggle(p.id)}>
            <div className="list-row">
              <div className={`m3-check ${p.packed?"on":""}`}>{p.packed&&<Icon name="check" size={14}/>}</div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:15, textDecoration:p.packed?"line-through":"none", color:p.packed?"#79747E":"#1C1B1F" }}>{p.item}</p>
                <p style={{ fontSize:12, color:"#79747E", marginTop:2 }}>{p.category}</p>
              </div>
              <Ripple onClick={e=>{e.stopPropagation?.();remove(p.id);}} style={{ borderRadius:"50%", width:48, height:48, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <button className="icon-btn" style={{ pointerEvents:"none" }}><Icon name="trash" size={20}/></button>
              </Ripple>
            </div>
          </Ripple>
        ))}
        {items.length===0&&<div style={{ padding:"32px 16px", textAlign:"center", color:"#79747E", fontSize:15 }}>Nothing here yet</div>}
      </div>

      {showAdd&&(
        <div className="sheet-backdrop" onClick={()=>setShowAdd(false)}>
          <div className="sheet" onClick={e=>e.stopPropagation()} style={{ padding:"0 0 max(28px,env(safe-area-inset-bottom,28px))" }}>
            <div className="sheet-handle"/>
            <p className="sheet-title">Add packing item</p>
            <div style={{ padding:"0 24px", display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <label style={{ fontSize:12, color:"#6B5E52", marginBottom:6, display:"block", letterSpacing:".05em", textTransform:"uppercase" }}>Item</label>
                <input className="m3-input" placeholder="What to pack?" value={newItem.item} onChange={e=>setNewItem({...newItem,item:e.target.value})}/>
              </div>
              <div>
                <label style={{ fontSize:12, color:"#6B5E52", marginBottom:6, display:"block", letterSpacing:".05em", textTransform:"uppercase" }}>Category</label>
                <select className="m3-input" value={newItem.category} onChange={e=>setNewItem({...newItem,category:e.target.value})}>
                  {PACKING_CATS.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", gap:12, marginTop:4 }}>
                <Ripple onClick={()=>setShowAdd(false)} style={{ flex:1, borderRadius:50 }}>
                  <div style={{ height:48, display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid #CAC4D0", borderRadius:50, color:"#49454F", fontSize:15, fontWeight:500 }}>Cancel</div>
                </Ripple>
                <Ripple onClick={add} style={{ flex:1, borderRadius:50 }}>
                  <div style={{ height:48, display:"flex", alignItems:"center", justifyContent:"center", background:"#6D5B45", borderRadius:50, color:"#FFF8F4", fontSize:15, fontWeight:500 }}>Add</div>
                </Ripple>
              </div>
            </div>
          </div>
        </div>
      )}
      {snack&&<Snackbar message={snack.msg} onUndo={snack.undo} onDismiss={()=>setSnack(null)}/>}
    </div>
  );
}

// ─── BUDGET TAB ───────────────────────────────────────────────────────────────
function BudgetTab({ trip, onUpdate }) {
  const [editBudget, setEditBudget] = useState(false);
  const [lb, setLb] = useState(trip.budget||{total:0,currency:"EUR"});
  const [showAdd, setShowAdd] = useState(false);
  const [newExp, setNewExp] = useState({label:"",amount:""});
  const expenses = trip.expenses||[];
  const spent = expenses.reduce((s,e)=>s+parseFloat(e.amount||0),0);
  const pct   = lb.total>0?Math.min((spent/lb.total)*100,100):0;
  const rem   = lb.total-spent;

  function save(){ onUpdate({...trip,budget:lb}); setEditBudget(false); }
  function addExp(){ if(!newExp.label||!newExp.amount)return; onUpdate({...trip,expenses:[...expenses,{id:uid(),label:newExp.label,amount:parseFloat(newExp.amount)}]}); setNewExp({label:"",amount:""}); setShowAdd(false); }

  return (
    <div style={{ paddingBottom:24 }}>
      <div style={{ padding:"16px 20px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span className="section-label" style={{ padding:0 }}>Budget</span>
        <Ripple onClick={()=>setEditBudget(true)} style={{ borderRadius:50 }}>
          <div style={{ height:36, padding:"0 14px", display:"flex", alignItems:"center", border:"1px solid #CAC4D0", borderRadius:50, color:"#49454F", fontSize:14, fontWeight:500 }}>Set budget</div>
        </Ripple>
      </div>

      {/* Summary card */}
      <div style={{ margin:"0 20px 20px", background:"linear-gradient(135deg,#3C2E1E,#6D5B45)", borderRadius:20, padding:"22px 20px", color:"#FFF8F4" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", textAlign:"center", marginBottom:18 }}>
          {[["Budget",lb.total,null],["Spent",spent,null],[rem>=0?"Left":"Over",Math.abs(rem),rem>=0?"#C5EFBB":"#F9DEDC"]].map(([l,v,c])=>(
            <div key={l}>
              <p className="serif" style={{ fontSize:22, fontWeight:300, color:c||"#FFF8F4" }}>{lb.currency} {v.toLocaleString()}</p>
              <p style={{ fontSize:11, color:"#C4B49A", letterSpacing:".08em", textTransform:"uppercase", marginTop:3 }}>{l}</p>
            </div>
          ))}
        </div>
        <div style={{ height:6, background:"rgba(255,255,255,.15)", borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", background:pct>90?"#F9DEDC":"#C5EFBB", width:`${pct}%`, transition:"width .4s" }}/>
        </div>
        <p style={{ fontSize:12, color:"#C4B49A", marginTop:8, textAlign:"right" }}>{Math.round(pct)}% used</p>
      </div>

      <div style={{ padding:"0 20px 8px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span className="section-label" style={{ padding:0 }}>Expenses</span>
        <Ripple onClick={()=>setShowAdd(true)} style={{ borderRadius:50 }}>
          <div style={{ height:40, padding:"0 16px", display:"flex", alignItems:"center", gap:8, background:"#6D5B45", borderRadius:50, color:"#FFF8F4", fontSize:14, fontWeight:500 }}>
            <Icon name="plus" size={16}/>Add
          </div>
        </Ripple>
      </div>
      <div style={{ margin:"0 20px" }} className="m3-card">
        {expenses.map(e=>(
          <div key={e.id} className="list-row">
            <span style={{ flex:1, fontSize:15 }}>{e.label}</span>
            <span style={{ fontSize:15, fontWeight:500, marginRight:4 }}>{lb.currency} {parseFloat(e.amount).toLocaleString()}</span>
            <Ripple onClick={()=>onUpdate({...trip,expenses:expenses.filter(x=>x.id!==e.id)})} style={{ borderRadius:"50%", width:48, height:48, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <button className="icon-btn" style={{ pointerEvents:"none" }}><Icon name="trash" size={20}/></button>
            </Ripple>
          </div>
        ))}
        {expenses.length===0&&<div style={{ padding:"32px 16px", textAlign:"center", color:"#79747E", fontSize:15 }}>No expenses logged yet</div>}
      </div>

      {editBudget&&(
        <div className="sheet-backdrop" onClick={()=>setEditBudget(false)}>
          <div className="sheet" onClick={e=>e.stopPropagation()} style={{ padding:"0 0 max(28px,env(safe-area-inset-bottom,28px))" }}>
            <div className="sheet-handle"/>
            <p className="sheet-title">Set budget</p>
            <div style={{ padding:"0 24px", display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <label style={{ fontSize:12, color:"#6B5E52", marginBottom:6, display:"block" }}>Total budget</label>
                <input type="number" className="m3-input" inputMode="decimal" value={lb.total} onChange={e=>setLb({...lb,total:parseFloat(e.target.value)||0})}/>
              </div>
              <div>
                <label style={{ fontSize:12, color:"#6B5E52", marginBottom:6, display:"block" }}>Currency</label>
                <select className="m3-input" value={lb.currency} onChange={e=>setLb({...lb,currency:e.target.value})}>
                  {["EUR","USD","GBP","CHF","JPY","AUD"].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", gap:12, marginTop:4 }}>
                <Ripple onClick={()=>setEditBudget(false)} style={{ flex:1, borderRadius:50 }}>
                  <div style={{ height:48, display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid #CAC4D0", borderRadius:50, color:"#49454F", fontSize:15, fontWeight:500 }}>Cancel</div>
                </Ripple>
                <Ripple onClick={save} style={{ flex:1, borderRadius:50 }}>
                  <div style={{ height:48, display:"flex", alignItems:"center", justifyContent:"center", background:"#6D5B45", borderRadius:50, color:"#FFF8F4", fontSize:15, fontWeight:500 }}>Save</div>
                </Ripple>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAdd&&(
        <div className="sheet-backdrop" onClick={()=>setShowAdd(false)}>
          <div className="sheet" onClick={e=>e.stopPropagation()} style={{ padding:"0 0 max(28px,env(safe-area-inset-bottom,28px))" }}>
            <div className="sheet-handle"/>
            <p className="sheet-title">Log expense</p>
            <div style={{ padding:"0 24px", display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <label style={{ fontSize:12, color:"#6B5E52", marginBottom:6, display:"block" }}>Description</label>
                <input className="m3-input" placeholder="e.g. Hotel, Dinner" value={newExp.label} onChange={e=>setNewExp({...newExp,label:e.target.value})}/>
              </div>
              <div>
                <label style={{ fontSize:12, color:"#6B5E52", marginBottom:6, display:"block" }}>Amount ({lb.currency})</label>
                <input type="number" className="m3-input" inputMode="decimal" placeholder="0" value={newExp.amount} onChange={e=>setNewExp({...newExp,amount:e.target.value})}/>
              </div>
              <div style={{ display:"flex", gap:12, marginTop:4 }}>
                <Ripple onClick={()=>setShowAdd(false)} style={{ flex:1, borderRadius:50 }}>
                  <div style={{ height:48, display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid #CAC4D0", borderRadius:50, color:"#49454F", fontSize:15, fontWeight:500 }}>Cancel</div>
                </Ripple>
                <Ripple onClick={addExp} style={{ flex:1, borderRadius:50 }}>
                  <div style={{ height:48, display:"flex", alignItems:"center", justifyContent:"center", background:"#6D5B45", borderRadius:50, color:"#FFF8F4", fontSize:15, fontWeight:500 }}>Add</div>
                </Ripple>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NOTES TAB ────────────────────────────────────────────────────────────────
function NotesTab({ trip, onUpdate }) {
  const [showAdd,  setShowAdd]  = useState(false);
  const [newNote,  setNewNote]  = useState({title:"",body:""});
  const [expanded, setExpanded] = useState({});
  const [editing,  setEditing]  = useState({});
  const [snack,    setSnack]    = useState(null);

  const rawNotes = trip.notes;
  const notes = typeof rawNotes==="string"
    ? [{id:"legacy",title:"Notes",body:rawNotes,createdAt:trip.startDate}]
    : (rawNotes||[]);

  function addNote(){
    if(!newNote.title&&!newNote.body)return;
    const note={id:uid(),title:newNote.title||"Untitled",body:newNote.body,createdAt:new Date().toISOString().slice(0,10)};
    onUpdate({...trip,notes:[...notes,note]});
    setNewNote({title:"",body:""}); setShowAdd(false);
    setExpanded(ex=>({...ex,[note.id]:true}));
  }
  function deleteNote(id){
    const saved=notes;
    onUpdate({...trip,notes:notes.filter(n=>n.id!==id)});
    setSnack({msg:"Note deleted",undo:()=>{onUpdate({...trip,notes:saved});setSnack(null);}});
  }
  function saveEdit(id){ onUpdate({...trip,notes:notes.map(n=>n.id===id?{...n,body:editing[id]}:n)}); setEditing(ed=>{const x={...ed};delete x[id];return x;}); }

  return (
    <div style={{ paddingBottom:24 }}>
      <div style={{ padding:"16px 20px 12px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span className="section-label" style={{ padding:0 }}>{notes.length} note{notes.length!==1?"s":""}</span>
        <Ripple onClick={()=>setShowAdd(true)} style={{ borderRadius:50 }}>
          <div style={{ height:40, padding:"0 16px", display:"flex", alignItems:"center", gap:8, background:"#6D5B45", borderRadius:50, color:"#FFF8F4", fontSize:14, fontWeight:500 }}>
            <Icon name="plus" size={18}/>Note
          </div>
        </Ripple>
      </div>
      <div style={{ padding:"0 20px" }}>
        {notes.length===0&&(
          <div style={{ padding:"60px 0", textAlign:"center", color:"#79747E" }}>
            <p className="serif" style={{ fontSize:22, fontWeight:300 }}>No notes yet</p>
            <p style={{ fontSize:14, marginTop:8 }}>Jot down ideas, memories, tips…</p>
          </div>
        )}
        {notes.map(note=>{
          const isOpen=!!expanded[note.id];
          const isEdit=note.id in editing;
          return (
            <div key={note.id} className="m3-card-outlined" style={{ marginBottom:12 }}>
              <Ripple onClick={()=>setExpanded(ex=>({...ex,[note.id]:!ex[note.id]}))}>
                <div style={{ display:"flex", alignItems:"center", padding:"14px 16px", minHeight:56 }}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:15, fontWeight:500 }}>{note.title}</p>
                    {note.createdAt&&<p style={{ fontSize:12, color:"#79747E", marginTop:3 }}>{fmtDateL(note.createdAt)}</p>}
                  </div>
                  <Ripple onClick={e=>{e.stopPropagation?.();deleteNote(note.id);}} style={{ borderRadius:"50%", width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <button className="icon-btn" style={{ pointerEvents:"none" }}><Icon name="trash" size={20}/></button>
                  </Ripple>
                  <div style={{ color:"#79747E", transform:isOpen?"rotate(180deg)":"none", transition:"transform .2s" }}>
                    <Icon name="chevron" size={22}/>
                  </div>
                </div>
              </Ripple>
              {isOpen&&(
                <div style={{ padding:"0 16px 16px", borderTop:"1px solid #CAC4D0" }}>
                  {isEdit?(
                    <>
                      <textarea className="m3-input" style={{ marginTop:12, minHeight:140, borderRadius:8 }}
                        value={editing[note.id]} onChange={e=>setEditing(ed=>({...ed,[note.id]:e.target.value}))}/>
                      <div style={{ display:"flex", gap:10, marginTop:10 }}>
                        <Ripple onClick={()=>setEditing(ed=>{const x={...ed};delete x[note.id];return x;})} style={{ flex:1, borderRadius:50 }}>
                          <div style={{ height:44, display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid #CAC4D0", borderRadius:50, color:"#49454F", fontSize:14, fontWeight:500 }}>Cancel</div>
                        </Ripple>
                        <Ripple onClick={()=>saveEdit(note.id)} style={{ flex:1, borderRadius:50 }}>
                          <div style={{ height:44, display:"flex", alignItems:"center", justifyContent:"center", background:"#6D5B45", borderRadius:50, color:"#FFF8F4", fontSize:14, fontWeight:500 }}>Save</div>
                        </Ripple>
                      </div>
                    </>
                  ):(
                    <>
                      <p style={{ fontSize:15, lineHeight:1.7, color:"#1C1B1F", whiteSpace:"pre-wrap", paddingTop:12 }}>
                        {note.body||<span style={{ color:"#79747E", fontStyle:"italic" }}>Empty note</span>}
                      </p>
                      <Ripple onClick={()=>setEditing(ed=>({...ed,[note.id]:note.body||""}))} style={{ display:"inline-flex", borderRadius:50, marginTop:10 }}>
                        <div style={{ height:36, padding:"0 14px", display:"flex", alignItems:"center", gap:8, border:"1px solid #CAC4D0", borderRadius:50, color:"#49454F", fontSize:14, fontWeight:500, cursor:"pointer" }}>
                          <Icon name="edit" size={16}/>Edit
                        </div>
                      </Ripple>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showAdd&&(
        <div className="sheet-backdrop" onClick={()=>setShowAdd(false)}>
          <div className="sheet" onClick={e=>e.stopPropagation()} style={{ padding:"0 0 max(28px,env(safe-area-inset-bottom,28px))" }}>
            <div className="sheet-handle"/>
            <p className="sheet-title">New note</p>
            <div style={{ padding:"0 24px", display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <label style={{ fontSize:12, color:"#6B5E52", marginBottom:6, display:"block" }}>Title</label>
                <input className="m3-input" placeholder='e.g. "Restaurant tips"' value={newNote.title} onChange={e=>setNewNote({...newNote,title:e.target.value})}/>
              </div>
              <div>
                <label style={{ fontSize:12, color:"#6B5E52", marginBottom:6, display:"block" }}>Content</label>
                <textarea className="m3-input" style={{ minHeight:140 }} placeholder="Write anything…" value={newNote.body} onChange={e=>setNewNote({...newNote,body:e.target.value})}/>
              </div>
              <div style={{ display:"flex", gap:12, marginTop:4 }}>
                <Ripple onClick={()=>setShowAdd(false)} style={{ flex:1, borderRadius:50 }}>
                  <div style={{ height:48, display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid #CAC4D0", borderRadius:50, color:"#49454F", fontSize:15, fontWeight:500 }}>Cancel</div>
                </Ripple>
                <Ripple onClick={addNote} style={{ flex:1, borderRadius:50 }}>
                  <div style={{ height:48, display:"flex", alignItems:"center", justifyContent:"center", background:"#6D5B45", borderRadius:50, color:"#FFF8F4", fontSize:15, fontWeight:500 }}>Add</div>
                </Ripple>
              </div>
            </div>
          </div>
        </div>
      )}
      {snack&&<Snackbar message={snack.msg} onUndo={snack.undo} onDismiss={()=>setSnack(null)}/>}
    </div>
  );
}

// ─── NEW TRIP SCREEN ──────────────────────────────────────────────────────────
function NewTripScreen({ onSave, onBack }) {
  const [form, setForm] = useState({name:"",destination:"",emoji:"✈️",startDate:"",endDate:"",coverColor:"#6D5B45",currency:"EUR",budget:0});
  const emojiOpts=["✈️","🏖️","🏔️","🌍","🏙️","🚂","⛵","🏕️","🎡","🍜"];
  const colorOpts=["#6D5B45","#2E6B3E","#2D5F8A","#7D3030","#5B3B8A","#7A6030","#1C1B1F"];

  function submit(){
    if(!form.name||!form.startDate||!form.endDate)return;
    onSave({id:uid(),...form,budget:{total:parseFloat(form.budget)||0,currency:form.currency},days:[],packing:[],notes:[],expenses:[]});
  }

  return (
    <div className="slide-right" style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div className="top-bar" style={{ borderBottom:"1px solid #E6DFDA" }}>
        <Ripple onClick={onBack} style={{ borderRadius:"50%", width:48, height:48 }}>
          <button className="icon-btn"><Icon name="back" size={24}/></button>
        </Ripple>
        <span className="top-bar-title">New trip</span>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"20px 20px 48px", display:"flex", flexDirection:"column", gap:20 }}>
        <div>
          <label style={{ fontSize:12, color:"#6B5E52", marginBottom:10, display:"block", letterSpacing:".05em", textTransform:"uppercase" }}>Trip icon</label>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {emojiOpts.map(e=>(
              <Ripple key={e} onClick={()=>setForm({...form,emoji:e})} style={{ borderRadius:12, width:52, height:52 }}>
                <div style={{ width:52, height:52, fontSize:26, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:12, border:"1.5px solid", borderColor:form.emoji===e?"#6D5B45":"#CAC4D0", background:form.emoji===e?"#D8C7B3":"transparent" }}>
                  {e}
                </div>
              </Ripple>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize:12, color:"#6B5E52", marginBottom:6, display:"block", letterSpacing:".05em", textTransform:"uppercase" }}>Trip name *</label>
          <input className="m3-input" placeholder="e.g. Summer in Portugal" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        </div>
        <div>
          <label style={{ fontSize:12, color:"#6B5E52", marginBottom:6, display:"block", letterSpacing:".05em", textTransform:"uppercase" }}>Destination</label>
          <input className="m3-input" placeholder="e.g. Lisbon, Portugal" value={form.destination} onChange={e=>setForm({...form,destination:e.target.value})}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div>
            <label style={{ fontSize:12, color:"#6B5E52", marginBottom:6, display:"block", letterSpacing:".05em", textTransform:"uppercase" }}>Start *</label>
            <input type="date" className="m3-input" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/>
          </div>
          <div>
            <label style={{ fontSize:12, color:"#6B5E52", marginBottom:6, display:"block", letterSpacing:".05em", textTransform:"uppercase" }}>End *</label>
            <input type="date" className="m3-input" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/>
          </div>
        </div>
        <div>
          <label style={{ fontSize:12, color:"#6B5E52", marginBottom:10, display:"block", letterSpacing:".05em", textTransform:"uppercase" }}>Accent colour</label>
          <div style={{ display:"flex", gap:12 }}>
            {colorOpts.map(c=>(
              <Ripple key={c} onClick={()=>setForm({...form,coverColor:c})} style={{ borderRadius:"50%", width:40, height:40 }}>
                <div style={{ width:40, height:40, borderRadius:"50%", background:c, border:form.coverColor===c?"3px solid #1C1B1F":"3px solid transparent", outline:form.coverColor===c?"2.5px solid #FFFBF7":"none", outlineOffset:-4 }}/>
              </Ripple>
            ))}
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:12 }}>
          <div>
            <label style={{ fontSize:12, color:"#6B5E52", marginBottom:6, display:"block", letterSpacing:".05em", textTransform:"uppercase" }}>Currency</label>
            <select className="m3-input" value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}>
              {["EUR","USD","GBP","CHF","JPY","AUD"].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:12, color:"#6B5E52", marginBottom:6, display:"block", letterSpacing:".05em", textTransform:"uppercase" }}>Total budget</label>
            <input type="number" className="m3-input" inputMode="decimal" placeholder="0" value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})}/>
          </div>
        </div>

        <Ripple onClick={submit} style={{ borderRadius:50 }}>
          <div style={{ height:56, display:"flex", alignItems:"center", justifyContent:"center", gap:10, background:"#6D5B45", borderRadius:50, color:"#FFF8F4", fontSize:16, fontWeight:500 }}>
            <Icon name="plane" size={20}/>Create trip
          </div>
        </Ripple>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [data,   setData]   = useState(null);
  const [screen, setScreen] = useState("home");
  const [tripId, setTripId] = useState(null);

  useEffect(()=>{ loadData().then(s=>setData(s||defaultData)); },[]);

  async function updateData(d){ setData(d); await saveData(d); }
  function updateTrip(u){ updateData({...data,trips:data.trips.map(t=>t.id===u.id?u:t)}); }
  function addTrip(t){ const d={...data,trips:[...data.trips,t]}; updateData(d); setTripId(t.id); setScreen("trip"); }

  if(!data) return(<><G/><div className="app-shell" style={{alignItems:"center",justifyContent:"center"}}><p className="serif" style={{fontSize:26,fontWeight:300,color:"#6B5E52"}}>Loading…</p></div></>);

  const trip = data.trips.find(t=>t.id===tripId);
  return (
    <>
      <G/>
      <div className="app-shell">
        {screen==="home" && <HomeScreen data={data} onSelectTrip={id=>{setTripId(id);setScreen("trip");}} onAddTrip={()=>setScreen("new")}/>}
        {screen==="trip" && trip && <TripDetail trip={trip} onBack={()=>setScreen("home")} onUpdate={updateTrip}/>}
        {screen==="new"  && <NewTripScreen onSave={addTrip} onBack={()=>setScreen("home")}/>}
      </div>
    </>
  );
}
