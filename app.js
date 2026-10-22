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

// свайпы между экранами — только «чистые» горизонтальные, не с краёв и не по прокручиваемым штукам
const EDGE = 36; // у краёв живут системные жесты «назад» (iPhone, Android с жестами)
const NOSWIPE = 'input, textarea, select, .tabs, .tools, .swatches, .noswipe';
function scrollsX(el) {
  for (; el && el !== document.body; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 2 && /(auto|scroll)/.test(getComputedStyle(el).overflowX)) return true;
  }
  return false;
}
let sw = null;
$('#app').addEventListener('touchstart', e => {
  const t = e.touches[0];
  sw = null;
  if (e.touches.length > 1 || busy) return;
  if (t.clientX < EDGE || t.clientX > innerWidth - EDGE) return;
  if (e.target.closest(NOSWIPE) || scrollsX(e.target)) return;
  sw = { x: t.clientX, y: t.clientY, t: Date.now(), dead: false };
}, { passive: true });
$('#app').addEventListener('touchmove', e => {
  if (!sw || sw.dead) return;
  const t = e.touches[0], dx = t.clientX - sw.x, dy = t.clientY - sw.y;
  if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) sw.dead = true; // человек листает вниз — не мешаем
}, { passive: true });
$('#app').addEventListener('touchend', e => {
  if (!sw || sw.dead || e.touches.length) { sw = null; return; }
  const t = e.changedTouches[0], dx = t.clientX - sw.x, dy = t.clientY - sw.y, dt = Date.now() - sw.t;
  sw = null;
  if (dt > 650 || Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 2) return;
  go(cur + (dx < 0 ? 1 : -1), dx < 0 ? innerWidth : 0, t.clientY);
}, { passive: true });
$('#app').addEventListener('touchcancel', () => sw = null, { passive: true });

// iPhone: не даём странице/ТГ утаскивать экран, пока двигаешь пазл или рисуешь
$('#layer').addEventListener('touchmove', e => { if (e.target.closest('.pz-board, .board')) e.preventDefault(); }, { passive: false });

/* ================= интро ================= */
(function intro() {
  const el = $('#introTitle'); let i = 0;
  `Это для тебя, ${C.HER_NAME}`.split(' ').forEach(word => {
    const w = document.createElement('span'); w.className = 'w';
    for (const ch of word) { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; s.style.setProperty('--i', i++); w.append(s); }
    el.append(w, ' ');
  });
  function enter(btn, chars, pt) {
    const r = btn.getBoundingClientRect(), x = pt ? pt[0] : r.left + r.width / 2, y = pt ? pt[1] : r.top + r.height / 2;
    fx.burst(x, y, chars, 60, 1.4); buzz(30);
    if (isAdmin) { $('#suggest').hidden = true; $('#navAdmin').hidden = false; $('#nav').style.setProperty('--n', 8); initAdmin(); loadPlans(); }
    $('#intro').classList.add('out'); setTimeout(() => $('#intro').remove(), 1000);
    go(0, x, y);
    setTimeout(() => $('#nav').classList.add('on'), 700);
  }
  /* --- вопрос на входе для неё --- */
  let quizQ = null, wrong = 0;
  const NOPE = ['Хм, не то 🤔', 'Точно? Подумай ещё', 'Неа 😏', 'Почти… или нет 🙈'];
  async function ask(btn) {
    btn.disabled = true;
    try {
      quizQ = await rpc('get_question', {});
      if (!quizQ) return herIn(btn); // вопросов нет — пускаем сразу
      wrong = 0;
      $('#quizQ').textContent = quizQ.question;
      const a = $('#quizA'); a.value = '';
      a.type = quizQ.kind === 'date' ? 'date' : 'text';
      $('#quizHint').hidden = true; $('#quizOther').hidden = true;
      $('#who').hidden = true; $('#login').hidden = true; $('#quiz').hidden = false; $('#intro').classList.add('asking');
      replay($('#quiz'), 'pop-in');
      if (a.type === 'text') setTimeout(() => a.focus(), 300);
    } catch (e) { console.error(e); herIn(btn); } // нет связи — не мучаем
    finally { btn.disabled = false; }
  }
  async function answer() {
    const a = $('#quizA'), btn = $('#quizBtn');
    if (!a.value.trim()) { replay(a, 'shake'); return; }
    btn.disabled = true;
    try {
      const r = await rpc('check_answer', { qid: quizQ.id, a: a.value });
      if (r && r.ok) { $('#quiz').hidden = true; return herIn(btn); }
      wrong++; replay(a, 'shake'); buzz(60);
      toast(NOPE[Math.floor(Math.random() * NOPE.length)]);
      if (r && r.hint) { $('#quizHint').textContent = 'Подсказка: ' + r.hint; $('#quizHint').hidden = false; }
      if (wrong >= 2) $('#quizOther').hidden = false;
    } catch (e) { console.error(e); toast('Нет связи, попробуй ещё раз'); }
    finally { btn.disabled = false; }
  }
  $('#asHer').onclick = e => { preloadMemories(); ask(e.currentTarget); };
  // её вход: вжух → полёт сквозь воспоминания → «привет»
  function herIn(btn) {
    if (reduce) return enter(btn, ['💗', '💖', '✨']);
    entrance(() => enter(btn, ['💗', '💖', '✨', '💫'], [innerWidth / 2, innerHeight / 2]));
  }
  $('#quizBtn').onclick = answer;
  $('#quizA').onkeydown = e => { if (e.key === 'Enter') answer(); };
  $('#quizOther').onclick = () => ask($('#quizOther'));
  $('#quizBack').onclick = () => { $('#quiz').hidden = true; $('#who').hidden = false; $('#intro').classList.remove('asking'); };
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
const HEART = '<svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21C5 16 1 12.5 1 7.5 1 4 3.7 1.5 7 1.5c2 0 3.8 1 5 2.7C13.2 2.5 15 1.5 17 1.5c3.3 0 6 2.5 6 6 0 5-4 8.5-11 13.5Z"/></svg>';
function plansSub() {
  const ok = plans.filter(p => p.approved), both = plans.filter(p => p.liked && p.liked_he).length;
  $('#plansSub').textContent = `Сделали ${ok.filter(p => p.done).length} из ${ok.length}` + (both ? `, совпали ${both} 💞` : '');
}
async function loadPlans() {
  const ul = $('#plans');
  try {
    plans = await db('plans?select=id,text,liked,liked_he,done,approved,by_her&order=id');
    if (!plans.length) { ul.innerHTML = '<li class="empty">Список пока пуст</li>'; return; }
    ul.innerHTML = '';
    for (const p of plans) {
      const li = document.createElement('li');
      li.className = 'plan' + (p.done ? ' done' : '') + (p.approved ? '' : ' pending'); li.dataset.a = '';
      const tag = p.approved ? (p.by_her ? `<span class="tag">${isAdmin ? 'её идея' : 'твоя идея'} 💡</span>` : '') : `<span class="tag">${isAdmin ? 'ждёт твоего «да»' : 'ждёт его «да»'}</span>`;
      li.innerHTML = `<span class="check">${p.done ? '✓' : p.approved ? '' : '⏳'}</span><span class="t"><span class="tx"></span>${tag}</span>
        <button class="likes ${isAdmin ? 'me-him' : 'me-her'}" aria-label="Хочу"><span class="lh her">${HEART}</span><span class="lh him">${HEART}</span></button>`;
      $('.tx', li).textContent = p.text;
      const btn = $('.likes', li), mineK = () => isAdmin ? 'liked_he' : 'liked';
      const paint = () => {
        $('.her', btn).classList.toggle('on', !!p.liked); $('.him', btn).classList.toggle('on', !!p.liked_he);
        btn.classList.toggle('match', !!(p.liked && p.liked_he)); btn.setAttribute('aria-pressed', !!p[mineK()]);
      };
      paint();
      btn.onclick = async () => {
        const mine = mineK(), v = !p[mine]; p[mine] = v; paint(); plansSub(); buzz();
        replay($(isAdmin ? '.him' : '.her', btn), 'pump');
        if (v) fx.at(btn, p.liked && p.liked_he ? ['💞', '💖', '✨'] : [isAdmin ? '💜' : '💗'], p.liked && p.liked_he ? 26 : 10, .8);
        if (v && p.liked && p.liked_he) toast('Совпадение! 💞');
        try {
          if (isAdmin) await rpc('admin_like', { p: adminPass, row_id: p.id, v });
          else await db(`plans?id=eq.${p.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ liked: v }) });
        } catch (e) { console.error(e); p[mine] = !v; paint(); plansSub(); toast('Не сохранилось, попробуй ещё раз'); }
      };
      ul.append(li);
    }
    plansSub();
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
    try { list = await db('puzzles?select=id,hint,cols,message,thumb,preview,solved_at,best_time,rotate,opens_at&order=id.desc'); }
    catch (e) { console.error(e); fail($('#pzList')); return; }
    const box = $('#pzList'); if (!box) return;
    if (!list.length) { box.innerHTML = `<p class="err">Пазлов пока нет. ${isAdmin ? 'Добавь в пульте 🧩' : 'Скоро появятся 😉'}</p>`; return; }
    box.innerHTML = '';
    list.forEach((p, i) => {
      const saved = store.get(key(p.id)), solved = !!p.solved_at;
      const lockDays = p.opens_at ? Math.ceil((new Date(p.opens_at + 'T00:00:00') - Date.now()) / DAY) : 0, locked = lockDays > 0 && !isAdmin;
      const b = document.createElement('button'); b.className = 'pz-card' + (locked ? ' locked' : ''); b.style.animationDelay = i * 70 + 'ms';
      b.innerHTML = `<div class="pz-thumb${solved ? ' solved' : ''}"><i></i>${solved ? '' : `<span class="pz-q">${locked ? '🔒' : '?'}</span>`}<span class="pz-badge"></span></div><b></b><small></small>`;
      $('i', b).style.backgroundImage = `url("${solved ? p.preview || p.thumb : p.thumb}")`;
      $('.pz-badge', b).textContent = (DIFF[p.cols] || `${p.cols}×${p.cols}`) + (p.rotate ? ' 🔄' : '');
      $('b', b).textContent = p.hint || (solved ? 'Собрано' : 'Что же тут?');
      $('small', b).textContent = locked ? `Откроется через ${lockDays} ${plural(lockDays, DAYS)}` : solved ? `✓ ${fmtT(p.best_time || 0)}` : saved ? '▶ Продолжить' : 'Нажми, чтобы собрать';
      b.onclick = () => {
        if (locked) { replay($('.pz-thumb', b), 'wiggle'); buzz(25); toast('Откроется ' + fmtDate(p.opens_at)); return; }
        buzz(); start(p);
      };
      box.append(b);
    });
  }

  async function start(p) {
    $('#layerTitle').textContent = p.hint || 'Пазл';
    root.innerHTML = `
      <div class="pz-bar"><span class="pz-stat" id="pzTime">0:00</span><span class="pz-stat" id="pzMoves">0 ходов</span>
        <button class="chip" id="pzPeek">👁 Подсмотреть</button></div>
      <div class="pz-stage" id="pzStage"><div class="pz-board" id="pzBoard"><div class="pz-ghost"></div></div><p class="pz-loading">Загружаю картинку…</p></div>
      <div class="pz-foot" id="pzFoot">${p.rotate ? '<p class="pz-tip">Тап — повернуть, тащи — переставить</p>' : ''}<button class="link" id="pzBack">← Все пазлы</button></div>`;
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
    const rotOn = !!p.rotate;
    const rots = saved && saved.rot && saved.rot.length === n ? saved.rot
      : [...Array(n)].map(() => rotOn ? (Math.random() < .2 ? 0 : 1 + Math.floor(Math.random() * 3)) : 0);
    st = { p, url, cols, rows, n, iw, ih, rotOn, aspect: cols / rows, board, tiles: [], sel: null, done: false, gap: n > 30 ? 2 : 3,
      moves: saved ? saved.moves : 0, secs: saved ? saved.secs : 0, timer: 0 };
    $('.pz-ghost', board).style.backgroundImage = `url(${url})`;
    for (let h = 0; h < n; h++) {
      const el = document.createElement('div'); el.className = 'tile';
      el.style.backgroundImage = `url(${url})`;
      const t = { el, home: h, pos: order[h], rot: rots[h], conn: {}, g: null };
      st.tiles.push(t); board.append(el); bind(t);
    }
    recompute(); st.tiles.forEach(t => t.vconn = { ...t.conn }); stats(); layout();
    // раздача: кусочки вылетают из центра
    st.tiles.forEach(t => { t.el.style.transition = 'none'; t.el.style.opacity = 0; t.el.style.transform = `translate3d(${(st.bw - st.tw) / 2}px,${(st.bh - st.th) / 2}px,0) rotate(${t.rot * 90 + Math.random() * 60 - 30}deg) scale(.2)`; });
    void board.offsetWidth;
    st.tiles.forEach(t => { t.el.style.transition = ''; t.el.style.transitionDelay = (reduce ? 0 : Math.random() * 450 | 0) + 'ms'; t.el.style.opacity = 1; render(t); });
    setTimeout(() => st && st.tiles.forEach(t => t.el.style.transitionDelay = ''), 1000);
    ro = new ResizeObserver(() => { cancelAnimationFrame(st.lraf); st.lraf = requestAnimationFrame(layout); }); ro.observe($('#pzStage'));
    st.timer = setInterval(() => {
      if (document.hidden || !st || st.done) return;
      st.secs++; $('#pzTime').textContent = fmtT(st.secs); if (st.secs % 5 === 0) save();
    }, 1000);
    const peek = $('#pzPeek'), on = () => board.classList.add('peek'), off = () => board.classList.remove('peek');
    peek.onpointerdown = on; peek.onpointerup = peek.onpointerleave = peek.onpointercancel = off;
    peek.oncontextmenu = e => e.preventDefault();
  }

  function stats() { $('#pzTime').textContent = fmtT(st.secs); $('#pzMoves').textContent = `${st.moves} ${plural(st.moves, ['ход', 'хода', 'ходов'])}`; }
  function save() { if (st && !st.done) store.set(key(st.p.id), { order: st.tiles.map(t => t.pos), rot: st.tiles.map(t => t.rot), moves: st.moves, secs: st.secs }); }

  /* --- геометрия --- */
  const cr = i => [i % st.cols, Math.floor(i / st.cols)];
  function layout() {
    const stage = $('#pzStage'); if (!stage || !st) return;
    const sw = stage.clientWidth, sh = stage.clientHeight;
    let bw = sw, bh = sw / st.aspect; if (bh > sh) { bh = sh; bw = sh * st.aspect; }
    bw = Math.floor(bw); bh = Math.floor(bh);
    if (st.dragging) { st.pendingLayout = true; return; }
    if (st.bw && Math.abs(bw - st.bw) < 2 && Math.abs(bh - st.bh) < 2) return; // мелкие дёрганья экрана игнорируем
    const first = !st.bw;
    if (!first) st.board.classList.add('nofx');
    const g = st.gap;
    Object.assign(st, { bw, bh, g, tw: (bw - g * (st.cols - 1)) / st.cols, th: (bh - g * (st.rows - 1)) / st.rows });
    st.px = st.tw + g; st.py = st.th + g;
    st.board.style.width = bw + 'px'; st.board.style.height = bh + 'px';
    // фото «обрезается по центру», чтобы кусочки были квадратными
    const sc = Math.max(bw / st.iw, bh / st.ih), iw = st.iw * sc, ih = st.ih * sc, ox = (bw - iw) / 2, oy = (bh - ih) / 2;
    st.tiles.forEach(t => {
      const [hc, hr] = cr(t.home);
      t.el.style.backgroundSize = `${iw}px ${ih}px`;
      t.el.style.backgroundPosition = `${ox - hc * st.px}px ${oy - hr * st.py}px`;
      shape(t); render(t);
    });
    if (!first) requestAnimationFrame(() => requestAnimationFrame(() => st && st.board.classList.remove('nofx')));
  }
  // кусок рисуется с «нахлёстом» на щель там, где он склеен с соседом
  // позиция (только transform — дёшево и плавно)
  function render(t, dx = 0, dy = 0) {
    const [c, r] = cr(t.pos);
    t.el.style.transform = `translate3d(${c * st.px + dx}px,${r * st.py + dy}px,0) rotate(${t.rot * 90}deg)`;
  }
  // форма: склеенные стороны без щели и без скруглений (+1px нахлёст против швов)
  function shape(t) {
    const k = t.vconn || {}, R = 6;
    t.el.style.width = st.tw + (k.r ? st.g + 1 : 0) + 'px';
    t.el.style.height = st.th + (k.b ? st.g + 1 : 0) + 'px';
    t.el.style.borderRadius = `${k.t || k.l ? 0 : R}px ${k.t || k.r ? 0 : R}px ${k.b || k.r ? 0 : R}px ${k.b || k.l ? 0 : R}px`;
  }

  /* --- склейка: соседи по картинке, стоящие рядом правильно, образуют группу --- */
  function recompute() {
    const T = st.tiles, parent = T.map((_, i) => i);
    const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
    T.forEach(t => t.conn = {});
    const up = t => t.rot % 4 === 0;
    for (const t of T) {
      if (!up(t)) continue;
      const [hc, hr] = cr(t.home), [pc, pr] = cr(t.pos);
      if (hc < st.cols - 1) { const u = T[t.home + 1]; if (up(u) && pc < st.cols - 1 && u.pos === t.pos + 1) { t.conn.r = u.conn.l = true; parent[find(t.home)] = find(u.home); } }
      if (hr < st.rows - 1) { const u = T[t.home + st.cols]; if (up(u) && pr < st.rows - 1 && u.pos === t.pos + st.cols) { t.conn.b = u.conn.t = true; parent[find(t.home)] = find(u.home); } }
    }
    const groups = new Map();
    T.forEach(t => { const r = find(t.home); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(t); });
    groups.forEach(list => { const g = { list, locked: list[0].pos === list[0].home && up(list[0]) }; list.forEach(t => t.g = g); });
    T.forEach(t => t.el.classList.toggle('ok', t.g.locked));
  }
  const links = () => st.tiles.reduce((s, t) => s + (t.conn.r ? 1 : 0) + (t.conn.b ? 1 : 0), 0);

  /* --- управление --- */
  function bind(t) {
    const el = t.el; let sx = 0, sy = 0, dx = 0, dy = 0, drag = false, pid = null, fr = 0;
    const lift = on => t.g.list.forEach(m => { m.el.classList.toggle('drag', on); m.el.style.zIndex = on ? '' : 6; });
    const end = () => { cancelAnimationFrame(fr); fr = 0; st.dragging = false; if (st.pendingLayout) { st.pendingLayout = false; layout(); } };
    el.onpointerdown = e => {
      if (st.done) return;
      if (t.g.locked) { t.g.list.forEach(m => replay(m.el, 'nope')); return; }
      pid = e.pointerId; el.setPointerCapture(pid); sx = e.clientX; sy = e.clientY; drag = false;
    };
    el.onpointermove = e => {
      if (pid !== e.pointerId) return;
      dx = e.clientX - sx; dy = e.clientY - sy;
      if (!drag && Math.hypot(dx, dy) > 7) { drag = true; st.dragging = true; clearSel(); lift(true); }
      if (drag && !fr) fr = requestAnimationFrame(() => { fr = 0; t.g.list.forEach(m => render(m, dx, dy)); });
    };
    el.onpointerup = e => {
      if (pid !== e.pointerId) return; pid = null;
      if (!drag) return tap(t);
      end(); dx = e.clientX - sx; dy = e.clientY - sy;
      const list = t.g.list; lift(false);
      setTimeout(() => list.forEach(m => { if (m.el.style.zIndex === '6') m.el.style.zIndex = ''; }), 350);
      // куда встал схваченный кусок: по его центру
      const [pc, pr] = cr(t.pos);
      const cx = pc * st.px + st.tw / 2 + dx, cy = pr * st.py + st.th / 2 + dy;
      const tc = Math.max(0, Math.min(st.cols - 1, Math.floor(cx / st.px))), tr = Math.max(0, Math.min(st.rows - 1, Math.floor(cy / st.py)));
      if (!move(list, tc - pc, tr - pr)) list.forEach(m => render(m));
    };
    el.onpointercancel = () => { if (pid === null) return; pid = null; if (drag) { end(); lift(false); t.g.list.forEach(m => render(m)); } };
  }
  function clearSel() { if (st.sel) { st.sel.g.list.forEach(m => m.el.classList.remove('sel')); st.sel = null; } }
  function tap(t) {
    if (st.rotOn) { // режим поворота: тап крутит одиночный кусок
      if (t.g.list.length > 1) { t.g.list.forEach(m => replay(m.el, 'nope')); toast('Склейка уже повёрнута правильно 👌'); return; }
      const before = links(), prevConn = new Map(st.tiles.map(x => [x, { ...x.conn }]));
      t.rot++; render(t); st.moves++; stats(); buzz(6);
      settle(before, prevConn); return;
    }
    if (!st.sel) { st.sel = t; t.g.list.forEach(m => m.el.classList.add('sel')); buzz(5); return; }
    const a = st.sel; clearSel();
    if (a.g === t.g) return;
    const [ac, ar] = cr(a.pos), [bc, br] = cr(t.pos);
    if (!move(a.g.list, bc - ac, br - ar)) { a.g.list.forEach(m => replay(m.el, 'nope')); buzz(30); }
  }
  // сдвиг группы на (dc, dr); вытесненные куски уезжают на освободившиеся места
  function move(list, dc, dr) {
    if (!dc && !dr) return false;
    const at = []; st.tiles.forEach(x => at[x.pos] = x);
    const inG = new Set(list), target = new Map(), newCells = new Set();
    for (const m of list) {
      const [c, r] = cr(m.pos), nc = c + dc, nr = r + dr;
      if (nc < 0 || nc >= st.cols || nr < 0 || nr >= st.rows) return false;
      const cell = nr * st.cols + nc; target.set(m, cell); newCells.add(cell);
    }
    const back = i => { const [c, r] = cr(i); return (r - dr) * st.cols + (c - dc); };
    const displaced = [];
    for (const cell of newCells) {
      const o = at[cell]; if (inG.has(o)) continue;
      if (o.g.locked) return false; // собранное на месте не трогаем
      let y = back(cell); while (newCells.has(y)) y = back(y);
      displaced.push([o, y]);
    }
    const before = links(), prevConn = new Map(st.tiles.map(x => [x, { ...x.conn }]));
    target.forEach((cell, m) => { m.pos = cell; m.el.style.zIndex = 4; });
    displaced.forEach(([o, y]) => { o.pos = y; o.el.style.zIndex = 3; });
    setTimeout(() => [...target.keys(), ...displaced.map(d => d[0])].forEach(x => x.el.style.zIndex = ''), 400);
    st.moves++; stats(); buzz(8);
    settle(before, prevConn);
    return true;
  }
  // после любого хода: пересчёт склеек, анимация, сохранение, проверка победы
  function settle(before, prevConn) {
    recompute(); st.tiles.forEach(x => render(x));
    clearTimeout(st.shapeT);
    st.shapeT = setTimeout(() => st && st.tiles.forEach(x => { // склейку рисуем, когда куски доехали
      const v = x.vconn || {}, k = x.conn;
      if (v.r !== k.r || v.b !== k.b || v.l !== k.l || v.t !== k.t) { x.vconn = { ...k }; shape(x); }
    }), 300);
    if (links() > before) { // новая склейка
      const fresh = st.tiles.filter(x => { const p = prevConn.get(x); return (x.conn.r && !p.r) || (x.conn.b && !p.b) || (x.conn.l && !p.l) || (x.conn.t && !p.t); });
      setTimeout(() => {
        fresh.forEach(x => replay(x.el, 'flash'));
        if (fresh[0]) fx.at(fresh[0].el, ['✨'], 8, .5);
        buzz(20);
      }, 260);
    }
    save();
    if (st.tiles.every(x => x.pos === x.home && x.rot % 4 === 0)) setTimeout(win, 380);
  }
  function win() {
    st.tiles.forEach(x => { x.vconn = { ...x.conn }; shape(x); });
    st.done = true; clearInterval(st.timer); store.set(key(st.p.id), null);
    st.board.classList.add('solved');
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

/* ---------- 🃏 мемори ---------- */
GAMES.memory = (() => {
  let root, st = null, photos = null;
  const EMO = ['💗', '🌙', '⭐', '🌸', '🍓', '🎀', '🦋', '🌈', '🍒', '🧸'];
  const LEVELS = [[6, 3], [8, 4], [10, 4]]; // пар, столбцов
  const WORD = ['ход', 'хода', 'ходов'];

  function stop() { if (st) { clearInterval(st.timer); st.ro && st.ro.disconnect(); } st = null; }
  async function getPhotos() {
    if (photos) return photos;
    try { photos = (await db('memories?select=preview&order=id.desc&limit=30')).map(r => r.preview).filter(Boolean); }
    catch (e) { console.error(e); photos = []; }
    return photos;
  }
  function menu() {
    stop(); $('#layerTitle').textContent = 'Мемори';
    const best = store.get('memBest') || {};
    root.innerHTML = `<div class="mm-menu"><p class="mm-lead">Найди пары наших фото. Чем меньше ходов, тем лучше</p>
      ${LEVELS.map(([p], i) => `<button class="mm-level" data-i="${i}" style="animation-delay:${i * 80}ms"><b>${p} пар</b><small>${best[p] ? `рекорд: ${best[p].moves} ${plural(best[p].moves, WORD)}, ${fmtT(best[p].secs)}` : 'ещё не играла'}</small></button>`).join('')}</div>`;
    $$('.mm-level', root).forEach(b => b.onclick = () => { buzz(); start(LEVELS[+b.dataset.i]); });
  }
  async function start([pairs, cols]) {
    stop(); root.innerHTML = '<p class="err">Раскладываю…</p>';
    const ph = [...await getPhotos()].sort(() => Math.random() - .5);
    const faces = [...Array(pairs)].map((_, i) => i < ph.length ? { img: ph[i] } : { emo: EMO[i % EMO.length] });
    const deck = [...faces, ...faces].map((f, i) => ({ ...f, k: i % pairs })).sort(() => Math.random() - .5);
    st = { pairs, cols, deck, open: [], found: 0, moves: 0, secs: 0, lock: false, timer: 0 };
    root.innerHTML = `<div class="pz-bar"><span class="pz-stat" id="mmTime">0:00</span><span class="pz-stat" id="mmMoves">0 ходов</span><span class="pz-stat" id="mmLeft">0/${pairs}</span></div>
      <div class="mm-stage" id="mmStage"><div class="mm-grid" id="mmGrid" style="--cols:${cols}"></div></div>
      <div class="pz-foot" id="mmFoot"><button class="link" id="mmBack">← Уровни</button></div>`;
    $('#mmBack').onclick = menu;
    const grid = $('#mmGrid');
    deck.forEach((c, i) => {
      const b = document.createElement('button'); b.className = 'mm-card'; b.style.animationDelay = i * 35 + 'ms';
      b.innerHTML = '<div class="mm-in"><div class="mm-back"></div><div class="mm-front"></div></div>';
      const f = $('.mm-front', b);
      if (c.img) f.style.backgroundImage = `url("${c.img}")`; else { f.textContent = c.emo; f.classList.add('emo'); }
      c.el = b; b.onclick = () => flip(c); grid.append(b);
    });
    fit(); st.ro = new ResizeObserver(fit); st.ro.observe($('#mmStage'));
  }
  function fit() {
    const stage = $('#mmStage'); if (!stage || !st) return;
    const rows = Math.ceil(st.deck.length / st.cols), gap = 10;
    const s = Math.floor(Math.min((stage.clientWidth - gap * (st.cols - 1)) / st.cols, (stage.clientHeight - gap * (rows - 1)) / rows));
    $('#mmGrid').style.setProperty('--s', s + 'px');
  }
  function stats() {
    $('#mmTime').textContent = fmtT(st.secs);
    $('#mmMoves').textContent = `${st.moves} ${plural(st.moves, WORD)}`;
    $('#mmLeft').textContent = `${st.found}/${st.pairs}`;
  }
  function flip(c) {
    if (!st || st.lock || c.done || st.open.includes(c)) return;
    if (!st.timer) st.timer = setInterval(() => { if (st && !document.hidden) { st.secs++; stats(); } }, 1000);
    c.el.classList.add('up'); buzz(6); st.open.push(c);
    if (st.open.length < 2) return;
    st.moves++; stats(); st.lock = true;
    const [a, b] = st.open;
    if (a.k === b.k) setTimeout(() => {
      [a, b].forEach(x => { x.done = true; x.el.classList.add('match'); });
      fx.at(b.el, ['💖', '✨', '💗'], 16, .7); buzz(20);
      st.found++; stats(); st.open = []; st.lock = false;
      if (st.found === st.pairs) setTimeout(win, 450);
    }, 450);
    else setTimeout(() => {
      [a, b].forEach(x => { x.el.classList.remove('up'); replay(x.el, 'wiggle'); });
      st.open = []; st.lock = false;
    }, 950);
  }
  function win() {
    clearInterval(st.timer);
    const best = store.get('memBest') || {}, prev = best[st.pairs];
    const rec = !prev || st.moves < prev.moves || (st.moves === prev.moves && st.secs < prev.secs);
    if (rec) { best[st.pairs] = { moves: st.moves, secs: st.secs }; store.set('memBest', best); }
    navigator.vibrate && navigator.vibrate([40, 60, 80]);
    const r = $('#mmGrid').getBoundingClientRect();
    [0, 1, 2].forEach(i => setTimeout(() => fx.burst(r.left + r.width * (.2 + .3 * i), r.top + r.height * .4, ['💖', '✨', '🎉', '💗'], 34, 1.2), i * 200));
    const w = document.createElement('div'); w.className = 'pz-win';
    w.innerHTML = `<b>${rec && prev ? 'Новый рекорд! 🏆' : 'Все пары! 🎉'}</b><span>${fmtT(st.secs)}, ${st.moves} ${plural(st.moves, WORD)}</span>`;
    const again = document.createElement('button'); again.className = 'btn btn-sm'; again.textContent = 'Ещё раз';
    const lvl = [st.pairs, st.cols]; again.onclick = () => start(lvl);
    w.append(again); $('#mmFoot').prepend(w);
  }
  return { title: 'Мемори', open(r) { root = r; menu(); }, close: stop };
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
    meta: r => [r.approved ? '' : 'Она предложила, ждёт твоего «да»', r.by_her && r.approved ? 'идея от неё' : '', r.done ? '✓ сделали' : '', r.liked ? '💗 она хочет' : '', r.liked_he ? '💜 ты хочешь' : ''].filter(Boolean).join(', ') },
};
T.puzzles = { name: 'Пазлы', one: 'пазл',
  fields: [['image', 'Фото для пазла', 'image'], ['cols', 'Сложность', 'select'],
           ['rotate', '🔄 Кусочки повёрнуты (тап — поворот)', 'check'],
           ['opens_at', 'Открыть не раньше (необязательно)', 'date', 1],
           ['hint', 'Загадка на карточке (необязательно)', 'text', 1], ['message', 'Что она увидит, когда соберёт (необязательно)', 'area', 1]],
  label: r => r.hint || 'Без загадки',
  meta: r => `${DIFF[r.cols] || r.cols}${r.rotate ? ' 🔄' : ''}, ` + (r.opens_at && r.opens_at > dateIn(Date.now()) ? `🔒 до ${fmtDate(r.opens_at)}, ` : '') + (r.solved_at ? `✓ собрала за ${fmtT(r.best_time || 0)}` : 'ещё не собрала') };
T.questions = { name: 'Вопросы', one: 'вопрос',
  fields: [['question', 'Вопрос', 'text'], ['kind', 'Как она отвечает', 'select'],
           ['answers', 'Правильные ответы: каждый вариант с новой строки. Для даты: 12.05.2023 (или 12.05, если год не важен)', 'area'],
           ['hint', 'Подсказка после ошибки (необязательно)', 'text', 1]],
  label: r => r.question,
  meta: r => `${r.kind === 'date' ? '📅 дата' : '✍️ словами'}, спрашивал ${r.asked_count || 0} ${plural(r.asked_count || 0, ['раз', 'раза', 'раз'])}` + (r.wrong_streak ? `, ошибок подряд: ${r.wrong_streak}` : '') };
T.memories = { name: 'Воспоминания', one: 'воспоминание',
  fields: [['image', 'Фото (летит при её входе)', 'image'], ['caption', 'Подпись (необязательно)', 'text', 1]],
  label: r => r.caption || 'Без подписи', meta: () => 'летает на входе' };
const SELECTS = {
  cols: Object.entries(DIFF).map(([v, n]) => [v, `${n}, ${v}×${v}`]),
  kind: [['text', '✍️ Словами'], ['date', '📅 Выбирает дату']],
};
const RELOAD = { notes: () => { typed = false; return loadNote(); }, letters: () => loadLetters(), reasons: () => loadJar(), plans: () => loadPlans(), puzzles: () => {}, questions: () => {}, memories: () => {} };
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
  t.fields.forEach(([k, , type, opt]) => {
    const el = $(`[name="${k}"]`, sheet);
    if (type === 'check') el.checked = row ? !!row[k] : k === 'approved';
    else if (type === 'color') initPalette(el, row && row[k]);
    else if (type === 'image') initImagePick(row);
    else if (type === 'select') el.value = row ? row[k] : k === 'cols' ? '4' : SELECTS[k][0][0];
    else el.value = row ? (row[k] ?? '') : type === 'date' && !opt ? defaultDate(k) : '';
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
      pendingImg = await processImage(f, admTab === 'memories' ? 720 : 1080);
      prev.src = pendingImg.preview; prev.hidden = false; cta.textContent = '✓ ' + f.name;
      replay(prev, 'pop-in'); buzz();
    } catch (e) {
      console.error(e); cta.textContent = 'Фото не выбрано';
      toast(/heic|heif/i.test(f.name + f.type) ? 'HEIC не открывается, сохрани фото как JPG' : 'Не получилось открыть фото');
    }
  });
}
// сжимаем на телефоне: полное фото ~1080px, превью для пульта и маленький размытый «тизер»
async function processImage(file, max = 1080) {
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
  const res = { image: out(max, .82), preview: out(260, .72), thumb: out(14, .6) };
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
      if (admTab === 'memories') delete data.thumb;
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

/* ================= ✨ её вход: вжух ================= */
let memCache = [], memLoading = null;
function preloadMemories() {
  if (memLoading) return memLoading;
  memLoading = db('memories?select=image,caption&order=id.desc&limit=16').then(rows => Promise.all(rows.map(async r => {
    const img = new Image(); img.src = r.image;
    try { await img.decode(); memCache.push({ img, caption: r.caption }); } catch (e) {}
  }))).catch(e => console.error(e));
  return memLoading;
}

function warpStars(cv) {
  const g = cv.getContext('2d'), stars = [], COL = ['#FFFFFF', '#FFD3E8', '#FF8FC1', '#C9B2FF', '#FFE59A'];
  let W, H, speed = .002, target = .002, raf = 0;
  const resize = () => { const d = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); };
  const spawn = s => { s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; s.z = s.pz = .2 + Math.random() * .8; s.c = COL[Math.random() * COL.length | 0]; return s; };
  for (let i = 0; i < 360; i++) stars.push(spawn({}));
  const frame = () => {
    speed += (target - speed) * .07;
    g.clearRect(0, 0, W, H); g.lineCap = 'round';
    const k = Math.max(W, H) * .5;
    for (const s of stars) {
      s.pz = s.z; s.z -= speed;
      if (s.z <= .02) { spawn(s); continue; }
      const x = W / 2 + s.x / s.z * k, y = H / 2 + s.y / s.z * k, px = W / 2 + s.x / s.pz * k, py = H / 2 + s.y / s.pz * k;
      if (x < -50 || x > W + 50 || y < -50 || y > H + 50) { spawn(s); continue; }
      g.strokeStyle = s.c; g.globalAlpha = Math.min(1, (1 - s.z) * 1.4); g.lineWidth = (1 - s.z) * 3.2;
      g.beginPath(); g.moveTo(px, py); g.lineTo(x + .1, y); g.stroke();
    }
    g.globalAlpha = 1; raf = requestAnimationFrame(frame);
  };
  resize(); frame();
  return { speed: v => target = v, stop: () => cancelAnimationFrame(raf) };
}

function entrance(done) {
  const warp = $('#warp'), space = $('#warpSpace'), fin = $('#warpFinal'), intro = $('#intro');
  const short = false; // всегда полный, есть кнопка «Пропустить»
  const timers = [], at = (ms, f) => timers.push(setTimeout(f, ms));
  let stars, finished = false;
  const days = Math.floor(Math.max(0, END - Date.now()) / DAY);
  fin.innerHTML = `<p class="wf-name"></p><p class="wf-line">я очень скучаю 💗</p><p class="wf-days"><b>${days}</b> ${plural(days, DAYS)} до встречи</p>`;
  $('.wf-name', fin).textContent = C.HER_NAME + ',';

  function finish() {
    if (finished) return; finished = true;
    timers.forEach(clearTimeout); $('#warpSkip').hidden = true;
    warp.classList.add('out'); done();
    setTimeout(() => { stars && stars.stop(); warp.hidden = true; warp.className = 'warp'; space.innerHTML = ''; }, 900);
  }
  $('#warpSkip').onclick = finish;

  // 1. вжух: сердце раздувается во весь экран
  intro.classList.add('vzhuh'); buzz(20);
  $('.intro-heart').animate([
    { transform: 'scale(1)', opacity: 1 },
    { transform: 'scale(.8)', offset: .18 },
    { transform: 'scale(22)', opacity: 1, offset: .8 },
    { transform: 'scale(26)', opacity: 0 },
  ], { duration: 950, easing: 'cubic-bezier(.6,0,.35,1)', fill: 'forwards' });
  at(450, () => {
    warp.hidden = false; void warp.offsetWidth; warp.classList.add('on');
    stars = warpStars($('#warpCv')); stars.speed(.045); navigator.vibrate && navigator.vibrate([15, 30, 15, 30, 40]);
  });
  at(800, () => { intro.style.visibility = 'hidden'; stars.speed(.014); $('#warpSkip').hidden = false; });

  // 2. летят воспоминания
  const texts = [...(reasons || [])].sort(() => Math.random() - .5);
  const EMO = ['💗', '💌', '✨', '🫶', '💖', '🌙', '⭐'];
  let n = 0;
  function card() {
    const el = document.createElement('div'), mem = memCache.length ? memCache[n % memCache.length] : null;
    const kind = mem && n % 3 !== 2 ? 'photo' : texts.length && n % 3 === 2 ? 'text' : 'emo';
    el.className = 'wcard ' + kind;
    if (kind === 'photo') { el.append(mem.img.cloneNode()); if (mem.caption) { const c = document.createElement('span'); c.textContent = mem.caption; el.append(c); } }
    else if (kind === 'text') el.textContent = texts[n % texts.length];
    else el.textContent = EMO[n % EMO.length];
    space.append(el);
    const a = Math.random() * Math.PI * 2, R = 170 + Math.random() * 140, r0 = Math.random() * 40 - 20;
    const x = Math.cos(a) * R, y = Math.sin(a) * R * 1.25;
    el.animate([
      { transform: `translate3d(${x * .25}px,${y * .25}px,-2600px) rotate(${r0}deg)`, opacity: 0 },
      { opacity: 1, offset: .18 },
      { opacity: 1, offset: .82 },
      { transform: `translate3d(${x}px,${y}px,720px) rotate(${r0 * -1.5}deg)`, opacity: 0 },
    ], { duration: 2500, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'forwards' }).onfinish = () => el.remove();
    n++;
  }
  const FLY = short ? 0 : 3600, STEP = 260;
  for (let t = 900; t < 900 + FLY; t += STEP) at(t, card);

  // 3. разгон, вспышка, «привет»
  const T = 900 + FLY + (short ? 400 : 1400);
  at(T - 600, () => stars.speed(.07));
  at(T, () => { warp.classList.add('flash'); navigator.vibrate && navigator.vibrate(60); });
  at(T + 250, () => { stars.speed(.004); warp.classList.add('final'); fx.burst(innerWidth / 2, innerHeight * .42, ['💗', '✨', '💖', '💫'], 50, 1.2); });
  at(T + (short ? 1700 : 2600), finish);
}

/* ================= старт ================= */
loadNote(); loadLetters(); loadJar(); loadPlans(); loadMood();
