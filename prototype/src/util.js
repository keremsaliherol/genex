/* Yardımcılar ve partial karşılıkları (TagHelper/partial'ların HTML çıktısı) */
(function () {
  'use strict';
  const HM = (window.HM = window.HM || {});

  const nf2 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nf1 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nf0 = new Intl.NumberFormat('tr-TR');
  const df = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const tf = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const tfs = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const uzun = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const uzunGun = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
  const ayYil = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' });
  const gunAy = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });
  const EKSI = '−';

  const ISLEM_TIPI = {
    YATIRMA: { ad: 'Para yatırma', ikon: 'arrow-down-left' },
    CEKME: { ad: 'Para çekme', ikon: 'arrow-up-right' },
    TRANSFER_GELEN: { ad: 'Gelen transfer', ikon: 'arrows-left-right' },
    TRANSFER_GIDEN: { ad: 'Giden transfer', ikon: 'arrows-left-right' },
    ALIM: { ad: 'Hisse alım', ikon: 'trend-up' },
    SATIM: { ad: 'Hisse satım', ikon: 'trend-down' }
  };

  const u = {
    EKSI, ISLEM_TIPI,
    e(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    para(k, opt) {
      const o = opt || {};
      const isaret = o.isaret ? (k > 0 ? '+' : k < 0 ? EKSI : '') : k < 0 ? EKSI : '';
      return `${isaret}₺${nf2.format(Math.abs(k) / 100)}`;
    },
    paraKisa(k) {
      const tl = Math.abs(k) / 100; const s = k < 0 ? EKSI : '';
      if (tl >= 1e9) return `${s}₺${nf1.format(tl / 1e9)} mr`;
      if (tl >= 1e6) return `${s}₺${nf1.format(tl / 1e6)} mn`;
      if (tl >= 1e4) return `${s}₺${nf1.format(tl / 1e3)} bin`;
      return `${s}₺${nf0.format(Math.round(tl))}`;
    },
    tlGirdi(k) { return nf2.format(k / 100); },
    /* "8.140,25" / "8140,25" / "8140.25" → kuruş; geçersizse NaN */
    tutarParse(s) {
      let t = String(s || '').trim().replace(/[₺\s]/g, '');
      if (!t) return NaN;
      if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
      else if ((t.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(t)) t = t.replace(/\./g, '');
      if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
      return Math.round(parseFloat(t) * 100);
    },
    sayi: (n) => nf0.format(n),
    tarih: (d) => df.format(d),
    saat: (d) => tf.format(d),
    saatSn: (d) => tfs.format(d),
    tarihSaat: (d) => `${df.format(d)} ${tf.format(d)}`,
    uzunTarih: (d) => uzun.format(d),
    uzunGun: (d) => uzunGun.format(d),
    ayYil: (d) => ayYil.format(d),
    gunAy: (d) => gunAy.format(d),
    isoGun(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; },
    gunParse(s) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; },

    ikon(ad, cls) { return `<svg class="ic ${cls || ''}" aria-hidden="true" focusable="false"><use href="#i-${ad}"></use></svg>`; },

    tutar(k, opt) {
      const o = opt || {};
      const cls = o.renk === false ? '' : k > 0 && o.isaret ? ' tutar--giris' : k < 0 ? ' tutar--cikis' : '';
      return `<span class="tutar${cls}">${u.para(k, o)}</span>`;
    },
    islemTutar(i) { return u.tutar(HM.db.isaret(i.tip) * i.tutar, { isaret: true }); },
    islemRozet(tip) { const t = ISLEM_TIPI[tip]; return `<span class="rozet">${u.ikon(t.ikon)}${t.ad}</span>`; },
    durumRozet(aktif) { return aktif ? '<span class="rozet rozet--aktif">Aktif</span>' : '<span class="rozet rozet--pasif">Pasif</span>'; },
    musteriTipRozet(tip) { return tip === 'KURUMSAL' ? `<span class="rozet">${u.ikon('buildings')}Kurumsal</span>` : `<span class="rozet">${u.ikon('user')}Bireysel</span>`; },
    hesapTipRozet(tip) { return tip === 'YATIRIM' ? `<span class="rozet">${u.ikon('chart-line-up')}Yatırım</span>` : `<span class="rozet">${u.ikon('wallet')}Vadesiz</span>`; },
    harfler(ad) {
      const p = ad.replace(/(A\.Ş\.|Ltd\.|Şti\.|San\.|ve|Tic\.)/g, '').trim().split(/\s+/);
      return ((p[0] || '')[0] + ((p[1] || '')[0] || '')).toLocaleUpperCase('tr-TR');
    },
    kimlik(m, opt) {
      const o = opt || {};
      const ad = o.link === false ? `<span>${u.e(m.ad)}</span>` : `<a href="#/Musteri/Detay/${m.id}">${u.e(m.ad)}</a>`;
      return `<div class="kimlik"><span class="kimlik-harf${m.tip === 'KURUMSAL' ? ' kimlik-harf--kurumsal' : ''}" aria-hidden="true">${u.e(u.harfler(m.ad))}</span><div class="text-truncate">${ad}${o.alt ? `<small>${o.alt}</small>` : ''}</div></div>`;
    },
    noKopya(no, etiket) {
      return `<span class="no-kopya">${u.e(no)}<button type="button" class="btn btn-ghost btn-sm btn-icon" data-kopyala="${u.e(no)}" aria-label="${u.e(etiket || 'Numarayı')} kopyala" title="Kopyala">${u.ikon('copy', 'ic-14')}</button></span>`;
    },
    sayfaBasligi(o) {
      return `<div class="sayfa-bas"><div><h1>${o.baslik}</h1>${o.alt ? `<div class="alt">${o.alt}</div>` : ''}</div>${o.eylemler ? `<div class="sayfa-eylem">${o.eylemler}</div>` : ''}</div>`;
    },
    iskeletSatirlar(sutun, satir) {
      let h = '';
      for (let r = 0; r < satir; r++) {
        h += '<tr>';
        for (let c = 0; c < sutun; c++) h += `<td><span class="iskelet" style="width:${40 + ((r * 7 + c * 13) % 50)}%"></span></td>`;
        h += '</tr>';
      }
      return h;
    },
    bos(o) {
      return `<div class="bos-durum"><div class="ikon-kap">${u.ikon(o.ikon || 'magnifying-glass')}</div><h3>${o.baslik}</h3><p>${o.metin}</p>${o.eylem || ''}</div>`;
    },
    hataUyari(o) {
      const istek = '0HN' + Math.random().toString(36).slice(2, 10).toUpperCase() + ':00000002';
      return `<div class="uyari uyari--hata" role="alert">${u.ikon('warning-circle')}<div><strong>${o.baslik}</strong><p>${o.metin}</p></div>${o.kod ? `<details><summary>Teknik detay</summary><code>${u.e(o.kod)}</code><br><code>İstek kimliği: ${istek}</code></details>` : ''}${o.eylem ? `<div class="eylem">${o.eylem}</div>` : ''}</div>`;
    },
    baglantiHatasi() {
      return u.hataUyari({ baslik: 'Veritabanına ulaşılamıyor.', metin: 'Bağlantıyı kontrol edip tekrar deneyin. Sorun sürerse sistem yöneticisine istek kimliğini iletin.', kod: 'ORA-12541: TNS:no listener (localhost:1521/XEPDB1)', eylem: '<button type="button" class="btn btn-outline-secondary btn-sm" data-demo-durum="normal">Tekrar dene</button>' });
    },

    /* Sıralanabilir başlık ve sayfalama */
    thSirala(anahtar, etiket, q, opt) {
      const o = opt || {};
      const aktif = q.sirala === anahtar;
      const yon = aktif ? (q.yon === 'azalan' ? 'descending' : 'ascending') : 'none';
      const ikon = aktif ? (q.yon === 'azalan' ? 'arrow-down' : 'arrow-up') : 'caret-up-down';
      return `<th scope="col" class="${o.num ? 'num' : ''}" aria-sort="${yon}"><button type="button" class="sirala" data-sirala="${anahtar}">${etiket}${u.ikon(ikon, 'ic-14')}</button></th>`;
    },
    sayfalama(toplam, sayfa, boyut) {
      const son = Math.max(1, Math.ceil(toplam / boyut));
      const bas = toplam ? (sayfa - 1) * boyut + 1 : 0;
      const bit = Math.min(toplam, sayfa * boyut);
      return `<div class="sayfalama"><span class="num">${u.sayi(bas)}-${u.sayi(bit)} / ${u.sayi(toplam)}</span>
        <div class="d-flex align-items-center gap-2"><label class="visually-hidden" for="sayfa-boyut">Sayfa boyutu</label>
        <select id="sayfa-boyut" class="form-select" data-sayfa-boyut>${[10, 25, 50].map((n) => `<option value="${n}"${n === boyut ? ' selected' : ''}>${n} satır</option>`).join('')}</select>
        <nav aria-label="Sayfalar"><button type="button" class="btn btn-outline-secondary btn-sm btn-icon" data-sayfa="${sayfa - 1}"${sayfa <= 1 ? ' disabled' : ''} aria-label="Önceki sayfa">${u.ikon('caret-left', 'ic-16')}</button>
        <span class="px-2 align-self-center num">${sayfa} / ${son}</span>
        <button type="button" class="btn btn-outline-secondary btn-sm btn-icon" data-sayfa="${sayfa + 1}"${sayfa >= son ? ' disabled' : ''} aria-label="Sonraki sayfa">${u.ikon('caret-right', 'ic-16')}</button></nav></div></div>`;
    },
    siralaFn(anahtar, yon, erisim) {
      const k = yon === 'azalan' ? -1 : 1;
      const coll = new Intl.Collator('tr-TR');
      return (a, b) => {
        const x = erisim(a, anahtar); const y = erisim(b, anahtar);
        if (typeof x === 'string') return coll.compare(x, y) * k;
        return ((x > y) - (x < y)) * k;
      };
    },
    debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; },

    /* Toast (aria-live polite) */
    toast(mesaj, opt) {
      const o = opt || {};
      const alan = document.getElementById('toast-alani');
      const el = document.createElement('div');
      el.className = 'toast'; el.setAttribute('role', 'status');
      el.innerHTML = `<div class="toast-body">${u.ikon(o.ikon || 'check-circle')}<span class="flex-grow-1"></span>${o.geriAl ? '<button type="button" class="btn btn-ghost btn-sm" data-geri>Geri al</button>' : ''}<button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Kapat"></button></div>`;
      el.querySelector('span.flex-grow-1').textContent = mesaj;
      if (o.hata) el.querySelector('.ic').style.color = 'var(--debit)';
      alan.appendChild(el);
      const t = new bootstrap.Toast(el, { delay: o.geriAl ? 6000 : 4000 });
      if (o.geriAl) el.querySelector('[data-geri]').addEventListener('click', () => { t.hide(); o.geriAl(); });
      el.addEventListener('hidden.bs.toast', () => el.remove());
      t.show();
    },

    /* Onay diyaloğu: geri alınamaz işlemler için */
    onay(o) {
      return new Promise((coz) => {
        const el = document.getElementById('onay-modal');
        el.querySelector('.modal-title').textContent = o.baslik;
        el.querySelector('.modal-body').innerHTML = o.govde;
        const btn = el.querySelector('[data-onayla]');
        btn.textContent = o.onayMetni;
        btn.className = `btn ${o.tehlikeli ? 'btn-danger' : 'btn-primary'}`;
        const m = bootstrap.Modal.getOrCreateInstance(el);
        let sonuc = false;
        const tik = () => { sonuc = true; m.hide(); };
        btn.addEventListener('click', tik, { once: true });
        el.addEventListener('hidden.bs.modal', () => { btn.removeEventListener('click', tik); coz(sonuc); }, { once: true });
        m.show();
      });
    },

    /* CSV: gerçek uygulamada FileResult ile iner; prototipte önizleme penceresi */
    csvGoster(dosya, satirlar) {
      const csv = satirlar.map((r) => r.map((c) => { const s = String(c == null ? '' : c); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(';')).join('\n');
      const el = document.getElementById('csv-modal');
      el.querySelector('.csv-dosya').textContent = dosya;
      el.querySelector('textarea').value = csv;
      bootstrap.Modal.getOrCreateInstance(el).show();
    },
    kopyala(metin) {
      const bitti = () => u.toast('Panoya kopyalandı.');
      const yedek = () => {
        const t = document.createElement('textarea'); t.value = metin; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select();
        let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        t.remove();
        ok ? bitti() : u.toast('Kopyalanamadı. Metni seçip Ctrl+C ile kopyalayın.', { ikon: 'warning', hata: true });
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(metin).then(bitti, yedek);
      else yedek();
    },

    /* Yazdırma görünümü: sandbox print() engellerse de ekranda aynı çıktı */
    baskiGorunumu(ac) {
      document.documentElement.classList.toggle('baski', ac);
      if (ac) { try { window.print(); } catch (e) { /* sandbox */ } }
    },

    /* Tema: data-theme (Artifact barındırıcısıyla aynı sözleşme) + data-bs-theme eşlemesi */
    tema: {
      tercih() { try { return localStorage.getItem('hm-tema') || 'sistem'; } catch (e) { return 'sistem'; } },
      ayarla(t) {
        try { localStorage.setItem('hm-tema', t); } catch (e) { /* depolama kapalı */ }
        const r = document.documentElement;
        if (t === 'acik') r.setAttribute('data-theme', 'light');
        else if (t === 'koyu') r.setAttribute('data-theme', 'dark');
        else r.removeAttribute('data-theme');
        u.tema.esle();
      },
      etkin() {
        const d = document.documentElement.getAttribute('data-theme');
        if (d === 'dark' || d === 'light') return d;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      },
      esle() {
        const t = u.tema.etkin();
        document.documentElement.setAttribute('data-bs-theme', t);
        document.dispatchEvent(new CustomEvent('hm:tema', { detail: t }));
      },
      baslat() {
        let kayitli = null; try { kayitli = localStorage.getItem('hm-tema'); } catch (e) { kayitli = null; }
        if (kayitli && kayitli !== 'sistem') u.tema.ayarla(kayitli); else u.tema.esle();
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', u.tema.esle);
        new MutationObserver(u.tema.esle).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      }
    },

    css(ad) { return getComputedStyle(document.documentElement).getPropertyValue(ad).trim(); }
  };
  HM.u = u;
})();
