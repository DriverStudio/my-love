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
  // стиль движения + свои эмодзи + сила. Старые названия тоже понимаем.
  const STYLES = {
    fall: { name: '⬇️ Падают сверху', def: '💗💖💕' },
    leaves: { name: '🍂 Кружась опадают (листопад)', def: '🍂🍁' },
    rise: { name: '🎈 Взлетают снизу (шарики)', def: '🎈' },
    float: { name: '🦋 Парят по экрану', def: '🦋✨' },
    pop: { name: '💥 Появляются и лопаются', def: '🎉🥳💥' },
    burst: { name: '🎆 Салют из эмодзи', def: '✨🎆💫' },
    twinkle: { name: '✨ Мерцают на месте', def: '✨⭐' },
    swirl: { name: '🌀 Вихрь из центра', def: '💫✨' },
    confetti: { name: '🎊 Цветное конфетти', def: '' },
    snow: { name: '❄️ Снег (или свои снежинки)', def: '' },
    rain: { name: '🌧 Дождь', def: '' },
    bubbles: { name: '🫧 Мыльные пузыри', def: '' },
    aurora: { name: '🌌 Северное сияние', def: '' },
  };
  const OLD = { hearts: 'fall', fireworks: 'burst', stars: 'twinkle' };
  const POWER = { low: .5, mid: 1, high: 1.9 };
  const splitEmoji = t => {
    t = String(t || '').trim(); if (!t) return [];
    const parts = window.Intl && Intl.Segmenter ? [...new Intl.Segmenter('ru', { granularity: 'grapheme' }).segment(t)].map(x => x.segment) : Array.from(t);
    return parts.filter(x => x.trim());
  };
  const cv = $('#evFx'), g = cv.getContext('2d');
  let parts = [], cfg = null, raf = 0, last = 0, W = 0, H = 0, boomT = 0, clock = 0;
  const sprites = new Map();
  const sprite = ch => { if (sprites.has(ch)) return sprites.get(ch); const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.font = '48px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 32, 35); sprites.set(ch, c); return c; };
  const COLORS = ['#FF3D8B', '#FFD86B', '#7FE7C4', '#8FD8FF', '#B28CFF', '#FF9E7A'];
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = () => cfg.emo[Math.random() * cfg.emo.length | 0];
  function size() { const d = Math.min(1.5, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); }
  function spawn(first) {
    const st = cfg.style, p = { ch: cfg.emo.length ? pick() : null, t: R(0, 6.3), r: R(0, 6.3), vr: R(-2, 2), s: R(16, 30) };
    if (st === 'fall' || st === 'leaves' || st === 'snow' || st === 'confetti' || st === 'rain') {
      Object.assign(p, { x: R(-20, W + 20), y: first ? R(-H, H) : R(-60, -20), vy: { fall: R(35, 75), leaves: R(25, 50), snow: R(18, 45), confetti: R(55, 120), rain: R(500, 750) }[st] });
      if (st === 'snow' && !p.ch) p.s = R(1.2, 3.6);
      if (st === 'confetti') { p.s = R(5, 10); p.c = COLORS[Math.random() * COLORS.length | 0]; }
      if (st === 'rain') { p.s = R(10, 22); }
    } else if (st === 'rise' || st === 'bubbles') {
      Object.assign(p, { x: R(0, W), y: first ? R(0, H + 200) : H + R(20, 80), vy: -R(30, 70), s: st === 'bubbles' ? R(8, 26) : R(24, 40), popAt: R(H * .05, H * .6) });
    } else if (st === 'float') {
      Object.assign(p, { x: R(0, W), y: R(0, H), vx: R(-18, 18), vy: R(-14, 14), s: R(18, 32) });
    } else if (st === 'pop' || st === 'twinkle') {
      Object.assign(p, { x: R(10, W - 10), y: R(H * .05, H * .85), life: first ? R(0, 1) : 0, sp: st === 'pop' ? R(.6, 1) : R(.25, .45), s: R(18, 36) });
    } else if (st === 'swirl') {
      Object.assign(p, { a: R(0, 6.3), rad: first ? R(0, Math.max(W, H) * .6) : R(0, 20), vrad: R(30, 60), va: R(.6, 1.2) * (Math.random() < .5 ? 1 : -1), s: R(14, 28) });
    }
    return p;
  }
  function seed() {
    const base = { fall: 22, leaves: 18, rise: 12, float: 14, pop: 10, twinkle: 24, swirl: 26, confetti: 55, snow: 70, rain: 70, bubbles: 16, burst: 0, aurora: 0 }[cfg.style] || 0;
    parts = Array.from({ length: Math.round(base * cfg.k) }, () => spawn(true));
  }
  const draw = (p, s, alpha, rot = 0) => { g.globalAlpha = alpha; g.save(); g.translate(p.x, p.y); g.rotate(rot); g.drawImage(sprite(p.ch), -s / 2, -s / 2, s, s); g.restore(); };
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < 33) return; const dt = Math.min(.1, (now - last) / 1000 || .033); last = now; clock += dt;
    g.clearRect(0, 0, W, H);
    const st = cfg.style;
    if (st === 'aurora') { // переливающиеся полосы сияния сверху
      for (let i = 0; i < 3; i++) {
        const y0 = H * (.08 + i * .07), gr = g.createLinearGradient(0, y0 - 60, 0, y0 + 90);
        const c = ['rgba(80,255,190,', 'rgba(140,120,255,', 'rgba(255,90,200,'][i];
        gr.addColorStop(0, c + '0)'); gr.addColorStop(.5, c + (.22 * cfg.k) + ')'); gr.addColorStop(1, c + '0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(0, y0);
        for (let x = 0; x <= W; x += 20) g.lineTo(x, y0 + Math.sin(x * .012 + clock * (.6 + i * .2) + i) * 30 + Math.sin(x * .03 - clock) * 12);
        g.lineTo(W, y0 + 120); g.lineTo(0, y0 + 120); g.fill();
      }
      g.globalAlpha = 1; return;
    }
    if (st === 'burst' && (boomT -= dt) < 0) { // салют: каждые ~1.3 с взрыв из твоих эмодзи
      const x = R(W * .15, W * .85), y = R(H * .1, H * .4), n = Math.round(14 * cfg.k) + 6;
      for (let i = 0; i < n; i++) { const a = i / n * 6.283, v = R(90, 180); parts.push({ spark: 1, ch: pick(), x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, s: R(14, 24), r: 0, vr: R(-3, 3) }); }
      boomT = R(.9, 1.6) / Math.sqrt(cfg.k);
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.pop || p.spark) { // искры салюта и брызги лопнувших пузырей
        p.life -= dt * (p.pop ? 2.5 : .7); p.vy += 80 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        if (p.pop) { g.globalAlpha = p.life; g.fillStyle = '#fff'; g.fillRect(p.x, p.y, 2, 2); }
        else draw(p, p.s, Math.min(1, p.life * 1.5), p.r += p.vr * dt);
        continue;
      }
      p.t += dt;
      switch (st) {
        case 'fall': p.y += p.vy * dt; p.x += Math.sin(p.t * 1.3) * 18 * dt; draw(p, p.s, .8, Math.sin(p.t) * .3); break;
        case 'leaves': p.y += p.vy * dt; p.x += Math.sin(p.t * 1.6) * 55 * dt; draw(p, p.s, .85, Math.sin(p.t * 1.6) * 1.1); break;
        case 'snow': p.y += p.vy * dt; p.x += Math.sin(p.t) * 14 * dt;
          if (p.ch) draw(p, p.s * .8, .85, p.t * .5); else { g.globalAlpha = .9; g.fillStyle = '#fff'; g.shadowColor = 'rgba(60,40,90,.45)'; g.shadowBlur = 4; g.beginPath(); g.arc(p.x, p.y, p.s, 0, 7); g.fill(); g.shadowBlur = 0; } break;
        case 'confetti': p.y += p.vy * dt; p.x += Math.sin(p.t * 2) * 25 * dt; p.r += p.vr * dt;
          g.globalAlpha = .92; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, Math.cos(p.t * 4)); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); break;
        case 'rain': p.y += p.vy * dt; p.x -= p.vy * .12 * dt; g.globalAlpha = .55; g.strokeStyle = '#6F9BE0'; g.lineWidth = 1.4;
          g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + p.s * .12, p.y - p.s); g.stroke(); break;
        case 'rise': p.y += p.vy * dt; p.x += Math.sin(p.t * 1.1) * 14 * dt; draw(p, p.s, .9, Math.sin(p.t) * .15);
          if (p.ch && (p.ch === '🎈' || cfg.emo.length === 1)) { g.globalAlpha = .4; g.strokeStyle = '#fff'; g.lineWidth = 1; g.beginPath(); g.moveTo(p.x, p.y + p.s * .45); g.quadraticCurveTo(p.x + Math.sin(p.t * 2) * 6, p.y + p.s, p.x, p.y + p.s * 1.6); g.stroke(); } break;
        case 'bubbles': p.y += p.vy * dt; p.x += Math.sin(p.t * 2) * 20 * dt;
          if (p.y < p.popAt) { for (let k = 0; k < 6; k++) parts.push({ pop: 1, x: p.x, y: p.y, vx: Math.cos(k) * 60, vy: Math.sin(k) * 60, life: .4 }); parts[i] = spawn(false); continue; }
          g.globalAlpha = .55; g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.4; g.beginPath(); g.arc(p.x, p.y, p.s, 0, 7); g.stroke();
          g.globalAlpha = .35; g.fillStyle = '#fff'; g.beginPath(); g.arc(p.x - p.s * .35, p.y - p.s * .35, p.s * .2, 0, 7); g.fill(); break;
        case 'float': p.vx += Math.sin(p.t * .7) * 6 * dt; p.vy += Math.cos(p.t * .5) * 6 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.x < -30) p.x = W + 30; if (p.x > W + 30) p.x = -30; if (p.y < -30) p.y = H + 30; if (p.y > H + 30) p.y = -30;
          draw(p, p.s * (1 + Math.sin(p.t * 3) * .08), .85, Math.sin(p.t * 3) * .2); break;
        case 'pop': case 'twinkle': p.life += dt * p.sp;
          if (p.life >= 1) { parts[i] = spawn(false); continue; }
          if (st === 'pop') { const k = p.life < .7 ? p.life / .7 : 1 + (p.life - .7) * 1.5; draw(p, p.s * k, p.life < .7 ? 1 : 1 - (p.life - .7) / .3, Math.sin(p.t * 5) * .15); }
          else draw(p, p.s * (.6 + .4 * Math.sin(p.life * Math.PI)), Math.sin(p.life * Math.PI) * .9);
          break;
        case 'swirl': p.a += p.va * dt; p.rad += p.vrad * dt; p.x = W / 2 + Math.cos(p.a) * p.rad; p.y = H * .45 + Math.sin(p.a) * p.rad * .8;
          if (p.rad > Math.max(W, H) * .75) { parts[i] = spawn(false); continue; }
          draw(p, p.s, Math.min(1, p.rad / 60) * .85, p.a); break;
        case 'burst': break;
      }
      if ((st === 'fall' || st === 'leaves' || st === 'snow' || st === 'confetti' || st === 'rain') && p.y > H + 40) parts[i] = spawn(false);
      if (st === 'rise' && p.y < -60) parts[i] = spawn(false);
    }
    g.globalAlpha = 1;
  }
  function effects(force) {
    const live = force || list.find(e => e.live && e.effect && e.effect !== 'none');
    const style = live ? (OLD[live.effect] || live.effect) : 'none';
    const want = live && STYLES[style] && (force || (!store.get('evFxOff') && !reduce && !document.hidden)) ? style : 'none';
    const sig = want + '|' + (live && live.fx_emoji) + '|' + (live && live.fx_power);
    if (sig === effects.sig && (raf || want === 'none')) return;
    effects.sig = sig; cancelAnimationFrame(raf); raf = 0; g.clearRect(0, 0, W, H);
    if (want === 'none') return;
    let emo = splitEmoji(live.fx_emoji);
    if (!emo.length) emo = splitEmoji(STYLES[want].def || (live.effect === 'hearts' ? '💗💖' : ''));
    if (live.effect === 'hearts' && !live.fx_emoji) emo = ['💗', '💖', '❤️', '💕'];
    cfg = { style: want, emo, k: POWER[live.fx_power] || 1 };
    if (!cfg.emo.length && ['fall', 'leaves', 'rise', 'float', 'pop', 'burst', 'twinkle', 'swirl'].includes(want)) cfg.emo = ['✨'];
    size(); seed(); last = 0; raf = requestAnimationFrame(frame);
  }
  // предпросмотр из пульта: эффект на 6 секунд поверх всего
  window.evPreview = (effect, emoji, power) => {
    effects.sig = null; effects({ effect, fx_emoji: emoji, fx_power: power });
    clearTimeout(window.evPreview.t); window.evPreview.t = setTimeout(() => { effects.sig = null; effects(); }, 6000);
  };
  addEventListener('resize', () => { if (cfg && raf) { size(); seed(); } });
  document.addEventListener('visibilitychange', () => effects());
  document.addEventListener('entered', () => { load(); clearInterval(timer); timer = setInterval(() => !document.hidden && load(), 120000); });
  const prevCount = onEnter.count;
  onEnter.count = () => { prevCount && prevCount(); render(); };

  /* ---------- пульт: вкладка «Ивенты» ---------- */
  Object.assign(SELECTS, {
    dur: [['day', 'Весь день'], ['3h', '3 часа с начала (созвон, кино)']],
    repeat: [['none', 'Один раз'], ['weekly', 'Каждую неделю'], ['monthly', 'Каждый месяц'], ['yearly', 'Каждый год']],
    effect: [...Object.entries(STYLES).map(([k, v]) => [k, v.name]), ['none', 'Без эффекта']],
    remind: [['60', 'Напомнить за час'], ['180', 'За 3 часа'], ['1440', 'За день'], ['0', 'Не напоминать']],
    fx_power: [['mid', 'Средне'], ['low', 'Чуть-чуть'], ['high', 'Много']],
  });
  T.events = {
    name: 'Ивенты', one: 'ивент',
    fields: [['title', 'Что будет (Созвон, Наша годовщина, Её день рождения…)', 'text'], ['emoji', 'Эмодзи (необязательно)', 'text', 1],
      ['starts_at', 'Когда (время по Москве)', 'datetime'], ['dur', 'Длительность', 'select'], ['repeat', 'Повторять', 'select'],
      ['effect', 'Эффект на сайте в этот момент', 'select'],
      ['fx_emoji', 'Свои эмодзи для эффекта (необязательно): впиши любые, например 🎂🎈🥳', 'text', 1],
      ['fx_power', 'Сила эффекта', 'select'], ['remind', 'Напоминание', 'select'], ['about', 'Подробности (необязательно)', 'area', 1]],
    label: r => `${r.emoji || '🎉'} ${r.title}`,
    meta: r => {
      const d = new Date(String(r.next_at || r.starts_at).replace(' ', 'T'));
      return d.toLocaleString('ru-RU', { day: 'numeric', month: 'long', ...(r.all_day ? {} : { hour: '2-digit', minute: '2-digit' }) }) + (REP[r.repeat] ? `, ${REP[r.repeat]}` : '') + (r.effect && r.effect !== 'none' ? ', эффект ✨' : '');
    },
  };
  RELOAD.events = () => load();
  // кнопка «Посмотреть эффект» в карточке ивента
  new MutationObserver(() => {
    const sh = $('#sheet'); if (!sh.open || admTab !== 'events' || $('#evPrev', sh)) return;
    const f = $('[name="fx_power"]', sh); if (!f) return;
    f.closest('.field').insertAdjacentHTML('afterend', '<button type="button" class="chip" id="evPrev">👁 Посмотреть эффект</button>');
    $('#evPrev', sh).onclick = () => {
      const v = n => $(`[name="${n}"]`, sh).value;
      if (v('effect') === 'none') { toast('Выбран «Без эффекта»'); return; }
      sh.close(); toast('Смотри 6 секунд 👀'); evPreview(v('effect'), v('fx_emoji'), v('fx_power'));
      setTimeout(() => { if (!sh.open) sh.showModal(); }, 6200);
    };
  }).observe($('#sheetFields'), { childList: true });
})();
