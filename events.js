/* =====================================================================
   🎉 ИВЕНТЫ: свидания-созвоны, праздники, годовщины.
   Ближайший — на главном экране с обратным отсчётом; в день ивента —
   эффект на весь сайт (сердечки, конфетти, салют, снег, звёзды).
   ===================================================================== */
(() => {
  const P = () => (isAdmin ? adminPass : null);
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const REP = { none: '', weekly: 'каждую неделю', monthly: 'каждый месяц', yearly: 'каждый год' };
  let list = [], fetchedAt = 0, timer = 0, bannerShown = false;

  /* ---------- загрузка и обратный отсчёт ---------- */
  async function load() {
    try { list = (await rpc('events_upcoming', { p: P() })) || []; fetchedAt = Date.now(); }
    catch (e) { console.error(e); return; }
    render(); effects();
    if (!bannerShown) { bannerShown = true; banner(); }
  }
  const left = e => e.secs - (Date.now() - fetchedAt) / 1000;
  function until(s) {
    if (s <= 0) return 'сейчас';
    const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = Math.floor(s % 60);
    if (d >= 2) return `через ${d} ${plural(d, DAYS)}`;
    if (d === 1) return `через 1 день ${h} ч`;
    return `через ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  const when = e => {
    const d = new Date(e.next_at.replace(' ', 'T'));
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' }) + (e.all_day ? '' : ', ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
  };
  function render() {
    const box = $('#evBox'); if (!box) return;
    if (!list.length) { box.innerHTML = ''; box.hidden = true; return; }
    box.hidden = false;
    const [main, ...rest] = list, live = main.live || left(main) <= 0;
    box.innerHTML = `
      <div class="ev-main ${live ? 'live' : ''}">
        <i>${esc(main.emoji || '🎉')}</i>
        <div><small>${live ? (main.all_day ? 'Сегодня' : 'Сейчас идёт') : 'Ближайший ивент'}</small><b>${esc(main.title)}</b>
          <span class="ev-when">${live ? '✨ ' + (main.about ? esc(main.about) : 'Отмечаем!') : `${when(main)} · <em id="evCount">${until(left(main))}</em>`}</span>
          ${!live && main.about ? `<p class="ev-about">${esc(main.about)}</p>` : ''}</div>
        ${main.effect !== 'none' && live ? `<button class="ev-fx" id="evFxBtn">${store.get('evFxOff') ? '✨ Вкл' : '✨ Выкл'}</button>` : ''}
      </div>
      ${rest.slice(0, 3).map(e => `<div class="ev-row"><i>${esc(e.emoji || '🎉')}</i><b>${esc(e.title)}</b><small>${e.live ? 'сейчас' : when(e)}</small></div>`).join('')}`;
    const fb = $('#evFxBtn'); if (fb) fb.onclick = () => { store.set('evFxOff', !store.get('evFxOff')); effects(); render(); };
  }
  setInterval(() => {
    const c = $('#evCount'); if (c && list[0]) c.textContent = until(left(list[0]));
    if (list[0] && !list[0].live && left(list[0]) <= 0) load(); // ивент начался — обновим
  }, 1000);

  // в день ивента — большая карточка при входе
  function banner() {
    const e = list.find(x => x.live); if (!e) return;
    setTimeout(() => {
      const o = document.createElement('div'); o.className = 'ev-banner';
      o.innerHTML = `<div><i>${esc(e.emoji || '🎉')}</i><small>${e.all_day ? 'Сегодня' : 'Сейчас'}</small><b>${esc(e.title)}</b>${e.about ? `<p>${esc(e.about)}</p>` : ''}<button class="btn btn-sm">Ура! 💗</button></div>`;
      document.body.append(o);
      fx.burst(innerWidth / 2, innerHeight * .4, [e.emoji || '🎉', '✨', '💗'], 50, 1.3);
      navigator.vibrate && navigator.vibrate([40, 60, 40]);
      const close = () => { o.classList.add('out'); setTimeout(() => o.remove(), 400); };
      $('button', o).onclick = close; o.onclick = ev => { if (ev.target === o) close(); };
    }, 1500);
  }

  /* ---------- ✨ эффекты на весь сайт ---------- */
  const cv = $('#evFx'), g = cv.getContext('2d');
  let parts = [], mode = 'none', raf = 0, last = 0, W = 0, H = 0, boomT = 0;
  const sprites = new Map();
  const sprite = ch => { if (sprites.has(ch)) return sprites.get(ch); const c = document.createElement('canvas'); c.width = c.height = 48; const x = c.getContext('2d'); x.font = '36px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 24, 26); sprites.set(ch, c); return c; };
  const COLORS = ['#FF3D8B', '#FFD86B', '#7FE7C4', '#8FD8FF', '#B28CFF', '#FF9E7A'];
  function size() { const d = Math.min(1.5, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); }
  function seed() {
    const n = { hearts: 22, snow: 70, confetti: 55, stars: 26, fireworks: 0 }[mode] || 0;
    parts = Array.from({ length: n }, () => spawn(true));
  }
  function spawn(any) {
    const p = { x: Math.random() * W, y: any ? Math.random() * H : -20, r: Math.random() * 6.3, vr: (Math.random() - .5) * 3, t: Math.random() * 6.3 };
    if (mode === 'hearts') Object.assign(p, { v: 30 + Math.random() * 40, s: 14 + Math.random() * 14, ch: ['💗', '💖', '❤️', '💕'][Math.random() * 4 | 0] });
    if (mode === 'snow') Object.assign(p, { v: 20 + Math.random() * 40, s: 1 + Math.random() * 2.6 });
    if (mode === 'confetti') Object.assign(p, { v: 50 + Math.random() * 70, s: 5 + Math.random() * 5, c: COLORS[Math.random() * COLORS.length | 0] });
    if (mode === 'stars') Object.assign(p, { y: Math.random() * H, v: 0, s: 10 + Math.random() * 12, life: Math.random() });
    return p;
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < 33) return; const dt = Math.min(.1, (now - last) / 1000 || .033); last = now;
    g.clearRect(0, 0, W, H);
    if (mode === 'fireworks' && (boomT -= dt) < 0) { fx.burst(W * (.15 + Math.random() * .7), H * (.12 + Math.random() * .3), ['✨', '💥', '🎆', '⭐'], 22, .9); boomT = 1 + Math.random() * 1.6; }
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]; p.t += dt;
      if (mode === 'stars') {
        p.life += dt * .35; if (p.life > 1) parts[i] = Object.assign(spawn(true), { life: 0 });
        g.globalAlpha = Math.sin(p.life * Math.PI) * .9; const s = p.s * (.6 + .4 * Math.sin(p.life * Math.PI));
        g.drawImage(sprite('✨'), p.x - s / 2, p.y - s / 2, s, s); continue;
      }
      p.y += p.v * dt; p.x += Math.sin(p.t * 1.3) * 18 * dt; p.r += p.vr * dt;
      if (p.y > H + 20) parts[i] = spawn(false);
      if (mode === 'snow') { g.globalAlpha = .8; g.fillStyle = '#fff'; g.beginPath(); g.arc(p.x, p.y, p.s, 0, 7); g.fill(); }
      else if (mode === 'confetti') { g.globalAlpha = .9; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); }
      else if (mode === 'hearts') { g.globalAlpha = .75; g.save(); g.translate(p.x, p.y); g.rotate(Math.sin(p.t) * .3); g.drawImage(sprite(p.ch), -p.s / 2, -p.s / 2, p.s, p.s); g.restore(); }
    }
    g.globalAlpha = 1;
  }
  function effects() {
    const live = list.find(e => e.live && e.effect && e.effect !== 'none');
    const want = live && !store.get('evFxOff') && !reduce && !document.hidden ? live.effect : 'none';
    if (want === mode && (raf || want === 'none')) return;
    mode = want; cancelAnimationFrame(raf); raf = 0; g.clearRect(0, 0, W, H);
    if (mode === 'none') return;
    size(); seed(); last = 0; raf = requestAnimationFrame(frame);
  }
  addEventListener('resize', () => { if (mode !== 'none') { size(); seed(); } });
  document.addEventListener('visibilitychange', effects);
  document.addEventListener('entered', () => { load(); clearInterval(timer); timer = setInterval(() => !document.hidden && load(), 120000); });
  const prevCount = onEnter.count;
  onEnter.count = () => { prevCount && prevCount(); render(); };

  /* ---------- пульт: вкладка «Ивенты» ---------- */
  Object.assign(SELECTS, {
    dur: [['day', 'Весь день'], ['3h', '3 часа с начала (созвон, кино)']],
    repeat: [['none', 'Один раз'], ['weekly', 'Каждую неделю'], ['monthly', 'Каждый месяц'], ['yearly', 'Каждый год']],
    effect: [['hearts', '💗 Сердечки'], ['confetti', '🎉 Конфетти'], ['fireworks', '🎆 Салют'], ['snow', '❄️ Снег'], ['stars', '✨ Звёзды'], ['none', 'Без эффекта']],
    remind: [['60', 'Напомнить за час'], ['180', 'За 3 часа'], ['1440', 'За день'], ['0', 'Не напоминать']],
  });
  T.events = {
    name: 'Ивенты', one: 'ивент',
    fields: [['title', 'Что будет (Созвон, Наша годовщина, Её день рождения…)', 'text'], ['emoji', 'Эмодзи (необязательно)', 'text', 1],
      ['starts_at', 'Когда (время по Москве)', 'datetime'], ['dur', 'Длительность', 'select'], ['repeat', 'Повторять', 'select'],
      ['effect', 'Эффект на сайте в этот момент', 'select'], ['remind', 'Напоминание', 'select'], ['about', 'Подробности (необязательно)', 'area', 1]],
    label: r => `${r.emoji || '🎉'} ${r.title}`,
    meta: r => {
      const d = new Date(String(r.next_at || r.starts_at).replace(' ', 'T'));
      return d.toLocaleString('ru-RU', { day: 'numeric', month: 'long', ...(r.all_day ? {} : { hour: '2-digit', minute: '2-digit' }) }) + (REP[r.repeat] ? `, ${REP[r.repeat]}` : '') + (r.effect && r.effect !== 'none' ? ', эффект ✨' : '');
    },
  };
  RELOAD.events = () => load();
})();
