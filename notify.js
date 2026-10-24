/* =====================================================================
   🔔 УВЕДОМЛЕНИЯ: колокольчик на сайте + Telegram-бот
   Подключается после app.js, us.js, soldier.js.
   ===================================================================== */
(() => {
  const P = () => (isAdmin ? adminPass : null);
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const when = iso => new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const bell = $('#bell');
  let waitingTg = false, firstPing = false;

  /* ---------- колокольчик: счётчик и всплывашка о новом ---------- */
  function showBell() {
    bell.hidden = !$('#layer').hidden;
  }
  document.addEventListener('entered', () => { showBell(); });
  new MutationObserver(showBell).observe($('#layer'), { attributes: true, attributeFilter: ['hidden'] });
  document.addEventListener('us-ping', e => {
    const r = e.detail || {}, b = $('.badge', bell), n = r.unread || 0;
    b.hidden = !n; b.textContent = n > 9 ? '9+' : n;
    bell.classList.toggle('ring', n > 0);
    const key = 'nfSeen' + (isAdmin ? 'he' : 'she'), seen = store.get(key) || 0;
    if (!firstPing) firstPing = true, n && setTimeout(() => toast(n === 1 && r.last ? `${r.last.icon || '🔔'} ${r.last.body}` : `🔔 У тебя ${n} ${plural(n, ['новое уведомление', 'новых уведомления', 'новых уведомлений'])}`), 1500);
    else if (r.last && r.last.id > seen) { toast(`${r.last.icon || '🔔'} ${r.last.body}`); buzz(20); }
    if (r.last && r.last.id > seen) store.set(key, r.last.id);
  });
  bell.onclick = () => { buzz(); openLayer(Layer); };

  /* ---------- Telegram: подключение через бота ---------- */
  async function tgSync() {
    try { await rpc('tg_sync', {}); await new Promise(r => setTimeout(r, 2500)); return await rpc('tg_sync', {}); }
    catch (e) { console.error(e); return null; }
  }
  function connect(bot, code) {
    waitingTg = true;
    window.open(`https://t.me/${bot}?start=${code}`, '_blank');
    toast('В Telegram нажми «Start» и возвращайся сюда');
  }
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden || !waitingTg) return;
    waitingTg = false; toast('Проверяю подключение…');
    const r = await tgSync();
    const ok = r && (isAdmin ? r.he : r.she);
    toast(ok ? 'Telegram подключён ✓' : 'Пока не вижу. Нажми «Проверить» через пару секунд');
    if (!$('#layer').hidden && $('#nfList')) Layer.open($('#layerBody'));
    if ($('#nfAdmin')) adminView($('#admList'));
  });

  /* ---------- окно уведомлений ---------- */
  const Layer = {
    title: 'Уведомления',
    async open(root) {
      root.innerHTML = '<div class="us-scroll"><div id="nfTg"></div><div id="nfList"><p class="err">Загружаю…</p></div></div>';
      let r; try { r = await rpc('notifs_list', { p: P() }); } catch (e) { fail($('#nfList')); return; }
      if (!$('#nfList')) return;
      $('.badge', bell).hidden = true; bell.classList.remove('ring');
      const tg = r.tg || {};
      const box = $('#nfTg');
      if (tg.linked) box.innerHTML = `<div class="nf-tg ok">✓ Уведомления приходят тебе в Telegram</div>`;
      else if (tg.ready) {
        box.innerHTML = `<div class="nf-tg"><b>Получать уведомления в Telegram</b><small>Откроется бот — нажми там «Start» и возвращайся</small>
          <div class="us-row"><button class="link" id="nfCheck">Проверить</button><button class="btn btn-sm" id="nfConnect">Подключить ✈️</button></div></div>`;
        $('#nfConnect').onclick = () => connect(tg.bot, tg.code);
        $('#nfCheck').onclick = async () => { toast('Проверяю…'); await tgSync(); Layer.open(root); };
      } else box.innerHTML = `<div class="nf-tg"><small>${isAdmin ? 'Telegram-бот ещё не настроен: Пульт → «Уведомления»' : 'Скоро уведомления будут приходить и в Telegram 😉'}</small></div>`;
      const items = r.items || [];
      $('#nfList').innerHTML = items.length ? items.map((n, i) => `
        <div class="us-card nf-item ${n.is_read ? '' : 'new'}" style="animation-delay:${i * 30}ms"><i>${esc(n.icon || '🔔')}</i>
          <div><p>${esc(n.body)}</p><small>${when(n.created_at)}</small></div></div>`).join('')
        : '<p class="err">Пока тихо. Здесь будет всё новое 🔔</p>';
    },
  };

  /* ---------- пульт: вкладка «Уведомления» ---------- */
  const ICONS = ['🔔', '💗', '🧩', '📸', '💌', '🎁', '🪖', '🌴', '✨'];
  async function adminView(box) {
    box.innerHTML = '<p class="err">Загружаю…</p>';
    let r; try { r = await rpc('admin_tg_get', { p: adminPass }); } catch (e) { console.error(e); fail(box); return; }
    let icon = ICONS[0];
    const site = r.site_url || (location.origin + location.pathname);
    box.innerHTML = `<div class="sa" id="nfAdmin">
      <section class="sa-sec"><h4>Отправить ей уведомление</h4>
        <div class="sa-chips" id="nfIcons">${ICONS.map((e, i) => `<button type="button" data-v="${e}" aria-pressed="${!i}">${e}</button>`).join('')}</div>
        <label class="field"><span>Текст</span><textarea id="nfText" rows="2" maxlength="300" placeholder="Загляни в пазлы — там сюрприз 😉"></textarea></label>
        <div class="us-row"><span></span><button class="btn btn-sm" id="nfSend">Отправить 🔔</button></div>
      </section>
      <section class="sa-sec"><h4>Telegram-бот</h4>
        <p class="nf-steps">1. В Telegram открой <b>@BotFather</b> → <b>/newbot</b> → придумай имя и юзернейм → он пришлёт токен.<br>
          2. Вставь токен и юзернейм бота сюда → «Сохранить бота».<br>3. Нажми «Подключить меня» и в боте — «Start». Она подключается у себя через 🔔.</p>
        <label class="field"><span>Токен бота</span><input id="nfTok" type="password" autocomplete="off" placeholder="${r.token_set ? '•••••• сохранён (вставь новый, чтобы заменить)' : '123456789:AAH…'}"></label>
        <label class="field"><span>Юзернейм бота</span><input id="nfBot" value="${esc(r.bot || '')}" placeholder="my_love_bot"></label>
        <label class="field"><span>Адрес сайта (кнопка «Открыть» в сообщениях)</span><input id="nfSite" value="${esc(site)}"></label>
        <div class="us-row"><span></span><button class="btn btn-sm" id="nfSave">Сохранить бота</button></div>
        <div class="nf-status">
          <div><span>Ты</span><b class="${r.he ? 'ok' : ''}">${r.he ? '✓ подключён' : 'не подключён'}</b>${r.bot && r.token_set && !r.he ? '<button class="chip" id="nfMe">Подключить меня</button>' : ''}</div>
          <div><span>Она</span><b class="${r.she ? 'ok' : ''}">${r.she ? '✓ подключена' : 'не подключена'}</b></div>
          <button class="link" id="nfCheck2">Проверить подключение</button>
        </div>
      </section>
      <section class="sa-sec"><h4>Последние ей</h4>
        <div class="sa-notes">${(r.sent || []).map(n => `<div class="${n.is_read ? '' : 'new'}"><p>${esc(n.icon)} ${esc(n.body)}</p><small>${when(n.created_at)}${n.is_read ? ' • прочитано ✓' : ' • ещё не видела'}</small></div>`).join('') || '<p class="err">Пока ничего</p>'}</div>
      </section></div>`;
    $('#nfIcons').onclick = e => { const b = e.target.closest('button'); if (!b) return; icon = b.dataset.v; $$('#nfIcons button').forEach(x => x.setAttribute('aria-pressed', x === b)); };
    $('#nfSend').onclick = async () => {
      const t = $('#nfText').value.trim(); if (!t) { replay($('#nfText'), 'shake'); return; }
      $('#nfSend').disabled = true;
      try { await rpc('admin_notify', { p: adminPass, ic: icon, txt: t }); toast('Отправлено 🔔'); fx.at($('#nfSend'), [icon, '✨'], 16); adminView(box); }
      catch (e) { toast(/bad password/.test(e.message) ? 'Пароль сменился, войди заново' : 'Не отправилось'); $('#nfSend').disabled = false; }
    };
    $('#nfSave').onclick = async () => {
      try { await rpc('admin_tg_set', { p: adminPass, tok: $('#nfTok').value, b: $('#nfBot').value, site: $('#nfSite').value }); toast('Бот сохранён ✓'); adminView(box); }
      catch (e) { toast('Не сохранилось'); }
    };
    const me = $('#nfMe'); if (me) me.onclick = () => connect(r.bot, r.code);
    $('#nfCheck2').onclick = async () => { toast('Проверяю…'); await tgSync(); adminView(box); };
  }
  T.notifs = { name: 'Уведомления', custom: adminView, fields: [] };
})();
