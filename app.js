const C = window.CONFIG;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const DAY = 864e5;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const START = new Date(C.START), END = new Date(C.END);

/* ================= helpers ================= */
const H = { apikey: C.SUPABASE_KEY, 'Content-Type': 'application/json' };
if (C.SUPABASE_KEY.startsWith('eyJ')) H.Authorization = 'Bearer ' + C.SUPABASE_KEY;
async function db(path, opts = {}) {
  const r = await fetch(`${C.SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { ...H, ...opts.headers } });
  if (!r.ok) throw new Error(r.status + ' ' + await r.text());
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
const pad = n => String(n).padStart(2, '0');
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
  if (i === cur || busy || i < 0 || i >= screens.length) return;
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
  $('#enter').onclick = e => {
    const r = e.currentTarget.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    fx.burst(x, y, ['❤️', '💖', '💗', '✨'], 60, 1.4); buzz(30);
    $('#intro').classList.add('out'); setTimeout(() => $('#intro').remove(), 1000);
    go(0, x, y);
    setTimeout(() => $('#nav').classList.add('on'), 700);
  };
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
  [...str].forEach((ch, k) => clockCols[k].style.transform = `translateY(-${ch}em)`);
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
    [note] = await db('notes?select=text,created_at&order=created_at.desc&limit=1');
    $('#noteDate').textContent = note ? new Date(note.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : ' ';
    if (!note) $('#noteText').textContent = 'Скоро здесь будет записка';
  } catch (e) { console.error(e); fail($('#noteText')); }
}
onEnter.note = () => { if (note && !typed) { typed = true; setTimeout(() => typeText($('#noteText'), note.text), 700); } };
$('#noteCard').onclick = e => { replay($('#noteCard'), 'jelly'); fx.burst(e.clientX, e.clientY, ['💖', '💗', '✨'], 18); buzz(); };

/* ================= 3. письма ================= */
const dlg = $('#dlg'); let openedEnv = null;
async function loadLetters() {
  const box = $('#letters');
  try {
    const [all, opened] = await Promise.all([db('letters_locked?select=id,title,open_at&order=open_at'), db('letters?select=id,body')]);
    const body = Object.fromEntries(opened.map(l => [l.id, l.body]));
    if (!all.length) { box.innerHTML = '<p class="err">Писем пока нет</p>'; return; }
    box.innerHTML = '';
    all.forEach((l, n) => {
      const isOpen = l.id in body, openDate = new Date(l.open_at + 'T00:00:00');
      const left = Math.max(1, Math.ceil((openDate - Date.now()) / DAY));
      const b = document.createElement('button');
      b.className = `env c${n % 4}` + (isOpen ? '' : ' locked'); b.dataset.a = '';
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
  const done = plans.filter(p => p.done).length, liked = plans.filter(p => p.liked).length;
  $('#plansSub').textContent = `Сделали ${done} из ${plans.length}, твоих сердечек ${liked}`;
}
async function loadPlans() {
  const ul = $('#plans');
  try {
    plans = await db('plans?select=id,text,liked,done&order=id');
    if (!plans.length) { ul.innerHTML = '<li class="empty">Список пока пуст</li>'; return; }
    ul.innerHTML = '';
    for (const p of plans) {
      const li = document.createElement('li');
      li.className = 'plan' + (p.done ? ' done' : ''); li.dataset.a = '';
      li.innerHTML = `<span class="check">${p.done ? '✓' : ''}</span><span class="t"></span><button class="heart" aria-label="Хочу">❤️</button>`;
      $('.t', li).textContent = p.text;
      const h = $('.heart', li);
      const set = v => { p.liked = v; h.setAttribute('aria-pressed', v); plansSub(); };
      set(p.liked);
      h.onclick = async () => {
        set(!p.liked); buzz();
        if (p.liked) fx.at(h, ['❤️', '💖'], 14, .8);
        try { await db(`plans?id=eq.${p.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ liked: p.liked }) }); }
        catch (e) { console.error(e); set(!p.liked); toast('Не сохранилось, попробуй ещё раз'); }
      };
      ul.append(li);
    }
    stagger($('.s-plans'));
  } catch (e) { console.error(e); fail(ul); }
}

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
$$('.game').forEach(g => g.onclick = () => { replay($('i', g), 'wiggle'); fx.at(g, ['✨', '🎮'], 12); toast('Скоро открою 😉'); });

/* ================= старт ================= */
loadNote(); loadLetters(); loadJar(); loadPlans(); loadMood();
