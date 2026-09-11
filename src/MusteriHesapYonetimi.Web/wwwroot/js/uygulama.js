/* Hesap Masası: sayfa davranışları.
   Ekranlar sunucuda çizilir; bu dosya yalnız iyileştirir. JS kapalıyken formlar ve bağlantılar yine çalışır. */
(function () {
  'use strict';
  const $ = (s, k) => (k || document).querySelector(s);
  const $$ = (s, k) => [...(k || document).querySelectorAll(s)];
  const sprite = document.body.dataset.sprite || '/icons/sprite.svg';
  const ikon = (ad, sinif) => `<svg class="ic ${sinif || ''}" aria-hidden="true" focusable="false"><use href="${sprite}#i-${ad}"></use></svg>`;
  const e = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gecikmeli = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  /* Tema: data-theme (açık seçim) + data-bs-theme (Bootstrap). İlk boyama öncesi ayar _Layout'taki satır içi betikte. */
  const tema = {
    tercih() { try { return localStorage.getItem('hm-tema') || 'sistem'; } catch (_) { return 'sistem'; } },
    ayarla(t) {
      try { localStorage.setItem('hm-tema', t); } catch (_) { /* depolama kapalı */ }
      const r = document.documentElement;
      if (t === 'acik') r.setAttribute('data-theme', 'light');
      else if (t === 'koyu') r.setAttribute('data-theme', 'dark');
      else r.removeAttribute('data-theme');
      tema.esle();
    },
    esle() {
      const d = document.documentElement.getAttribute('data-theme');
      const etkin = d === 'dark' || d === 'light' ? d : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-bs-theme', etkin);
      const secili = tema.tercih();
      $$('[data-tema]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.tema === secili)));
    }
  };
  tema.esle();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', tema.esle);

  /* Mobil menü (768 px altında offcanvas) */
  const kabuk = $('#kabuk'); const perde = $('#menu-perde'); const menuDugme = $('#menu-dugme');
  const menu = (ac) => {
    if (ac) kabuk.setAttribute('data-menu', 'acik'); else kabuk.removeAttribute('data-menu');
    perde.hidden = !ac; menuDugme.setAttribute('aria-expanded', String(ac));
  };
  menuDugme?.addEventListener('click', () => menu(true));
  perde?.addEventListener('click', () => menu(false));

  /* Bildirimler: sunucudan gelen (TempData) ve sayfa içinde üretilen */
  $$('.toast[data-otomatik]').forEach((t) => bootstrap.Toast.getOrCreateInstance(t).show());
  function toast(mesaj, hata) {
    const el = document.createElement('div');
    el.className = 'toast'; el.setAttribute('role', 'status');
    el.innerHTML = `<div class="toast-body">${ikon(hata ? 'warning-circle' : 'check-circle', hata ? 'ic-hata' : '')}<span class="flex-grow-1"></span><button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Kapat"></button></div>`;
    el.querySelector('span').textContent = mesaj;
    $('#toast-alani').appendChild(el);
    el.addEventListener('hidden.bs.toast', () => el.remove());
    bootstrap.Toast.getOrCreateInstance(el, { delay: 4000 }).show();
  }

  function kopyala(metin) {
    const bitti = () => toast('Panoya kopyalandı.');
    const yedek = () => {
      const t = document.createElement('textarea');
      t.value = metin; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      t.remove();
      if (ok) bitti(); else toast('Kopyalanamadı. Metni seçip Ctrl+C ile kopyalayın.', true);
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(metin).then(bitti, yedek);
    else yedek();
  }

  /* Onay diyaloğu: geri alınamaz POST formları (data-onay) */
  const onayModal = $('#onay-modal');
  function onayla(baslik, metin, dugmeMetni) {
    return new Promise((coz) => {
      $('#onay-baslik').textContent = baslik;
      $('#onay-metin').textContent = metin;
      const dugme = $('[data-onayla]', onayModal);
      dugme.textContent = dugmeMetni;
      const m = bootstrap.Modal.getOrCreateInstance(onayModal);
      let sonuc = false;
      const tik = () => { sonuc = true; m.hide(); };
      dugme.addEventListener('click', tik, { once: true });
      onayModal.addEventListener('hidden.bs.modal', () => { dugme.removeEventListener('click', tik); coz(sonuc); }, { once: true });
      m.show();
    });
  }
  document.addEventListener('submit', (ev) => {
    const f = ev.target;
    if (!(f instanceof HTMLFormElement) || !f.dataset.onay || f.dataset.onaylandi) return;
    ev.preventDefault();
    onayla(f.dataset.onay, f.dataset.onayMetin || '', f.dataset.onayDugme || 'Onayla')
      .then((ok) => { if (ok) { f.dataset.onaylandi = '1'; f.submit(); } });
  });

  /* Genel tıklamalar ve kısayollar */
  document.addEventListener('click', (ev) => {
    const t = ev.target;
    const k = t.closest('[data-kopyala]'); if (k) { kopyala(k.dataset.kopyala); return; }
    const tm = t.closest('[data-tema]'); if (tm) { tema.ayarla(tm.dataset.tema); return; }
    const oz = t.closest('.hata-ozeti a[href^="#"]');
    if (oz) {
      ev.preventDefault();
      let hedef = document.getElementById(oz.getAttribute('href').slice(1));
      if (hedef && hedef.type === 'hidden') hedef = $(`[data-yerine="${hedef.id}"]`);
      hedef?.focus();
      return;
    }
    // Satırın tamamı tıklanır; satır içindeki bağlantı ve düğmeler kendi işini yapar
    const satir = t.closest('tr[data-href]');
    if (satir && !t.closest('a, button, input, select, label, form, .dropdown-menu')) {
      if (ev.ctrlKey || ev.metaKey) window.open(satir.dataset.href, '_blank');
      else location.href = satir.dataset.href;
    }
  });
  document.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); $('#genel-arama')?.focus(); }
    else if (ev.key === 'Escape' && kabuk?.hasAttribute('data-menu')) menu(false);
  });

  /* Canlı filtre: GET formu ve sıralama/sayfa bağlantıları tabloyu sayfayı yenilemeden değiştirir.
     Sunucu aynı sayfayı döndürür, yalnız [data-canli-kap] ve sayaç alınır. Adres her zaman paylaşılabilir kalır. */
  const kap = $('[data-canli-kap]');
  if (kap) {
    let istek = null;
    const yukle = async (adres, gecmis) => {
      if (istek) istek.abort();
      istek = new AbortController();
      kap.setAttribute('aria-busy', 'true');
      try {
        const yanit = await fetch(adres, { signal: istek.signal, headers: { 'X-Requested-With': 'fetch' } });
        if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
        const belge = new DOMParser().parseFromString(await yanit.text(), 'text/html');
        const yeni = belge.querySelector('[data-canli-kap]');
        if (!yeni) throw new Error('Yanıtta liste yok');
        kap.innerHTML = yeni.innerHTML;
        const sayaclar = belge.querySelectorAll('[data-canli-sayac]');
        $$('[data-canli-sayac]').forEach((s, i) => { if (sayaclar[i]) s.textContent = sayaclar[i].textContent; });
        if (gecmis === 'ekle') history.pushState(null, '', adres);
        else if (gecmis === 'degistir') history.replaceState(null, '', adres);
      } catch (hata) {
        if (hata.name !== 'AbortError') location.href = adres; // yedek: tam sayfa yükleme
      } finally {
        kap.removeAttribute('aria-busy');
      }
    };
    const formAdresi = (f) => {
      const p = new URLSearchParams();
      for (const [k, v] of new FormData(f)) if (v !== '') p.set(k, v);
      const s = p.toString();
      return (f.getAttribute('action') || location.pathname) + (s ? `?${s}` : '');
    };
    const aramaGecikmeli = gecikmeli((f) => yukle(formAdresi(f), 'degistir'), 300);
    document.addEventListener('input', (ev) => {
      const f = ev.target.closest('form[data-canli-form]');
      if (f && ev.target.matches('[data-canli-arama]')) aramaGecikmeli(f);
    });
    document.addEventListener('change', (ev) => {
      const f = ev.target.closest('form[data-canli-form]');
      if (f && !ev.target.matches('[data-canli-arama]')) yukle(formAdresi(f), 'ekle');
    });
    document.addEventListener('submit', (ev) => {
      const f = ev.target.closest('form[data-canli-form]');
      if (f) { ev.preventDefault(); yukle(formAdresi(f), 'ekle'); }
    });
    document.addEventListener('click', (ev) => {
      const a = ev.target.closest('a[data-canli]');
      if (!a || !kap.contains(a) || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
      ev.preventDefault();
      yukle(a.href, 'ekle');
    });
    window.addEventListener('popstate', () => location.reload());
  }

  /* Üst çubuk araması (Ctrl+K): /api/ara */
  const arama = $('#genel-arama'); const sonuclar = $('#arama-sonuc');
  if (arama && sonuclar) {
    let aktif = -1; let istek = null;
    const kapat = () => { sonuclar.hidden = true; arama.setAttribute('aria-expanded', 'false'); aktif = -1; };
    const goster = gecikmeli(async () => {
      const q = arama.value.trim();
      if (q.length < 2) { kapat(); return; }
      if (istek) istek.abort();
      istek = new AbortController();
      try {
        const v = await (await fetch(`/api/ara?q=${encodeURIComponent(q)}`, { signal: istek.signal })).json();
        const m = v.musteriler.map((x) => `<a role="option" href="/Musteri/Detay/${x.id}"><span>${e(x.ad)}${x.aktif ? '' : ' <span class="rozet rozet--pasif">Pasif</span>'}</span><span class="mono text-secondary">${e(x.no)}</span></a>`).join('');
        const h = v.hesaplar.map((x) => `<a role="option" href="/Hesap/Detay/${x.id}"><span class="mono">${e(x.no)}</span><span class="text-secondary text-truncate">${e(x.ad)}</span></a>`).join('');
        sonuclar.innerHTML = (m ? `<h3>Müşteriler</h3>${m}` : '') + (h ? `<h3>Hesaplar</h3>${h}` : '')
          + (!m && !h ? `<p class="bos">"${e(q)}" için sonuç yok. Ad, müşteri no (8 hane) veya hesap no deneyin.</p>` : '');
        sonuclar.hidden = false; arama.setAttribute('aria-expanded', 'true'); aktif = -1;
      } catch (hata) { if (hata.name !== 'AbortError') kapat(); }
    }, 150);
    arama.addEventListener('input', goster);
    arama.addEventListener('focus', goster);
    arama.addEventListener('blur', () => setTimeout(kapat, 150));
    arama.addEventListener('keydown', (ev) => {
      const l = $$('a', sonuclar);
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (!l.length) return;
        aktif = ev.key === 'ArrowDown' ? Math.min(l.length - 1, aktif + 1) : Math.max(0, aktif - 1);
        l.forEach((a, i) => a.setAttribute('aria-selected', String(i === aktif)));
      } else if (ev.key === 'Enter' && l.length) { ev.preventDefault(); location.href = l[Math.max(0, aktif)].href; }
      else if (ev.key === 'Escape') { kapat(); arama.blur(); }
    });
    sonuclar.addEventListener('mousedown', (ev) => ev.preventDefault());
  }

  /* Tutar ve telefon biçimleri (sunucudaki TutarMetni ve MusteriKurallari.TelefonBicimle ile aynı kural) */
  const nf2 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const tutarKurus = (s) => {
    let t = String(s || '').replace(/[₺\s ]/g, '');
    if (!t) return NaN;
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    else if ((t.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(t)) t = t.replace(/\./g, '');
    return /^\d{1,16}(\.\d{1,2})?$/.test(t) ? Math.round(parseFloat(t) * 100) : NaN;
  };
  const telefonBicimle = (v) => {
    let d = v.replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('90')) d = d.slice(2);
    if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
    return d.length === 10 ? `+90 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}` : v.trim();
  };
  $$('[data-tutar-girdi]').forEach((i) => i.addEventListener('blur', () => {
    const k = tutarKurus(i.value);
    if (i.value.trim() && !isNaN(k)) i.value = nf2.format(k / 100);
  }));

  /* İlk hatalı alana odak (sunucu doğrulaması sonrası) */
  $('form .input-validation-error:not([type="hidden"])')?.focus();

  /* Müşteri formu: tip değişince etiket, otomatik müşteri no, telefon biçimi */
  const mf = $('#mf');
  if (mf) {
    const adEtiket = $('[data-ad-etiket]', mf);
    $$('input[name="Tip"]', mf).forEach((r) => r.addEventListener('change', () => {
      adEtiket.textContent = $('input[name="Tip"]:checked', mf)?.value === 'Kurumsal' ? 'Ünvan' : 'Ad soyad';
    }));
    $('[data-no-uret]', mf)?.addEventListener('click', async () => {
      try {
        const v = await (await fetch('/api/musteri/yeni-no')).json();
        const no = $('#MusteriNo', mf);
        no.value = v.no;
        no.dispatchEvent(new Event('input', { bubbles: true }));
      } catch (_) { toast('Numara üretilemedi. Tekrar deneyin.', true); }
    });
    const tel = $('#Telefon', mf);
    tel?.addEventListener('blur', () => { if (tel.value) tel.value = telefonBicimle(tel.value); });
  }

  /* Kaydedilmemiş değişiklikle sayfadan ayrılma uyarısı */
  $$('form[data-kirli-uyari]').forEach((f) => {
    let kirli = false; let gonderildi = false;
    const durum = $('[data-durum-metni]', f);
    const isaretle = () => { kirli = true; if (durum) durum.textContent = 'Kaydedilmemiş değişiklik var'; };
    f.addEventListener('input', isaretle);
    f.addEventListener('change', isaretle);
    f.addEventListener('submit', () => { gonderildi = true; });
    window.addEventListener('beforeunload', (ev) => { if (kirli && !gonderildi) { ev.preventDefault(); ev.returnValue = ''; } });
  });

  /* Hesap aç: müşteri seçici (combobox, /api/musteri/ara) ve hesap no önizlemesi */
  const secici = $('[data-musteri-secici]');
  if (secici) {
    const girdi = $('input[role="combobox"]', secici); const liste = $('[role="listbox"]', secici);
    const gizli = $('#MusteriId'); const noAlani = $('[data-hesap-no]'); const hata = $('#MusteriId-hata');
    const bosNo = 'Müşteri seçince oluşur';
    let ogeler = []; let aktif = -1; let istek = null;
    const kapat = () => { liste.hidden = true; girdi.setAttribute('aria-expanded', 'false'); girdi.removeAttribute('aria-activedescendant'); };
    const ciz = () => {
      liste.innerHTML = ogeler.length
        ? ogeler.map((m, i) => `<li id="ms-${i}" role="option" aria-selected="${i === aktif}"${m.aktif ? '' : ' aria-disabled="true"'} data-i="${i}"><span><span>${e(m.ad)}</span><small>${e(m.no)}, ${e(m.tip.toLocaleLowerCase('tr-TR'))}</small></span><span class="text-end">${m.aktif ? '' : '<span class="rozet rozet--pasif">Pasif</span>'}</span></li>`).join('')
        : `<li role="option" aria-disabled="true"><span>${girdi.value.trim() ? 'Eşleşen müşteri yok' : 'Ad veya müşteri no yazın'}</span></li>`;
      liste.hidden = false; girdi.setAttribute('aria-expanded', 'true');
      if (aktif >= 0) girdi.setAttribute('aria-activedescendant', `ms-${aktif}`); else girdi.removeAttribute('aria-activedescendant');
    };
    const ara = gecikmeli(async () => {
      const q = girdi.value.trim();
      if (istek) istek.abort();
      if (!q) { ogeler = []; ciz(); return; }
      istek = new AbortController();
      try { ogeler = await (await fetch(`/api/musteri/ara?q=${encodeURIComponent(q)}`, { signal: istek.signal })).json(); aktif = -1; ciz(); }
      catch (_) { /* iptal edildi */ }
    }, 150);
    const sec = async (i) => {
      const m = ogeler[i]; if (!m || !m.aktif) return;
      girdi.value = m.ad; gizli.value = m.id; kapat();
      girdi.classList.remove('input-validation-error'); if (hata) hata.textContent = '';
      noAlani.value = 'Hesaplanıyor';
      try { noAlani.value = (await (await fetch(`/api/hesap/no-onizle?musteriId=${m.id}`)).json()).no || bosNo; }
      catch (_) { noAlani.value = bosNo; }
    };
    girdi.addEventListener('input', () => { gizli.value = ''; noAlani.value = bosNo; aktif = -1; ara(); });
    girdi.addEventListener('focus', () => { girdi.select(); ara(); });
    girdi.addEventListener('blur', () => setTimeout(kapat, 120));
    girdi.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); aktif = Math.min(ogeler.length - 1, aktif + 1); ciz(); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); aktif = Math.max(0, aktif - 1); ciz(); }
      else if (ev.key === 'Enter') { if (!liste.hidden && ogeler.length) { ev.preventDefault(); sec(aktif >= 0 ? aktif : 0); } }
      else if (ev.key === 'Escape') kapat();
    });
    liste.addEventListener('mousedown', (ev) => { const li = ev.target.closest('li[data-i]'); if (li) { ev.preventDefault(); sec(Number(li.dataset.i)); } });
  }
})();
