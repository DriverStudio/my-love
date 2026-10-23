/* =====================================================================
   🪖 СОЛДАТИК — маленький «он», живёт по его распорядку
   Подключается после app.js и пользуется его функциями (db, rpc, fx…)
   ===================================================================== */
(() => {
  const SKIN = { light: '#F7D3B5', medium: '#E9B48A', tan: '#C98E62' };
  const HAIR = ['#2B1D14', '#4A3020', '#7A4E2D', '#B07A45', '#D9B26A', '#111111'];
  const EYES = ['#3B2A20', '#3E6FB0', '#3F8A5A', '#6B6B6B', '#8A5A2B'];
  const DEF_LOOK = { skin: 'light', hair: '#4A3020', style: 'short', eyes: '#3B2A20', glasses: false, stubble: false };
  const DEF_PARCELS = [['🥫', 'Сгущёнка'], ['🍪', 'Печенье'], ['🍫', 'Шоколадка'], ['🍜', 'Доширак'], ['🧃', 'Сок'], ['🍬', 'Конфеты']];
  const STATUS = {
    ok:    ['💪', 'Всё ок',      'Всё хорошо, служит 💪'],
    tired: ['😮‍💨', 'Устал',     'Устал, но держится'],
    duty:  ['🫡', 'Наряд',       'В наряде 🫡'],
    leave: ['🎉', 'Увольнение',  'В увольнении! 🎉'],
    miss:  ['🥺', 'Скучаю',      'Очень скучает по тебе 💗'],
    sick:  ['🤒', 'Болею',       'Приболел 🤒 Пожалей его'],
    field: ['🌲', 'В поле',      'На полевом выходе 🌲'],
  };
  const RANKS = [[0, 'Рядовой', 0], [40, 'Ефрейтор', 1], [70, 'Мл. сержант', 2], [90, 'Сержант', 3]];
  const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  /* ---------- время по его часовому поясу ---------- */
  function nowParts() {
    const d = new Date(), f = new Intl.DateTimeFormat('en-GB', { timeZone: C.TZ, hour: '2-digit', minute: '2-digit', weekday: 'short', month: 'numeric', hour12: false });
    const p = Object.fromEntries(f.formatToParts(d).map(x => [x.type, x.value]));
    const wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday);
    return { min: (+p.hour % 24) * 60 + +p.minute, hour: +p.hour % 24, wd, month: +p.month - 1, date: dateIn(Date.now()) };
  }
  const toMin = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
  // ночь «принадлежит» вечеру, когда начался отбой
  function nightKey(cfg) {
    const n = nowParts();
    return n.min < toMin(cfg.wake || '06:00') ? dateIn(Date.now() - DAY) : n.date;
  }
  function phaseOf(cfg) {
    const n = nowParts(), wake = toMin(cfg.wake || '06:00'), sleep = toMin(cfg.sleep || '22:00');
    const asleep = wake < sleep ? (n.min < wake || n.min >= sleep) : (n.min >= sleep && n.min < wake);
    if (asleep) return 'sleep';
    const since = (n.min - wake + 1440) % 1440, until = (sleep - n.min + 1440) % 1440;
    if (since < 30) return 'exercise';
    if (cfg.offline_until && n.date <= cfg.offline_until) return 'writing';
    if (until <= 30) return 'evening';
    return 'day';
  }
  function skyOf() {
    const h = nowParts().hour;
    return h >= 6 && h < 9 ? 'morning' : h >= 9 && h < 18 ? 'day' : h >= 18 && h < 21 ? 'evening' : 'night';
  }
  function rankOf() {
    const pct = Math.min(100, Math.max(0, (Date.now() - START) / (END - START) * 100));
    let r = RANKS[0]; for (const x of RANKS) if (pct >= x[0]) r = x;
    return { pct, name: r[1], stripes: r[2] };
  }

  /* ---------- рисунок ---------- */
  function head(sleeping) {
    return `
      <ellipse cx="-38" cy="4" rx="7" ry="9" fill="var(--skin)"/><ellipse cx="38" cy="4" rx="7" ry="9" fill="var(--skin)"/>
      <circle r="40" fill="var(--skin)"/>
      <path class="hair hair-short" d="M-41 0C-44-36-18-47 0-47S44-36 41 0C35-17 22-25 0-25S-35-17-41 0Z" fill="var(--hair)"/>
      <path class="hair hair-buzz" d="M-38-6C-38-34-18-42 0-42S38-34 38-6C30-21 16-27 0-27S-30-21-38-6Z" fill="var(--hair)" opacity=".85"/>
      <path class="hair hair-bangs" d="M-41 0C-44-36-18-47 0-47S44-36 41 0C38-12 33-20 28-24Q18-8 6-20Q-6-6-18-18Q-28-10-34-14Z" fill="var(--hair)"/>
      <path class="stubble" d="M-28 12Q0 44 28 12Q24 36 0 38Q-24 36-28 12Z" fill="var(--hair)" opacity=".2"/>
      <ellipse cx="-24" cy="15" rx="7" ry="4.5" fill="#FF8FA8" opacity=".55"/><ellipse cx="24" cy="15" rx="7" ry="4.5" fill="#FF8FA8" opacity=".55"/>
      ${sleeping ? `
      <path d="M-21 4Q-14 9-7 4M7 4Q14 9 21 4" stroke="var(--eyes)" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M-5 20Q0 23 5 20" stroke="#7A3B2E" stroke-width="2.6" fill="none" stroke-linecap="round"/>` : `
      <g class="eyes"><g transform="translate(-14 3)"><g class="eye"><ellipse rx="5.5" ry="7" fill="var(--eyes)"/><circle cx="2" cy="-2.6" r="1.9" fill="#fff"/></g></g>
        <g transform="translate(14 3)"><g class="eye"><ellipse rx="5.5" ry="7" fill="var(--eyes)"/><circle cx="2" cy="-2.6" r="1.9" fill="#fff"/></g></g></g>
      <path class="eyes-happy" d="M-20 5Q-14-2-8 5M8 5Q14-2 20 5" stroke="var(--eyes)" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      <g class="lids"><rect x="-21" y="-5" width="14" height="7" fill="var(--skin)"/><rect x="7" y="-5" width="14" height="7" fill="var(--skin)"/></g>
      <path class="brows" d="M-21-9L-9-11M9-11L21-9" stroke="var(--hair)" stroke-width="3" stroke-linecap="round"/>
      <path class="brows-sad" d="M-21-12L-9-8M9-8L21-12" stroke="var(--hair)" stroke-width="3" stroke-linecap="round"/>
      <path class="m m-smile" d="M-8 19Q0 27 8 19" stroke="#7A3B2E" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path class="m m-flat" d="M-6 21H6" stroke="#7A3B2E" stroke-width="3" stroke-linecap="round"/>
      <path class="m m-sad" d="M-7 24Q0 18 7 24" stroke="#7A3B2E" stroke-width="3" fill="none" stroke-linecap="round"/>
      <g class="m m-open"><ellipse cy="21" rx="6.5" ry="7" fill="#7A3B2E"/><ellipse cy="25" rx="4" ry="2.5" fill="#FF8FA8"/></g>
      <g class="x-sick"><rect x="6" y="20" width="22" height="3" rx="1.5" fill="#fff" transform="rotate(14 6 21)"/><circle cx="27" cy="26" r="2.5" fill="#E0234F"/></g>`}
      <g class="glasses" fill="none" stroke="#2B2418" stroke-width="2.4"><circle cx="-14" cy="3" r="10"/><circle cx="14" cy="3" r="10"/><path d="M-4 2H4"/></g>`;
  }
  const stripes = n => [...Array(n)].map((_, i) => `<rect x="-6" y="${-2 + i * 4}" width="12" height="2.4" rx="1" fill="#FFD86B"/>`).join('');

  function doll(rank) {
    return `
    <g class="sd">
      <ellipse class="sd-shadow" cx="0" cy="2" rx="44" ry="8" fill="rgba(0,0,0,.22)"/>
      <g class="sd-legs">
        <rect x="-22" y="-52" width="18" height="46" rx="8" fill="var(--pants)"/><rect x="4" y="-52" width="18" height="46" rx="8" fill="var(--pants)"/>
        <rect x="-27" y="-12" width="25" height="13" rx="6" fill="#2B2418"/><rect x="2" y="-12" width="25" height="13" rx="6" fill="#2B2418"/>
      </g>
      <g class="sd-up">
        <rect class="x-field" x="-40" y="-110" width="80" height="54" rx="14" fill="#4B5530"/>
        <g class="armL"><rect x="-47" y="-106" width="17" height="50" rx="8.5" fill="var(--uni)"/><rect class="x-duty" x="-47" y="-92" width="17" height="9" fill="#E0234F"/><circle cx="-38.5" cy="-56" r="8.5" fill="var(--skin)"/></g>
        <g class="armR"><rect x="30" y="-106" width="17" height="50" rx="8.5" fill="var(--uni)"/><circle cx="38.5" cy="-56" r="8.5" fill="var(--skin)"/></g>
        <rect x="-34" y="-114" width="68" height="70" rx="22" fill="var(--uni)"/>
        <ellipse cx="-14" cy="-92" rx="6" ry="4" fill="var(--uni2)"/><ellipse cx="16" cy="-74" rx="7" ry="4.5" fill="var(--uni2)"/><ellipse cx="-8" cy="-62" rx="5" ry="3.5" fill="var(--uni2)"/>
        <rect x="-26" y="-98" width="16" height="12" rx="3" fill="var(--uni2)"/><rect x="10" y="-98" width="16" height="12" rx="3" fill="var(--uni2)"/>
        <rect x="-34" y="-54" width="68" height="8" fill="#3A3322"/><rect x="-6" y="-55" width="12" height="10" rx="2" fill="#C9A24A"/>
        <g transform="translate(-26 -110)">${stripes(rank)}</g><g transform="translate(26 -110)">${stripes(rank)}</g>
        <g class="hold x-sign"><rect x="-50" y="-112" width="100" height="50" rx="8" fill="#FFFDF6" stroke="#C9A24A" stroke-width="3"/>
          <text class="sd-signtext" x="0" y="-87" text-anchor="middle"></text></g>
        <g class="hold x-frame"><rect x="-20" y="-96" width="40" height="46" rx="4" fill="#C9A24A"/><rect x="-15" y="-91" width="30" height="36" fill="#FFE0EE"/>
          <path d="M0-62C-10-69-12-76-6-79-3-80 0-78 0-75 0-78 3-80 6-79 12-76 10-69 0-62Z" fill="#FF3D8B"/></g>
        <g class="hold x-letter"><rect x="-22" y="-100" width="44" height="34" rx="3" fill="#fff"/><path d="M-16-90H16M-16-83H12M-16-76H8" stroke="#C9B9D9" stroke-width="2"/></g>
        <g transform="translate(0 -150)"><g class="sd-head">
          ${head(false)}
          <g class="x-cap"><path d="M-42-12C-42-50 42-50 42-12Z" fill="var(--uni)"/><rect x="-43" y="-17" width="86" height="8" rx="3" fill="var(--uni2)"/>
            <path d="M-8-13Q30-16 54-6Q30-4-8-8Z" fill="#3E4627"/><circle cx="0" cy="-30" r="5" fill="#C9A24A"/></g>
          <g class="x-field"><path d="M-48-4C-48-58 48-58 48-4Z" fill="#4B5530"/><rect x="-50" y="-9" width="100" height="8" rx="4" fill="#3E4627"/></g>
        </g></g>
        <text class="sd-item" x="0" y="-122" text-anchor="middle" font-size="26"></text>
      </g>
    </g>`;
  }

  function room() {
    const n = nowParts(), winter = [10, 11, 0, 1, 2].includes(n.month);
    const snow = winter ? [...Array(14)].map((_, i) => `<circle class="snow" cx="${8 + (i * 37) % 96}" cy="-6" r="${1.4 + (i % 3) * .6}" fill="#fff" style="animation-delay:${-i * .37}s;animation-duration:${3 + (i % 4)}s"/>`).join('') : '';
    const stars = [...Array(9)].map((_, i) => `<circle class="star" cx="${10 + (i * 23) % 86}" cy="${8 + (i * 17) % 50}" r="1.3" fill="#fff" style="animation-delay:${-i * .5}s"/>`).join('');
    return `
      <rect x="-400" y="-400" width="1160" height="650" fill="#EFE8D8"/><rect x="-400" y="250" width="1160" height="82" fill="#8FA06E"/><rect x="-400" y="248" width="1160" height="5" fill="#6E7D50"/>
      <rect x="-400" y="330" width="1160" height="500" fill="#B98B5E"/>
      <path d="M-400 362H760M-400 398H760M-400 434H760M90 330V362M220 362V398M140 398V434M300 330V362M-30 362V398M400 398V434" stroke="#A47A50" stroke-width="2"/>
      <g class="win" transform="translate(130 34)">
        <rect x="-6" y="-6" width="112" height="96" rx="6" fill="#fff"/>
        <svg x="0" y="0" width="100" height="84" overflow="hidden"><rect class="sky" width="100" height="84"/>
          <circle class="sun" cx="72" cy="22" r="11" fill="#FFD86B"/><g class="moon"><circle cx="72" cy="22" r="10" fill="#FFF6D6"/><circle cx="77" cy="18" r="9" class="moon-cut"/></g>
          <g class="stars">${stars}</g>${snow}
          <path d="M0 84V66Q14 56 26 66T52 64T80 62T100 66V84Z" fill="rgba(0,0,0,.18)"/></svg>
        <path d="M50 0V84M0 42H100" stroke="#fff" stroke-width="4"/>
      </g>
      <g class="cal" transform="translate(258 38)">
        <rect width="80" height="98" rx="6" fill="#fff" stroke="#D9CDB4" stroke-width="2"/><rect width="80" height="22" rx="6" fill="#E0234F"/><rect y="14" width="80" height="8" fill="#E0234F"/>
        <text x="40" y="16" text-anchor="middle" font-size="12" font-weight="800" fill="#fff" font-family="Unbounded, sans-serif">ДМБ</text>
        <text class="cal-n" x="40" y="62" text-anchor="middle" font-size="26" font-weight="800" fill="#3A1240" font-family="Unbounded, sans-serif"></text>
        <text class="cal-w" x="40" y="84" text-anchor="middle" font-size="11" font-weight="700" fill="#8E6A86" font-family="Manrope, sans-serif"></text>
        <path class="cal-x" d="M14 32L66 88M66 32L14 88" stroke="#E0234F" stroke-width="5" stroke-linecap="round" fill="none"/>
      </g>
      <g class="bunk">
        <rect x="14" y="150" width="8" height="252" rx="3" fill="#7C8796"/><rect x="126" y="150" width="8" height="252" rx="3" fill="#7C8796"/>
        <rect x="18" y="214" width="112" height="6" fill="#7C8796"/><rect x="22" y="196" width="104" height="20" rx="6" fill="#5D6E8C"/><rect x="26" y="190" width="28" height="12" rx="5" fill="#fff"/>
        <rect x="18" y="374" width="112" height="6" fill="#7C8796"/><rect x="22" y="352" width="104" height="24" rx="6" fill="#5D6E8C"/><rect x="26" y="344" width="30" height="13" rx="5" fill="#fff"/>
        <g class="sleeper">
          <g transform="translate(44 345) rotate(-78) scale(.42)">${head(true)}</g>
          <path class="blanket-thin" d="M58 340Q92 330 126 342V368H58Z" fill="#7E8FAD"/>
          <g class="blanket-love"><path d="M54 336Q92 322 128 338V370H54Z" fill="#FF8FC1"/><text x="76" y="358" font-size="12">💗</text><text x="102" y="352" font-size="10">💗</text></g>
          <g class="zzz"><text x="70" y="318" font-size="16" font-weight="800" fill="#C9B2FF">z</text><text x="82" y="304" font-size="20" font-weight="800" fill="#C9B2FF">z</text><text x="96" y="288" font-size="24" font-weight="800" fill="#C9B2FF">Z</text></g>
          <g transform="translate(150 286)"><g class="dream"><ellipse rx="34" ry="24" fill="#fff" opacity=".95"/><circle cx="-26" cy="26" r="6" fill="#fff" opacity=".9"/><circle cx="-36" cy="40" r="3.5" fill="#fff" opacity=".85"/>
            <text y="8" text-anchor="middle" font-size="22">💭</text></g></g>
        </g>
      </g>
      <g class="tumb" transform="translate(262 300)">
        <rect width="72" height="92" rx="4" fill="#A47148"/><rect x="6" y="10" width="60" height="30" rx="3" fill="#B98258"/><circle cx="36" cy="25" r="3" fill="#6E4A2C"/>
        <g class="frame" transform="translate(16 -42)"><rect width="38" height="42" rx="3" fill="#C9A24A"/><rect x="4" y="4" width="30" height="34" fill="#FFE0EE"/>
          <path d="M19 32C9 25 7 18 13 14 16 13 19 15 19 18 19 15 22 13 25 14 31 18 29 25 19 32Z" fill="#FF3D8B"/></g>
        <text class="phone" x="58" y="-6" font-size="18">📱</text>
      </g>
`;
  }

  // перенос текста таблички на 1–3 строки
  function signText(el, t) {
    if (!el) return;
    const words = t.split(/\s+/).filter(Boolean), lines = [];
    let cur = '';
    for (const w of words) { if ((cur + ' ' + w).trim().length > 15 && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
    if (cur) lines.push(cur);
    const L = lines.slice(0, 3), fs = L.length > 2 ? 13 : L.length > 1 ? 15 : 17, lh = fs * 1.05;
    el.setAttribute('font-size', fs);
    el.innerHTML = L.map((l, i) => `<tspan x="0" dy="${i ? lh : -(L.length - 1) * lh / 2 + fs * .35}">${esc(l)}</tspan>`).join('');
  }

  /* =================== ИГРА =================== */
  GAMES.soldier = (() => {
    let root, cfg = null, today = {}, timers = [], phase = 'day', acting = false, fitRO = null;
    const T0 = (ms, f) => timers.push(setTimeout(f, ms));
    const svg = () => $('#sdScene');

    function applyLook(el, look) {
      const L = { ...DEF_LOOK, ...(look || {}) };
      el.style.setProperty('--skin', SKIN[L.skin] || SKIN.light);
      el.style.setProperty('--hair', L.hair); el.style.setProperty('--eyes', L.eyes);
      el.dataset.hair = L.style; el.dataset.glasses = L.glasses ? 1 : 0; el.dataset.stubble = L.stubble ? 1 : 0;
    }

    function bubble(text, ms = 2600, sticky) {
      const b = $('#sdBubble'); if (!b) return;
      b.textContent = text; b.classList.toggle('sticky', !!sticky); replay(b, 'show');
      clearTimeout(bubble.t); if (!sticky) bubble.t = setTimeout(() => b.classList.remove('show'), ms);
    }
    function act(name, ms, mouth) {
      const s = svg(); if (!s) return;
      acting = true; s.dataset.act = name; if (mouth) s.dataset.mouth = mouth;
      clearTimeout(act.t); act.t = setTimeout(() => { if (!svg()) return; delete s.dataset.act; delete s.dataset.mouth; acting = false; }, ms);
    }

    function paint() {
      const s = svg(); if (!s || !cfg) return;
      phase = phaseOf(cfg);
      const n = nowParts(), st = STATUS[cfg.status] ? cfg.status : 'ok', days = Math.floor(Math.max(0, END - Date.now()) / DAY), rk = rankOf();
      s.dataset.st = st; s.dataset.phase = phase; s.dataset.sky = skyOf();
      s.dataset.call = (cfg.call_days || []).includes(n.wd) && phase !== 'sleep' ? 1 : 0;
      s.dataset.sign = cfg.sign && ['day', 'evening'].includes(phase) ? 1 : 0;
      s.dataset.covered = store.get('sdBlanket') === nightKey(cfg) ? 1 : 0;
      $('.cal-n', s).textContent = days; $('.cal-w', s).textContent = plural(days, DAYS);
      signText($('.sd-signtext', s), cfg.sign || '');
      $('#sdRank').textContent = `${rk.name}, ${rk.pct.toFixed(0)}%`;
      const txt = phase === 'sleep' ? 'Отбой. Спит и видит тебя во сне 💤'
        : phase === 'exercise' ? 'Утренняя зарядка! 🏃'
        : phase === 'writing' ? `Без телефона до ${new Date(cfg.offline_until + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}, но думает о тебе и пишет письмо ✍️`
        : STATUS[st][2];
      $('#sdStatus').textContent = txt;
      const extra = [];
      if (+s.dataset.call) extra.push('📞 Сегодня может позвонить');
      if (phase !== 'sleep') extra.push(`Отбой в ${cfg.sleep || '22:00'}`); else extra.push(`Подъём в ${cfg.wake || '06:00'}`);
      $('#sdSub').textContent = extra.join(', ');
      const t = today, care = [['hug', '🤗'], ['parcel', '📦'], ['note', '✉️'], ['blanket', '🛏']].filter(([k]) => t[k]).map(([k, e]) => `${e} ${t[k]}`);
      $('#sdCare').textContent = care.length ? 'Сегодня от тебя: ' + care.join('  ') : 'Он ждёт твоей заботы 💗';
      $('#sdBlanketBtn').classList.toggle('dim', phase !== 'sleep');
    }

    async function load() {
      try {
        const r = await rpc('soldier_state', {});
        if (!svg()) return; // уже закрыли
        cfg = r || {}; today = (r && r.today) || {};
        applyLook(svg(), cfg.look);
        if (!cfg.parcels || !cfg.parcels.length) cfg.parcels = DEF_PARCELS.map(([e, name]) => ({ e, name }));
        paint();
        // приветствие / ответ / вечернее зачёркивание
        const last = store.get('sdLast'), now = Date.now(); store.set('sdLast', now);
        if (cfg.reply && cfg.reply_at && store.get('sdReplySeen') !== cfg.reply_at && !isAdmin) {
          T0(900, () => { bubble('💌 ' + cfg.reply, 0, true); $('#sdBubble').onclick = () => { store.set('sdReplySeen', cfg.reply_at); $('#sdBubble').classList.remove('show', 'sticky'); $('#sdBubble').onclick = null; }; });
        } else if (last && now - last > 2 * DAY && phase !== 'sleep') {
          T0(700, () => { act('jump', 1800, 'open'); bubble('Ты пришла! Я так скучал 💗', 3000); fx.at($('.sd', svg()), ['💗', '✨'], 14, .8); });
        }
        if (phase === 'evening' && store.get('sdCross') !== nowParts().date) T0(1500, crossDay);
        if (phase === 'sleep') preloadMemories();
        if (r && r.last_note && r.last_note.text) {
          $('#sdNote').textContent = `Твоя записка: «${r.last_note.text}» ${r.last_note.read ? '✓ прочитал' : '— ещё не прочитал'}`;
        }
      } catch (e) { console.error(e); const st = $('#sdStatus'); if (st) st.textContent = 'Не загрузилось, проверь интернет'; }
    }

    async function log(kind, payload) {
      today[kind] = (today[kind] || 0) + 1; paint();
      if (isAdmin) return; // его тапы не считаем
      try { await rpc('soldier_care', { k: kind, pl: payload || null }); } catch (e) { console.error(e); }
    }

    /* --- действия --- */
    const REACT = [['salute', 'Так точно! 🫡', 'smile'], ['wave', 'Привет, солнце!', 'open'], ['jump', 'Ура, ты тут! 💗', 'open'], ['laugh', 'Хи-хи, щекотно 😆', 'open']];
    function poke() {
      if (acting) return;
      if (phase === 'sleep') { bubble('Тсс… он спит 💤'); return; }
      if (phase === 'writing') { bubble('Пишу тебе письмо ✍️'); return; }
      if (phase === 'exercise') { bubble('Зарядка! Присоединяйся 💪'); buzz(8); return; }
      const r = REACT[Math.floor(Math.random() * REACT.length)];
      act(r[0], 1400, r[2]); bubble(r[1]); buzz(8);
    }
    function hug() {
      if (phase === 'sleep') { bubble('Улыбнулся во сне 🥰'); fx.at($('.sleeper', svg()), ['💗'], 10, .6); log('hug'); return; }
      if (phase === 'exercise') { bubble('Сначала зарядка, потом обнимашки 😄'); log('hug'); return; }
      act('hug', 2200, 'open'); buzz(30); bubble('Обнимаю тебя крепко-крепко 🤗', 2200);
      fx.at($('.sd', svg()), ['💗', '💖', '🤗', '✨'], 30, 1);
      log('hug');
    }
    function crossDay() {
      if (!svg() || phase === 'sleep') return;
      store.set('sdCross', nowParts().date);
      act('cross', 3400); bubble('Ещё один день позади…', 3000);
      T0(1500, () => { const x = $('.cal-x', svg()); if (x) replay(x, 'draw'); buzz(20); });
    }
    function parcelMenu() {
      const box = $('#sdPanel');
      box.innerHTML = `<p class="sd-ptitle">Что положить в посылку?</p><div class="sd-parcels">${cfg.parcels.map((p, i) => `<button data-i="${i}"><i>${esc(p.e)}</i>${esc(p.name)}</button>`).join('')}</div>`;
      box.hidden = false; replay(box, 'pop-in');
      box.onclick = e => { const b = e.target.closest('button[data-i]'); if (!b) return; box.hidden = true; sendParcel(cfg.parcels[+b.dataset.i]); };
    }
    function flyTo(emoji, done) {
      const scene = $('.sd-stage'), r = scene.getBoundingClientRect(), el = document.createElement('div');
      el.className = 'sd-fly'; el.textContent = emoji; scene.append(el);
      el.animate([{ transform: `translate(${r.width / 2 - 20}px, ${r.height}px) scale(.6) rotate(-20deg)`, opacity: 0 },
                  { transform: `translate(${r.width / 2 - 20}px, ${r.height * .45}px) scale(1.3) rotate(10deg)`, opacity: 1, offset: .7 },
                  { transform: `translate(${r.width / 2 - 20}px, ${r.height * .5}px) scale(.4)`, opacity: 0 }],
                 { duration: 1000, easing: 'cubic-bezier(.3,.8,.4,1)' }).onfinish = () => { el.remove(); done && done(); };
    }
    function sendParcel(p) {
      buzz(15);
      if (phase === 'sleep') { toast(`Положила ${p.e} на тумбочку, утром найдёт`); log('parcel', p.name); return; }
      flyTo('📦', () => {
        $('.sd-item', svg()).textContent = p.e; act('eat', 2600, 'open');
        bubble(`${p.name}! Ты лучшая 😋`, 2600); fx.at($('.sd', svg()), ['💗', p.e, '✨'], 18, .8);
      });
      log('parcel', p.name);
    }
    function noteMenu() {
      const box = $('#sdPanel');
      box.innerHTML = `<p class="sd-ptitle">Записка солдатику</p><textarea id="sdNoteIn" maxlength="140" rows="3" placeholder="Пару тёплых слов…"></textarea><button class="btn btn-sm" id="sdNoteSend">Отправить ✈️</button>`;
      box.hidden = false; replay(box, 'pop-in'); box.onclick = null;
      setTimeout(() => $('#sdNoteIn').focus(), 200);
      $('#sdNoteSend').onclick = () => {
        const t = $('#sdNoteIn').value.trim(); if (!t) { replay($('#sdNoteIn'), 'shake'); return; }
        box.hidden = true; buzz(15);
        $('#sdNote').textContent = `Твоя записка: «${t}» — ещё не прочитал`;
        if (phase === 'sleep') { toast('Подсунула под подушку, утром прочитает 💌'); log('note', t); return; }
        flyTo('✈️', () => { act('read', 3000, 'smile'); T0(1200, () => bubble('Прочитал… спрятал в карман у сердца 💗', 2600)); });
        log('note', t);
      };
    }
    function blanket() {
      if (phase !== 'sleep') { toast('Укрыть можно после отбоя 🌙'); return; }
      const d = nightKey(cfg);
      if (store.get('sdBlanket') === d) { toast('Он уже укрыт и сладко спит 💗'); return; }
      store.set('sdBlanket', d); paint(); buzz(25);
      fx.at($('.sleeper', svg()), ['💗', '✨', '💤'], 18, .7); toast('Укрыла. Ему тепло 🥰');
      log('blanket');
    }
    async function dream() {
      if (!memCache.length) { toast('Загружаю сон…'); await preloadMemories(); }
      if (!svg()) return;
      const list = memCache.length ? memCache : null;
      const box = $('#sdPanel');
      if (!list) { toast('Ему снишься ты 💗'); return; }
      const m = list[Math.floor(Math.random() * list.length)];
      box.innerHTML = `<p class="sd-ptitle">Ему снится…</p><div class="sd-dream"></div>${m.caption ? `<p class="sd-dcap">${esc(m.caption)}</p>` : ''}`;
      $('.sd-dream', box).append(m.img.cloneNode());
      box.hidden = false; replay(box, 'pop-in'); box.onclick = () => box.hidden = true;
    }

    /* --- привязка жестов к сцене --- */
    function bind() {
      const s = svg(); let holdT = 0, held = false;
      const sd = $('.sd', s);
      sd.onpointerdown = e => { e.preventDefault(); held = false; if (!cfg) return; holdT = setTimeout(() => { held = true; hug(); }, 450); };
      sd.onpointerup = () => { clearTimeout(holdT); if (!held && cfg) poke(); };
      sd.onpointerleave = sd.onpointercancel = () => clearTimeout(holdT);
      sd.oncontextmenu = e => e.preventDefault();
      $('.sleeper', s).onclick = () => cfg && hug();
      $('.dream', s).onclick = e => { e.stopPropagation(); dream(); };
      $('.cal', s).onclick = () => { if (!cfg) return; const d = Math.floor(Math.max(0, END - Date.now()) / DAY); bubble(`Осталось ${d} ${plural(d, DAYS)} 📅`); if (phase === 'evening') crossDay(); };
      $('.frame', s).onclick = () => bubble('Тут твоё фото. Смотрю на него каждый день 💗');
      $('.win', s).onclick = () => bubble(phase === 'sleep' ? 'Ночь. Звёзды как у тебя за окном ✨' : 'Смотрю в окно и думаю о тебе');
    }

    return {
      title: 'Солдатик',
      open(r) {
        root = r;
        r.innerHTML = `
          <div class="sd-top"><span class="pz-stat" id="sdRank">…</span></div>
          <div class="sd-stage">
            <svg id="sdScene" class="sd-scene" viewBox="0 0 360 440" preserveAspectRatio="xMidYMid meet">
              ${room()}<g transform="translate(190 412)">${doll(rankOf().stripes)}</g>
              <g class="table x-writing" transform="translate(190 352)"><rect x="-74" y="-18" width="148" height="14" rx="4" fill="#8B5E3C"/><rect x="-66" y="-4" width="10" height="64" fill="#7A5232"/><rect x="56" y="-4" width="10" height="64" fill="#7A5232"/>
                <rect x="-30" y="-26" width="44" height="10" rx="2" fill="#fff" transform="rotate(-6)"/><text x="18" y="-20" font-size="18">✏️</text></g>
              <rect class="night" x="-400" y="-400" width="1160" height="1240" fill="#0B0A2A"/>
            </svg>
            <div class="sd-bubble" id="sdBubble"></div>
            <div class="sd-panel" id="sdPanel" hidden></div>
          </div>
          <div class="sd-info"><p class="sd-status" id="sdStatus">Загружаю…</p><p class="sd-sub" id="sdSub"></p><p class="sd-care" id="sdCare"></p><p class="sd-note" id="sdNote"></p></div>
          <div class="sd-actions">
            <button id="sdHug"><i>🤗</i>Обнять</button><button id="sdParcel"><i>📦</i>Посылка</button>
            <button id="sdNoteBtn"><i>✉️</i>Записка</button><button id="sdBlanketBtn"><i>🛏</i>Укрыть</button>
          </div>`;
        applyLook(svg(), {}); bind();
        // сцена подстраивается под экран: не обрезаем, а «доращиваем» стену/пол
        const fit = () => { const st = $('.sd-stage'), s = svg(); if (!st || !s) return; const a = st.clientWidth / st.clientHeight;
          if (a < 360 / 440) { const H = 360 / a; s.setAttribute('viewBox', `0 ${440 - H} 360 ${H}`); }
          else { const W = 440 * a; s.setAttribute('viewBox', `${(360 - W) / 2} 0 ${W} 440`); } };
        fitRO = new ResizeObserver(fit); fitRO.observe($('.sd-stage')); fit();
        const ready = f => () => { if (cfg) f(); else toast('Секунду, загружаю…'); };
        $('#sdHug').onclick = ready(hug); $('#sdParcel').onclick = ready(parcelMenu);
        $('#sdNoteBtn').onclick = ready(noteMenu); $('#sdBlanketBtn').onclick = ready(blanket);
        $('.sd-stage').addEventListener('click', e => { const p = $('#sdPanel'); if (!p.hidden && !p.contains(e.target) && e.target.closest('svg')) p.hidden = true; });
        load();
        timers.push(setInterval(() => { if (cfg && !acting) { const was = phase; paint(); if (was !== phase && phase === 'evening') crossDay(); } }, 30000));
      },
      close() { timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = []; clearTimeout(act.t); clearTimeout(bubble.t); acting = false; cfg = null; fitRO && fitRO.disconnect(); },
    };
  })();

  /* =================== ПУЛЬТ =================== */
  async function adminView(box) {
    box.innerHTML = '<p class="err">Загружаю…</p>';
    let r;
    try { r = await rpc('admin_soldier_get', { p: adminPass }); }
    catch (e) { console.error(e); fail(box); return; }
    const c = r.cfg || {}, look = { ...DEF_LOOK, ...(c.look || {}) };
    let status = c.status || 'ok', days = new Set(c.call_days || []);
    const parcels = (c.parcels && c.parcels.length ? c.parcels : DEF_PARCELS.map(([e, name]) => ({ e, name }))).map(p => `${p.e} ${p.name}`).join('\n');
    const T = r.today || {}, A = r.total || {};
    const stat = (k, e, n) => `<div><b>${e} ${T[k] || 0}</b><small>${n}, всего ${A[k] || 0}</small></div>`;
    const sw = (arr, cur, key) => arr.map(v => `<button type="button" data-k="${key}" data-v="${v}" style="background:${SKIN[v] || v}" aria-pressed="${v === cur}"></button>`).join('');

    box.innerHTML = `
      <div class="sa">
        <section class="sa-sec"><h4>Статус сейчас</h4>
          <div class="sa-chips" id="saStatus">${Object.entries(STATUS).map(([k, [e, n]]) => `<button type="button" data-v="${k}" aria-pressed="${k === status}">${e} ${n}</button>`).join('')}</div>
          <label class="field"><span>Табличка в руках (необязательно)</span><input id="saSign" maxlength="60" value="${esc(c.sign)}" placeholder="Держусь ради тебя"></label>
          <label class="field"><span>Без связи до (необязательно)</span><div class="sa-row"><input type="date" id="saOff" value="${esc(c.offline_until)}"><button type="button" class="chip" id="saOffX">Убрать</button></div></label>
        </section>
        <section class="sa-sec"><h4>Её забота сегодня</h4>
          <div class="sa-stats">${stat('hug', '🤗', 'обнимашки')}${stat('parcel', '📦', 'посылки')}${stat('note', '✉️', 'записки')}${stat('blanket', '🛏', 'укрыла')}</div>
          <div class="sa-notes">${(r.notes || []).map(n => `<div class="${n.is_read ? '' : 'new'}"><p>${esc(n.payload)}</p><small>${new Date(n.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}${n.is_read ? '' : ' • новая'}</small></div>`).join('') || '<p class="err">Записок пока нет</p>'}</div>
          <label class="field"><span>Ответ ей (появится у солдатика)</span><textarea id="saReply" rows="2" maxlength="140">${esc(c.reply)}</textarea></label>
        </section>
        <section class="sa-sec"><h4>Распорядок</h4>
          <div class="sa-row"><label class="field"><span>Подъём</span><input type="time" id="saWake" value="${esc(c.wake || '06:00')}"></label>
            <label class="field"><span>Отбой</span><input type="time" id="saSleep" value="${esc(c.sleep || '22:00')}"></label></div>
          <span class="sa-lbl">Дни, когда обычно звонишь</span>
          <div class="sa-chips" id="saDays">${WD.map((d, i) => `<button type="button" data-v="${i}" aria-pressed="${days.has(i)}">${d}</button>`).join('')}</div>
        </section>
        <section class="sa-sec"><h4>Внешность</h4>
          <div class="sa-look">
            <svg class="sa-prev" id="saPrev" viewBox="-80 -212 160 220">${doll(rankOf().stripes)}</svg>
            <div class="sa-opts">
              <span class="sa-lbl">Кожа</span><div class="sa-sw">${sw(Object.keys(SKIN), look.skin, 'skin')}</div>
              <span class="sa-lbl">Волосы</span><div class="sa-sw">${sw(HAIR, look.hair, 'hair')}</div>
              <span class="sa-lbl">Глаза</span><div class="sa-sw">${sw(EYES, look.eyes, 'eyes')}</div>
              <div class="sa-chips" id="saStyle">${[['short', 'Стрижка'], ['buzz', 'Ёжик'], ['bangs', 'Чёлка']].map(([v, n]) => `<button type="button" data-v="${v}" aria-pressed="${v === look.style}">${n}</button>`).join('')}</div>
              <div class="sa-chips"><button type="button" id="saGl" aria-pressed="${!!look.glasses}">👓 Очки</button><button type="button" id="saSt" aria-pressed="${!!look.stubble}">🧔 Щетина</button></div>
            </div>
          </div>
        </section>
        <section class="sa-sec"><h4>Посылки</h4>
          <label class="field"><span>По одной в строке: эмодзи и название</span><textarea id="saParcels" rows="6">${esc(parcels)}</textarea></label>
        </section>
        <section class="sa-sec"><h4>Финальное письмо</h4>
          <label class="field"><span>Откроется ей в день дембеля</span><textarea id="saFinal" rows="5">${esc(c.final_letter)}</textarea></label>
        </section>
        <button class="btn sa-save" id="saSave">Сохранить</button>
      </div>`;

    const prev = $('#saPrev');
    const showLook = () => { prev.style.setProperty('--skin', SKIN[look.skin]); prev.style.setProperty('--hair', look.hair); prev.style.setProperty('--eyes', look.eyes);
      prev.dataset.hair = look.style; prev.dataset.glasses = look.glasses ? 1 : 0; prev.dataset.stubble = look.stubble ? 1 : 0; prev.dataset.st = status; };
    showLook();
    const press = (wrap, v) => $$('button', wrap).forEach(b => b.setAttribute('aria-pressed', b.dataset.v === String(v)));
    $('#saStatus').onclick = e => { const b = e.target.closest('button'); if (!b) return; status = b.dataset.v; press($('#saStatus'), status); showLook(); buzz(); };
    $('#saDays').onclick = e => { const b = e.target.closest('button'); if (!b) return; const i = +b.dataset.v; days.has(i) ? days.delete(i) : days.add(i); b.setAttribute('aria-pressed', days.has(i)); buzz(); };
    $('#saStyle').onclick = e => { const b = e.target.closest('button'); if (!b) return; look.style = b.dataset.v; press($('#saStyle'), look.style); showLook(); };
    $$('.sa-sw', box).forEach(w => w.onclick = e => { const b = e.target.closest('button'); if (!b) return; look[b.dataset.k] = b.dataset.v; press(w, b.dataset.v); showLook(); buzz(); });
    $('#saGl').onclick = () => { look.glasses = !look.glasses; $('#saGl').setAttribute('aria-pressed', look.glasses); showLook(); };
    $('#saSt').onclick = () => { look.stubble = !look.stubble; $('#saSt').setAttribute('aria-pressed', look.stubble); showLook(); };
    $('#saOffX').onclick = () => { $('#saOff').value = ''; };
    $('#saSave').onclick = async () => {
      const btn = $('#saSave'); btn.disabled = true; btn.textContent = 'Сохраняю…';
      const pl = $('#saParcels').value.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const m = l.match(/^(\S+)\s+(.+)$/); return m ? { e: m[1], name: m[2] } : { e: '🎁', name: l }; });
      const d = { status, sign: $('#saSign').value.trim(), offline_until: $('#saOff').value, wake: $('#saWake').value || '06:00', sleep: $('#saSleep').value || '22:00',
        call_days: [...days].sort(), look, parcels: pl, reply: $('#saReply').value.trim(), final_letter: $('#saFinal').value.trim() };
      try { await rpc('admin_soldier_set', { p: adminPass, d }); toast('Сохранено 🪖'); fx.at(btn, ['🫡', '✨', '💖'], 18); }
      catch (e) { console.error(e); toast(/bad password/.test(e.message) ? 'Пароль сменился, войди заново' : 'Не сохранилось, проверь интернет'); }
      finally { btn.disabled = false; btn.textContent = 'Сохранить'; }
    };
  }

  T.soldier = { name: 'Солдатик', custom: adminView, fields: [] };
})();
