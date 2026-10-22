const C = window.CONFIG;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const DAY = 864e5;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const START = new Date(C.START), END = new Date(C.END);

/* ================= helpers ================= */
const H = { apikey: C.SUPABASE_KEY, 'Content-Type': 'application/json' };
if (C.SUPABASE_KEY.startsWith('eyJ')) H.Authorization = 'Bearer ' + C.SUPABASE_KEY;
/* ---- вход для него: пароль хранится в БД (хэш), проверяет Supabase ---- */
const store = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
let isAdmin = false, adminPass = store.get('adm');
const rpc = (fn, args) => db('rpc/' + fn, { method: 'POST', body: JSON.stringify(args) });
const checkPass = async p => (await rpc('check_pass', { p })) === true;

async function db(path, opts = {}) {
  const r = await fetch(`${C.SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { ...H, ...opts.headers } });
  if (!r.ok) throw new Error(r.status + ' ' + await r.text());
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
const pad = n => String(n).padStart(2, '0');
const fmtT = s => `${Math.floor(s / 60)}:${pad(s % 60)}`;
const DIFF = { 3: 'Лёгкий', 4: 'Средний', 5: 'Сложный', 6: 'Хардкор', 8: 'Безумие' };
const plural = (n, f) => f[n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2];
const DAYS = ['день', 'дня', 'дней'];
const dateIn = ms => new Date(ms).toLocaleDateString('sv-SE', { timeZone: C.TZ });
const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const buzz = (ms = 10) => navigator.vibrate && navigator.vibrate(ms);
const fail = el => { el.textContent = 'Не загрузилось. Проверь интернет и обнови страницу.'; el.classList.add('err'); };
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove('show'), 2400);
}
function countUp(el, to, { dur = 1400, dec = 0, suffix = '', done } = {}) {
  if (reduce) { el.textContent = to.toFixed(dec) + suffix; done && done(); return; }
  const t0 = performance.now();
  const f = t => {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
    el.textContent = (to * e).toFixed(dec) + suffix;
    k < 1 ? requestAnimationFrame(f) : done && done();
  };
  requestAnimationFrame(f);
}

/* ================= частицы ================= */
const fx = (() => {
  const c = $('#fx'), g = c.getContext('2d');
  let W = 0, H = 0, dpr = 1, raf = 0;
  const parts = [], stars = [], cache = new Map();
  const COLORS = ['#FFFFFF', '#FFD86B', '#FF8FC1', '#B28CFF'];
  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    c.width = W * dpr; c.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); cache.clear();
  }
  function seed() {
    stars.length = 0; if (reduce) return;
    for (let i = 0; i < 26; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.8 + .6, v: Math.random() * .25 + .08, t: Math.random() * 6.3, c: COLORS[i % 4] });
  }
  function sprite(ch) {
    if (cache.has(ch)) return cache.get(ch);
    const s = Math.round(64 * dpr), cv = document.createElement('canvas'); cv.width = cv.height = s;
    const x = cv.getContext('2d');
    x.font = `${s * .74}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, s / 2, s / 2 + s * .05);
    cache.set(ch, cv); return cv;
  }
  function frame() {
    g.clearRect(0, 0, W, H);
    for (const s of stars) {
      s.y -= s.v; s.t += .03; if (s.y < -5) { s.y = H + 5; s.x = Math.random() * W; }
      g.globalAlpha = .35 + .35 * Math.sin(s.t); g.fillStyle = s.c;
      g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.283); g.fill();
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vx *= .98; p.vy += .22; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= p.d;
      if (p.life <= 0 || p.y > H + 50) { parts.splice(i, 1); continue; }
      const sz = p.s * (.6 + .4 * p.life);
      g.globalAlpha = Math.min(1, p.life * 1.6);
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.drawImage(sprite(p.ch), -sz / 2, -sz / 2, sz, sz); g.restore();
    }
    g.globalAlpha = 1;
    raf = (stars.length || parts.length) && !document.hidden ? requestAnimationFrame(frame) : 0;
  }
  const start = () => { if (!raf) raf = requestAnimationFrame(frame); };
  function burst(x, y, chars = ['❤️', '💖', '✨'], n = 26, power = 1) {
    if (reduce) n = Math.min(n, 6);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (Math.random() * 6 + 3) * power;
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4 * power, s: Math.random() * 16 + 16,
        r: Math.random() * 6.3, vr: (Math.random() - .5) * .3, life: 1, d: Math.random() * .012 + .012, ch: chars[i % chars.length] });
    }
    start();
  }
  addEventListener('resize', () => { resize(); seed(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  resize(); seed(); start();
  return {
    burst,
    at(el, chars, n, p) { const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, chars, n, p); },
  };
})();

/* ================= экраны ================= */
const screens = $$('.screen'), navBtns = $$('#nav button'), onEnter = {};
let cur = -1, busy = false;
const stagger = root => $$('[data-a]', root).forEach((el, i) => el.style.setProperty('--i', i));
screens.forEach(stagger);

function go(i, ox = innerWidth / 2, oy = innerHeight / 2) {
  if (i === cur || busy || i < 0 || i >= screens.length - (isAdmin ? 0 : 1)) return;
  busy = true; buzz(8);
  const to = screens[i], from = screens[cur];
  to.style.setProperty('--x', ox + 'px'); to.style.setProperty('--y', oy + 'px');
  $('.content', to).scrollTop = 0;
  to.classList.remove('in', 'open');
  to.classList.add('show', 'front');
  void to.offsetWidth;
  to.classList.add('open', 'in');
  cur = i;
  $('#nav').style.setProperty('--k', i);
  navBtns.forEach((b, k) => b.setAttribute('aria-current', k === i));
  const name = to.dataset.name;
  onEnter[name] && onEnter[name]();
  setTimeout(() => {
    from && from.classList.remove('show', 'open', 'in', 'front');
    to.classList.remove('front'); busy = false;
  }, reduce ? 0 : 820);
}
navBtns.forEach((b, k) => b.onclick = () => { const r = b.getBoundingClientRect(); go(k, r.left + r.width / 2, r.top + r.height / 2); });

// свайпы
let sx = 0, sy = 0, st = 0;
$('#app').addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); }, { passive: true });
$('#app').addEventListener('touchend', e => {
  const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
  if (sx < 24 || Date.now() - st > 700) return; // край экрана = жест «назад» в ТГ
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) go(cur + (dx < 0 ? 1 : -1), dx < 0 ? innerWidth : 0, t.clientY);
}, { passive: true });

/* ================= интро ================= */
(function intro() {
  const el = $('#introTitle'); let i = 0;
  `Это для тебя, ${C.HER_NAME}`.split(' ').forEach(word => {
    const w = document.createElement('span'); w.className = 'w';
    for (const ch of word) { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; s.style.setProperty('--i', i++); w.append(s); }
    el.append(w, ' ');
  });
  function enter(btn, chars) {
    const r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    fx.burst(x, y, chars, 60, 1.4); buzz(30);
    if (isAdmin) { $('#suggest').hidden = true; $('#navAdmin').hidden = false; $('#nav').style.setProperty('--n', 8); initAdmin(); }
    $('#intro').classList.add('out'); setTimeout(() => $('#intro').remove(), 1000);
    go(0, x, y);
    setTimeout(() => $('#nav').classList.add('on'), 700);
  }
  $('#asHer').onclick = e => enter(e.currentTarget, ['❤️', '💖', '💗', '✨']);
  $('#asHim').onclick = async e => {
    const btn = e.currentTarget;
    if (adminPass) {
      try { if (await checkPass(adminPass)) { isAdmin = true; return enter(btn, ['🪖', '⭐', '✨', '💪']); } }
      catch (err) { console.error(err); }
      adminPass = null; store.set('adm', null);
    }
    $('#who').hidden = true; $('#login').hidden = false; $('#pass').focus();
  };
  $('#loginBack').onclick = () => { $('#login').hidden = true; $('#who').hidden = false; };
  async function doLogin() {
    const btn = $('#loginBtn'), pass = $('#pass');
    if (!pass.value) { replay(pass, 'shake'); return; }
    btn.disabled = true;
    try {
      if (!(await checkPass(pass.value))) throw new Error('bad password');
      adminPass = pass.value; store.set('adm', adminPass); isAdmin = true; pass.value = '';
      enter(btn, ['🪖', '⭐', '✨', '💪']);
    } catch (err) { console.error(err); replay(pass, 'shake'); buzz(60); toast(/bad password/.test(err.message) ? 'Неверный пароль' : 'Нет связи, попробуй ещё раз'); }
    finally { btn.disabled = false; }
  }
  $('#loginBtn').onclick = doLogin;
  $('#pass').onkeydown = e => { if (e.key === 'Enter') doLogin(); };
})();

/* ================= 1. счётчик ================= */
const clockCols = [];
(function buildClock() {
  const el = $('#clock'); let html = '';
  for (let k = 0; k < 6; k++) {
    html += `<span class="roll"><span class="col">${[...'0123456789'].map(d => `<span>${d}</span>`).join('')}</span></span>`;
    if (k === 1 || k === 3) html += '<b>:</b>';
  }
  el.innerHTML = html; clockCols.push(...$$('.col', el));
})();

let daysLive = false;
function tick() {
  const ms = Math.max(0, END - Date.now()), d = Math.floor(ms / DAY), s = Math.floor(ms / 1000) % 86400;
  const str = pad(Math.floor(s / 3600)) + pad(Math.floor(s / 60) % 60) + pad(s % 60);
  [...str].forEach((ch, k) => clockCols[k].style.transform = `translateY(-${ch * 1.4}em)`);
  if (daysLive) $('#days').textContent = d;
  $('#daysLabel').textContent = plural(d, DAYS) + ' до дембеля';
}
tick(); setInterval(tick, 1000);


function drawTape() {
  const left = Math.max(0, Math.ceil((END - Date.now()) / DAY));
  const L = Math.min(100, left), w = L * 10;
  const tk = i => {
    const x = i * 10, h = i % 10 === 0 ? 28 : i % 5 === 0 ? 20 : 12;
    return `<line x1="${x}" y1="24" x2="${x}" y2="${24 + h}" class="t-tick"/>` + (i % 10 === 0 ? `<text x="${x - 4}" y="66" class="t-num">${i}</text>` : '');
  };
  let s = `<rect x="0" y="24" width="1000" height="48" rx="4" class="t-gone"/>`;
  if (L) s += `<rect x="0" y="24" width="${w}" height="48" rx="4" class="t-body"/>`;
  for (let i = 1; i <= L; i++) s += tk(i);
  if (L < 100 && !reduce) {
    s += `<g class="t-piece"><rect x="${w}" y="24" width="10" height="48" class="t-body"/>${tk(L + 1)}</g>`;
    s += `<text x="${w}" y="16" class="snip">✂️</text>`;
  }
  $('#tape').innerHTML = s;
  $('#tapeCap').textContent =
    left > 100 ? `Ленту начнём резать за 100 дней. Ждать ещё ${left - 100} ${plural(left - 100, DAYS)}` :
    left === 0 ? 'Лента кончилась. Я дома ❤' : `Осталось ${L} см ленты, каждый день отрезаю по сантиметру`;
}

const ring = $('#ringFg'), RING = 2 * Math.PI * 52;
ring.style.strokeDasharray = RING;
onEnter.count = () => {
  const d = Math.floor(Math.max(0, END - Date.now()) / DAY);
  const pct = Math.min(100, Math.max(0, (Date.now() - START) / (END - START) * 100));
  daysLive = false; $('#days').textContent = 0;
  setTimeout(() => countUp($('#days'), d, { done: () => daysLive = true }), 400);
  ring.style.transition = 'none'; ring.style.strokeDashoffset = RING; void ring.getBoundingClientRect(); ring.style.transition = '';
  setTimeout(() => { ring.style.strokeDashoffset = RING * (1 - pct / 100); countUp($('#pct'), pct, { dur: 1800, dec: 1, suffix: '%' }); }, 900);
  drawTape();
};
$('#hint').onclick = e => go(1, e.clientX, e.clientY);

/* ================= 2. записка ================= */
let note = null, typed = false;
function typeText(el, text) {
  if (reduce) { el.textContent = text; return; }
  let i = 0; el.textContent = ''; el.classList.add('typing');
  const step = () => { el.textContent = text.slice(0, ++i); i < text.length ? setTimeout(step, 38) : el.classList.remove('typing'); };
  step();
}
async function loadNote() {
  try {
    [note] = await db('notes?select=text,show_on&order=show_on.desc,created_at.desc&limit=1');
    $('#noteDate').textContent = note ? new Date(note.show_on + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : ' ';
    if (!note) $('#noteText').textContent = 'Скоро здесь будет записка';
  } catch (e) { console.error(e); fail($('#noteText')); }
}
onEnter.note = () => { if (note && !typed) { typed = true; setTimeout(() => typeText($('#noteText'), note.text), 700); } };
$('#noteCard').onclick = e => { replay($('#noteCard'), 'jelly'); fx.burst(e.clientX, e.clientY, ['💖', '💗', '✨'], 18); buzz(); };

/* ================= цвета конвертов ================= */
function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return [h, s * 100, l * 100];
}
const hsl = (h, s, l) => `hsl(${Math.round(h)} ${Math.round(Math.min(100, Math.max(0, s)))}% ${Math.round(Math.min(95, Math.max(8, l)))}%)`;
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))).toString(16).padStart(2, '0');
  return '#' + f(0) + f(8) + f(4);
}
function paintEnv(el, hex) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return;
  const [h, s, l] = hexToHsl(hex);
  el.style.setProperty('--e1', hsl(h, s, l));
  el.style.setProperty('--e2', hsl(h, s + 6, l - 12));
  el.style.setProperty('--e3', hsl(h, s - 6, l + 12));
}
// палитра: случайный оттенок + гармоничная схема
function genPalette() {
  const base = Math.random() * 360;
  const schemes = [[0, 25, 50, -25, -50, 180], [0, 120, 240, 30, 150, 270], [0, 180, 20, 200, -20, 160], [0, 15, 30, 45, 60, 75]];
  const sc = schemes[Math.floor(Math.random() * schemes.length)];
  return sc.map((d, i) => hslToHex((base + d + 360) % 360, 70 + Math.random() * 20, 62 + (i % 3) * 6));
}

/* ================= 3. письма ================= */
const dlg = $('#dlg'); let openedEnv = null;
async function loadLetters() {
  const box = $('#letters');
  try {
    const [all, opened] = await Promise.all([db('letters_locked?select=id,title,open_at,color&order=open_at'), db('letters?select=id,body')]);
    const body = Object.fromEntries(opened.map(l => [l.id, l.body]));
    if (!all.length) { box.innerHTML = '<p class="err">Писем пока нет</p>'; return; }
    box.innerHTML = '';
    all.forEach((l, n) => {
      const openDate = new Date(l.open_at + 'T00:00:00'), isOpen = l.id in body && openDate <= Date.now();
      const left = Math.max(1, Math.ceil((openDate - Date.now()) / DAY));
      const b = document.createElement('button');
      b.className = `env c${n % 4}` + (isOpen ? '' : ' locked'); b.dataset.a = '';
      paintEnv(b, l.color);
      b.innerHTML = `<div class="env-box"><div class="env-back"></div><div class="env-paper"></div><div class="env-front"></div><div class="env-flap"></div><div class="env-seal">${isOpen ? '❤' : '🔒'}</div></div><span class="env-title"></span><span class="env-sub"></span>`;
      $('.env-title', b).textContent = l.title;
      $('.env-sub', b).textContent = isOpen ? 'Можно открыть' : `Через ${left} ${plural(left, DAYS)}`;
      b.onclick = () => {
        if (!isOpen) { replay($('.env-box', b), 'wiggle'); buzz(20); toast('Откроется ' + openDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })); return; }
        openedEnv = b; b.classList.add('opening'); buzz(15);
        setTimeout(() => fx.at($('.env-box', b), ['💌', '💖', '✨'], 22), 450);
        setTimeout(() => { $('#dlgTitle').textContent = l.title; $('#dlgBody').textContent = body[l.id]; dlg.showModal(); }, reduce ? 0 : 1000);
      };
      box.append(b);
    });
    stagger($('.s-letters'));
  } catch (e) { console.error(e); fail(box); }
}
const closeDlg = () => dlg.close();
$('#dlgClose').onclick = closeDlg;
dlg.addEventListener('click', e => { if (e.target === dlg) closeDlg(); });
dlg.addEventListener('close', () => { openedEnv && openedEnv.classList.remove('opening'); openedEnv = null; });

/* ================= 4. банка ================= */
let reasons = [], lastReason = -1, shown = 0;
async function loadJar() {
  try { reasons = (await db('reasons?select=text')).map(r => r.text); }
  catch (e) { console.error(e); fail($('#jarCount')); }
}
$('#jar').onclick = () => {
  const jar = $('#jar'), card = $('#reasonCard');
  replay($('svg', jar), 'shake'); buzz(25);
  if (!reasons.length) { toast('Банка пока пустая'); return; }
  let i; do i = Math.floor(Math.random() * reasons.length); while (reasons.length > 1 && i === lastReason);
  lastReason = i; shown++;
  setTimeout(() => {
    const r = jar.getBoundingClientRect();
    fx.burst(r.left + r.width / 2, r.top + 20, ['💗', '💛', '✨', '💜'], 30, 1.1);
    $('#reason').textContent = reasons[i]; replay(card, 'pop');
    $('#jarCount').textContent = `Достала ${shown}, в банке ${reasons.length}. Тряхни ещё`;
  }, reduce ? 0 : 350);
};

/* ================= 5. планы ================= */
let plans = [];
function plansSub() {
  const liked = plans.filter(p => p.liked).length;
  const ok = plans.filter(p => p.approved);
  $('#plansSub').textContent = `Сделали ${ok.filter(p => p.done).length} из ${ok.length}, твоих сердечек ${liked}`;
}
async function loadPlans() {
  const ul = $('#plans');
  try {
    plans = await db('plans?select=id,text,liked,done,approved,by_her&order=id');
    if (!plans.length) { ul.innerHTML = '<li class="empty">Список пока пуст</li>'; return; }
    ul.innerHTML = '';
    for (const p of plans) {
      const li = document.createElement('li');
      li.className = 'plan' + (p.done ? ' done' : '') + (p.approved ? '' : ' pending'); li.dataset.a = '';
      li.innerHTML = `<span class="check">${p.done ? '✓' : p.approved ? '' : '⏳'}</span><span class="t"><span class="tx"></span>${p.approved ? (p.by_her ? '<span class="tag">твоя идея 💡</span>' : '') : '<span class="tag">ждёт его «да»</span>'}</span><button class="heart" aria-label="Хочу">❤️</button>`;
      $('.tx', li).textContent = p.text;
      const h = $('.heart', li);
      const set = v => { p.liked = v; h.setAttribute('aria-pressed', v); plansSub(); };
      set(p.liked);
      h.onclick = async () => {
        if (isAdmin) { toast('Сердечки ставит она 🙂'); return; }
        set(!p.liked); buzz();
        if (p.liked) fx.at(h, ['❤️', '💖'], 14, .8);
        try { await db(`plans?id=eq.${p.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ liked: p.liked }) }); }
        catch (e) { console.error(e); set(!p.liked); toast('Не сохранилось, попробуй ещё раз'); }
      };
      ul.append(li);
    }
    stagger($('.s-plans'));
    if (isAdmin) renderTabs();
  } catch (e) { console.error(e); fail(ul); }
}

async function suggest() {
  const inp = $('#sugIn'), t = inp.value.trim();
  if (!t) { replay(inp, 'shake'); return; }
  $('#sugBtn').disabled = true;
  try {
    await rpc('suggest_plan', { t });
    inp.value = ''; fx.at($('#sugBtn'), ['💡', '💖', '✨'], 22); buzz(20);
    toast('Отправила ему на одобрение 💌'); await loadPlans();
  } catch (e) { console.error(e); toast('Не отправилось, попробуй ещё раз'); }
  finally { $('#sugBtn').disabled = false; }
}
$('#sugBtn').onclick = suggest;
$('#sugIn').onkeydown = e => { if (e.key === 'Enter') suggest(); };

/* ================= 6. настроение ================= */
const MOODS = { miss: ['🥺', 'Скучаю'], hold: ['💪', 'Держусь'], wait: ['💌', 'Жду'], happy: ['☀️', 'Хороший день'] };
async function loadMood() {
  const wrap = $('#moods'), cal = $('#cal'), today = dateIn(Date.now());
  const days = [...Array(28)].map((_, i) => dateIn(Date.now() - (27 - i) * DAY));
  const map = {};
  const paint = () => {
    cal.innerHTML = days.map(d => `<div class="${d === today ? 'today' : ''}">${map[d] ? MOODS[map[d]][0] : ''}</div>`).join('');
    $$('button', wrap).forEach(b => b.setAttribute('aria-pressed', b.dataset.k === map[today]));
  };
  wrap.innerHTML = Object.entries(MOODS).map(([k, [e, t]]) => `<button class="mood" data-k="${k}"><i>${e}</i>${t}</button>`).join('');
  wrap.onclick = async ev => {
    const b = ev.target.closest('button'); if (!b) return;
    if (isAdmin) { toast('Это её кнопки 🙂'); return; }
    const k = b.dataset.k, prev = map[today];
    replay(b, 'jelly'); fx.at(b, [MOODS[k][0], '✨'], 22); buzz(15);
    map[today] = k; paint();
    try {
      await db('moods?on_conflict=day', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ day: today, mood: k }) });
      toast('Сохранено, я увижу 💌');
    } catch (e) { console.error(e); map[today] = prev; paint(); toast('Не сохранилось, попробуй ещё раз'); }
  };
  try { (await db(`moods?select=day,mood&day=gte.${days[0]}`)).forEach(r => map[r.day] = r.mood); }
  catch (e) { console.error(e); }
  paint();
}

/* ================= 7. игры ================= */
const GAMES = {};
$$('.game').forEach(g => g.onclick = () => {
  const game = GAMES[g.dataset.game];
  if (!game) { replay($('i', g), 'wiggle'); fx.at(g, ['✨', '🎮'], 12); toast('Скоро открою 😉'); return; }
  fx.at(g, ['✨', '🎨', '💖'], 16); buzz(15); openLayer(game);
});
let layerGame = null;
function openLayer(game) {
  layerGame = game; $('#layerTitle').textContent = game.title;
  $('#layerBody').innerHTML = ''; $('#layer').hidden = false; $('#nav').style.visibility = 'hidden';
  game.open($('#layerBody'));
}
function closeLayer() {
  layerGame && layerGame.close && layerGame.close(); layerGame = null;
  $('#layer').hidden = true; $('#nav').style.visibility = '';
}
$('#layerX').onclick = closeLayer;

/* ---------- 🧩 пазлы ---------- */
GAMES.puzzle = (() => {
  let root, st = null, ro = null;
  const key = id => 'pz' + id;

  function shuffle(n) {
    let best = null;
    for (let tries = 0; tries < 30; tries++) {
      const a = [...Array(n).keys()];
      for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      const fixed = a.filter((v, i) => v === i).length;
      if (!best || fixed < best.f) best = { a, f: fixed };
      if (fixed === 0) break;
    }
    return best.a;
  }

  async function showList() {
    stop(); $('#layerTitle').textContent = 'Пазлы';
    root.innerHTML = '<div class="pz-list" id="pzList"><p class="err">Загружаю…</p></div>';
    let list;
    try { list = await db('puzzles?select=id,hint,cols,message,thumb,preview,solved_at,best_time&order=id.desc'); }
    catch (e) { console.error(e); fail($('#pzList')); return; }
    const box = $('#pzList'); if (!box) return;
    if (!list.length) { box.innerHTML = `<p class="err">Пазлов пока нет. ${isAdmin ? 'Добавь в пульте 🧩' : 'Скоро появятся 😉'}</p>`; return; }
    box.innerHTML = '';
    list.forEach((p, i) => {
      const saved = store.get(key(p.id)), solved = !!p.solved_at;
      const b = document.createElement('button'); b.className = 'pz-card'; b.style.animationDelay = i * 70 + 'ms';
      b.innerHTML = `<div class="pz-thumb${solved ? ' solved' : ''}"><i></i>${solved ? '' : '<span class="pz-q">?</span>'}<span class="pz-badge"></span></div><b></b><small></small>`;
      $('i', b).style.backgroundImage = `url("${solved ? p.preview || p.thumb : p.thumb}")`;
      $('.pz-badge', b).textContent = DIFF[p.cols] || `${p.cols}×${p.cols}`;
      $('b', b).textContent = p.hint || (solved ? 'Собрано' : 'Что же тут?');
      $('small', b).textContent = solved ? `✓ ${fmtT(p.best_time || 0)}` : saved ? '▶ Продолжить' : 'Нажми, чтобы собрать';
      b.onclick = () => { buzz(); start(p); };
      box.append(b);
    });
  }

  async function start(p) {
    $('#layerTitle').textContent = p.hint || 'Пазл';
    root.innerHTML = `
      <div class="pz-bar"><span class="pz-stat" id="pzTime">0:00</span><span class="pz-stat" id="pzMoves">0 ходов</span>
        <button class="chip" id="pzPeek">👁 Подсмотреть</button></div>
      <div class="pz-stage" id="pzStage"><div class="pz-board" id="pzBoard"><div class="pz-ghost"></div></div><p class="pz-loading">Загружаю картинку…</p></div>
      <div class="pz-foot" id="pzFoot"><button class="link" id="pzBack">← Все пазлы</button></div>`;
    $('#pzBack').onclick = showList;
    try {
      const [row] = await db(`puzzles?select=image&id=eq.${p.id}`);
      const url = URL.createObjectURL(await (await fetch(row.image)).blob());
      const img = new Image(); img.src = url; await img.decode();
      if (!$('#pzBoard')) { URL.revokeObjectURL(url); return; } // успела выйти
      setup(p, url, img.naturalWidth, img.naturalHeight);
    } catch (e) { console.error(e); const l = $('.pz-loading'); if (l) l.textContent = 'Не загрузилось, проверь интернет'; }
  }

  function setup(p, url, iw, ih) {
    $('.pz-loading').remove();
    const cols = +p.cols, rows = Math.max(2, Math.round(cols * ih / iw)), n = cols * rows;
    const saved = store.get(key(p.id));
    const order = saved && saved.order && saved.order.length === n ? saved.order : shuffle(n);
    const board = $('#pzBoard');
    st = { p, url, cols, rows, n, aspect: iw / ih, board, tiles: [], sel: null, done: false, gap: n > 30 ? 2 : 3,
      moves: saved ? saved.moves : 0, secs: saved ? saved.secs : 0, timer: 0 };
    $('.pz-ghost', board).style.backgroundImage = `url(${url})`;
    for (let h = 0; h < n; h++) {
      const el = document.createElement('div'), c = h % cols, r = Math.floor(h / cols);
      el.className = 'tile';
      el.style.backgroundImage = `url(${url})`;
      el.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;
      el.style.backgroundPosition = `${c / (cols - 1) * 100}% ${r / (rows - 1) * 100}%`;
      const t = { el, home: h, pos: order[h], locked: false };
      t.locked = t.pos === t.home; if (t.locked) el.classList.add('ok');
      st.tiles.push(t); board.append(el); bind(t);
    }
    stats(); layout();
    // раздача: кусочки вылетают из центра
    st.tiles.forEach(t => { t.el.style.transition = 'none'; t.el.style.opacity = 0; t.el.style.transform = `translate(${(st.bw - st.tw) / 2}px,${(st.bh - st.th) / 2}px) scale(.2) rotate(${Math.random() * 60 - 30}deg)`; });
    void board.offsetWidth;
    st.tiles.forEach(t => { t.el.style.transition = ''; t.el.style.transitionDelay = (reduce ? 0 : Math.random() * 450 | 0) + 'ms'; t.el.style.opacity = 1; place(t); });
    setTimeout(() => st && st.tiles.forEach(t => t.el.style.transitionDelay = ''), 1000);
    ro = new ResizeObserver(layout); ro.observe($('#pzStage'));
    st.timer = setInterval(() => {
      if (document.hidden || !st || st.done) return;
      st.secs++; $('#pzTime').textContent = fmtT(st.secs); if (st.secs % 5 === 0) save();
    }, 1000);
    const peek = $('#pzPeek'), on = () => board.classList.add('peek'), off = () => board.classList.remove('peek');
    peek.onpointerdown = on; peek.onpointerup = peek.onpointerleave = peek.onpointercancel = off;
    peek.oncontextmenu = e => e.preventDefault();
  }

  function layout() {
    const stage = $('#pzStage'); if (!stage || !st) return;
    const sw = stage.clientWidth, sh = stage.clientHeight;
    let bw = sw, bh = sw / st.aspect; if (bh > sh) { bh = sh; bw = sh * st.aspect; }
    const g = st.done ? 0 : st.gap;
    Object.assign(st, { bw, bh, g, tw: (bw - g * (st.cols - 1)) / st.cols, th: (bh - g * (st.rows - 1)) / st.rows });
    st.board.style.width = bw + 'px'; st.board.style.height = bh + 'px';
    st.tiles.forEach(t => { t.el.style.width = st.tw + 'px'; t.el.style.height = st.th + 'px'; if (!t.el.classList.contains('drag')) place(t); });
  }
  const cellXY = i => [(i % st.cols) * (st.tw + st.g), Math.floor(i / st.cols) * (st.th + st.g)];
  function place(t, dx = 0, dy = 0, sc = 1) { const [x, y] = cellXY(t.pos); t.el.style.transform = `translate(${x + dx}px,${y + dy}px) scale(${sc})`; }
  function stats() { $('#pzTime').textContent = fmtT(st.secs); $('#pzMoves').textContent = `${st.moves} ${plural(st.moves, ['ход', 'хода', 'ходов'])}`; }
  function save() { if (st && !st.done) store.set(key(st.p.id), { order: st.tiles.map(t => t.pos), moves: st.moves, secs: st.secs }); }
  function clearSel() { if (st.sel) { st.sel.el.classList.remove('sel'); st.sel = null; } }

  function bind(t) {
    const el = t.el; let sx = 0, sy = 0, drag = false, pid = null;
    el.onpointerdown = e => {
      if (st.done) return;
      if (t.locked) { replay(el, 'nope'); return; }
      pid = e.pointerId; el.setPointerCapture(pid); sx = e.clientX; sy = e.clientY; drag = false;
    };
    el.onpointermove = e => {
      if (pid !== e.pointerId) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!drag && Math.hypot(dx, dy) > 7) { drag = true; clearSel(); el.classList.add('drag'); }
      if (drag) place(t, dx, dy, 1.08);
    };
    el.onpointerup = e => {
      if (pid !== e.pointerId) return; pid = null;
      if (!drag) return tap(t);
      el.classList.remove('drag');
      const r = st.board.getBoundingClientRect();
      const c = Math.floor((e.clientX - r.left) / (st.tw + st.g)), rr = Math.floor((e.clientY - r.top) / (st.th + st.g));
      const target = c >= 0 && c < st.cols && rr >= 0 && rr < st.rows ? rr * st.cols + c : -1;
      const other = st.tiles.find(o => o.pos === target);
      if (!other || other === t || other.locked) { place(t); return; }
      swap(t, other);
    };
    el.onpointercancel = () => { pid = null; el.classList.remove('drag'); place(t); };
  }
  function tap(t) {
    if (!st.sel) { st.sel = t; t.el.classList.add('sel'); buzz(5); return; }
    if (st.sel === t) { clearSel(); return; }
    const a = st.sel; clearSel(); swap(a, t);
  }
  function swap(a, b) {
    [a.pos, b.pos] = [b.pos, a.pos];
    a.el.style.zIndex = 4; b.el.style.zIndex = 3;
    place(a); place(b);
    setTimeout(() => { a.el.style.zIndex = ''; b.el.style.zIndex = ''; }, 380);
    st.moves++; stats(); buzz(8);
    let hit = false;
    for (const t of [a, b]) if (t.pos === t.home) {
      t.locked = true; t.el.classList.add('ok'); replay(t.el, 'flash'); hit = true;
      setTimeout(() => fx.at(t.el, ['✨'], 6, .5), 250);
    }
    if (hit) buzz(20);
    save();
    if (st.tiles.every(t => t.locked)) setTimeout(win, 350);
  }
  function win() {
    st.done = true; clearInterval(st.timer); store.set(key(st.p.id), null);
    st.board.classList.add('solved'); layout();
    navigator.vibrate && navigator.vibrate([40, 60, 80]);
    const r = st.board.getBoundingClientRect();
    [0, 1, 2].forEach(i => setTimeout(() => fx.burst(r.left + r.width * (.2 + .3 * i), r.top + r.height * .45, ['💖', '✨', '🎉', '💗'], 36, 1.3), 500 + i * 220));
    $('#pzPeek').hidden = true;
    const w = document.createElement('div'); w.className = 'pz-win';
    w.innerHTML = `<b>Собрано! 🎉</b><span>${fmtT(st.secs)}, ${st.moves} ${plural(st.moves, ['ход', 'хода', 'ходов'])}</span>${st.p.message ? '<p></p>' : ''}`;
    if (st.p.message) $('p', w).textContent = st.p.message;
    $('#pzFoot').prepend(w);
    if (!isAdmin) rpc('puzzle_solved', { pid: st.p.id, secs: st.secs }).catch(e => console.error(e));
  }
  function stop() {
    if (!st) return;
    save(); clearInterval(st.timer); ro && ro.disconnect(); ro = null;
    URL.revokeObjectURL(st.url); st = null;
  }
  return { title: 'Пазлы', open(r) { root = r; showList(); }, close: stop };
})();

/* ---------- 🎨 рисуем вдвоём ---------- */
GAMES.draw = (() => {
  const COLORS = ['#3A1240', '#FF3D8B', '#FF9E7A', '#FFC93C', '#3CCB8E', '#3D8BFF', '#9B6BFF', '#FFFDF6'];
  const SIZES = [.006, .014, .03];
  let cv, g, W, H, strokes = [], seen = new Set(), lastId = 0, timer = 0, color = COLORS[1], size = SIZES[1], cur = null, ro;
  const me = () => isAdmin ? 'he' : 'she';

  function drawStroke(st) {
    const p = st.points; if (!p || !p.length) return;
    g.strokeStyle = st.color; g.lineWidth = Math.max(1.5, st.width * W); g.lineCap = g.lineJoin = 'round';
    g.beginPath(); g.moveTo(p[0][0] * W, p[0][1] * H);
    if (p.length === 1) g.lineTo(p[0][0] * W + .1, p[0][1] * H);
    for (let i = 1; i < p.length - 1; i++) {
      const mx = (p[i][0] + p[i + 1][0]) / 2 * W, my = (p[i][1] + p[i + 1][1]) / 2 * H;
      g.quadraticCurveTo(p[i][0] * W, p[i][1] * H, mx, my);
    }
    if (p.length > 1) g.lineTo(p[p.length - 1][0] * W, p[p.length - 1][1] * H);
    g.stroke();
  }
  function redraw() { g.clearRect(0, 0, W, H); strokes.forEach(drawStroke); cur && drawStroke(cur); }
  function resize() {
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); redraw();
  }
  function status(text, live) { const s = $('.board-status'); if (!s) return; s.textContent = text; s.classList.toggle('live', !!live); }

  function take(rows, initial) {
    let other = false;
    for (const r of rows) {
      lastId = Math.max(lastId, r.id);
      if (seen.has(r.id)) continue; seen.add(r.id);
      if (r.kind === 'clear') { strokes = []; if (!initial) toast(r.who === me() ? 'Лист очищен' : (r.who === 'he' ? 'Он' : 'Она') + ' взял(а) новый лист'); continue; }
      strokes.push(r); if (r.who !== me()) other = true;
    }
    redraw();
    if (other && !initial) { status(isAdmin ? 'Она рисует ✏️' : 'Он рисует ✏️', true); clearTimeout(status.t); status.t = setTimeout(() => status('Рисуем вдвоём'), 3000); }
  }
  async function load() {
    const [clr] = await db('strokes?select=id&kind=eq.clear&order=id.desc&limit=1');
    const from = clr ? clr.id : 0; lastId = from;
    take(await db(`strokes?select=*&id=gt.${from}&kind=eq.line&order=id`), true);
  }
  async function poll() {
    try { take(await db(`strokes?select=*&id=gt.${lastId}&order=id`)); } catch (e) { console.error(e); }
    timer = setTimeout(poll, document.hidden ? 6000 : 2000);
  }
  async function send(st) {
    try {
      const [row] = await db('strokes', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(st) });
      if (row) { seen.add(row.id); lastId = Math.max(lastId, row.id); }
    } catch (e) { console.error(e); toast('Линия не сохранилась, нет сети'); }
  }

  const pt = e => { const r = cv.getBoundingClientRect(); return [+((e.clientX - r.left) / W).toFixed(4), +((e.clientY - r.top) / H).toFixed(4)]; };
  function down(e) { cv.setPointerCapture(e.pointerId); cur = { who: me(), kind: 'line', color, width: size, points: [pt(e)] }; redraw(); }
  function move(e) {
    if (!cur) return;
    const p = pt(e), q = cur.points[cur.points.length - 1];
    if (Math.hypot(p[0] - q[0], p[1] - q[1]) < .004 || cur.points.length > 1400) return;
    cur.points.push(p); redraw();
  }
  function up() { if (!cur) return; const st = cur; cur = null; strokes.push(st); redraw(); send(st); }

  return {
    title: 'Рисуем вдвоём',
    open(root) {
      root.innerHTML = `
        <div class="board"><canvas></canvas><span class="board-status">Загружаю…</span></div>
        <div class="tools">
          ${COLORS.map(c => `<button class="dot" style="--c:${c}" data-c="${c}" aria-label="Цвет"></button>`).join('')}
          <span class="sep"></span>
          ${SIZES.map((s, i) => `<button class="size" data-s="${s}" aria-label="Толщина"><i style="width:${6 + i * 6}px;height:${6 + i * 6}px"></i></button>`).join('')}
          <span class="sep"></span>
          <button class="chip" id="drawClear">🧻 Новый лист</button>
        </div>`;
      cv = $('canvas', root); g = cv.getContext('2d');
      const mark = () => {
        $$('.dot', root).forEach(b => b.setAttribute('aria-pressed', b.dataset.c === color));
        $$('.size', root).forEach(b => b.setAttribute('aria-pressed', +b.dataset.s === size));
      };
      $('.tools', root).onclick = e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.c) color = b.dataset.c; else if (b.dataset.s) size = +b.dataset.s; else return;
        mark(); buzz(6);
      };
      mark();
      const clr = $('#drawClear');
      clr.onclick = async () => {
        if (!clr.classList.contains('arm')) {
          clr.classList.add('arm'); clr.textContent = 'Точно стереть?';
          clearTimeout(clr.t); clr.t = setTimeout(() => { clr.classList.remove('arm'); clr.textContent = '🧻 Новый лист'; }, 3000); return;
        }
        clr.classList.remove('arm'); clr.textContent = '🧻 Новый лист';
        strokes = []; redraw(); await send({ who: me(), kind: 'clear' });
      };
      cv.onpointerdown = down; cv.onpointermove = move; cv.onpointerup = cv.onpointercancel = up;
      ro = new ResizeObserver(resize); ro.observe(cv); resize();
      strokes = []; seen = new Set();
      load().then(() => { status('Рисуем вдвоём'); poll(); }).catch(e => { console.error(e); status('Нет связи'); });
    },
    close() { clearTimeout(timer); timer = 0; ro && ro.disconnect(); cur = null; },
  };
})();

/* ================= 8. пульт ================= */
const fmtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const T = {
  notes: { name: 'Записки', one: 'записку',
    fields: [['text', 'Текст записки', 'area'], ['show_on', 'В какой день показать', 'date']],
    label: r => r.text,
    meta: r => { const t = dateIn(Date.now()), d = fmtDate(r.show_on); return r.show_on > t ? '⏰ Покажется ' + d : r.show_on === t ? '🟢 Сегодня' : 'Была ' + d; } },
  letters: { name: 'Письма', one: 'письмо', order: 'open_at',
    fields: [['title', 'Заголовок на конверте', 'text'], ['open_at', 'Когда можно открыть', 'date'], ['color', 'Цвет конверта', 'color'], ['body', 'Текст письма', 'area']],
    label: r => r.title, meta: r => new Date(r.open_at + 'T00:00:00') <= Date.now() ? 'Уже открыто' : 'Откроется ' + fmtDate(r.open_at) },
  reasons: { name: 'Причины', one: 'причину', order: 'id',
    fields: [['text', 'Почему я тебя люблю', 'area']], label: r => r.text, meta: () => '' },
  plans: { name: 'Планы', one: 'план', order: 'id',
    fields: [['text', 'Что сделаем', 'text'], ['approved', 'Одобрено (она видит без «ждёт»)', 'check'], ['done', 'Уже сделали', 'check']],
    label: r => (r.approved ? '' : '⏳ ') + r.text,
    meta: r => [r.approved ? '' : 'Она предложила, ждёт твоего «да»', r.by_her && r.approved ? 'идея от неё' : '', r.done ? '✓ сделали' : '', r.liked ? '❤ она хочет' : ''].filter(Boolean).join(', ') },
};
T.puzzles = { name: 'Пазлы', one: 'пазл',
  fields: [['image', 'Фото для пазла', 'image'], ['cols', 'Сложность', 'select'],
           ['hint', 'Загадка на карточке (необязательно)', 'text', 1], ['message', 'Что она увидит, когда соберёт (необязательно)', 'area', 1]],
  label: r => r.hint || 'Без загадки',
  meta: r => `${DIFF[r.cols] || r.cols}, ` + (r.solved_at ? `✓ собрала за ${fmtT(r.best_time || 0)}` : 'ещё не собрала') };
const SELECTS = { cols: Object.entries(DIFF).map(([v, n]) => [v, `${n}, ${v}×${v}`]) };
const RELOAD = { notes: () => { typed = false; return loadNote(); }, letters: () => loadLetters(), reasons: () => loadJar(), plans: () => loadPlans(), puzzles: () => {} };
let admTab = 'notes', admRows = [], editing = null;
const sheet = $('#sheet');

function initAdmin() { renderTabs(); loadAdm(); }
function renderTabs() {
  const pend = plans.filter(p => !p.approved).length;
  $('#admTabs').innerHTML = Object.entries(T).map(([k, t]) =>
    `<button data-k="${k}" aria-pressed="${k === admTab}">${t.name}${k === 'plans' && pend ? `<span class="badge">${pend}</span>` : ''}</button>`).join('');
}
$('#admTabs').onclick = e => { const b = e.target.closest('button'); if (!b || b.dataset.k === admTab) return; admTab = b.dataset.k; renderTabs(); loadAdm(); buzz(); };
async function loadAdm() {
  const list = $('#admList'); list.innerHTML = '<p class="err">Загружаю…</p>';
  try { admRows = (await rpc('admin_list', { p: adminPass, tbl: admTab })) || []; renderAdm(); }
  catch (e) { console.error(e); fail(list); }
}
function renderAdm() {
  const t = T[admTab], list = $('#admList');
  if (!admRows.length) { list.innerHTML = '<p class="err">Пусто. Нажми «Добавить»</p>'; return; }
  list.innerHTML = '';
  admRows.forEach((r, i) => {
    const b = document.createElement('button'); b.className = 'adm-item'; b.style.animationDelay = i * 40 + 'ms';
    b.innerHTML = '<b></b><small></small>';
    $('b', b).textContent = t.label(r); $('small', b).textContent = t.meta(r);
    if (r.preview) { b.classList.add('has-img'); const im = new Image(); im.src = r.preview; im.alt = ''; b.prepend(im); }
    b.onclick = () => openSheet(r);
    list.append(b);
  });
}
function openSheet(row) {
  editing = row; const t = T[admTab];
  $('#sheetTitle').textContent = row ? 'Изменить ' + t.one : 'Добавить ' + t.one;
  $('#sheetFields').innerHTML = t.fields.map(([k, l, type]) => type === 'check'
    ? `<label class="chk"><input type="checkbox" name="${k}"><span>${l}</span></label>`
    : type === 'image'
    ? `<div class="field"><span>${l}</span><div class="img-pick"><img class="img-prev" alt="" hidden><div class="img-side"><span class="img-cta">Фото не выбрано</span><div class="img-btns"><label class="chip">🖼 Галерея<input type="file" accept="image/*" hidden></label><label class="chip">📁 Файлы<input type="file" hidden></label></div></div></div></div>`
    : type === 'select'
    ? `<label class="field"><span>${l}</span><select name="${k}">${SELECTS[k].map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select></label>`
    : type === 'color'
    ? `<div class="field"><span>${l}</span><div class="pal-row"><div class="env env-mini c0" id="envPrev"><div class="env-box"><div class="env-back"></div><div class="env-paper"></div><div class="env-front"></div><div class="env-flap"></div><div class="env-seal">❤</div></div></div><div class="swatches" id="swatches"></div></div><div class="pal-actions"><button type="button" class="chip" id="palGen">🎲 Другие цвета</button><label class="chip">🎨 Свой<input type="color" name="${k}"></label></div></div>`
    : `<label class="field"><span>${l}</span>${type === 'area' ? `<textarea name="${k}" rows="${k === 'body' ? 9 : 3}"></textarea>` : `<input name="${k}" type="${type}">`}</label>`).join('');
  t.fields.forEach(([k, , type]) => {
    const el = $(`[name="${k}"]`, sheet);
    if (type === 'check') el.checked = row ? !!row[k] : k === 'approved';
    else if (type === 'color') initPalette(el, row && row[k]);
    else if (type === 'image') initImagePick(row);
    else if (type === 'select') el.value = row ? row[k] : '4';
    else el.value = row ? (row[k] ?? '') : type === 'date' ? defaultDate(k) : '';
  });
  const del = $('#sheetDel'); del.hidden = !row; del.classList.remove('arm'); del.textContent = 'Удалить';
  sheet.showModal();
}
// новая записка по умолчанию встаёт на следующий свободный день
function defaultDate(k) {
  const today = dateIn(Date.now());
  if (admTab !== 'notes' || k !== 'show_on') return today;
  const last = admRows.map(r => r.show_on).filter(Boolean).sort().pop();
  if (!last || last < today) return today;
  const d = new Date(last + 'T12:00:00'); d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('sv-SE');
}
function initPalette(input, current) {
  const prev = $('#envPrev'), sw = $('#swatches');
  const pick = hex => {
    input.value = hex; paintEnv(prev, hex);
    $$('button', sw).forEach(b => b.setAttribute('aria-pressed', b.dataset.c === hex));
  };
  const fill = () => {
    const pal = genPalette();
    sw.innerHTML = pal.map(c => `<button type="button" data-c="${c}" style="background:${c}" aria-label="Цвет"></button>`).join('');
    return pal;
  };
  sw.onclick = e => { const b = e.target.closest('button'); if (b) { pick(b.dataset.c); buzz(); } };
  $('#palGen').onclick = () => { const p = fill(); pick(p[0]); replay(prev, 'wiggle'); buzz(); };
  input.oninput = () => pick(input.value);
  const pal = fill();
  pick(current && /^#[0-9a-f]{6}$/i.test(current) ? current : pal[0]);
}
let pendingImg = null;
function initImagePick(row) {
  pendingImg = null;
  const pick = $('.img-pick', sheet), prev = $('.img-prev', pick), cta = $('.img-cta', pick);
  if (row && row.preview) { prev.src = row.preview; prev.hidden = false; cta.textContent = 'Текущее фото'; }
  const isImg = f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(f.name);
  $$('input[type="file"]', pick).forEach(inp => inp.onchange = async () => {
    const f = inp.files[0]; inp.value = ''; if (!f) return;
    if (!isImg(f)) { toast('Это не картинка'); replay(pick, 'shake'); return; }
    cta.textContent = '⏳ Обрабатываю…';
    try {
      pendingImg = await processImage(f);
      prev.src = pendingImg.preview; prev.hidden = false; cta.textContent = '✓ ' + f.name;
      replay(prev, 'pop-in'); buzz();
    } catch (e) {
      console.error(e); cta.textContent = 'Фото не выбрано';
      toast(/heic|heif/i.test(f.name + f.type) ? 'HEIC не открывается, сохрани фото как JPG' : 'Не получилось открыть фото');
    }
  });
}
// сжимаем на телефоне: полное фото ~1080px, превью для пульта и маленький размытый «тизер»
async function processImage(file) {
  const src = URL.createObjectURL(file), img = new Image(); img.src = src; await img.decode();
  let w = img.naturalWidth, h = img.naturalHeight, sx = 0, sy = 0;
  const a = w / h;
  if (a < .6) { const nh = w / .6; sy = (h - nh) / 2; h = nh; }
  else if (a > 1.5) { const nw = h * 1.5; sx = (w - nw) / 2; w = nw; }
  const out = (max, q) => {
    const k = Math.min(1, max / Math.max(w, h)), c = document.createElement('canvas');
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(img, sx, sy, w, h, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  };
  const res = { image: out(1080, .82), preview: out(260, .72), thumb: out(14, .6) };
  URL.revokeObjectURL(src); return res;
}
$('#admAdd').onclick = () => openSheet(null);
$('#sheetX').onclick = () => sheet.close();

const errMsg = e => /bad password/.test(e.message) ? 'Пароль сменился. Нажми «Выйти» и войди заново' : 'Не получилось, проверь интернет';
async function afterChange(msg) {
  sheet.close(); toast(msg); fx.burst(innerWidth / 2, innerHeight / 2, ['✨', '💖', '⭐'], 24);
  await loadAdm(); RELOAD[admTab]();
}
$('#sheetSave').onclick = async () => {
  const t = T[admTab], data = {};
  for (const [k, l, type, opt] of t.fields) {
    if (type === 'image') {
      if (pendingImg) Object.assign(data, pendingImg);
      else if (!editing) { toast('Выбери фото'); replay($('.img-pick', sheet), 'shake'); return; }
      continue;
    }
    const el = $(`[name="${k}"]`, sheet);
    data[k] = type === 'check' ? el.checked : el.value.trim();
    if (type !== 'check' && !opt && !data[k]) { toast(`Заполни «${l}»`); replay(el, 'shake'); el.focus(); return; }
  }
  const btn = $('#sheetSave'); btn.disabled = true; btn.textContent = data.image ? 'Загружаю…' : 'Сохраняю…';
  try {
    await rpc('admin_save', { p: adminPass, tbl: admTab, row_id: editing ? editing.id : null, d: data });
    await afterChange(editing ? 'Сохранено' : 'Добавлено');
  } catch (e) { console.error(e); toast(errMsg(e)); }
  finally { btn.disabled = false; btn.textContent = 'Сохранить'; }
};
$('#sheetDel').onclick = async () => {
  const del = $('#sheetDel');
  if (!del.classList.contains('arm')) { // защита от случайного тапа
    del.classList.add('arm'); del.textContent = 'Точно удалить?'; buzz(20);
    clearTimeout(del.t); del.t = setTimeout(() => { del.classList.remove('arm'); del.textContent = 'Удалить'; }, 3000);
    return;
  }
  try { await rpc('admin_delete', { p: adminPass, tbl: admTab, row_id: editing.id }); await afterChange('Удалено'); }
  catch (e) { console.error(e); toast(errMsg(e)); }
};
$('#logout').onclick = () => { store.set('adm', null); location.reload(); };

/* ================= старт ================= */
loadNote(); loadLetters(); loadJar(); loadPlans(); loadMood();
