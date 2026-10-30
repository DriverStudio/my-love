/* =====================================================================
   🎵 ПЛЕЕР + военная сцена на фоне. Подключается после app.js.
   ===================================================================== */
(() => {
  const aud = $('#aud');
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  let tracks = [], cur = -1, shuffle = store.get('muShuf') || false, repeat = store.get('muRep') ?? true, loaded = false;

  /* ---------------- плеер ---------------- */
  async function loadTracks() {
    try { tracks = await db('tracks?select=id,title,artist,url&order=sort,id'); } catch (e) { console.error(e); tracks = []; }
    loaded = true; renderList();
    if (cur < 0 && tracks.length) setTrack(Math.max(0, tracks.findIndex(t => t.id === store.get('muLast'))), false);
    if (!tracks.length) { $('#muTitle').textContent = 'Тишина…'; $('#muArtist').textContent = isAdmin ? 'Добавь песни: Пульт → «Музыка»' : 'Скоро тут будет наша музыка 🎵'; }
  }
  function setTrack(i, play = true) {
    if (!tracks.length) return;
    cur = (i + tracks.length) % tracks.length;
    const t = tracks[cur];
    aud.src = t.url; store.set('muLast', t.id);
    $('#muTitle').textContent = t.title; $('#muArtist').textContent = t.artist || ' ';
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist || '', artwork: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }] });
    renderList();
    if (play) aud.play().catch(e => { console.error(e); toast('Не получилось включить, нажми ▶'); });
  }
  const fmt = s => isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00';
  function next(auto) {
    if (!tracks.length) return;
    if (shuffle && tracks.length > 1) { let j; do j = Math.floor(Math.random() * tracks.length); while (j === cur); return setTrack(j); }
    if (auto && !repeat && cur === tracks.length - 1) return;
    setTrack(cur + 1);
  }
  function prev() { if (aud.currentTime > 3) aud.currentTime = 0; else setTrack(shuffle ? Math.floor(Math.random() * tracks.length) : cur - 1); }
  function toggle() {
    if (!tracks.length) { toast(isAdmin ? 'Сначала добавь песни в пульте' : 'Песен пока нет'); return; }
    if (cur < 0) return setTrack(0);
    aud.paused ? aud.play().catch(() => toast('Не получилось включить')) : aud.pause();
  }
  function paint() {
    const playing = !aud.paused;
    $('#muPlay').textContent = playing ? '⏸' : '▶';
    $('#navMusic').classList.toggle('playing', playing);
    $('.s-music').classList.toggle('playing', playing);
    $('#muShuf').classList.toggle('on', shuffle); $('#muRep').classList.toggle('on', repeat);
  }
  function renderList() {
    const box = $('#muList'); if (!box) return;
    box.innerHTML = tracks.length ? tracks.map((t, i) => `<button class="mu-row ${i === cur ? 'cur' : ''}" data-i="${i}">
        <span class="mu-n">${i === cur && !aud.paused ? '<i class="eq"><b></b><b></b><b></b></i>' : i + 1}</span>
        <span class="mu-tt"><b>${esc(t.title)}</b><small>${esc(t.artist || '')}</small></span></button>`).join('')
      : '';
  }
  $('#muList').onclick = e => { const b = e.target.closest('.mu-row'); if (!b) return; const i = +b.dataset.i; i === cur ? toggle() : setTrack(i); buzz(); };
  $('#muPlay').onclick = () => { toggle(); buzz(10); };
  $('#muNext').onclick = () => { next(); buzz(); };
  $('#muPrev').onclick = () => { prev(); buzz(); };
  $('#muShuf').onclick = () => { shuffle = !shuffle; store.set('muShuf', shuffle); paint(); toast(shuffle ? 'Вперемешку 🔀' : 'По порядку'); };
  $('#muRep').onclick = () => { repeat = !repeat; store.set('muRep', repeat); paint(); toast(repeat ? 'Повтор плейлиста 🔁' : 'Без повтора'); };
  aud.addEventListener('play', () => { paint(); renderList(); });
  aud.addEventListener('pause', () => { paint(); renderList(); });
  aud.addEventListener('ended', () => next(true));
  aud.addEventListener('error', () => { if (aud.src) toast('Песня не загрузилась, проверь интернет'); });
  aud.addEventListener('loadedmetadata', () => $('#muDur').textContent = fmt(aud.duration));
  aud.addEventListener('timeupdate', () => {
    if (seeking) return;
    const p = aud.duration ? aud.currentTime / aud.duration : 0;
    $('#muFill').style.width = p * 100 + '%'; $('#muKnob').style.left = p * 100 + '%'; $('#muCur').textContent = fmt(aud.currentTime);
  });
  // перемотка пальцем
  let seeking = false;
  const bar = $('#muBar');
  const seekTo = e => { const r = bar.getBoundingClientRect(), p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); $('#muFill').style.width = p * 100 + '%'; $('#muKnob').style.left = p * 100 + '%'; return p; };
  bar.onpointerdown = e => { if (!aud.duration) return; seeking = true; bar.setPointerCapture(e.pointerId); seekTo(e); };
  bar.onpointermove = e => { if (seeking) { const p = seekTo(e); $('#muCur').textContent = fmt(p * aud.duration); } };
  bar.onpointerup = e => { if (!seeking) return; aud.currentTime = seekTo(e) * aud.duration; seeking = false; };
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => aud.play());
    navigator.mediaSession.setActionHandler('pause', () => aud.pause());
    navigator.mediaSession.setActionHandler('nexttrack', () => next());
    navigator.mediaSession.setActionHandler('previoustrack', () => prev());
  }
  document.addEventListener('entered', () => { loadTracks(); paint(); });

  /* ---------------- 🌑 военная сцена ---------------- */
  const War = (() => {
    const cv = $('#warCv'), g = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, raf = 0, last = 0, t = 0;
    let hills = [], ash = [], booms = [], tracers = [], flare = null, nextBoom = 2, nextTracer = 4, nextFlare = 9;
    const noise = document.createElement('canvas'); noise.width = noise.height = 96; const ng = noise.getContext('2d');
    function resize() {
      dpr = Math.min(1.5, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      hills = [.27, .345, .43].map((y, k) => ({ y, amp: [28, 22, 16][k], f: [.004, .007, .011][k], ph: Math.random() * 9, sp: [4, 9, 16][k], col: ['#2b2d23', '#16180f', '#060705'][k] }));
      ash = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 20 + Math.random() * 40, s: Math.random() * 1.6 + .4 }));
    }
    const ridge = (h, x) => H * h.y + Math.sin((x + t * h.sp) * h.f + h.ph) * h.amp + Math.sin((x + t * h.sp) * h.f * 2.7 + h.ph * 2) * h.amp * .35;
    function soldier(x, y, s, ph) { // силуэт солдата с винтовкой
      const step = Math.sin(ph) * 5 * s;
      g.save(); g.translate(x, y); g.scale(s, s);
      g.beginPath(); g.moveTo(-3, -18); g.lineTo(3 + step * .2, 0); g.moveTo(3, -18); g.lineTo(-3 - step * .2, 0); g.lineWidth = 3.4; g.stroke(); // ноги
      g.fillRect(-5, -36, 10, 19);                            // корпус
      g.fillRect(-9, -34, 5, 13);                             // рюкзак
      g.beginPath(); g.arc(0, -40, 4.6, 0, 7); g.fill();     // голова
      g.beginPath(); g.ellipse(0, -43, 7, 3.6, 0, Math.PI, 0); g.fill(); // каска
      g.beginPath(); g.moveTo(3, -32); g.lineTo(13, -50); g.lineWidth = 2; g.stroke(); // винтовка на плече
      g.restore();
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (now - last < 33) return; // ~30 кадров: красиво и бережёт батарею
      const dt = Math.min(.1, (now - last) / 1000 || .033); last = now; t += dt;
      const playing = !aud.paused;
      // небо
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#05070a'); sky.addColorStop(.55, '#141a16'); sky.addColorStop(.75, '#2a2618'); sky.addColorStop(1, '#0a0b08');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      // луна в дымке
      g.save(); g.globalAlpha = .55; g.shadowColor = '#d8d2b0'; g.shadowBlur = 40; g.fillStyle = '#cfc9a8';
      g.beginPath(); g.arc(W * .78, H * .16, Math.min(W, H) * .045, 0, 7); g.fill(); g.restore();
      // взрывы на горизонте: вспышка + столб дыма
      if ((nextBoom -= dt) < 0) { booms.push({ x: W * (.1 + Math.random() * .8), age: 0, r: 30 + Math.random() * 40 }); nextBoom = (playing ? 1.6 : 3) + Math.random() * 3.5; }
      booms = booms.filter(b => (b.age += dt) < 7);
      for (const b of booms) {
        const hy = ridge(hills[0], b.x);
        if (b.age < .7) { // вспышка подсвечивает небо
          const k = 1 - b.age / .7, gl = g.createRadialGradient(b.x, hy, 0, b.x, hy, b.r * 6);
          gl.addColorStop(0, `rgba(255,150,60,${.55 * k})`); gl.addColorStop(1, 'rgba(255,90,20,0)');
          g.fillStyle = gl; g.fillRect(0, 0, W, H);
          g.fillStyle = `rgba(255,210,140,${k})`; g.beginPath(); g.arc(b.x, hy, b.r * .35 * (1 + b.age), 0, 7); g.fill();
        }
        for (let i = 0; i < 5; i++) { // дым поднимается и расползается
          const a = Math.max(0, .35 - b.age * .05), yy = hy - b.age * (14 + i * 6), rr = b.r * (.4 + b.age * .25 + i * .12);
          g.fillStyle = `rgba(40,40,36,${a})`; g.beginPath(); g.arc(b.x + Math.sin(b.age + i) * 10, yy, rr, 0, 7); g.fill();
        }
      }
      // прожекторы
      g.save(); g.globalCompositeOperation = 'lighter';
      [[.18, .7, 0], [.82, .5, 2.1]].forEach(([px, sp, ph]) => {
        const x = W * px, y = ridge(hills[1], x), ang = -Math.PI / 2 + Math.sin(t * sp + ph) * .55, len = H * .9, wd = .07;
        const gr = g.createLinearGradient(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
        gr.addColorStop(0, 'rgba(255,250,215,.22)'); gr.addColorStop(1, 'rgba(255,250,215,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(x, y);
        g.lineTo(x + Math.cos(ang - wd) * len, y + Math.sin(ang - wd) * len); g.lineTo(x + Math.cos(ang + wd) * len, y + Math.sin(ang + wd) * len); g.fill();
      });
      // трассеры
      if ((nextTracer -= dt) < 0) { const x0 = Math.random() * W, dir = Math.random() < .5 ? 1 : -1; for (let i = 0; i < 6; i++) tracers.push({ x: x0 - dir * i * 26, y: H * .42 + i * 4, vx: dir * 360, vy: -300, life: 1.3 + i * .05 }); nextTracer = 2.5 + Math.random() * 5; }
      tracers = tracers.filter(p => (p.life -= dt) > 0);
      g.strokeStyle = 'rgba(255,110,40,.95)'; g.lineWidth = 2; g.shadowColor = '#ff6a2a'; g.shadowBlur = 8;
      for (const p of tracers) { p.x += p.vx * dt; p.y += p.vy * dt; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * .035, p.y - p.vy * .035); g.stroke(); }
      g.shadowBlur = 0;
      // осветительная ракета: медленно падает и заливает всё красным светом
      if ((nextFlare -= dt) < 0 && !flare) { flare = { x: W * (.25 + Math.random() * .5), y: H * .12, age: 0 }; nextFlare = 14 + Math.random() * 12; }
      if (flare) {
        flare.age += dt; flare.y += dt * 12; flare.x += Math.sin(flare.age) * .3;
        const k = Math.min(1, flare.age) * Math.max(0, 1 - flare.age / 9), gl = g.createRadialGradient(flare.x, flare.y, 0, flare.x, flare.y, H * .7);
        gl.addColorStop(0, `rgba(255,70,50,${.35 * k})`); gl.addColorStop(1, 'rgba(255,40,30,0)');
        g.fillStyle = gl; g.fillRect(0, 0, W, H);
        g.fillStyle = `rgba(255,220,200,${k})`; g.beginPath(); g.arc(flare.x, flare.y, 3, 0, 7); g.fill();
        if (flare.age > 9) flare = null;
      }
      g.restore();
      // зарево пожаров за холмами
      const glow = g.createLinearGradient(0, H * .22, 0, H * .48);
      glow.addColorStop(0, 'rgba(255,110,40,0)'); glow.addColorStop(.6, `rgba(255,110,40,${.16 + Math.sin(t * 1.3) * .04 + (playing ? .05 : 0)})`); glow.addColorStop(1, 'rgba(255,110,40,0)');
      g.fillStyle = glow; g.fillRect(0, H * .22, W, H * .26);
      // холмы (параллакс)
      hills.forEach((h, k) => {
        if (k === 2) { const gl2 = g.createLinearGradient(0, H * .33, 0, H * .45); gl2.addColorStop(0, 'rgba(255,120,50,0)'); gl2.addColorStop(1, 'rgba(255,120,50,.14)'); g.fillStyle = gl2; g.fillRect(0, H * .33, W, H * .12); }
        g.fillStyle = h.col; g.beginPath(); g.moveTo(0, H);
        for (let x = 0; x <= W + 8; x += 8) g.lineTo(x, ridge(h, x));
        g.lineTo(W, H); g.fill();
        if (k === 2) { // по ближнему гребню идёт колонна
          g.fillStyle = g.strokeStyle = '#000';
          const n = 7, spd = 26, sc = Math.max(.8, Math.min(1.25, W / 380));
          for (let i = 0; i < n; i++) {
            const x = ((t * spd + i * 46 * sc) % (W + 400)) - 120;
            soldier(x, ridge(h, x) + 2, sc, t * 5.5 + i * 1.3);
          }
        }
      });
      // колючая проволока на переднем плане
      g.strokeStyle = '#030403'; g.fillStyle = '#030403'; g.lineWidth = 2;
      const base = H * .5;
      for (let x = -20; x < W + 40; x += 70) { g.fillRect(x, base - 34, 4, 60); }
      for (let r = 0; r < 2; r++) { g.beginPath(); for (let x = -20; x < W + 40; x += 12) g.lineTo(x, base - 26 + r * 14 + ((x / 12) % 2 ? 5 : -5)); g.stroke(); }
      // пепел
      g.fillStyle = 'rgba(190,185,170,.35)';
      for (const a of ash) { a.y += a.v * dt; a.x -= a.v * .35 * dt; if (a.y > H) { a.y = -5; a.x = Math.random() * W * 1.3; } g.fillRect(a.x, a.y, a.s, a.s); }
      // туман у земли
      const fog = g.createLinearGradient(0, H * .36, 0, H * .62);
      fog.addColorStop(0, 'rgba(60,62,55,0)'); fog.addColorStop(1, `rgba(60,62,55,${.35 + Math.sin(t * .4) * .08})`);
      g.fillStyle = fog; g.fillRect(0, H * .36, W, H * .64);
      // плёночное зерно и виньетка
      if (Math.random() < .5) { const id = ng.createImageData(96, 96); for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 18; } ng.putImageData(id, 0, 0); }
      g.fillStyle = g.createPattern(noise, 'repeat'); g.fillRect(0, 0, W, H);
      const vg = g.createRadialGradient(W / 2, H * .3, Math.min(W, H) * .3, W / 2, H * .5, Math.max(W, H) * .75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.75)');
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
    }
    return {
      start() { if (raf) return; resize(); last = 0; raf = requestAnimationFrame(frame); },
      stop() { cancelAnimationFrame(raf); raf = 0; },
      resize,
    };
  })();
  // сцена живёт только пока экран плеера на виду
  const isOn = () => $('.s-music').classList.contains('show') && !document.hidden;
  const sync = () => isOn() ? War.start() : War.stop();
  new MutationObserver(sync).observe($('.s-music'), { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', sync);
  addEventListener('resize', () => isOn() && War.resize());
  onEnter.music = () => { if (!loaded) loadTracks(); };

  /* ---------------- пульт: вкладка «Музыка» ---------------- */
  const H = { apikey: C.SUPABASE_KEY }; if (C.SUPABASE_KEY.startsWith('eyJ')) H.Authorization = 'Bearer ' + C.SUPABASE_KEY;
  function upload(path, file, onProgress) {
    return new Promise((res, rej) => {
      const x = new XMLHttpRequest();
      x.open('POST', `${C.SUPABASE_URL}/storage/v1/object/music/${path}`);
      Object.entries(H).forEach(([k, v]) => x.setRequestHeader(k, v));
      x.setRequestHeader('Content-Type', file.type || 'audio/mpeg'); x.setRequestHeader('x-upsert', 'false');
      x.upload.onprogress = e => e.lengthComputable && onProgress(e.loaded / e.total);
      x.onload = () => x.status < 300 ? res() : rej(new Error(x.status + ' ' + x.responseText));
      x.onerror = () => rej(new Error('network'));
      x.send(file);
    });
  }
  async function adminView(box) {
    box.innerHTML = '<p class="err">Загружаю…</p>';
    let dir, list;
    try { [dir, list] = await Promise.all([rpc('admin_music_dir', { p: adminPass }), db('tracks?select=id,title,artist,url,path&order=sort,id')]); }
    catch (e) { console.error(e); fail(box); return; }
    box.innerHTML = `<div class="sa">
      <section class="sa-sec"><h4>Добавить песню</h4>
        <div class="img-btns"><label class="chip">🎵 Выбрать файл<input type="file" accept="audio/*,.mp3,.m4a,.aac,.ogg,.wav" hidden id="muFile"></label></div>
        <p class="sa-lbl" id="muFileName">Файл не выбран (mp3, m4a — до 50 МБ)</p>
        <label class="field"><span>Название</span><input id="muT" maxlength="120"></label>
        <label class="field"><span>Исполнитель (необязательно)</span><input id="muA" maxlength="120"></label>
        <div class="mu-prog" id="muProg" hidden><i></i></div>
        <div class="us-row"><span></span><button class="btn btn-sm" id="muAdd">Загрузить 🎵</button></div>
      </section>
      <section class="sa-sec"><h4>Плейлист</h4><div class="mu-adm" id="muAdm">${list.length ? '' : '<p class="err">Пока пусто</p>'}</div></section></div>`;
    let file = null;
    $('#muFile').onchange = () => {
      file = $('#muFile').files[0] || null; if (!file) return;
      $('#muFileName').textContent = `✓ ${file.name} (${(file.size / 1048576).toFixed(1)} МБ)`;
      if (!$('#muT').value) $('#muT').value = file.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').replace(/^\d+[\s.-]+/, '');
      if (file.size > 50 * 1048576) toast('Файл больше 50 МБ — не влезет');
    };
    $('#muAdd').onclick = async () => {
      if (!file) { toast('Сначала выбери файл'); return; }
      const title = $('#muT').value.trim(); if (!title) { replay($('#muT'), 'shake'); return; }
      const ext = (file.name.match(/\.[a-z0-9]+$/i) || ['.mp3'])[0].toLowerCase(), path = `${dir}/${Date.now()}${ext}`;
      const btn = $('#muAdd'), prog = $('#muProg'); btn.disabled = true; prog.hidden = false;
      try {
        await upload(path, file, p => { $('i', prog).style.width = p * 100 + '%'; btn.textContent = `Загружаю ${Math.round(p * 100)}%`; });
        await rpc('admin_track_add', { p: adminPass, t: title, a: $('#muA').value, u: `${C.SUPABASE_URL}/storage/v1/object/public/music/${path}`, pth: path });
        toast('Песня добавлена 🎵'); fx.at(btn, ['🎵', '🎶', '✨'], 18); loadTracks(); adminView(box);
      } catch (e) { console.error(e); toast(/413|too large|exceeded/i.test(e.message) ? 'Файл слишком большой' : 'Не загрузилось, проверь интернет'); btn.disabled = false; btn.textContent = 'Загрузить 🎵'; prog.hidden = true; }
    };
    const adm = $('#muAdm');
    list.forEach((t, i) => {
      const row = document.createElement('div'); row.className = 'mu-arow';
      row.innerHTML = `<span class="mu-tt"><b></b><small></small></span><button data-a="up" ${i ? '' : 'disabled'}>↑</button><button data-a="down" ${i < list.length - 1 ? '' : 'disabled'}>↓</button><button data-a="del">🗑</button>`;
      $('b', row).textContent = t.title; $('small', row).textContent = t.artist || '';
      row.onclick = async e => {
        const b = e.target.closest('button'); if (!b) return;
        try {
          if (b.dataset.a === 'del') {
            if (!b.classList.contains('arm')) { b.classList.add('arm'); b.textContent = 'Точно?'; return; }
            const pth = await rpc('admin_track_del', { p: adminPass, tid: t.id });
            if (pth) fetch(`${C.SUPABASE_URL}/storage/v1/object/music/${pth}`, { method: 'DELETE', headers: H }).catch(() => {});
            toast('Удалено');
          } else await rpc('admin_track_move', { p: adminPass, tid: t.id, dir: b.dataset.a === 'up' ? -1 : 1 });
          loadTracks(); adminView(box);
        } catch (er) { toast('Не получилось'); }
      };
      adm.append(row);
    });
  }
  T.music = { name: 'Музыка', custom: adminView, fields: [] };
})();
