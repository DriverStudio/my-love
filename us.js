/* =====================================================================
   💞 МЫ — всё, что на двоих: рядом/тук-тук, вопрос дня, дневник,
   задания, «угадай меня», холодильник. Подключается после app.js.
   ===================================================================== */
(() => {
  const P = () => (isAdmin ? adminPass : null);
  const call = (fn, args = {}) => rpc(fn, { p: P(), ...args });
  const me = () => (isAdmin ? 'he' : 'she');
  const Other = () => (isAdmin ? 'Она' : 'Он');
  const other = () => (isAdmin ? 'она' : 'он');
  const her_him = () => (isAdmin ? 'ей' : 'ему');
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const ago = s => s == null ? 'давно' : s < 60 ? 'только что' : s < 3600 ? `${Math.floor(s / 60)} мин назад` : s < 86400 ? `${Math.floor(s / 3600)} ч назад` : `${Math.floor(s / 86400)} дн назад`;
  const when = iso => new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const label = w => (w === me() ? 'Ты' : w === 'he' ? 'Он' : 'Она');
  const errText = e => /bad password/.test(e.message) ? 'Пароль сменился, войди заново' : 'Не получилось, проверь интернет';

  /* выбор фото: галерея или файлы → сжатое */
  function photoPicker(host, onPick) {
    host.innerHTML = `<div class="us-pick"><img alt="" hidden><span>Фото (необязательно)</span>
      <div class="img-btns"><label class="chip">🖼 Галерея<input type="file" accept="image/*" hidden></label><label class="chip">📁 Файлы<input type="file" hidden></label></div></div>`;
    const img = $('img', host), cap = $('span', host);
    $$('input', host).forEach(inp => inp.onchange = async () => {
      const f = inp.files[0]; inp.value = ''; if (!f) return;
      cap.textContent = '⏳ Обрабатываю…';
      try { const r = await processImage(f, 720); img.src = r.image; img.hidden = false; cap.textContent = '✓ Фото добавлено'; onPick(r.image); }
      catch (e) { console.error(e); cap.textContent = 'Не открылось, попробуй другое фото'; }
    });
  }
  const armBtn = (btn, text, go) => btn.onclick = () => {
    if (!btn.classList.contains('arm')) { const t = btn.textContent; btn.classList.add('arm'); btn.textContent = text; btn._t = setTimeout(() => { btn.classList.remove('arm'); btn.textContent = t; }, 3000); return; }
    clearTimeout(btn._t); go();
  };

  /* ================= 1. РЯДОМ + ТУК-ТУК ================= */
  let pres = { online: false, ago: null }, pingT = 0, entered = false;
  async function ping() {
    clearTimeout(pingT);
    if (!document.hidden) {
      try {
        const r = await call('us_ping');
        const was = pres.online; pres = r || pres;
        if (!was && pres.online) toast(`${Other()} сейчас здесь 💫`);
        if (r && r.knocks) knocked(r.knocks);
        document.dispatchEvent(new CustomEvent('us-ping', { detail: r }));
        renderPres();
      } catch (e) { console.error(e); }
    }
    pingT = setTimeout(ping, pres.online ? 4000 : 8000);
  }
  function renderPres() {
    const chip = $('#usChip');
    // на экране «Мы» и в играх значок не нужен (там своё), в остальных — маленький в углу
    chip.hidden = !pres.online || !$('#layer').hidden || (screens[cur] && screens[cur].dataset.name === 'us');
    chip.innerHTML = `<span class="dot"></span>${Other()} тут <b>💓</b>`;
    const box = $('#usPres'); if (!box) return;
    box.innerHTML = pres.online
      ? `<div class="us-live"><span class="dot"></span><b>${Other()} сейчас здесь</b></div><button class="us-knock" id="usKnock">💓<span>Тук-тук</span></button><p class="us-hint">Нажми — у ${isAdmin ? 'неё' : 'него'} забьётся сердце и завибрирует телефон</p>`
      : `<div class="us-live off"><span class="dot"></span><b>${Other()} был${isAdmin ? 'а' : ''} ${ago(pres.ago)}</b></div><p class="us-hint">Когда вы оба тут — появится «тук-тук»</p>`;
    const k = $('#usKnock'); if (k) k.onclick = knock;
  }
  async function knock(e) {
    const btn = e && e.currentTarget;
    if (btn) { replay(btn, 'pump'); fx.at(btn, ['💓', '💗'], 14, .8); }
    navigator.vibrate && navigator.vibrate(30);
    try { await call('us_knock'); toast('Тук-тук отправлен 💓'); } catch (er) { console.error(er); toast(errText(er)); }
  }
  function knocked(n) {
    const box = $('#knockFx');
    $('#knockText').textContent = `Тук-тук от ${isAdmin ? 'неё' : 'него'}${n > 1 ? ' ×' + n : ''}`;
    box.hidden = false; replay(box, 'show');
    navigator.vibrate && navigator.vibrate([120, 90, 120, 260, 120, 90, 120]);
    fx.burst(innerWidth / 2, innerHeight / 2, ['💓', '💗', '💖'], 40, 1.2);
    clearTimeout(knocked.t); knocked.t = setTimeout(() => box.hidden = true, 2600);
  }
  $('#usChip').onclick = knock;
  $('#knockFx').onclick = () => $('#knockFx').hidden = true;
  document.addEventListener('visibilitychange', () => { if (!document.hidden && entered) ping(); });

  /* ================= 3. ВОПРОС ДНЯ ================= */
  const QS = [
    'Что ты первым делом съешь, когда мы снова увидимся?', 'Какой наш момент ты вспоминаешь чаще всего?', 'Куда бы ты поехал(а) со мной прямо сейчас?',
    'Какая песня у тебя ассоциируется со мной?', 'Что тебя во мне удивило, когда мы познакомились?', 'Каким будет наш идеальный выходной после дембеля?',
    'Что ты делаешь, когда скучаешь по мне?', 'Какой мой поступок тебя больше всего тронул?', 'Опиши меня тремя словами', 'Какое наше свидание было лучшим?',
    'Что бы ты хотел(а) сказать мне прямо сейчас, если бы я был(а) рядом?', 'Какую привычку ты у меня перенял(а)?', 'Чего ты больше всего ждёшь после дембеля?',
    'Какой фильм мы посмотрим первым?', 'Что тебя рассмешило сегодня?', 'Какой у тебя был сон про нас?', 'За что ты сегодня благодарен(на)?',
    'Какую мою фотку ты любишь больше всего?', 'Что для тебя значит «дом»?', 'Если бы у нас был кот, как бы мы его назвали?', 'Какой подарок от меня ты помнишь до сих пор?',
    'Что бы ты приготовил(а) мне на ужин?', 'Какое моё слово или фраза тебя смешит?', 'Где ты видишь нас через 5 лет?', 'Что ты сейчас слушаешь?',
    'О чём ты подумал(а) первым, когда проснулся(ась)?', 'Какое твоё самое сильное желание на этот месяц?', 'Чему ты научился(ась) за время разлуки?',
    'Какую мою черту ты бы ни за что не поменял(а)?', 'Что бы ты сделал(а), если бы мы встретились на один час?', 'Наше место, куда хочется вернуться?',
    'Что ты ел(а) сегодня вкусного?', 'Какая погода у тебя за окном и какое настроение?', 'Что тебя сегодня порадовало?', 'Чего ты боишься больше всего?',
    'Как ты представляешь нашу встречу на вокзале?', 'Какую вещь ты бы хотел(а) сделать вместе впервые?', 'Какой комплимент от меня ты помнишь?',
    'Твоя любимая черта моего характера?', 'Какое у тебя было детское прозвище?', 'Что бы ты написал(а) на нашей общей табличке у двери?',
    'Какая еда напоминает тебе обо мне?', 'Что ты сделал(а) сегодня ради нас?', 'Если бы мы были героями фильма, какой это был бы жанр?',
    'Какой звук тебе нравится больше всего?', 'Что тебе помогает не грустить?', 'Какое наше фото ты бы повесил(а) на стену?', 'Какая моя фраза тебя поддержала?',
    'Куда поедем в первое лето вместе после дембеля?', 'Что ты хочешь, чтобы я знал(а) о тебе, но ты не говорил(а)?', 'Твоё самое тёплое воспоминание детства?',
    'Чай или кофе, и почему именно так?', 'Какое у тебя сегодня было «маленькое счастье»?', 'Что бы ты положил(а) в посылку мне прямо сейчас?',
    'Какое время суток наше?', 'Какую суперсилу ты бы хотел(а) для нас двоих?', 'Как будет называться наша общая традиция?', 'Что для тебя идеальное объятие?',
    'Какой ты видишь нашу первую квартиру?', 'Что ты почувствовал(а), когда я впервые сказал(а) «люблю»?', 'Какое наше общее дурацкое слово?', 'О чём мечтаешь перед сном?',
  ];
  const dayNo = () => Math.floor(Date.parse(dateIn(Date.now()) + 'T00:00:00Z') / DAY);
  const todayQ = () => QS[dayNo() % QS.length];
  async function renderQ() {
    const box = $('#usQ'); if (!box) return;
    const d = dateIn(Date.now()), q = todayQ();
    let r = null; try { r = await call('qday_get', { d }); } catch (e) { console.error(e); }
    if (!r) { box.innerHTML = `<p class="us-qk">Вопрос дня</p><p class="us-qq">${esc(q)}</p><p class="err">Не загрузилось</p>`; return; }
    if (!r.mine) {
      box.innerHTML = `<p class="us-qk">Вопрос дня ${r.other_done ? `<span class="us-tag">${other()} уже ответил${isAdmin ? 'а' : ''} 👀</span>` : ''}</p><p class="us-qq">${esc(q)}</p>
        <textarea id="usQa" rows="2" maxlength="500" placeholder="Твой ответ… (${isAdmin ? 'её' : 'его'} откроется после твоего)"></textarea>
        <div class="us-row"><button class="link" id="usQfeed">Все ответы →</button><button class="btn btn-sm" id="usQsend">Ответить</button></div>`;
      $('#usQsend').onclick = async () => {
        const a = $('#usQa').value.trim(); if (!a) { replay($('#usQa'), 'shake'); return; }
        $('#usQsend').disabled = true;
        try { await call('qday_answer', { d, qt: q, ans: a }); fx.at($('#usQ'), ['💬', '💗', '✨'], 18); buzz(15); renderQ(); }
        catch (e) { console.error(e); toast(errText(e)); $('#usQsend').disabled = false; }
      };
    } else {
      box.innerHTML = `<p class="us-qk">Вопрос дня</p><p class="us-qq">${esc(q)}</p>
        <div class="us-ans mine"><small>Ты</small><p>${esc(r.mine)}</p></div>
        ${r.other ? `<div class="us-ans theirs reveal"><small>${Other()}</small><p>${esc(r.other)}</p></div>` : `<div class="us-ans wait"><small>${Other()}</small><p>Ещё не ответил${isAdmin ? 'а' : ''} ⏳</p></div>`}
        <div class="us-row"><button class="link" id="usQfeed">Все ответы →</button></div>`;
    }
    $('#usQfeed').onclick = () => openLayer(Feed);
  }
  const Feed = {
    title: 'Наши ответы',
    async open(root) {
      root.innerHTML = '<div class="us-scroll" id="usFeed"><p class="err">Загружаю…</p></div>';
      try {
        const rows = await call('qday_feed');
        $('#usFeed').innerHTML = rows.length ? rows.map((r, i) => `
          <div class="us-card" style="animation-delay:${i * 40}ms"><small class="us-date">${new Date(r.day + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</small>
            <p class="us-qq">${esc(r.q)}</p>
            <div class="us-ans mine"><small>Ты</small><p>${r.mine ? esc(r.mine) : '<i>не ответил' + (isAdmin ? '' : 'а') + '</i>'}</p></div>
            <div class="us-ans theirs"><small>${Other()}</small><p>${r.other ? esc(r.other) : r.other_done ? '🔒 ответь, чтобы увидеть' : '<i>не ответил' + (isAdmin ? 'а' : '') + '</i>'}</p></div></div>`).join('')
          : '<p class="err">Пока пусто. Ответьте на первый вопрос дня 💬</p>';
      } catch (e) { console.error(e); fail($('#usFeed')); }
    },
  };

  /* ================= 4. ДНЕВНИК ================= */
  const REACTS = ['💗', '😍', '😂', '🥺', '🔥', '👏'];
  const Diary = {
    title: 'Дневник',
    async open(root) {
      let pimg = null;
      root.innerHTML = `<div class="us-scroll">
        <button class="btn us-new" id="dNew">+ Новая запись</button>
        <div class="us-form" id="dForm" hidden><div id="dPick"></div><textarea id="dText" rows="3" maxlength="1000" placeholder="Как прошёл день? Что ела, куда ходила, что на тебе надето…"></textarea>
          <div class="us-row"><button class="link" id="dCancel">Отмена</button><button class="btn btn-sm" id="dPost">Опубликовать</button></div></div>
        <div id="dList"><p class="err">Загружаю…</p></div></div>`;
      if (isAdmin) $('#dText').placeholder = 'Что у тебя сегодня? Пара строк для неё…';
      $('#dNew').onclick = () => { $('#dForm').hidden = false; $('#dNew').hidden = true; pimg = null; photoPicker($('#dPick'), v => pimg = v); };
      $('#dCancel').onclick = () => { $('#dForm').hidden = true; $('#dNew').hidden = false; };
      $('#dPost').onclick = async () => {
        const t = $('#dText').value.trim(); if (!t && !pimg) { replay($('#dText'), 'shake'); return; }
        const b = $('#dPost'); b.disabled = true; b.textContent = pimg ? 'Загружаю…' : 'Публикую…';
        try { await call('diary_add', { pimg, ptext: t }); toast('Опубликовано 📓'); fx.at(b, ['📓', '💗', '✨'], 18); $('#dText').value = ''; $('#dCancel').onclick(); load(); }
        catch (e) { console.error(e); toast(errText(e)); }
        finally { b.disabled = false; b.textContent = 'Опубликовать'; }
      };
      let shown = 15;
      const load = async () => {
        let rows;
        try { rows = await db(`diary?select=id,who,img,body,reaction,created_at&order=id.desc&limit=${shown + 1}`); }
        catch (e) { console.error(e); fail($('#dList')); return; }
        const list = $('#dList'); if (!list) return;
        const more = rows.length > shown; rows = rows.slice(0, shown);
        const lastOther = Math.max(0, ...rows.filter(r => r.who !== me()).map(r => r.id)); store.set('usDiarySeen' + me(), lastOther); badges();
        if (!rows.length) { list.innerHTML = `<p class="err">Записей пока нет. ${isAdmin ? 'Её день появится здесь.' : 'Расскажи ему про свой день 💗'}</p>`; return; }
        list.innerHTML = '';
        rows.forEach((r, i) => {
          const mine = r.who === me(), c = document.createElement('div');
          c.className = 'us-card d-card' + (mine ? ' mine' : ''); c.style.animationDelay = i * 40 + 'ms';
          c.innerHTML = `<div class="us-who"><b>${label(r.who)}</b><small>${when(r.created_at)}</small>${mine ? '<button class="us-x" aria-label="Удалить">✕</button>' : ''}</div>
            ${r.img ? `<img class="d-img" src="${r.img}" alt="">` : ''}${r.body ? `<p class="d-body"></p>` : ''}
            <div class="d-react">${mine ? (r.reaction ? `<span class="d-got">${esc(r.reaction)} от ${isAdmin ? 'неё' : 'него'}</span>` : `<small>${other()} ещё не отреагировал${isAdmin ? 'а' : ''}</small>`)
              : REACTS.map(e => `<button data-e="${e}" aria-pressed="${r.reaction === e}">${e}</button>`).join('')}</div>`;
          if (r.body) $('.d-body', c).textContent = r.body;
          if (mine) armBtn($('.us-x', c), 'Удалить?', async () => { try { await call('diary_del', { pid: r.id }); c.remove(); } catch (e) { toast(errText(e)); } });
          else $('.d-react', c).onclick = async e => {
            const b = e.target.closest('button'); if (!b) return;
            const v = b.getAttribute('aria-pressed') === 'true' ? '' : b.dataset.e;
            $$('button', c).forEach(x => x.setAttribute('aria-pressed', x.dataset.e === v));
            if (v) { fx.at(b, [v], 10, .6); buzz(8); }
            try { await call('diary_react', { pid: r.id, r: v }); } catch (er) { toast(errText(er)); }
          };
          list.append(c);
        });
        if (more) { const m = document.createElement('button'); m.className = 'link us-more'; m.textContent = 'Показать ещё'; m.onclick = () => { shown += 15; load(); }; list.append(m); }
      };
      load();
    },
  };

  /* ================= 5. ЗАДАНИЯ ================= */
  /* --- 🤫 пин-код на задания (раз в 3 часа) --- */
  const PIN_KEY = () => 'tasksPin' + (isAdmin ? 'he' : 'she'), PIN_TTL = 3 * 3600e3;
  const savedPin = () => { const v = store.get(PIN_KEY()); return v && v.until > Date.now() ? v.pin : null; };
  function pinLock(root, onOk) {
    let code = '';
    root.innerHTML = `<div class="pin">
      <div class="pin-emoji">🤫</div>
      <p class="pin-title">Только ты можешь знать, что тут</p>
      <p class="pin-sub">Введи пин-код</p>
      <div class="pin-dots">${'<i></i>'.repeat(4)}</div>
      <div class="pin-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => k === '' ? '<span></span>' : `<button data-k="${k}">${k}</button>`).join('')}</div></div>`;
    const dots = $$('.pin-dots i', root), box = $('.pin-dots', root);
    const paint = () => dots.forEach((d, i) => d.classList.toggle('on', i < code.length));
    $('.pin-pad', root).onclick = async e => {
      const b = e.target.closest('button'); if (!b || box.classList.contains('busy')) return;
      const k = b.dataset.k; buzz(5); b.classList.add('tap'); setTimeout(() => b.classList.remove('tap'), 160);
      if (k === '⌫') code = code.slice(0, -1); else if (code.length < 4) code += k;
      paint();
      if (code.length < 4) return;
      box.classList.add('busy');
      let ok = false;
      try { ok = await rpc('tasks_check', { pin: code }); }
      catch (er) { toast(/locked/.test(er.message) ? 'Слишком много попыток, подожди 10 минут' : 'Нет связи, попробуй ещё раз'); }
      if (ok) {
        box.classList.add('ok'); navigator.vibrate && navigator.vibrate([15, 40, 25]);
        store.set(PIN_KEY(), { pin: code, until: Date.now() + PIN_TTL });
        const pin = code; setTimeout(() => { $('.pin', root) && $('.pin', root).classList.add('open'); setTimeout(() => onOk(pin), 380); }, 350);
      } else {
        box.classList.add('bad'); navigator.vibrate && navigator.vibrate(120);
        setTimeout(() => { box.classList.remove('bad', 'busy'); code = ''; paint(); }, 600);
      }
    };
  }

  /* --- свайп карточки вправо: под ней кнопки действий --- */
  function swipeable(wrap, card, actW) {
    let sx = 0, sy = 0, dx = 0, base = 0, pid = null, lock = null, open = false, dragged = 0;
    const set = (x, anim) => { card.style.transition = anim ? 'translate .38s cubic-bezier(.2,.9,.3,1.12)' : 'none'; card.style.translate = x + 'px 0'; };
    const close = () => { open = false; set(0, true); wrap.classList.remove('open'); setTimeout(() => { if (!open) wrap.classList.remove('swiping'); }, 380); };
    wrap._close = close;
    card.addEventListener('pointerdown', e => {
      if (e.target.closest('button, textarea, input, label, .t-ph')) return;
      pid = e.pointerId; sx = e.clientX; sy = e.clientY; lock = null; base = open ? actW : 0; dx = base;
    });
    card.addEventListener('pointermove', e => {
      if (pid !== e.pointerId) return;
      const mx = e.clientX - sx, my = e.clientY - sy;
      if (!lock) {
        if (Math.abs(mx) > 8 && Math.abs(mx) > Math.abs(my) * 1.3) {
          lock = 'x'; card.setPointerCapture(pid); wrap.classList.add('swiping');
          $$('.t-swipe.open').forEach(w => w !== wrap && w._close && w._close());
        } else if (Math.abs(my) > 8) { lock = 'y'; pid = null; return; } else return;
      }
      dx = base + mx;
      set(dx < 0 ? dx * .25 : dx > actW ? actW + (dx - actW) * .25 : dx, false); // резинка на краях
    });
    const end = e => {
      if (pid !== e.pointerId) return; pid = null;
      if (lock !== 'x') return;
      dragged = Date.now(); // клик, который браузер пришлёт сразу после свайпа, игнорируем
      open = dx > actW * .4; set(open ? actW : 0, true); wrap.classList.toggle('open', open);
      if (open) { buzz(6); store.set('tSwiped', 1); const h = $('.t-hint'); if (h) h.remove(); } else setTimeout(() => { if (!open) wrap.classList.remove('swiping'); }, 380);
    };
    card.addEventListener('pointerup', end); card.addEventListener('pointercancel', end);
    card.addEventListener('click', e => {
      if (Date.now() - dragged < 350) { e.stopPropagation(); e.preventDefault(); return; }
      if (open && !e.target.closest('button')) { e.stopPropagation(); e.preventDefault(); close(); }
    }, true);
  }

  const Tasks = {
    title: 'Задания',
    open(root) {
      const pin = savedPin();
      if (pin) Tasks.show(root, pin); else pinLock(root, p => Tasks.show(root, p));
    },
    async show(root, pin) {
      root.innerHTML = `<div class="us-scroll">
        <div class="us-form"><p class="us-ftitle">Дать задание ${her_him()}</p>
          <textarea id="tNew" rows="2" maxlength="300" placeholder="${isAdmin ? 'Сходи в нашу кофейню и сфоткай наш столик' : 'Нарисуй меня на листке и покажи'}"></textarea>
          <div class="us-row"><span></span><button class="btn btn-sm" id="tAdd">Дать 🎯</button></div></div>
        <div id="tList"><p class="err">Загружаю…</p></div></div>`;
      $('#tAdd').onclick = async () => {
        const t = $('#tNew').value.trim(); if (!t) { replay($('#tNew'), 'shake'); return; }
        try { await call('task_add', { t }); $('#tNew').value = ''; toast('Задание отправлено 🎯'); fx.at($('#tAdd'), ['🎯', '✨'], 14); load(); }
        catch (e) { toast(errText(e)); }
      };
      const load = async () => {
        let rows;
        try { rows = await call('tasks_list', { pin }); }
        catch (e) {
          if (/bad pin/.test(e.message)) { store.set(PIN_KEY(), null); pinLock(root, p => Tasks.show(root, p)); return; } // пин сменили
          fail($('#tList')); return;
        }
        const box = $('#tList'); if (!box) return;
        const toMe = rows.filter(r => r.from_who !== me()), fromMe = rows.filter(r => r.from_who === me());
        const ST = { open: '⏳ ждёт', done: '✅ выполнено', accepted: '💗 принято' };
        const reload = () => load();
        const act$ = async (fn, args, ok) => { try { await call(fn, { tid: args.id, ...args.x }); if (ok) toast(ok); reload(); } catch (er) { toast(/too soon/.test(er.message) ? 'Уже напоминал' + (isAdmin ? '' : 'а') + ' недавно, подожди часик' : errText(er)); } };
        const card = (r, mineTask) => {
          const wrap = document.createElement('div'); wrap.className = 't-swipe';
          const c = document.createElement('div'); c.className = 'us-card t-card st-' + r.status + (r.pinned ? ' pinned' : '');
          c.innerHTML = `<div class="us-who"><b>${esc(ST[r.status])}</b><small>${when(r.created_at)}</small>${r.pinned ? '<span class="t-pin">📌</span>' : ''}</div>
            <p class="t-title"></p>
            ${r.status !== 'open' ? `<div class="t-proof">${r.proof_img ? `<div class="t-ph ${r.spoiler ? 'spoil' : ''}"><img src="${r.proof_img}" alt="">${r.spoiler ? '<span class="t-spoil">🫣 Нажми, чтобы посмотреть</span>' : ''}</div>` : ''}${r.proof_text ? '<p></p>' : ''}</div>` : ''}
            <div class="t-act"></div>`;
          $('.t-title', c).textContent = r.title;
          if (r.proof_text) $('.t-proof p', c).textContent = r.proof_text;
          const ph = $('.t-ph.spoil', c); if (ph) ph.onclick = () => { ph.classList.add('shown'); buzz(8); };
          const act = $('.t-act', c);
          if (!mineTask && r.status === 'open') {
            act.innerHTML = '<button class="btn btn-sm">✓ Выполнить</button>';
            $('button', act).onclick = () => {
              let pimg = null;
              act.innerHTML = `<div class="us-form"><div class="t-pick"></div><label class="chk t-spchk"><input type="checkbox"><span>🫣 Фото под спойлер</span></label>
                <textarea rows="2" maxlength="300" placeholder="Пара слов (необязательно)"></textarea>
                <div class="us-row"><span></span><button class="btn btn-sm">Готово ✅</button></div></div>`;
              photoPicker($('.t-pick', act), v => pimg = v);
              $('.btn', act).onclick = async e => {
                e.currentTarget.disabled = true;
                try {
                  await call('task_done', { tid: r.id, pimg, txt: $('textarea', act).value });
                  if (pimg && $('.t-spchk input', act).checked) await call('task_spoiler', { tid: r.id, v: true });
                  toast('Отправлено на проверку ✅'); fx.at(c, ['✅', '💗', '✨'], 22); reload();
                } catch (er) { toast(errText(er)); e.currentTarget.disabled = false; }
              };
            };
          }
          if (mineTask && r.status === 'done') {
            act.innerHTML = '<button class="btn btn-sm">Принять 💗</button>';
            $('button', act).onclick = async () => { try { await call('task_accept', { tid: r.id }); fx.at(c, ['💗', '🎉', '✨'], 26); buzz(20); reload(); } catch (er) { toast(errText(er)); } };
          }
          // действия под свайпом
          const A = [];
          if (mineTask) {
            if (r.status === 'open') A.push(['✏️', 'Изменить', 'edit', 'blue'], ['⏰', 'Напомнить', 'nudge', 'amber']);
            if (r.status === 'done') A.push(['🔁', 'Переделать', 'redo', 'amber']);
          } else if (r.status !== 'open' && r.proof_img) A.push([r.spoiler ? '👁' : '🫣', r.spoiler ? 'Без спойлера' : 'Спойлер', 'spoiler', 'violet']);
          A.push([r.pinned ? '📍' : '📌', r.pinned ? 'Открепить' : 'Закрепить', 'pin', 'teal']);
          if (mineTask) A.push(['🗑', 'Удалить', 'del', 'red']);
          const acts = document.createElement('div'); acts.className = 't-actions';
          acts.innerHTML = A.map(([e, t, k, col]) => `<button data-k="${k}" class="c-${col}"><i>${e}</i>${t}</button>`).join('');
          acts.onclick = e => {
            const b = e.target.closest('button'); if (!b) return; const k = b.dataset.k; buzz(8);
            if (k === 'del') {
              if (!b.classList.contains('arm')) { b.classList.add('arm'); $('i', b).textContent = '❓'; b.lastChild.textContent = 'Точно?'; return; }
              return act$('task_del', { id: r.id }, 'Удалено');
            }
            if (k === 'pin') return act$('task_pin', { id: r.id, x: { v: !r.pinned } }, r.pinned ? 'Откреплено' : 'Закреплено 📌');
            if (k === 'spoiler') return act$('task_spoiler', { id: r.id, x: { v: !r.spoiler } }, r.spoiler ? 'Фото открыто' : 'Фото под спойлером 🫣');
            if (k === 'nudge') return act$('task_nudge', { id: r.id }, 'Напомнил' + (isAdmin ? '' : 'а') + ' ⏰');
            if (k === 'redo') return act$('task_redo', { id: r.id }, 'Вернул' + (isAdmin ? '' : 'а') + ' на доработку 🔁');
            if (k === 'edit') {
              wrap._close();
              const t = $('.t-title', c), old = r.title;
              t.outerHTML = `<div class="us-form t-edit"><textarea rows="2" maxlength="300"></textarea><div class="us-row"><button class="link">Отмена</button><button class="btn btn-sm">Сохранить</button></div></div>`;
              const f = $('.t-edit', c), ta = $('textarea', f); ta.value = old; ta.focus();
              $('.link', f).onclick = () => reload();
              $('.btn', f).onclick = () => { const v = ta.value.trim(); if (!v) { replay(ta, 'shake'); return; } act$('task_edit', { id: r.id, x: { t: v } }, 'Сохранено ✏️'); };
            }
          };
          wrap.append(acts, c); swipeable(wrap, c, A.length * 72 + 8);
          return wrap;
        };
        box.innerHTML = `${store.get('tSwiped') ? '' : '<p class="us-hint t-hint">👉 Свайпни карточку вправо — там действия</p>'}<p class="us-sec">${isAdmin ? 'От неё тебе' : 'От него тебе'}</p><div id="tMe"></div><p class="us-sec">Ты дал${isAdmin ? '' : 'а'} ${her_him()}</p><div id="tThem"></div>`;
        toMe.length ? toMe.forEach(r => $('#tMe').append(card(r, false))) : $('#tMe').innerHTML = '<p class="err">Пока заданий нет</p>';
        fromMe.length ? fromMe.forEach(r => $('#tThem').append(card(r, true))) : $('#tThem').innerHTML = '<p class="err">Дай первое задание ☝️</p>';
        badges();
      };
      load();
    },
  };

  /* ================= 9. УГАДАЙ МЕНЯ ================= */
  const Guess = {
    title: 'Угадай меня',
    async open(root) {
      let tab = 'answer';
      root.innerHTML = `<div class="us-score" id="gScore"></div><div class="sa-chips g-tabs" id="gTabs"><button data-t="answer" aria-pressed="true">Отвечать</button><button data-t="mine" aria-pressed="false">Мои вопросы</button></div><div class="us-scroll" id="gBox"><p class="err">Загружаю…</p></div>`;
      $('#gTabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.t; $$('button', $('#gTabs')).forEach(x => x.setAttribute('aria-pressed', x === b)); render(); };
      let rows = [];
      const load = async () => { try { rows = await call('guess_list'); } catch (e) { fail($('#gBox')); return; } render(); badges(); };
      const render = () => {
        const box = $('#gBox'); if (!box) return;
        const theirs = rows.filter(r => !r.mine), mine = rows.filter(r => r.mine);
        const a1 = theirs.filter(r => r.my_choice != null), ok1 = a1.filter(r => r.my_ok).length;
        const a2 = mine.filter(r => r.their_choice != null), ok2 = a2.filter(r => r.their_ok).length;
        $('#gScore').innerHTML = `<div><b>${ok1}/${a1.length}</b><small>ты угадал${isAdmin ? '' : 'а'}</small></div><div class="vs">vs</div><div><b>${ok2}/${a2.length}</b><small>${other()} угадал${isAdmin ? 'а' : ''}</small></div>`;
        box.innerHTML = '';
        if (tab === 'answer') {
          if (!theirs.length) { box.innerHTML = `<p class="err">${Other()} ещё не придумал${isAdmin ? 'а' : ''} вопросов. А ты придумай свои во вкладке «Мои вопросы» 😉</p>`; return; }
          theirs.forEach((r, i) => {
            const c = document.createElement('div'); c.className = 'us-card g-card'; c.style.animationDelay = i * 40 + 'ms';
            c.innerHTML = `<p class="us-qq"></p><div class="g-opts">${r.options.map((o, k) => `<button data-k="${k}"></button>`).join('')}</div>`;
            $('.us-qq', c).textContent = r.q;
            const btns = $$('.g-opts button', c); btns.forEach((b, k) => b.textContent = r.options[k]);
            const show = (ch, cor) => btns.forEach((b, k) => { b.disabled = true; b.classList.toggle('ok', k === cor); b.classList.toggle('bad', k === ch && ch !== cor); });
            if (r.my_choice != null) show(r.my_choice, r.correct);
            else $('.g-opts', c).onclick = async e => {
              const b = e.target.closest('button'); if (!b) return;
              btns.forEach(x => x.disabled = true);
              try {
                const res = await call('guess_answer', { gid: r.id, ch: +b.dataset.k });
                r.my_choice = +b.dataset.k; r.correct = res.correct; r.my_ok = res.ok; show(r.my_choice, r.correct);
                if (res.ok) { fx.at(b, ['🎉', '💗', '✨'], 22); buzz(20); toast('Угадал' + (isAdmin ? '' : 'а') + '! 🎉'); } else { replay(c, 'wiggle'); buzz(60); toast('Мимо 😅'); }
                setTimeout(render, 900);
              } catch (er) { toast(errText(er)); btns.forEach(x => x.disabled = false); }
            };
            box.append(c);
          });
        } else {
          const f = document.createElement('div'); f.className = 'us-form';
          f.innerHTML = `<p class="us-ftitle">Новый вопрос о себе</p><input id="gQ" maxlength="200" placeholder="Мой любимый цвет?">
            ${[0, 1, 2, 3].map(k => `<label class="g-opt"><input type="radio" name="gC" value="${k}" ${k ? '' : 'checked'}><input class="g-in" maxlength="60" placeholder="Вариант ${k + 1}${k > 1 ? ' (необязательно)' : ''}"></label>`).join('')}
            <small class="us-hint">Кружок — правильный ответ</small><div class="us-row"><span></span><button class="btn btn-sm" id="gAdd">Добавить</button></div>`;
          box.append(f);
          $('#gAdd').onclick = async () => {
            const q = $('#gQ').value.trim(), ins = $$('.g-in', f), c = +$('input[name=gC]:checked', f).value;
            const opts = [], map = {};
            ins.forEach((x, k) => { const v = x.value.trim(); if (v) { map[k] = opts.length; opts.push(v); } });
            if (!q) { replay($('#gQ'), 'shake'); return; }
            if (opts.length < 2) { toast('Нужно минимум 2 варианта'); return; }
            if (map[c] == null) { toast('Отмеченный правильный вариант пустой'); return; }
            try { await call('guess_add', { qt: q, opts, c: map[c] }); toast('Вопрос добавлен 🧠'); load(); } catch (e) { toast(errText(e)); }
          };
          mine.forEach((r, i) => {
            const c = document.createElement('div'); c.className = 'us-card g-card'; c.style.animationDelay = i * 40 + 'ms';
            c.innerHTML = `<div class="us-who"><b>${r.their_choice == null ? `⏳ ${other()} ещё не ответил${isAdmin ? 'а' : ''}` : r.their_ok ? `🎉 ${other()} угадал${isAdmin ? 'а' : ''}` : `😅 ${other()} не угадал${isAdmin ? 'а' : ''}`}</b><button class="us-x">✕</button></div>
              <p class="us-qq"></p><div class="g-opts">${r.options.map((o, k) => `<button disabled class="${k === r.correct ? 'ok' : k === r.their_choice ? 'bad' : ''}"></button>`).join('')}</div>`;
            $('.us-qq', c).textContent = r.q; $$('.g-opts button', c).forEach((b, k) => b.textContent = r.options[k]);
            armBtn($('.us-x', c), 'Удалить?', async () => { try { await call('guess_del', { gid: r.id }); load(); } catch (e) { toast(errText(e)); } });
            box.append(c);
          });
        }
      };
      load();
    },
  };

  /* ================= 11. ХОЛОДИЛЬНИК ================= */
  const MAGNETS = ['🌸', '💗', '🍓', '⭐', '🐻', '🌙', '🍕', '🎀', '🐱', '🔥', '🦋', '🍒', '☀️', '🪖', '💌', '🌈', '🍉', '🧸', '🌻', '🍩'];
  const NOTE_COL = ['#FFF3A6', '#FFD3E2', '#D6F5E6', '#E3D6FF', '#FFE0C2'];
  const LET_COL = ['#E0234F', '#FF8A1F', '#F5C400', '#2DBE7E', '#2F7BFF', '#8A4DFF', '#FF4FA3'];
  const SHAPES = [['polaroid', '🖼', 'Полароид'], ['circle', '⚪', 'Круг'], ['heart', '💗', 'Сердце'], ['star', '⭐', 'Звезда'], ['round', '▢', 'Квадрат']];
  const Fridge = (() => {
    let board, items = new Map(), timer = 0, dragging = null, armed = null;
    const place = (el, r) => { el.style.left = r.x * 100 + '%'; el.style.top = r.y * 100 + '%'; el.style.setProperty('--r', (r.rot || 0) + 'deg'); };
    function make(r) {
      const el = document.createElement('div');
      el.className = 'fr-item ' + r.kind + (r.who === me() ? ' mine' : '');
      if (r.kind === 'note') { el.style.background = r.color || NOTE_COL[0]; el.textContent = r.content; }
      else if (r.kind === 'letters') {
        el.style.fontSize = Math.max(18, Math.min(34, 250 / r.content.length)) + 'px'; // длинное слово — буквы мельче
        [...r.content].forEach((ch, i) => {
          const sp = document.createElement('span');
          if (ch === ' ') sp.className = 'sp'; else { sp.textContent = ch; sp.style.color = LET_COL[(i * 3 + r.id) % LET_COL.length]; sp.style.setProperty('--t', ((i * 7 + r.id) % 11 - 5) + 'deg'); }
          el.append(sp);
        });
      } else if (r.kind === 'photo') {
        el.classList.add('sh-' + (r.color || 'polaroid'));
        const im = new Image(); im.src = r.content; im.alt = ''; im.draggable = false;
        const fr = document.createElement('div'); fr.className = 'ph'; fr.append(im); el.append(fr);
      } else el.textContent = r.content;
      if (r.who === me()) {
        const x = document.createElement('button'); x.className = 'fr-x'; x.textContent = '✕'; el.append(x);
        x.onpointerdown = e => e.stopPropagation();
        x.onclick = async e => { e.stopPropagation(); el.remove(); items.delete(r.id); try { await call('fridge_del', { fid: r.id }); } catch (er) { toast(errText(er)); } };
      }
      place(el, r); bindDrag(el, r); board.append(el); return el;
    }
    function bindDrag(el, r) {
      let sx, sy, ox, oy, moved = false, pid = null, lastTap = 0;
      el.onpointerdown = e => {
        if (e.target.classList.contains('fr-x')) return;
        pid = e.pointerId; el.setPointerCapture(pid); moved = false; dragging = r.id;
        const b = board.getBoundingClientRect(); sx = e.clientX; sy = e.clientY; ox = r.x * b.width; oy = r.y * b.height;
        el.classList.add('drag'); board.append(el); // наверх стопки
      };
      el.onpointermove = e => {
        if (pid !== e.pointerId) return;
        const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.hypot(dx, dy) > 4) moved = true;
        const b = board.getBoundingClientRect();
        r.x = Math.max(0, Math.min(1, (ox + dx) / b.width)); r.y = Math.max(0, Math.min(1, (oy + dy) / b.height)); place(el, r);
      };
      const end = async e => {
        if (pid !== e.pointerId) return; pid = null; el.classList.remove('drag');
        if (!moved) {
          const now = Date.now();
          if (r.who === me() && now - lastTap < 350) { if (armed && armed !== el) armed.classList.remove('armed'); el.classList.toggle('armed'); armed = el; }
          lastTap = now; dragging = null; return;
        }
        buzz(6);
        try { await call('fridge_move', { fid: r.id, nx: r.x, ny: r.y }); } catch (er) { console.error(er); }
        setTimeout(() => { if (dragging === r.id) dragging = null; }, 300);
      };
      el.onpointerup = end; el.onpointercancel = end;
    }
    // лёгкая синхронизация: тянем только координаты, полные данные — только для новых
    async function sync(first) {
      clearTimeout(timer);
      if (!board || !board.isConnected) return;
      try {
        const pos = await db('fridge?select=id,x,y&order=id');
        const fresh = pos.filter(p => !items.has(p.id)).map(p => p.id);
        if (fresh.length) {
          const full = await db(`fridge?select=*&id=in.(${fresh.join(',')})&order=id`);
          full.forEach(r => { const el = make(r); items.set(r.id, { r, el }); if (!first) replay(el, 'pop-in'); });
        }
        const seen = new Set(pos.map(p => p.id));
        pos.forEach(p => {
          const cur = items.get(p.id);
          if (cur && dragging !== p.id && (Math.abs(cur.r.x - p.x) > .001 || Math.abs(cur.r.y - p.y) > .001)) {
            cur.r.x = p.x; cur.r.y = p.y; cur.el.classList.add('glide'); place(cur.el, cur.r); setTimeout(() => cur.el.classList.remove('glide'), 600);
          }
        });
        items.forEach((v, id) => { if (!seen.has(id)) { v.el.remove(); items.delete(id); } });
        const empty = $('#frEmpty'); if (empty) empty.hidden = items.size > 0;
      } catch (e) { console.error(e); }
      timer = setTimeout(sync, document.hidden ? 10000 : 3500);
    }
    async function add(kind, content, color) {
      const r = { x: kind === 'letters' ? .45 + Math.random() * .1 : .2 + Math.random() * .6, y: .15 + Math.random() * .6, rot: kind === 'letters' ? 0 : Math.round(Math.random() * 16 - 8) };
      try { await call('fridge_add', { k: kind, c: content, nx: r.x, ny: r.y, r0: r.rot, col: color || null }); buzz(10); sync(); return true; }
      catch (e) { toast(/full/.test(e.message) ? 'Холодильник переполнен, убери что-нибудь' : /photos/.test(e.message) ? 'Фоток на дверце уже 40, убери какую-нибудь' : errText(e)); return false; }
    }
    return {
      title: 'Холодильник',
      open(root) {
        items = new Map(); dragging = null; armed = null;
        root.innerHTML = `<div class="fr-door" id="frBoard"><span class="fr-handle"></span><p class="fr-empty" id="frEmpty" hidden>Пусто. Прилепи первый магнитик 🧲</p></div>
          <div class="sa-chips fr-modes" id="frModes"><button data-m="mag" aria-pressed="true">🧲 Магниты</button><button data-m="let" aria-pressed="false">🔤 Буквы</button><button data-m="ph" aria-pressed="false">📷 Фото</button><button data-m="note" aria-pressed="false">📝 Записка</button></div>
          <div class="fr-panel" id="frPanel"></div>
          <p class="us-hint">Тащи что угодно. Своё убрать — двойной тап и ✕</p>`;
        board = $('#frBoard');
        const panel = $('#frPanel');
        const modes = {
          mag() {
            panel.innerHTML = `<div class="tools">${MAGNETS.map(m => `<button class="fr-m" data-m="${m}">${m}</button>`).join('')}</div>`;
            panel.onclick = e => { const b = e.target.closest('.fr-m'); if (b) { add('magnet', b.dataset.m); replay(b, 'pump'); } };
          },
          let() {
            panel.innerHTML = `<div class="us-row fr-row"><input id="frLin" maxlength="16" placeholder="ЛЮБЛЮ" autocapitalize="characters"><button class="btn btn-sm" id="frLadd">Прилепить</button></div>`;
            panel.onclick = null;
            $('#frLadd').onclick = async () => { const t = $('#frLin').value.trim().toUpperCase(); if (!t) { replay($('#frLin'), 'shake'); return; } if (await add('letters', t)) $('#frLin').value = ''; };
          },
          ph() {
            let shape = 'polaroid', img = null;
            panel.innerHTML = `<div class="sa-chips fr-shapes">${SHAPES.map(([k, e, n], i) => `<button data-s="${k}" aria-pressed="${!i}">${e} ${n}</button>`).join('')}</div>
              <div class="us-row fr-row"><div class="img-btns"><label class="chip">🖼 Галерея<input type="file" accept="image/*" hidden></label><label class="chip">📁 Файлы<input type="file" hidden></label></div><span class="fr-phst" id="frPhSt"></span></div>`;
            panel.onclick = e => { const b = e.target.closest('.fr-shapes button'); if (!b) return; shape = b.dataset.s; $$('.fr-shapes button').forEach(x => x.setAttribute('aria-pressed', x === b)); };
            $$('input[type="file"]', panel).forEach(inp => inp.onchange = async () => {
              const f = inp.files[0]; inp.value = ''; if (!f) return;
              $('#frPhSt').textContent = '⏳';
              try { img = (await processImage(f, 220)).image; } catch (e) { $('#frPhSt').textContent = 'Не открылось'; return; }
              $('#frPhSt').textContent = ''; await add('photo', img, shape);
            });
          },
          note() {
            let col = NOTE_COL[0];
            panel.innerHTML = `<input id="frNin" maxlength="80" placeholder="Коротко, на стикер"><div class="us-row fr-row"><div class="fr-cols">${NOTE_COL.map((c, i) => `<button data-c="${c}" style="background:${c}" aria-pressed="${!i}"></button>`).join('')}</div><button class="btn btn-sm" id="frNadd">Прилепить</button></div>`;
            panel.onclick = e => { const b = e.target.closest('.fr-cols button'); if (!b) return; col = b.dataset.c; $$('.fr-cols button').forEach(x => x.setAttribute('aria-pressed', x === b)); };
            $('#frNadd').onclick = async () => { const t = $('#frNin').value.trim(); if (!t) { replay($('#frNin'), 'shake'); return; } if (await add('note', t, col)) $('#frNin').value = ''; };
          },
        };
        $('#frModes').onclick = e => { const b = e.target.closest('button'); if (!b) return; $$('#frModes button').forEach(x => x.setAttribute('aria-pressed', x === b)); modes[b.dataset.m](); buzz(5); };
        modes.mag();
        board.onpointerdown = e => { if (e.target === board && armed) { armed.classList.remove('armed'); armed = null; } };
        sync(true);
      },
      close() { clearTimeout(timer); board = null; },
    };
  })();

  /* ================= ✨ лёгкое появление карточек =================
     Карточка мягко всплывает, когда доходит до экрана. Без наклонов и щелчков. */
  function reveal(sc) {
    if (!sc._io) {
      sc.classList.add('reveal');
      sc._io = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('seen'); sc._io.unobserve(e.target); }
      }), { root: sc, threshold: .12 });
    }
    $$('.us-card:not(.seen):not([data-io])', sc).forEach(c => { c.dataset.io = 1; sc._io.observe(c); });
  }
  new MutationObserver(() => requestAnimationFrame(() => $$('#layerBody .us-scroll').forEach(reveal)))
    .observe($('#layerBody'), { childList: true, subtree: true });

  /* ================= ☀️🌙 ритуал «доброе утро / спокойной ночи» ================= */
  let ritStreak = null;
  async function renderRit() {
    const box = $('#rit'); if (!box) return;
    let r; try { r = await call('ritual_state'); } catch (e) { console.error(e); return; }
    const h = +new Intl.DateTimeFormat('en-GB', { timeZone: C.TZ, hour: '2-digit', hour12: false }).format(new Date()) % 24;
    const kind = h >= 5 && h < 12 ? 'morning' : h >= 20 || h < 5 ? 'night' : null;
    const done = kind && r.mine.includes(kind), theirs = kind && r.theirs.includes(kind);
    const grew = ritStreak != null && r.streak > ritStreak; ritStreak = r.streak;
    box.innerHTML = `
      <div class="rit-streak ${r.streak ? 'on' : ''}"><b>🔥 ${r.streak}</b><small>${plural(r.streak, ['день', 'дня', 'дней'])} подряд вместе</small></div>
      ${kind ? `<button class="rit-btn rit-${kind} ${done ? 'done' : ''}" ${done ? 'disabled' : ''}>${kind === 'morning' ? '☀️ Доброе утро' : '🌙 Спокойной ночи'}${done ? ' ✓' : ''}</button>
        <p class="rit-sub">${theirs ? `${Other()} уже пожелал${isAdmin ? 'а' : ''} 💛` : `${Other()} ещё не пожелал${isAdmin ? 'а' : ''}`}${r.today_both ? ', день засчитан 🔥' : ''}</p>`
      : `<p class="rit-sub">${r.today_both ? 'Сегодня уже засчитано 🔥' : 'С утра — «доброе утро», вечером — «спокойной ночи». Нажмёте оба — огонёк растёт'}</p>`}`;
    if (grew) { replay($('.rit-streak', box), 'pump'); fx.at($('.rit-streak', box), ['🔥', '✨', '💛'], 30, 1); toast(`Серия ${r.streak} ${plural(r.streak, ['день', 'дня', 'дней'])}! 🔥`); }
    const b = $('.rit-btn', box);
    if (b && !done) b.onclick = async () => {
      b.disabled = true; buzz(15);
      fx.at(b, kind === 'morning' ? ['☀️', '🌤', '💛'] : ['🌙', '⭐', '💜'], 24, .9);
      try { await call('ritual_do', { k: kind }); } catch (e) { toast(errText(e)); b.disabled = false; return; }
      renderRit();
    };
  }
  const prevCount = onEnter.count;
  onEnter.count = () => { prevCount && prevCount(); renderRit(); };

  /* ================= экран «Мы» ================= */
  const OPEN = { diary: Diary, tasks: Tasks, guess: Guess, fridge: Fridge };
  $$('.us-tile').forEach(t => t.onclick = () => { buzz(); openLayer(OPEN[t.dataset.open]); });
  async function badges() {
    let s; try { s = await call('us_summary'); } catch (e) { console.error(e); return; }
    if (!s) return;
    const newDiary = (s.diary_last || 0) > (store.get('usDiarySeen' + me()) || 0);
    const set = (k, n, txt) => { const t = $(`.us-tile[data-open="${k}"]`); const b = $('.badge', t); b.hidden = !n; b.textContent = n; $('small', t).textContent = txt; };
    set('diary', newDiary ? '•' : 0, newDiary ? 'Есть новое от ' + (isAdmin ? 'неё' : 'него') : `${s.diary_count} ${plural(s.diary_count, ['запись', 'записи', 'записей'])}`);
    set('tasks', s.tasks_for_me + s.tasks_to_accept, s.tasks_for_me ? `${s.tasks_for_me} для тебя` : s.tasks_to_accept ? 'Есть что принять' : 'Дай задание');
    set('guess', s.guess_new, s.guess_new ? `${s.guess_new} новых вопросов` : s.guess_mine ? `Твоих вопросов: ${s.guess_mine}` : 'Придумай вопросы');
    set('fridge', 0, `${s.fridge_count} на дверце`);
    $('#navUs').classList.toggle('has-new', !!(newDiary || s.tasks_for_me || s.tasks_to_accept || s.guess_new));
  }
  onEnter.us = () => { renderPres(); renderQ(); badges(); stagger($('.s-us')); };
  // значок «тут» пересчитываем при каждом переходе и открытии/закрытии игр
  $('#nav').addEventListener('click', () => setTimeout(renderPres, 50));
  new MutationObserver(renderPres).observe($('#layer'), { attributes: true, attributeFilter: ['hidden'] });
  document.addEventListener('entered', () => {
    entered = true; ping(); badges(); renderPres(); renderRit();
    setInterval(() => { if (!document.hidden) badges(); }, 60000);
  });
})();
