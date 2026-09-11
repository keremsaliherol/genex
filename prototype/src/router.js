/* Kabuk + yönlendirici: _Layout.cshtml ve MVC conventional routing'in aynası.
   #/Musteri/Detay/184 → MusteriController.Detay(184) */
(function () {
  'use strict';
  const HM = (window.HM = window.HM || {});
  const u = HM.u; const db = HM.db;
  HM.views = HM.views || {};
  HM.demo = { durum: 'normal' };
  HM.durum = { sonHesapId: null };

  /* Arama kaynakları (/api/musteri/ara, /api/hesap/ara karşılığı) */
  const kucuk = (s) => String(s).toLocaleLowerCase('tr-TR');
  HM.ara = {
    musteri(q, n) {
      const k = kucuk(q.trim()); if (!k) return [];
      return db.musteriler.filter((m) => kucuk(m.ad).includes(k) || m.no.startsWith(k) || kucuk(m.eposta).includes(k)).slice(0, n || 8);
    },
    hesap(q, opt) {
      const o = opt || {}; const k = kucuk(q.trim()); const rakam = k.replace(/[^0-9]/g, '');
      return db.hesaplar.filter((h) => (!o.sadeceAktif || h.aktif) && (!o.tip || h.tip === o.tip) && h.id !== o.haric &&
        (!k || (rakam.length >= 3 && h.no.replace(/-/g, '').includes(rakam)) || kucuk(db.musteri(h.musteriId).ad).includes(k))).slice(0, o.n || 8);
    }
  };

  /* Aramalı seçici (combobox): hesap/müşteri seçimi için partial + küçük JS */
  HM.secici = {
    html(o) {
      return `<div class="alan"><label class="form-label" for="${o.id}">${o.etiket}${o.zorunlu ? '<span class="zorunlu" aria-hidden="true">*</span>' : ''}</label>
        <div class="secici"><input id="${o.id}" class="form-control" type="text" autocomplete="off" role="combobox" aria-expanded="false" aria-autocomplete="list"
          aria-controls="${o.id}-liste" aria-describedby="${o.id}-yardim ${o.id}-hata" placeholder="${u.e(o.yerTutucu || '')}" value="${u.e(o.deger || '')}"${o.zorunlu ? ' aria-required="true"' : ''}>
        <ul id="${o.id}-liste" class="secici-liste" role="listbox" hidden></ul></div>
        <div id="${o.id}-yardim" class="form-text">${o.yardim || ''}</div><div id="${o.id}-hata" class="invalid-feedback"></div></div>`;
    },
    bagla(kok, o) {
      const inp = kok.querySelector('#' + o.id); const liste = kok.querySelector('#' + o.id + '-liste');
      let ogeler = []; let aktif = -1;
      const kapat = () => { liste.hidden = true; inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant'); };
      const ciz = () => {
        ogeler = o.ara(inp.value);
        liste.innerHTML = ogeler.length ? ogeler.map((x, i) => `<li id="${o.id}-o${i}" role="option" aria-selected="${i === aktif}"${x.pasif ? ' aria-disabled="true"' : ''} data-i="${i}"><span><span${x.mono ? ' class="mono"' : ''}>${u.e(x.baslik)}</span><small>${u.e(x.alt || '')}</small></span><span class="text-end">${x.sag || ''}</span></li>`).join('')
          : '<li role="option" aria-disabled="true"><span>Eşleşen kayıt yok</span></li>';
        liste.hidden = false; inp.setAttribute('aria-expanded', 'true');
        if (aktif >= 0) inp.setAttribute('aria-activedescendant', `${o.id}-o${aktif}`);
      };
      const sec = (i) => { const x = ogeler[i]; if (!x || x.pasif) return; inp.value = x.baslik; kapat(); o.sec(x); };
      inp.addEventListener('focus', () => { aktif = -1; ciz(); inp.select(); }, { signal: o.sinyal });
      inp.addEventListener('input', () => { aktif = -1; o.sec(null); ciz(); }, { signal: o.sinyal });
      inp.addEventListener('blur', () => setTimeout(kapat, 120), { signal: o.sinyal });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); if (liste.hidden) ciz(); aktif = Math.min(ogeler.length - 1, aktif + 1); ciz(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); aktif = Math.max(0, aktif - 1); ciz(); }
        else if (e.key === 'Enter') { if (!liste.hidden && ogeler.length) { e.preventDefault(); sec(aktif >= 0 ? aktif : 0); } }
        else if (e.key === 'Escape') kapat();
      }, { signal: o.sinyal });
      liste.addEventListener('mousedown', (e) => { const li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); sec(Number(li.dataset.i)); } }, { signal: o.sinyal });
    },
    hesapOgesi(h, opt) {
      const m = db.musteri(h.musteriId); const o = opt || {};
      return { id: h.id, deger: h, baslik: h.no, mono: true, alt: `${m.ad}, ${h.tip === 'YATIRIM' ? 'Yatırım' : 'Vadesiz'}${h.aktif ? '' : ', pasif'}`, sag: u.tutar(h.bakiye), pasif: (o.pasifKapat && !h.aktif) || (o.pasifFn && o.pasifFn(h)) };
    }
  };

  /* Rota tablosu */
  const ROTALAR = [
    { desen: '/', view: 'genelBakis', nav: 'genel' },
    { desen: '/Giris', view: 'giris', nav: null },
    { desen: '/Musteri', view: 'musteriListe', nav: 'musteri' },
    { desen: '/Musteri/Yeni', view: 'musteriForm', nav: 'musteri' },
    { desen: '/Musteri/Duzenle/:id', view: 'musteriForm', nav: 'musteri' },
    { desen: '/Musteri/Detay/:id', view: 'musteriDetay', nav: 'musteri' },
    { desen: '/Hesap', view: 'hesapListe', nav: 'hesap' },
    { desen: '/Hesap/Yeni', view: 'hesapYeni', nav: 'hesap' },
    { desen: '/Hesap/Detay/:id', view: 'hesapDetay', nav: 'hesap' },
    { desen: '/Hesap/Ekstre', view: 'ekstre', nav: 'ekstre' },
    { desen: '/Hesap/Ekstre/:id', view: 'ekstre', nav: 'ekstre' },
    { desen: '/Islem/Yeni', view: 'islemYeni', nav: 'islem' },
    { desen: '/Islem/Dekont/:id', view: 'dekont', nav: 'islem' },
    { desen: '/Rapor', yonlendir: '/Rapor/AylikOzet' },
    { desen: '/Rapor/AylikOzet', view: 'rapor', nav: 'rapor', ek: { sekme: 'aylik' } },
    { desen: '/Rapor/BakiyeDegisimi', view: 'rapor', nav: 'rapor', ek: { sekme: 'bakiye' } },
    { desen: '/Rapor/EnAktif', view: 'rapor', nav: 'rapor', ek: { sekme: 'aktif' } },
    { desen: '/Hata', view: 'hata', nav: null }
  ];
  function eslestir(desen, yol) {
    const a = desen.split('/'); const b = yol.split('/');
    if (a.length !== b.length) return null;
    const p = {};
    for (let i = 0; i < a.length; i++) {
      if (a[i].startsWith(':')) { if (!/^\d+$/.test(b[i])) return null; p[a[i].slice(1)] = Number(b[i]); }
      else if (a[i].toLowerCase() !== b[i].toLowerCase()) return null;
    }
    return p;
  }
  function coz() {
    const h = decodeURIComponent(location.hash.slice(1)) || '/';
    const i = h.indexOf('?');
    const yol = (i < 0 ? h : h.slice(0, i)).replace(/\/+$/, '') || '/';
    const q = Object.fromEntries(new URLSearchParams(i < 0 ? '' : h.slice(i + 1)));
    for (const r of ROTALAR) { const p = eslestir(r.desen, yol); if (p) return { r, p, q, yol }; }
    return { r: { view: 'bulunamadi', nav: null }, p: {}, q, yol };
  }
  const qs = (q) => { const s = new URLSearchParams(); Object.entries(q || {}).forEach(([k, v]) => { if (v !== '' && v != null) s.set(k, v); }); const t = s.toString(); return t ? '?' + t : ''; };

  /* Kabuk */
  const NAV = [
    ['genel', '#/', 'squares-four', 'Genel bakış'], ['musteri', '#/Musteri', 'users', 'Müşteriler'], ['hesap', '#/Hesap', 'wallet', 'Hesaplar'],
    ['islem', '#/Islem/Yeni', 'arrows-left-right', 'İşlem yap'], ['ekstre', '#/Hesap/Ekstre', 'receipt', 'Ekstre'], ['rapor', '#/Rapor/AylikOzet', 'chart-line', 'Raporlar']
  ];
  function kabukHtml() {
    return `<button type="button" class="skip-link" data-atla>İçeriğe atla</button>
    <div class="hm-shell" id="kabuk">
      <aside class="hm-sidebar" id="yan-menu" aria-label="Ana menü">
        <a class="hm-brand" href="#/" aria-label="Hesap Masası, genel bakış"><span class="hm-brand-mark">${u.ikon('vault')}</span><span class="hm-brand-name">Hesap Masası<small>Müşteri ve hesap yönetimi</small></span></a>
        <nav class="hm-nav" aria-label="Modüller">${NAV.map(([k, href, ik, ad]) => `<a href="${href}" data-nav="${k}" title="${ad}">${u.ikon(ik)}<span>${ad}</span></a>`).join('')}</nav>
        <div class="hm-sidebar-foot"><div class="hm-baglanti" title="Oracle Database XE 21c, XEPDB1 servisi, MUSTERIYONETIM şeması"><span class="hm-dot" aria-hidden="true"></span><span class="metin">XEPDB1 · MUSTERIYONETIM</span></div><div class="metin">Demo verisi, kurgusal</div></div>
      </aside>
      <div class="hm-backdrop" id="menu-perde" hidden></div>
      <div class="hm-main">
        <header class="hm-topbar">
          <button type="button" class="btn btn-ghost btn-icon hm-menu-btn" id="menu-dugme" aria-controls="yan-menu" aria-expanded="false" aria-label="Menüyü aç">${u.ikon('list')}</button>
          <nav class="hm-crumbs" aria-label="Konum"><ol id="kirinti"></ol></nav>
          <div class="hm-search" role="search">${u.ikon('magnifying-glass')}
            <label class="visually-hidden" for="genel-arama">Müşteri veya hesap ara</label>
            <input id="genel-arama" class="form-control" type="search" placeholder="Müşteri adı, müşteri no, hesap no" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="arama-sonuc" aria-autocomplete="list">
            <kbd>Ctrl K</kbd><div class="hm-search-results" id="arama-sonuc" role="listbox" aria-label="Arama sonuçları" hidden></div></div>
          <div class="hm-top-eylem">
            <button type="button" class="btn btn-ghost" id="iz-dugme" aria-pressed="false" aria-controls="iz" title="Oracle izi (Alt+O)">${u.ikon('database')}<span class="etiket">Oracle izi</span><span class="iz-sayac" id="iz-sayac">0</span></button>
            <div class="dropdown">
              <button type="button" class="btn btn-ghost" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Kullanıcı menüsü"><span class="hm-avatar" aria-hidden="true">AD</span><span class="etiket">admin</span>${u.ikon('caret-down', 'ic-14')}</button>
              <div class="dropdown-menu dropdown-menu-end" id="kullanici-menu" style="min-width:250px"></div>
            </div>
          </div>
        </header>
        <main id="icerik" class="hm-content" tabindex="-1"></main>
      </div>
    </div>
    <div id="tam-ekran" hidden></div>
    <section class="iz" id="iz" data-acik="false" aria-label="Oracle izi">
      <div class="iz-bar"><button type="button" class="iz-bar-btn" aria-expanded="false" aria-controls="iz-govde">${u.ikon('terminal-window', 'ic-16')}<strong>Oracle izi</strong><span class="iz-son"></span>${u.ikon('caret-up-down', 'ic-14 iz-caret')}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-iz-temizle>Temizle</button></div>
      <div class="iz-govde" id="iz-govde"></div>
    </section>
    <div class="toast-alani" id="toast-alani" aria-live="polite"></div>
    <div class="baski-cubugu" id="baski-cubugu" hidden><span>${u.ikon('printer', 'ic-16')} Yazdırma görünümü</span><button type="button" class="btn btn-primary btn-sm" data-baski-cik>Görünümden çık</button></div>
    <div class="modal fade" id="onay-modal" tabindex="-1" aria-labelledby="onay-baslik" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">
      <div class="modal-header"><h2 class="modal-title" id="onay-baslik"></h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Kapat"></button></div>
      <div class="modal-body"></div>
      <div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Vazgeç</button><button type="button" class="btn btn-primary" data-onayla></button></div></div></div></div>
    <div class="modal fade" id="csv-modal" tabindex="-1" aria-labelledby="csv-baslik" aria-hidden="true"><div class="modal-dialog modal-lg modal-dialog-centered"><div class="modal-content">
      <div class="modal-header"><h2 class="modal-title" id="csv-baslik">CSV dışa aktarma</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Kapat"></button></div>
      <div class="modal-body"><p class="form-text mt-0 mb-2">Gerçek uygulamada <span class="mono csv-dosya"></span> dosyası olarak iner (FileResult). Prototipte içerik aşağıda.</p>
        <label class="visually-hidden" for="csv-metin">CSV içeriği</label><textarea id="csv-metin" class="form-control mono" rows="12" readonly style="font-size:12px"></textarea></div>
      <div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Kapat</button><button type="button" class="btn btn-primary" data-csv-kopyala>${u.ikon('copy', 'ic-16')}Panoya kopyala</button></div></div></div></div>`;
  }

  function kullaniciMenusu() {
    const t = u.tema.tercih(); const d = HM.demo.durum;
    const tik = (a) => (a ? u.ikon('check', 'ic-16 tik') : '');
    const tema = [['sistem', 'Sistem'], ['acik', 'Açık'], ['koyu', 'Koyu']].map(([k, ad]) => `<li><button type="button" class="dropdown-item" data-tema="${k}">${ad}${tik(t === k)}</button></li>`).join('');
    const durum = [['normal', 'Normal'], ['yukleniyor', 'Yükleniyor'], ['bos', 'Boş'], ['hata', 'Bağlantı hatası']].map(([k, ad]) => `<li><button type="button" class="dropdown-item" data-demo-durum="${k}">${ad}${tik(d === k)}</button></li>`).join('');
    document.getElementById('kullanici-menu').innerHTML = `<div class="px-3 py-2"><div class="fw-semibold">admin</div><div class="form-text m-0">admin@hesapmasasi.local</div></div>
      <li><hr class="dropdown-divider"></li><h3 class="dropdown-header">Görünüm</h3>${tema}
      <li><hr class="dropdown-divider"></li><h3 class="dropdown-header">Demo: ekran durumu</h3>${durum}
      <li><button type="button" class="dropdown-item" data-git="#/Hata">${u.ikon('warning')}Hata sayfasını göster</button></li>
      <li><button type="button" class="dropdown-item" data-sifirla>${u.ikon('arrow-counter-clockwise')}Demo verisini sıfırla</button></li>
      <li><hr class="dropdown-divider"></li><li><a class="dropdown-item" href="#/Giris">${u.ikon('sign-out')}Çıkış yap</a></li>`;
  }

  let ctl = null; let oncekiYol = null;
  function ciz() {
    const { r, p, q, yol } = coz();
    if (r.yonlendir) { HM.r.git(r.yonlendir, q, { replace: true }); return; }
    if (ctl) ctl.abort();
    ctl = new AbortController();
    const tam = r.view === 'giris';
    document.getElementById('kabuk').hidden = tam;
    document.getElementById('iz').hidden = tam;
    const tamEl = document.getElementById('tam-ekran'); tamEl.hidden = !tam;
    const kok = tam ? tamEl : document.getElementById('icerik');
    const view = HM.views[r.view] || HM.views.bulunamadi;
    const params = Object.assign({}, r.ek || {}, p);
    kok.innerHTML = '';
    try { view.ciz(kok, params, q, ctl.signal); }
    catch (e) { console.error(e); kok.innerHTML = u.hataUyari({ baslik: 'Ekran açılamadı.', metin: 'Beklenmeyen bir hata oluştu. Sayfayı yenileyip tekrar deneyin.', kod: String(e && e.message) }); }
    HM.grafik.temizle();
    document.querySelectorAll('.hm-nav a').forEach((a) => (a.dataset.nav === r.nav ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    const kir = view.kirinti ? view.kirinti(params, q) : [];
    document.getElementById('kirinti').innerHTML = [['Hesap Masası', '#/'], ...kir].map(([ad, href], i, arr) =>
      i === arr.length - 1 ? `<li aria-current="page">${u.e(ad)}</li>` : `<li><a href="${href}">${u.e(ad)}</a></li>`).join('');
    document.title = `${kir.length ? kir[kir.length - 1][0] : 'Genel bakış'} | Hesap Masası`;
    if (yol !== oncekiYol) { window.scrollTo(0, 0); if (!tam) kok.focus({ preventScroll: true }); }
    oncekiYol = yol;
    menuKapat();
  }
  function menuKapat() {
    document.getElementById('kabuk').removeAttribute('data-menu');
    document.getElementById('menu-perde').hidden = true;
    document.getElementById('menu-dugme').setAttribute('aria-expanded', 'false');
  }

  HM.r = {
    git(yol, q, opt) {
      const hash = '#' + yol + qs(q);
      if (opt && opt.replace) { try { history.replaceState(null, '', hash); ciz(); return; } catch (e) { /* sandbox */ } }
      if (location.hash === hash) ciz(); else location.hash = hash;
    },
    guncelle(degis, opt) { const { yol, q } = coz(); HM.r.git(yol, Object.assign({}, q, degis), opt); },
    link: (yol, q) => '#' + yol + qs(q),
    yenile: ciz,
    durum: () => coz()
  };

  function genelArama() {
    const inp = document.getElementById('genel-arama'); const kutu = document.getElementById('arama-sonuc');
    let aktif = -1;
    const linkler = () => [...kutu.querySelectorAll('a')];
    const kapat = () => { kutu.hidden = true; inp.setAttribute('aria-expanded', 'false'); aktif = -1; };
    const goster = () => {
      const q = inp.value.trim(); if (!q) { kapat(); return; }
      const ms = HM.ara.musteri(q, 5); const hs = HM.ara.hesap(q, { n: 5 });
      kutu.innerHTML = (ms.length ? `<h3>Müşteriler</h3>${ms.map((m) => `<a role="option" href="#/Musteri/Detay/${m.id}"><span>${u.e(m.ad)}</span><span class="mono text-secondary">${m.no}</span></a>`).join('')}` : '') +
        (hs.length ? `<h3>Hesaplar</h3>${hs.map((h) => `<a role="option" href="#/Hesap/Detay/${h.id}"><span class="mono">${h.no}</span><span class="text-secondary text-truncate">${u.e(db.musteri(h.musteriId).ad)}</span></a>`).join('')}` : '') +
        (!ms.length && !hs.length ? `<p class="bos">"${u.e(q)}" için sonuç yok. Ad, müşteri no (8 hane) veya hesap no deneyin.</p>` : '');
      kutu.hidden = false; inp.setAttribute('aria-expanded', 'true'); aktif = -1;
    };
    inp.addEventListener('input', u.debounce(goster, 120));
    inp.addEventListener('focus', goster);
    inp.addEventListener('blur', () => setTimeout(kapat, 150));
    inp.addEventListener('keydown', (e) => {
      const l = linkler();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); if (!l.length) return;
        aktif = e.key === 'ArrowDown' ? Math.min(l.length - 1, aktif + 1) : Math.max(0, aktif - 1);
        l.forEach((a, i) => a.setAttribute('aria-selected', String(i === aktif)));
      } else if (e.key === 'Enter' && l.length) { e.preventDefault(); location.hash = l[Math.max(0, aktif)].getAttribute('href'); inp.value = ''; kapat(); inp.blur(); }
      else if (e.key === 'Escape') { kapat(); inp.blur(); }
    });
    kutu.addEventListener('mousedown', (e) => e.preventDefault());
    kutu.addEventListener('click', (e) => { if (e.target.closest('a')) { inp.value = ''; kapat(); } });
  }

  function olaylar() {
    document.addEventListener('click', (e) => {
      const t = e.target;
      const k = t.closest('[data-kopyala]'); if (k) { u.kopyala(k.dataset.kopyala); return; }
      const tema = t.closest('[data-tema]'); if (tema) { u.tema.ayarla(tema.dataset.tema); kullaniciMenusu(); return; }
      const dd = t.closest('[data-demo-durum]'); if (dd) { HM.demo.durum = dd.dataset.demoDurum; kullaniciMenusu(); ciz(); return; }
      const git = t.closest('[data-git]'); if (git) { location.hash = git.dataset.git; return; }
      if (t.closest('[data-sifirla]')) {
        u.onay({ baslik: 'Demo verisi sıfırlansın mı?', govde: `<p class="mb-0">Bu oturumda eklediğiniz müşteri, hesap ve işlemler silinir; tohum veri yeniden yüklenir. ${HM.api.olaySayisi()} kayıtlı eylem var.</p>`, onayMetni: 'Sıfırla', tehlikeli: true })
          .then((ok) => ok && HM.api.sifirla());
        return;
      }
      if (t.closest('[data-iz-ac]')) { HM.iz.ac(true); return; }
      if (t.closest('[data-iz-temizle]')) { HM.iz.temizle(); return; }
      if (t.closest('[data-baski]')) { u.baskiGorunumu(true); document.getElementById('baski-cubugu').hidden = false; return; }
      if (t.closest('[data-baski-cik]')) { u.baskiGorunumu(false); document.getElementById('baski-cubugu').hidden = true; return; }
      if (t.closest('[data-csv-kopyala]')) { u.kopyala(document.getElementById('csv-metin').value); return; }
      if (t.closest('[data-atla]')) { document.getElementById('icerik').focus(); return; }
      const satir = t.closest('tr[data-href]');
      if (satir && !t.closest('a, button, input, select, label')) { location.hash = satir.dataset.href; }
    });
    document.getElementById('iz-dugme').addEventListener('click', () => HM.iz.ac());
    document.querySelector('.iz-bar-btn').addEventListener('click', () => HM.iz.ac());
    document.getElementById('menu-dugme').addEventListener('click', () => {
      document.getElementById('kabuk').setAttribute('data-menu', 'acik');
      document.getElementById('menu-perde').hidden = false;
      document.getElementById('menu-dugme').setAttribute('aria-expanded', 'true');
    });
    document.getElementById('menu-perde').addEventListener('click', menuKapat);
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); document.getElementById('genel-arama').focus(); }
      else if (e.altKey && e.code === 'KeyO') { e.preventDefault(); HM.iz.ac(); }
      else if (e.key === 'Escape' && document.getElementById('iz').dataset.acik === 'true' && !document.querySelector('.modal.show')) HM.iz.ac(false);
    });
    window.addEventListener('hashchange', ciz);
  }

  HM.baslat = function () {
    const kok = document.getElementById('hm-kok');
    kok.innerHTML = kabukHtml();
    u.tema.baslat();
    kullaniciMenusu();
    genelArama();
    olaylar();
    HM.iz.render();
    HM.db.dogrula();
    ciz();
  };
})();
