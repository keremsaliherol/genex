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

  /* Biçimler: sunucudaki TurkceBicim, TutarMetni ve MusteriKurallari ile aynı kurallar. Tutarlar kuruş (tam sayı) tutulur. */
  const EKSI = '−';
  const nf2 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nf0 = new Intl.NumberFormat('tr-TR');
  const kurus = (tl) => Math.round(Number(tl) * 100);
  const para = (k, isaretli) => `${k < 0 ? EKSI : isaretli && k > 0 ? '+' : ''}₺${nf2.format(Math.abs(k) / 100)}`;
  const tutarHtml = (k, isaretli) => `<span class="tutar${k > 0 && isaretli ? ' tutar--giris' : k < 0 ? ' tutar--cikis' : ''}">${para(k, isaretli)}</span>`;
  const sayi = (n) => nf0.format(n);
  const tutarKurus = (s) => {
    let t = String(s || '').replace(/[₺\s ]/g, '');
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
  /* İşlem tipi: ad, ikon, bakiye etkisi (Etiketler.cs ve TRG_ISLEM_BAKIYE_GUNCELLE ile aynı) */
  const ISLEM = {
    Yatirma: ['Para yatırma', 'arrow-down-left', 1], Cekme: ['Para çekme', 'arrow-up-right', -1],
    TransferGelen: ['Gelen transfer', 'arrows-left-right', 1], TransferGiden: ['Giden transfer', 'arrows-left-right', -1],
    Alim: ['Hisse alım', 'trend-up', -1], Satim: ['Hisse satım', 'trend-down', 1]
  };
  const islemRozet = (t) => `<span class="rozet">${ikon(ISLEM[t][1])}${ISLEM[t][0]}</span>`;
  const pasifRozet = '<span class="rozet rozet--pasif">Pasif</span>';
  // grafik.js aynı biçimi kullanır (tutarlar kuruş)
  window.HM = Object.freeze({ para, sayi });

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
      // Grafikler renklerini token'lardan yeniden okur (grafik.js)
      document.dispatchEvent(new CustomEvent('hm:tema'));
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
    if (t.closest('[data-yazdir]')) { window.print(); return; }
    // Grafik ↔ tablo: her grafiğin aynı veriyi gösteren tablo karşılığı (erişilebilirlik alternatifi)
    const tg = t.closest('[data-tablo-gorunum]');
    if (tg) {
      const panel = tg.closest('.panel'); const tablo = $('[data-tablo]', panel); const grafik = $('[data-grafik-alan]', panel);
      const ac = tablo.hidden;
      tablo.hidden = !ac; if (grafik) grafik.hidden = ac;
      tg.setAttribute('aria-pressed', String(ac));
      $('span', tg).textContent = ac ? 'Grafik' : 'Tablo';
      return;
    }
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
        // Oracle izi paneli de yenilenir: filtre isteğinin ürettiği SQL görünür
        const yeniIz = belge.querySelector('#iz');
        if (yeniIz && $('#iz')) {
          $('#iz-govde').innerHTML = $('#iz-govde', yeniIz).innerHTML;
          $('#iz .iz-son').textContent = $('.iz-son', yeniIz).textContent;
          const sayac = belge.querySelector('#iz-sayac');
          if (sayac && $('#iz-sayac')) $('#iz-sayac').textContent = sayac.textContent;
        }
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
        const m = v.musteriler.map((x) => `<a role="option" href="/Musteri/Detay/${x.id}"><span>${e(x.ad)}${x.aktif ? '' : ` ${pasifRozet}`}</span><span class="mono text-secondary">${e(x.no)}</span></a>`).join('');
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

  /* Tutar alanı: blur'da 1.250,00 biçimi */
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

  /* Aramalı seçici (combobox, ARIA 1.2 deseni). o: { adres(q), oge(x) → { baslik, alt, sag, mono, secilebilir }, sec(x | null) } */
  function secici(kutu, o) {
    const girdi = $('input[role="combobox"]', kutu); const liste = $('[role="listbox"]', kutu);
    let ogeler = []; let aktif = -1; let istek = null;
    const kapat = () => { liste.hidden = true; girdi.setAttribute('aria-expanded', 'false'); girdi.removeAttribute('aria-activedescendant'); };
    const ciz = () => {
      liste.innerHTML = ogeler.length
        ? ogeler.map((x, i) => {
          const g = o.oge(x);
          return `<li id="${liste.id}-${i}" role="option" aria-selected="${i === aktif}"${g.secilebilir ? '' : ' aria-disabled="true"'} data-i="${i}"><span><span${g.mono ? ' class="mono"' : ''}>${e(g.baslik)}</span><small>${e(g.alt)}</small></span><span class="text-end">${g.sag || ''}</span></li>`;
        }).join('')
        : `<li role="option" aria-disabled="true"><span>${girdi.value.trim() ? o.eslesmeYok : o.bosMetin}</span></li>`;
      liste.hidden = false; girdi.setAttribute('aria-expanded', 'true');
      if (aktif >= 0) girdi.setAttribute('aria-activedescendant', `${liste.id}-${aktif}`); else girdi.removeAttribute('aria-activedescendant');
    };
    const ara = gecikmeli(async () => {
      const q = girdi.value.trim();
      if (istek) istek.abort();
      if (!q) { ogeler = []; ciz(); return; }
      istek = new AbortController();
      try { ogeler = await (await fetch(o.adres(q), { signal: istek.signal })).json(); aktif = -1; ciz(); }
      catch (_) { /* yeni arama öncekini iptal etti */ }
    }, 150);
    const sec = (i) => { const x = ogeler[i]; if (!x || !o.oge(x).secilebilir) return; girdi.value = o.oge(x).baslik; kapat(); o.sec(x); };
    girdi.addEventListener('input', () => { aktif = -1; o.sec(null); ara(); });
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

  /* Hesap aç: müşteri seçici (/api/musteri/ara) ve hesap no önizlemesi */
  const musteriSecici = $('[data-musteri-secici]');
  if (musteriSecici) {
    const gizli = $('#MusteriId'); const noAlani = $('[data-hesap-no]'); const hata = $('#MusteriId-hata');
    const bosNo = 'Müşteri seçince oluşur';
    secici(musteriSecici, {
      adres: (q) => `/api/musteri/ara?q=${encodeURIComponent(q)}`,
      bosMetin: 'Ad veya müşteri no yazın', eslesmeYok: 'Eşleşen müşteri yok',
      oge: (m) => ({ baslik: m.ad, alt: `${m.no}, ${m.tip.toLocaleLowerCase('tr-TR')}`, sag: m.aktif ? '' : pasifRozet, secilebilir: m.aktif }),
      sec: async (m) => {
        gizli.value = m ? m.id : ''; noAlani.value = bosNo;
        if (!m) return;
        $('#musteri-ara').classList.remove('input-validation-error'); if (hata) hata.textContent = '';
        noAlani.value = 'Hesaplanıyor';
        try { noAlani.value = (await (await fetch(`/api/hesap/no-onizle?musteriId=${m.id}`)).json()).no || bosNo; }
        catch (_) { noAlani.value = bosNo; }
      }
    });
  }

  /* İşlem yap: hesap seçicileri, türe göre alanlar, istemci doğrulaması, önizleme ve onay.
     İstemci kontrolleri kullanıcıya erken haber içindir; kuralın kaynağı PKG_ISLEM'dir ("Yine de gönder" bunu gösterir). */
  const isf = $('#if');
  if (isf) {
    const hisseler = JSON.parse(isf.dataset.hisseler || '[]');
    const kaynakKutu = $('[data-secici="kaynak"]', isf); const hedefKutu = $('[data-secici="hedef"]', isf);
    const hisseSec = $('#HisseKodu', isf); const onizlemeKutu = $('#oniz'); const bosOnizleme = onizlemeKutu.innerHTML;
    const oku = (kutu) => (kutu.dataset.deger ? JSON.parse(kutu.dataset.deger) : null);
    let hesap = oku(kaynakKutu); let hedef = oku(hedefKutu);
    let etkilesim = false; let zorla = false; let hisseAnahtari = null;
    const dokunulan = new Set();
    const HISSE = (t) => t === 'Alim' || t === 'Satim';
    const tur = () => ($('input[name="Tur"]:checked', isf) || {}).value || 'Yatirma';
    const bakiye = (h) => kurus(h.bakiye);
    const pozisyon = (h, kod) => { const p = ((h && h.portfoy) || []).find((x) => x.kod === kod); return p ? p.adet : 0; };
    const alanEl = (k) => $(`[data-yerine="${k}"]`, isf) || $(`#${k}`, isf);
    const hesapGetir = async (id) => { try { return await (await fetch(`/api/hesap/${id}/islem`)).json(); } catch (_) { return null; } };
    const hesapOge = (h) => ({
      baslik: h.no, mono: true, sag: tutarHtml(kurus(h.bakiye)), secilebilir: h.aktif && h.musteriAktif,
      alt: `${h.ad}, ${h.tipAd.toLocaleLowerCase('tr-TR')}${h.aktif && h.musteriAktif ? '' : ', pasif'}`
    });

    secici(kaynakKutu, {
      adres: (q) => `/api/hesap/ara?q=${encodeURIComponent(q)}`, bosMetin: 'Hesap no veya müşteri adı yazın', eslesmeYok: 'Eşleşen hesap yok', oge: hesapOge,
      sec: async (x) => { $('#HesapId').value = x ? x.id : ''; hesap = x ? await hesapGetir(x.id) : null; if (x) dokunulan.add('HesapId'); guncelle(); }
    });
    secici(hedefKutu, {
      adres: (q) => `/api/hesap/ara?q=${encodeURIComponent(q)}&haric=${$('#HesapId').value}`, bosMetin: 'Hesap no veya müşteri adı yazın', eslesmeYok: 'Eşleşen hesap yok', oge: hesapOge,
      sec: async (x) => { $('#HedefHesapId').value = x ? x.id : ''; hedef = x ? await hesapGetir(x.id) : null; if (x) dokunulan.add('HedefHesapId'); guncelle(); }
    });

    const deger = () => {
      const t = tur(); const hs = hisseler.find((x) => x.kod === hisseSec.value); const adet = Number($('#Adet').value);
      const tutar = HISSE(t) ? (hs && Number.isInteger(adet) && adet > 0 ? Math.round(hs.fiyat * adet * 100) : NaN) : tutarKurus($('#Tutar').value);
      return { t, hs, adet, tutar, aciklama: $('#Aciklama').value.trim() };
    };

    function hatalar(v) {
      const h = {};
      if (!hesap) h.HesapId = 'Listeden bir hesap seçin.';
      if (v.t === 'Transfer') {
        if (!hedef) h.HedefHesapId = 'Hedef hesabı seçin.';
        else if (hesap && hedef.id === hesap.id) h.HedefHesapId = 'Aynı hesaba transfer yapılamaz.';
      }
      if (HISSE(v.t)) {
        if (!v.hs) h.HisseKodu = 'Bir hisse seçin.';
        if (!(Number.isInteger(v.adet) && v.adet >= 1)) h.Adet = 'Adet 1 veya daha büyük tam sayı olmalı.';
        else if (hesap && v.t === 'Alim' && v.tutar > bakiye(hesap)) h.Adet = `Yetersiz bakiye. Kullanılabilir: ${para(bakiye(hesap))}`;
        else if (hesap && v.t === 'Satim' && v.hs && v.adet > pozisyon(hesap, v.hs.kod)) h.Adet = `Satılabilir adet: ${sayi(pozisyon(hesap, v.hs.kod))}`;
      } else {
        const ham = $('#Tutar').value.trim();
        if (!ham) h.Tutar = 'Tutarı girin.';
        else if (isNaN(v.tutar)) h.Tutar = 'Tutarı 1.250,00 biçiminde, en fazla 2 ondalıkla girin.';
        else if (v.tutar <= 0) h.Tutar = 'Tutar sıfırdan büyük olmalı.';
        else if (hesap && (v.t === 'Cekme' || v.t === 'Transfer') && v.tutar > bakiye(hesap)) h.Tutar = `Yetersiz bakiye. Kullanılabilir: ${para(bakiye(hesap))}`;
      }
      return h;
    }

    function hataYaz(h) {
      ['HesapId', 'HedefHesapId', 'Tutar', 'HisseKodu', 'Adet'].forEach((k) => {
        const goster = !!h[k] && dokunulan.has(k);
        const el = alanEl(k);
        if (el) { el.classList.toggle('input-validation-error', goster); if (goster) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); }
        const s = $(`#${k}-hata`, isf);
        if (s) { s.textContent = goster ? h[k] : ''; s.classList.toggle('field-validation-error', goster); s.classList.toggle('field-validation-valid', !goster); }
      });
    }

    function hisseSecenekleri(t) {
      const anahtar = `${t}|${hesap ? hesap.id : ''}`;
      if (anahtar === hisseAnahtari) return;
      hisseAnahtari = anahtar;
      const secili = hisseSec.value;
      const liste = t === 'Satim' ? hisseler.filter((x) => pozisyon(hesap, x.kod) > 0) : hisseler;
      hisseSec.innerHTML = '<option value="">Seçin</option>' + liste.map((x) =>
        `<option value="${e(x.kod)}">${e(x.kod)}, ${e(x.ad)} (${para(kurus(x.fiyat))}${t === 'Satim' ? `, ${sayi(pozisyon(hesap, x.kod))} adet` : ''})</option>`).join('');
      if (liste.some((x) => x.kod === secili)) hisseSec.value = secili;
      $('#hisse-not').textContent = t === 'Satim' && hesap && !liste.length ? 'Bu hesapta satılabilir pozisyon yok.' : '';
    }

    function satir(h, tip, tutar, sonra, ek) {
      return `<div class="defter-satir"><div><div class="hesap">${e(h.no)}</div><div class="kim">${e(h.musteriAd)}</div></div><div class="text-end">${islemRozet(tip)}<div class="mt-1">${tutarHtml(ISLEM[tip][2] * tutar, true)}</div></div>
        <div class="bakiye-gecis"><span>${para(bakiye(h))}</span>${ikon('arrow-right', 'ic-14')}<span class="sonra">${para(sonra)}</span>${ek || ''}</div></div>`;
    }

    function onizle(v) {
      const alt = $('#oniz-alt');
      if (!hesap) { onizlemeKutu.innerHTML = bosOnizleme; alt.textContent = ''; return; }
      const t = isNaN(v.tutar) || v.tutar <= 0 ? 0 : v.tutar;
      if (v.t === 'Transfer') {
        alt.textContent = 'Transfer, çift kayıt';
        onizlemeKutu.innerHTML = `<div class="defter">${satir(hesap, 'TransferGiden', t, bakiye(hesap) - t)}${hedef ? satir(hedef, 'TransferGelen', t, bakiye(hedef) + t) : '<div class="defter-satir"><div class="kim">Hedef hesap seçilmedi</div></div>'}</div>
          <div class="atomik-not">${ikon('lock-simple', 'ic-16')}<span>İki kayıt tek transaction içinde yazılır ya da hiçbiri yazılmaz. Kayıtlar aynı referans numarasıyla bağlanır.</span></div>`;
        return;
      }
      let ek = '';
      if (HISSE(v.t) && v.hs) {
        const once = pozisyon(hesap, v.hs.kod);
        const sonra = Math.max(0, once + (v.t === 'Alim' ? 1 : -1) * (v.adet > 0 ? v.adet : 0));
        ek = `<span class="ms-2">${e(v.hs.kod)}: ${sayi(once)} → ${sayi(sonra)} adet</span>`;
      }
      const paket = { Yatirma: 'YATIR', Cekme: 'CEK', Alim: 'HISSE_AL', Satim: 'HISSE_SAT' }[v.t];
      alt.textContent = ISLEM[v.t][0];
      onizlemeKutu.innerHTML = `<div class="defter">${satir(hesap, v.t, t, bakiye(hesap) + ISLEM[v.t][2] * t, ek)}</div>
        <div class="atomik-not">${ikon('database', 'ic-16')}<span>PKG_ISLEM.${paket} bir ISLEM kaydı ekler; TRG_ISLEM_BAKIYE_GUNCELLE bakiyeyi günceller.</span></div>`;
    }

    function guncelle() {
      let t = tur();
      const vadesiz = !!hesap && hesap.tip !== 'Yatirim';
      ['Alim', 'Satim'].forEach((x) => { $(`#tur-${x}`, isf).disabled = vadesiz; });
      $('#tip-not').textContent = vadesiz ? 'Hisse işlemleri yalnız yatırım hesabında yapılır.' : '';
      if (vadesiz && HISSE(t)) { $('#tur-Yatirma', isf).checked = true; t = 'Yatirma'; }
      $$('[data-tur-alan]', isf).forEach((el) => {
        const a = el.dataset.turAlan;
        el.hidden = a === 'hisse' ? !HISSE(t) : a === 'transfer' ? t !== 'Transfer' : HISSE(t);
      });
      $('[data-alan-baslik]', isf).textContent = t === 'Transfer' ? 'Transfer' : HISSE(t) ? 'Hisse' : 'Tutar';
      $('#Aciklama').placeholder = t === 'Transfer' ? 'Örnek: Kira ödemesi, Eylül' : 'Örnek: Nakit yatırma, Kadıköy şube';
      hisseSecenekleri(t);
      $('#secili-hesap').innerHTML = hesap
        ? `<div class="secili-hesap"><span>${e(hesap.musteriAd)}, ${e(hesap.tipAd.toLocaleLowerCase('tr-TR'))}</span><span>Kullanılabilir bakiye <strong class="tutar">${para(bakiye(hesap))}</strong></span></div>` : '';
      const v = deger(); const h = hatalar(v);
      $('#hesaplanan').value = HISSE(t) && !isNaN(v.tutar) ? para(v.tutar) : '';
      $('#aciklama-sayac').textContent = `${v.aciklama.length}/300`;
      if (etkilesim) hataYaz(h);
      onizle(v);
      const yetersiz = Object.values(h).some((m) => m.startsWith('Yetersiz') || m.startsWith('Satılabilir'));
      $('#i-zorla').innerHTML = yetersiz && dokunulan.size ? '<button type="button" class="btn btn-ghost btn-sm w-100" data-zorla>Yine de gönder: veritabanı kontrolünü göster</button>' : '';
      return h;
    }

    function ozetYaz(v) {
      const satirlar = [['İşlem', v.t === 'Transfer' ? 'Transfer (giden ve gelen kayıt)' : ISLEM[v.t][0]], ['Hesap', hesap ? `${hesap.no}, ${hesap.musteriAd}` : 'Seçilmedi']];
      if (v.t === 'Transfer') satirlar.push(['Hedef', hedef ? `${hedef.no}, ${hedef.musteriAd}` : 'Seçilmedi']);
      if (HISSE(v.t)) satirlar.push(['Hisse', v.hs ? `${v.hs.kod} × ${sayi(Number.isInteger(v.adet) ? v.adet : 0)} adet` : 'Seçilmedi']);
      satirlar.push(['Tutar', isNaN(v.tutar) ? 'Geçersiz' : para(v.tutar)]);
      if (v.aciklama && !HISSE(v.t)) satirlar.push(['Açıklama', v.aciklama]);
      $('#islem-ozet').innerHTML = `<dl class="dl-liste">${satirlar.map(([a, b]) => `<dt>${e(a)}</dt><dd>${e(b)}</dd>`).join('')}</dl>`
        + (zorla ? `<div class="uyari uyari--uyari mt-3">${ikon('warning')}<p>İstemci doğrulaması atlanıyor. Veritabanının işlemi nasıl reddettiğini görmek için gönderiliyor.</p></div>` : '');
    }

    isf.addEventListener('input', () => { etkilesim = true; guncelle(); });
    isf.addEventListener('change', () => { etkilesim = true; guncelle(); });
    isf.addEventListener('focusout', (ev) => {
      const k = ev.target.dataset.yerine || ev.target.id;
      if (k && ev.target.value) { dokunulan.add(k); etkilesim = true; guncelle(); }
    });
    const islemOnay = $('#islem-onay');
    isf.addEventListener('submit', (ev) => {
      ev.preventDefault();
      etkilesim = true;
      const h = guncelle();
      if (!zorla && Object.keys(h).length) {
        Object.keys(h).forEach((k) => dokunulan.add(k));
        hataYaz(h);
        alanEl(Object.keys(h)[0])?.focus();
        return;
      }
      ozetYaz(deger());
      bootstrap.Modal.getOrCreateInstance(islemOnay).show();
    });
    $('[data-islem-gonder]', islemOnay).addEventListener('click', (ev) => {
      ev.currentTarget.disabled = true;
      const dugme = $('#i-onayla');
      dugme.disabled = true;
      dugme.innerHTML = '<span class="yukleniyor-nokta" aria-hidden="true"></span>İşleniyor';
      HTMLFormElement.prototype.submit.call(isf);
    });
    islemOnay.addEventListener('hidden.bs.modal', () => { zorla = false; });
    document.addEventListener('click', (ev) => { if (ev.target.closest('[data-zorla]')) { zorla = true; isf.requestSubmit(); } });

    guncelle();
    if (!$('.input-validation-error', isf) && !$('[role="alert"]', isf)) (hesap ? (HISSE(tur()) ? hisseSec : $('#Tutar')) : $('#hesap-ara')).focus();
  }

  /* Dönem formları (ekstre, bakiye değişimi): dönem, tarih ve tip değişince form gönderilir. Tarih elle değişirse
     dönem "Özel" olur; hazır dönem seçiliyken tarih alanları ve boş gizli alanlar adrese eklenmez (sunucu dönemi
     kendisi hesaplar). Hesap seçici kutusu seçimle kendisi gönderir. */
  $$('form[data-donem-form]').forEach((f) => {
    f.addEventListener('change', (ev) => {
      if (ev.target.matches('[role="combobox"]')) return;
      if (ev.target.type === 'date') { const ozel = $('#on-Ozel', f); if (ozel) ozel.checked = true; }
      f.requestSubmit();
    });
    f.addEventListener('submit', () => {
      const ozel = ($('input[name="on"]:checked', f) || {}).value === 'ozel';
      $$('input[type="date"]', f).forEach((i) => { i.disabled = !ozel; });
      $$('input[type="hidden"]', f).forEach((i) => { i.disabled = !i.value; });
    });
  });
  // Geri tuşuyla önbellekten dönülen sayfada gönderim öncesi kapatılan alanlar yeniden açılır
  window.addEventListener('pageshow', () => $$('form[data-donem-form] input:disabled').forEach((i) => { i.disabled = false; }));

  /* Kendiliğinden uygulanan süzgeçler (en aktif raporu): her değişiklik formu gönderir */
  $$('form[data-oto-gonder]').forEach((f) => f.addEventListener('change', () => f.requestSubmit()));

  /* Ekstre için hesap seçimi: pasif hesabın ekstresi de açılır */
  const ekstreSecici = $('[data-secici="ekstre"]');
  if (ekstreSecici) {
    secici(ekstreSecici, {
      adres: (q) => `/api/hesap/ara?q=${encodeURIComponent(q)}`, bosMetin: 'Hesap no veya müşteri adı yazın', eslesmeYok: 'Eşleşen hesap yok',
      oge: (h) => ({ baslik: h.no, mono: true, alt: `${h.ad}, ${h.tipAd.toLocaleLowerCase('tr-TR')}${h.aktif ? '' : ', pasif'}`, sag: tutarHtml(kurus(h.bakiye)), secilebilir: true }),
      sec: (h) => { if (h) location.href = `/Hesap/Ekstre/${h.id}`; }
    });
    $('#ekstre-ara', ekstreSecici).focus();
  }

  /* Rapor seçicileri: hesap (/api/hesap/ara) veya müşteri (/api/musteri/ara). Pasif kayıtların raporu da açılır.
     Seçim gizli alana yazılır; data-gonder varsa form hemen gönderilir (bakiye değişimi). */
  const raporHatasi = (kutu, mesaj) => {
    const girdi = $('[role="combobox"]', kutu); const m = document.getElementById(`${kutu.dataset.hedef}-hata`);
    girdi.classList.toggle('input-validation-error', !!mesaj);
    if (mesaj) girdi.setAttribute('aria-invalid', 'true'); else girdi.removeAttribute('aria-invalid');
    if (m) { m.textContent = mesaj; m.classList.toggle('field-validation-error', !!mesaj); }
  };
  $$('[data-secici="rapor"]').forEach((kutu) => {
    const gizli = document.getElementById(kutu.dataset.hedef);
    const musteri = kutu.dataset.kaynak === 'musteri';
    secici(kutu, {
      adres: (q) => `/api/${musteri ? 'musteri' : 'hesap'}/ara?q=${encodeURIComponent(q)}`,
      bosMetin: musteri ? 'Müşteri adı veya müşteri no yazın' : 'Hesap no veya müşteri adı yazın',
      eslesmeYok: musteri ? 'Eşleşen müşteri yok' : 'Eşleşen hesap yok',
      oge: musteri
        ? (x) => ({ baslik: x.ad, alt: `${x.no}, ${x.tip.toLocaleLowerCase('tr-TR')}`, sag: x.aktif ? '' : pasifRozet, secilebilir: true })
        : (x) => ({ baslik: x.no, mono: true, alt: `${x.ad}, ${x.tipAd.toLocaleLowerCase('tr-TR')}${x.aktif ? '' : ', pasif'}`, sag: tutarHtml(kurus(x.bakiye)), secilebilir: true }),
      sec: (x) => {
        gizli.value = x ? x.id : '';
        if (!x) return;
        raporHatasi(kutu, '');
        if ('gonder' in kutu.dataset) kutu.closest('form').requestSubmit();
      }
    });
  });

  /* Aylık özet: kapsam değişince seçici hesap/müşteri arasında değişir (seçim sıfırlanır, yıl ve ay korunur);
     kayıt seçilmeden rapor çalıştırılmaz. */
  const aylikForm = $('form[data-aylik-form]');
  if (aylikForm) {
    $$('input[name="kapsam"]', aylikForm).forEach((r) => r.addEventListener('change', () => {
      const p = new URLSearchParams({ kapsam: r.value, yil: $('#ao-yil', aylikForm).value, ay: $('#ao-ay', aylikForm).value });
      location.href = `${aylikForm.getAttribute('action')}?${p}`;
    }));
    aylikForm.addEventListener('submit', (ev) => {
      if ($('#ao-id', aylikForm).value) return;
      ev.preventDefault();
      const kutu = $('[data-secici="rapor"]', aylikForm);
      raporHatasi(kutu, 'Listeden bir kayıt seçin.');
      $('[role="combobox"]', kutu).focus();
    });
  }

  /* Oracle izi paneli: aç/kapa (düğme, Alt+O, Esc); açık durumu tarayıcıda hatırlanır.
     Temizle yalnız bu tarayıcının geçmişini siler. */
  const iz = $('#iz');
  if (iz) {
    const izAc = (durum) => {
      const acik = durum ?? iz.dataset.acik !== 'true';
      iz.dataset.acik = String(acik);
      $('.iz-bar-btn', iz).setAttribute('aria-expanded', String(acik));
      $('#iz-dugme')?.setAttribute('aria-pressed', String(acik));
      try { localStorage.setItem('hm-iz', acik ? '1' : '0'); } catch (_) { /* depolama kapalı */ }
    };
    try {
      if (localStorage.getItem('hm-iz') === '1') {
        // Sayfa açılırken panel kayarak gelmesin
        iz.style.transition = 'none';
        izAc(true);
        requestAnimationFrame(() => { iz.style.transition = ''; });
      }
    } catch (_) { /* depolama kapalı */ }
    document.addEventListener('click', async (ev) => {
      const ac = ev.target.closest('#iz-dugme, .iz-bar-btn, [data-iz-ac]');
      if (ac) { izAc(ac.matches('[data-iz-ac]') ? true : undefined); return; }
      if (!ev.target.closest('[data-iz-temizle]')) return;
      try { await fetch('/api/iz', { method: 'DELETE' }); } catch (_) { return; }
      $('#iz-govde').innerHTML = '<p class="iz-bos">Bu tarayıcıda henüz bir veritabanı komutu çalışmadı.</p>';
      $('.iz-son', iz).textContent = 'Henüz komut yok';
      const sayac = $('#iz-sayac'); if (sayac) sayac.textContent = '0';
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.altKey && ev.code === 'KeyO') { ev.preventDefault(); izAc(); }
      else if (ev.key === 'Escape' && iz.dataset.acik === 'true' && !document.querySelector('.modal.show')) izAc(false);
    });
  }
})();
