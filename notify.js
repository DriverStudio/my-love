/* =====================================================================
   🔔 УВЕДОМЛЕНИЯ: колокольчик на сайте
   Подключается после app.js, us.js, soldier.js.
   ===================================================================== */
(() => {
  const P = () => (isAdmin ? adminPass : null);
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const when = iso => new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const bell = $('#bell');
  let firstPing = false;

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

  /* ---------- окно уведомлений ---------- */
  const Layer = {
    title: 'Уведомления',
    async open(root) {
      root.innerHTML = '<div class="us-scroll"><div id="nfApp"></div><div id="nfList"><p class="err">Загружаю…</p></div></div>';
      installCard($('#nfApp'));
      let r; try { r = await rpc('notifs_list', { p: P() }); } catch (e) { fail($('#nfList')); return; }
      if (!$('#nfList')) return;
      $('.badge', bell).hidden = true; bell.classList.remove('ring');
      const items = r.items || [];
      $('#nfList').innerHTML = items.length ? items.map((n, i) => `
        <div class="us-card nf-item ${n.is_read ? '' : 'new'}" style="animation-delay:${i * 30}ms"><i>${esc(n.icon || '🔔')}</i>
          <div><p>${esc(n.body)}</p><small>${when(n.created_at)}</small></div></div>`).join('')
        : '<p class="err">Пока тихо. Здесь будет всё новое 🔔</p>';
      if (items.length) $('#nfList').insertAdjacentHTML('beforeend', '<p class="us-hint nf-clean">Уведомления старше 3 дней удаляются сами</p>');
    },
  };

  /* ---------- 📲 установить как приложение ---------- */
  function installCard(box) {
    if (isStandalone()) { box.remove(); return; }
    const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua), tg = /Telegram/i.test(ua) || !!window.TelegramWebviewProxy;
    let body;
    if (installPrompt) body = '<small>Иконка на главном экране, без адресной строки, грузится мгновенно</small><div class="us-row"><span></span><button class="btn btn-sm" id="appInstall">Установить 📲</button></div>';
    else if (tg) body = '<small>Из Telegram установить нельзя. Нажми ⋮ вверху → «Открыть в браузере», там будет кнопка установки</small>';
    else if (ios) body = '<small>В Safari нажми «Поделиться» ⬆️ → «На экран «Домой»»</small>';
    else body = '<small>В меню браузера ⋮ выбери «Добавить на главный экран» или «Установить приложение»</small>';
    box.innerHTML = `<div class="nf-tg nf-app"><b>📲 Сделать приложением</b>${body}</div>`;
    const b = $('#appInstall');
    if (b) b.onclick = async () => { installPrompt.prompt(); const r = await installPrompt.userChoice; installPrompt = null; if (r.outcome === 'accepted') { toast('Готово! Ищи сердечко на главном экране 💗'); box.remove(); } };
  }

  /* ---------- пульт: вкладка «Уведомления» ---------- */
  const ICONS = ['🔔', '💗', '🧩', '📸', '💌', '🎁', '🪖', '🌴', '✨'];
  async function adminView(box) {
    box.innerHTML = '<p class="err">Загружаю…</p>';
    let r; try { r = await rpc('admin_tg_get', { p: adminPass }); } catch (e) { console.error(e); fail(box); return; }
    let icon = ICONS[0];
    box.innerHTML = `<div class="sa" id="nfAdmin">
      <section class="sa-sec"><h4>Отправить ей уведомление</h4>
        <div class="sa-chips" id="nfIcons">${ICONS.map((e, i) => `<button type="button" data-v="${e}" aria-pressed="${!i}">${e}</button>`).join('')}</div>
        <label class="field"><span>Текст</span><textarea id="nfText" rows="2" maxlength="300" placeholder="Загляни в пазлы — там сюрприз 😉"></textarea></label>
        <div class="us-row"><span></span><button class="btn btn-sm" id="nfSend">Отправить 🔔</button></div>
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
  }
  T.notifs = { name: 'Уведомления', custom: adminView, fields: [] };
})();
