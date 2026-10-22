const C = window.CONFIG;
const $ = s => document.querySelector(s);
const DAY = 864e5;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const START = new Date(C.START), END = new Date(C.END);

/* ---------- Supabase REST (без библиотек, легче для ТГ) ---------- */
const H = { apikey: C.SUPABASE_KEY, 'Content-Type': 'application/json' };
if (C.SUPABASE_KEY.startsWith('eyJ')) H.Authorization = 'Bearer ' + C.SUPABASE_KEY;

async function db(path, opts = {}) {
  const r = await fetch(`${C.SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { ...H, ...opts.headers } });
  if (!r.ok) throw new Error(r.status + ' ' + await r.text());
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

/* ---------- helpers ---------- */
const pad = n => String(n).padStart(2, '0');
const plural = (n, f) => f[n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2];
const DAYS = ['день', 'дня', 'дней'];
const dateIn = ms => new Date(ms).toLocaleDateString('sv-SE', { timeZone: C.TZ }); // YYYY-MM-DD
const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const fail = el => { el.textContent = 'Не загрузилось. Проверь интернет и обнови страницу.'; el.classList.add('err'); };
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove('show'), 2500);
}
function onVisible(el, fn) {
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); fn(); } }, { threshold: .4 });
  io.observe(el);
}

/* ---------- 1. Счётчик ---------- */
$('#her').textContent = C.HER_NAME;
function tick() {
  const ms = Math.max(0, END - Date.now());
  const d = Math.floor(ms / DAY), s = Math.floor(ms / 1000) % 86400;
  $('#days').textContent = d;
  $('#daysLabel').textContent = plural(d, DAYS) + ' до дембеля';
  $('#clock').textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}
tick(); setInterval(tick, 1000);

const pct = Math.min(100, Math.max(0, (Date.now() - START) / (END - START) * 100));
setTimeout(() => $('#bar').style.width = pct + '%', 150);
$('#served').textContent = `Отслужено ${pct.toFixed(1)}%`;

/* ---------- 2. Лента ---------- */
function drawTape() {
  const left = Math.max(0, Math.ceil((END - Date.now()) / DAY));
  const L = Math.min(100, left), w = L * 10;
  const tk = i => {
    const x = i * 10, h = i % 10 === 0 ? 28 : i % 5 === 0 ? 20 : 12;
    return `<line x1="${x}" y1="24" x2="${x}" y2="${24 + h}" class="t-tick"/>` +
      (i % 10 === 0 ? `<text x="${x - 4}" y="66" class="t-num">${i}</text>` : '');
  };
  let s = `<rect x="0" y="24" width="1000" height="48" rx="3" class="t-gone"/>`;
  if (L) s += `<rect x="0" y="24" width="${w}" height="48" rx="3" class="t-body"/>`;
  for (let i = 1; i <= L; i++) s += tk(i);
  if (L < 100 && !reduce) { // сегодняшний сантиметр отрезается
    s += `<g class="t-piece"><rect x="${w}" y="24" width="10" height="48" class="t-body"/>${tk(L + 1)}</g>`;
    s += `<text x="${w}" y="18" class="snip">✂️</text>`;
  }
  $('#tape').innerHTML = s;
  $('#tapeCap').textContent =
    left > 100 ? `Ленту начнём резать за 100 дней. Ещё ${left - 100} ${plural(left - 100, DAYS)}` :
    left === 0 ? 'Лента кончилась. Я дома ❤' :
    `Осталось ${L} см: по сантиметру в день`;
}

/* ---------- 3. Записка дня ---------- */
function typeText(el, text) {
  if (reduce) { el.textContent = text; return; }
  let i = 0; el.textContent = '';
  const step = () => { el.textContent = text.slice(0, ++i); if (i < text.length) setTimeout(step, 35); };
  step();
}
async function loadNote() {
  const box = $('#noteText');
  try {
    const [n] = await db('notes?select=text,created_at&order=created_at.desc&limit=1');
    if (!n) { box.textContent = 'Скоро здесь будет записка'; return; }
    $('#noteDate').textContent = new Date(n.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    onVisible(box, () => typeText(box, n.text));
  } catch (e) { console.error(e); fail(box); }
}

/* ---------- 4. Письма с замком ---------- */
async function loadLetters() {
  const box = $('#letters');
  try {
    const [all, opened] = await Promise.all([
      db('letters_locked?select=id,title,open_at&order=open_at'),
      db('letters?select=id,body'), // БД отдаёт только уже открытые
    ]);
    const body = Object.fromEntries(opened.map(l => [l.id, l.body]));
    if (!all.length) { box.innerHTML = '<p class="err">Писем пока нет</p>'; return; }
    box.innerHTML = '';
    for (const l of all) {
      const isOpen = l.id in body;
      const left = Math.max(1, Math.ceil((new Date(l.open_at + 'T00:00:00') - Date.now()) / DAY));
      const b = document.createElement('button');
      b.className = 'env' + (isOpen ? '' : ' locked');
      b.innerHTML = `<span class="env-seal">${isOpen ? '❤' : '🔒'}</span><span class="env-title"></span><span class="env-sub"></span>`;
      b.querySelector('.env-title').textContent = l.title;
      b.querySelector('.env-sub').textContent = isOpen ? 'Открыть' : `Откроется через ${left} ${plural(left, DAYS)}`;
      b.onclick = () => isOpen ? openLetter(l.title, body[l.id]) : replay(b, 'wiggle');
      box.append(b);
    }
  } catch (e) { console.error(e); fail(box); }
}
const dlg = $('#dlg');
function openLetter(title, text) {
  $('#dlgTitle').textContent = title;
  $('#dlgBody').textContent = text;
  dlg.showModal();
}
$('#dlgClose').onclick = () => dlg.close();
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

/* ---------- 5. Банка причин ---------- */
async function loadJar() {
  const out = $('#reason'), jar = $('#jar');
  let list = [], last = -1;
  try { list = (await db('reasons?select=text')).map(r => r.text); }
  catch (e) { console.error(e); fail(out); return; }
  jar.onclick = () => {
    replay(jar, 'wiggle');
    if (!list.length) { out.textContent = 'Банка пока пустая'; return; }
    let i;
    do i = Math.floor(Math.random() * list.length); while (list.length > 1 && i === last);
    last = i;
    out.textContent = list[i];
    replay(out, 'pop');
  };
}

/* ---------- 7. Когда вернусь ---------- */
async function loadPlans() {
  const ul = $('#plans');
  try {
    const rows = await db('plans?select=id,text,liked,done&order=id');
    if (!rows.length) { ul.innerHTML = '<li class="err">Список пока пуст</li>'; return; }
    ul.innerHTML = '';
    for (const p of rows) {
      const li = document.createElement('li');
      if (p.done) li.className = 'done';
      li.innerHTML = '<span></span><button class="heart" aria-label="Хочу">❤️</button>';
      li.firstChild.textContent = p.text;
      const h = li.querySelector('button');
      const set = v => { p.liked = v; h.setAttribute('aria-pressed', v); };
      set(p.liked);
      h.onclick = async () => {
        set(!p.liked);
        try {
          await db(`plans?id=eq.${p.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ liked: p.liked }) });
        } catch (e) { console.error(e); set(!p.liked); toast('Не сохранилось, попробуй ещё раз'); }
      };
      ul.append(li);
    }
  } catch (e) { console.error(e); fail(ul); }
}

/* ---------- 8. Настроение ---------- */
const MOODS = { miss: ['🥺', 'Скучаю'], hold: ['💪', 'Держусь'], wait: ['💌', 'Жду'], happy: ['☀️', 'Хороший день'] };
async function loadMood() {
  const wrap = $('#moods'), cal = $('#cal'), today = dateIn(Date.now());
  const days = [...Array(28)].map((_, i) => dateIn(Date.now() - (27 - i) * DAY));
  const map = {};
  const paint = () => {
    cal.innerHTML = days.map(d => `<div class="${d === today ? 'today' : ''}">${map[d] ? MOODS[map[d]][0] : ''}</div>`).join('');
    wrap.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === map[today]));
  };
  wrap.innerHTML = Object.entries(MOODS).map(([k, [e, t]]) => `<button class="mood" data-k="${k}"><i>${e}</i>${t}</button>`).join('');
  wrap.onclick = async ev => {
    const b = ev.target.closest('button'); if (!b) return;
    const prev = map[today]; map[today] = b.dataset.k; paint();
    try {
      await db('moods?on_conflict=day', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ day: today, mood: b.dataset.k }),
      });
      toast('Сохранено');
    } catch (e) { console.error(e); map[today] = prev; paint(); toast('Не сохранилось, попробуй ещё раз'); }
  };
  try { (await db(`moods?select=day,mood&day=gte.${days[0]}`)).forEach(r => map[r.day] = r.mood); }
  catch (e) { console.error(e); }
  paint();
}

/* ---------- start ---------- */
drawTape();
loadNote();
loadLetters();
loadJar();
loadPlans();
loadMood();
