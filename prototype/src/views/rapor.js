/* RaporController: AylikOzet, BakiyeDegisimi, EnAktif */
(function () {
  'use strict';
  const HM = window.HM; const u = HM.u; const db = HM.db;
  const V = HM.views;

  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const SEKMELER = [['aylik', '/Rapor/AylikOzet', 'Aylık işlem özeti'], ['bakiye', '/Rapor/BakiyeDegisimi', 'Bakiye değişimi'], ['aktif', '/Rapor/EnAktif', 'En aktif müşteriler']];

  function enAktifHesap(bas) {
    let en = null; let n = -1;
    for (const h of db.hesaplar) {
      if (!h.aktif) continue;
      const l = db.hesapIslemleri(h.id); let c = 0;
      for (let i = l.length - 1; i >= 0 && l[i].zaman >= bas; i--) c++;
      if (c > n) { n = c; en = h; }
    }
    return en;
  }
  function durumPaneli(alan) {
    const d = HM.demo.durum;
    if (d === 'yukleniyor') { alan.innerHTML = '<section class="panel"><div class="panel-govde d-grid gap-3"><span class="iskelet" style="width:30%;height:16px"></span><span class="iskelet" style="height:220px"></span></div></section>'; return true; }
    if (d === 'hata') { alan.innerHTML = u.baglantiHatasi(); return true; }
    return false;
  }
  function tabloGecis(kok, sinyal) {
    const b = kok.querySelector('[data-tablo-gorunum]'); if (!b) return;
    b.addEventListener('click', () => {
      const t = kok.querySelector('[data-tablo]'); const ac = t.hidden;
      t.hidden = !ac; kok.querySelector('.grafik-kap').hidden = ac;
      b.setAttribute('aria-pressed', String(ac)); b.lastChild.textContent = ac ? 'Grafik' : 'Tablo';
    }, { signal: sinyal });
  }

  /* Aylık işlem özeti: PKG_RAPOR.AYLIK_OZET_HESAP / _MUSTERI */
  function aylik(govde, q, sinyal) {
    const kapsam = q.kapsam === 'musteri' ? 'musteri' : 'hesap';
    const bugun = db.bugun;
    const yil = Number(q.yil) || bugun.getFullYear();
    const ay = Math.min(12, Math.max(1, Number(q.ay) || bugun.getMonth() + 1));
    const ayBas = new Date(yil, ay - 1, 1);
    let hedef = q.id ? (kapsam === 'musteri' ? db.musteri(q.id) : db.hesap(q.id)) : null;
    if (!q.id) {
      const h = (HM.durum.sonHesapId && db.hesap(HM.durum.sonHesapId)) || enAktifHesap(ayBas);
      hedef = kapsam === 'hesap' ? h : h && db.musteri(h.musteriId);
    }
    const yillar = []; for (let y = db.baslangic.getFullYear(); y <= bugun.getFullYear(); y++) yillar.push(y);
    govde.innerHTML = `<section class="panel mb-3"><form class="filtre-cubugu align-items-end" id="ao-form" novalidate>
        <div class="alan"><span class="form-label" id="ao-kapsam-e">Kapsam</span><div class="segment" role="radiogroup" aria-labelledby="ao-kapsam-e">
          <input type="radio" name="ao-kapsam" id="ao-k-h" value="hesap"${kapsam === 'hesap' ? ' checked' : ''}><label for="ao-k-h">Hesap</label>
          <input type="radio" name="ao-kapsam" id="ao-k-m" value="musteri"${kapsam === 'musteri' ? ' checked' : ''}><label for="ao-k-m">Müşteri</label></div></div>
        <div style="flex:1 1 280px;max-width:380px">${HM.secici.html({ id: 'ao-secim', etiket: kapsam === 'hesap' ? 'Hesap' : 'Müşteri', zorunlu: true, yerTutucu: kapsam === 'hesap' ? 'Hesap no veya müşteri adı' : 'Müşteri adı veya no', deger: hedef ? (kapsam === 'hesap' ? hedef.no : hedef.ad) : '' })}</div>
        <div class="alan"><label class="form-label" for="ao-yil">Yıl</label><select id="ao-yil" class="form-select">${yillar.map((y) => `<option${y === yil ? ' selected' : ''}>${y}</option>`).join('')}</select></div>
        <div class="alan"><label class="form-label" for="ao-ay">Ay</label><select id="ao-ay" class="form-select">${AYLAR.map((a, i) => `<option value="${i + 1}"${i + 1 === ay ? ' selected' : ''}>${a}</option>`).join('')}</select></div>
        <button type="submit" class="btn btn-primary">Raporu çalıştır</button></form></section><div id="ao-sonuc"></div>`;
    let secilen = hedef;
    HM.secici.bagla(govde, { id: 'ao-secim', sinyal,
      ara: (x) => (kapsam === 'hesap' ? HM.ara.hesap(x || '', { n: 8 }).map((h) => HM.secici.hesapOgesi(h)) : HM.ara.musteri(x || '', 8).map((m) => ({ id: m.id, deger: m, baslik: m.ad, alt: m.no }))),
      sec: (o) => { secilen = o ? o.deger : null; } });
    govde.querySelectorAll('[name="ao-kapsam"]').forEach((r) => r.addEventListener('change', () => HM.r.git('/Rapor/AylikOzet', { kapsam: r.value, yil, ay }, { replace: true }), { signal: sinyal }));
    govde.querySelector('#ao-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = govde.querySelector('#ao-secim');
      if (!secilen) { inp.classList.add('is-invalid'); govde.querySelector('#ao-secim-hata').textContent = 'Listeden bir kayıt seçin.'; inp.focus(); return; }
      HM.r.git('/Rapor/AylikOzet', { kapsam, id: secilen.id, yil: govde.querySelector('#ao-yil').value, ay: govde.querySelector('#ao-ay').value });
    }, { signal: sinyal });

    const sonuc = govde.querySelector('#ao-sonuc');
    if (durumPaneli(sonuc)) return;
    if (!hedef) { sonuc.innerHTML = `<section class="panel">${u.bos({ ikon: 'chart-bar-horizontal', baslik: 'Rapor için bir kayıt seçin', metin: 'Hesap veya müşteri seçip Raporu çalıştır düğmesine basın.' })}</section>`; return; }
    const ids = kapsam === 'hesap' ? [hedef.id] : db.musteriHesaplari(hedef.id).map((h) => h.id);
    const satirlar = HM.demo.durum === 'bos' ? [] : HM.hesapla.aylikOzet(ids, yil, ay);
    const paket = kapsam === 'musteri' ? 'AYLIK_OZET_MUSTERI' : 'AYLIK_OZET_HESAP';
    const ad = kapsam === 'hesap' ? `${db.musteri(hedef.musteriId).ad}, ${hedef.no}` : hedef.ad;
    sonuc.innerHTML = `<div class="baski-bas"><div><strong>Demo Menkul Değerler A.Ş. (kurgusal)</strong><br>Aylık işlem özeti</div><div class="text-end">${u.e(ad)}<br>${AYLAR[ay - 1]} ${yil}</div></div>
      <section class="panel"><div class="panel-bas"><div><h2>${u.e(ad)}</h2><div class="aciklama">${AYLAR[ay - 1]} ${yil}${kapsam === 'musteri' ? `, ${ids.length} hesap` : ''}</div></div>
        <div class="d-flex gap-2 flex-wrap baski-gizle"><button type="button" class="btn btn-ghost btn-sm" data-iz-ac>${u.ikon('database', 'ic-16')}PKG_RAPOR.${paket}</button>
        <button type="button" class="btn btn-outline-secondary btn-sm" data-csv>${u.ikon('file-csv', 'ic-16')}CSV</button><button type="button" class="btn btn-outline-secondary btn-sm" data-baski>${u.ikon('printer', 'ic-16')}Yazdır</button></div></div>
        ${satirlar.length ? `<div class="panel-govde"><div class="grafik-kap" style="height:${satirlar.length * 40 + 44}px"><canvas id="ao-grafik" role="img" aria-label="İşlem tipine göre toplam tutarlar; değerler aşağıdaki tabloda"></canvas></div></div>` : ''}
        ${HM.hesapla.ozetTablo(satirlar)}</section>`;
    if (satirlar.length) HM.grafik.yatay(sonuc.querySelector('#ao-grafik'), satirlar.map((r) => ({ etiket: u.ISLEM_TIPI[r.tip].ad, deger: r.toplam })));
    sonuc.addEventListener('click', (e) => {
      if (e.target.closest('[data-csv]')) u.csvGoster(`aylik-ozet-${yil}-${String(ay).padStart(2, '0')}.csv`, [['ISLEM_TIPI', 'ISLEM_ADEDI', 'TOPLAM_TUTAR'], ...satirlar.map((r) => [r.tip, r.adet, u.tlGirdi(r.toplam)])]);
    }, { signal: sinyal });
    HM.iz.ekran('aylikOzet', { kapsam, id: hedef.id, yil, ay, satir: satirlar.length });
  }

  /* Bakiye değişimi: PKG_RAPOR.BAKIYE_DEGISIMI */
  function bakiye(govde, q, sinyal) {
    const on = ['30', '90', '180', 'ozel'].includes(q.on) ? q.on : (q.bas || q.bit ? 'ozel' : '90');
    let bit = db.bugun; let bas = new Date(bit.getTime() - ((on === 'ozel' ? 90 : Number(on)) - 1) * db.GUN);
    if (on === 'ozel') { bas = u.gunParse(q.bas) || bas; bit = u.gunParse(q.bit) || bit; }
    if (bas > bit) [bas, bit] = [bit, bas];
    const h = (q.id && db.hesap(q.id)) || (HM.durum.sonHesapId && db.hesap(HM.durum.sonHesapId)) || enAktifHesap(new Date(db.bugun.getTime() - 30 * db.GUN));
    const git = (degis) => HM.r.git('/Rapor/BakiyeDegisimi', Object.assign({ id: h.id, on, bas: on === 'ozel' ? u.isoGun(bas) : '', bit: on === 'ozel' ? u.isoGun(bit) : '' }, degis), { replace: true });
    govde.innerHTML = `<section class="panel mb-3"><div class="filtre-cubugu align-items-end">
        <div style="flex:1 1 280px;max-width:380px">${HM.secici.html({ id: 'bd-hesap', etiket: 'Hesap', yerTutucu: 'Hesap no veya müşteri adı', deger: h.no })}</div>
        <div class="alan"><span class="form-label" id="bd-on-e">Dönem</span><div class="segment" role="radiogroup" aria-labelledby="bd-on-e">${[['30', 'Son 30 gün'], ['90', 'Son 90 gün'], ['180', 'Son 6 ay'], ['ozel', 'Özel']].map(([k, ad]) => `<input type="radio" name="bd-on" id="bd-on-${k}" value="${k}"${on === k ? ' checked' : ''}><label for="bd-on-${k}">${ad}</label>`).join('')}</div></div>
        <div class="d-flex align-items-center gap-2"><label class="visually-hidden" for="bd-bas">Başlangıç</label><input type="date" id="bd-bas" class="form-control" value="${u.isoGun(bas)}" max="${u.isoGun(db.bugun)}"><span class="text-secondary">-</span><label class="visually-hidden" for="bd-bit">Bitiş</label><input type="date" id="bd-bit" class="form-control" value="${u.isoGun(bit)}" max="${u.isoGun(db.bugun)}"></div>
      </div></section><div id="bd-sonuc"></div>`;
    HM.secici.bagla(govde, { id: 'bd-hesap', sinyal, ara: (x) => HM.ara.hesap(x || '', { n: 8 }).map((x2) => HM.secici.hesapOgesi(x2)), sec: (o) => { if (o) git({ id: o.id }); } });
    govde.querySelectorAll('[name="bd-on"]').forEach((r) => r.addEventListener('change', () => git(r.value === 'ozel' ? { on: 'ozel', bas: u.isoGun(bas), bit: u.isoGun(bit) } : { on: r.value, bas: '', bit: '' }), { signal: sinyal }));
    ['bd-bas', 'bd-bit'].forEach((id) => govde.querySelector('#' + id).addEventListener('change', () => git({ on: 'ozel', bas: govde.querySelector('#bd-bas').value, bit: govde.querySelector('#bd-bit').value }), { signal: sinyal }));

    const sonuc = govde.querySelector('#bd-sonuc');
    if (durumPaneli(sonuc)) return;
    const simdi = new Date();
    const bitSon = new Date(Math.min(bit.getTime() + db.GUN, simdi.getTime()));
    const acilis = db.bakiyeTarihte(h.id, bas);
    const list = HM.demo.durum === 'bos' ? [] : db.hesapIslemleri(h.id).filter((i) => i.zaman >= bas && i.zaman < bitSon);
    const kapanis = list.length ? list[list.length - 1].bakiyeSonra : acilis;
    const noktalar = [{ x: bas, y: acilis }, ...list.map((i) => ({ x: i.zaman, y: i.bakiyeSonra })), { x: bitSon, y: kapanis }];
    let enY = noktalar[0]; let enD = noktalar[0];
    for (const n of noktalar) { if (n.y > enY.y) enY = n; if (n.y < enD.y) enD = n; }
    const m = db.musteri(h.musteriId);
    sonuc.innerHTML = `<section class="panel mb-3"><div class="kpi-serit">
        <div class="kpi"><span class="etiket">Dönem başı bakiye</span><span class="deger tutar">${u.para(acilis)}</span><span class="ek">${u.tarih(bas)}</span></div>
        <div class="kpi"><span class="etiket">Dönem sonu bakiye</span><span class="deger tutar">${u.para(kapanis)}</span><span class="ek">${u.tarih(bit)}</span></div>
        <div class="kpi"><span class="etiket">Net değişim</span><span class="deger">${u.tutar(kapanis - acilis, { isaret: true })}</span><span class="ek">${list.length} işlem</span></div>
        <div class="kpi"><span class="etiket">En yüksek bakiye</span><span class="deger tutar">${u.para(enY.y)}</span><span class="ek">En düşük ${u.para(enD.y)}, ${u.tarih(enD.x)}</span></div></div></section>
      <section class="panel"><div class="panel-bas"><div><h2>${u.e(m.ad)}, <span class="mono">${h.no}</span></h2><div class="aciklama">Her işlemden sonraki bakiye; bakiye yalnız işlem anında değişir.</div></div>
        <div class="d-flex gap-2"><button type="button" class="btn btn-ghost btn-sm" data-iz-ac>${u.ikon('database', 'ic-16')}PKG_RAPOR.BAKIYE_DEGISIMI</button><button type="button" class="btn btn-ghost btn-sm" data-tablo-gorunum aria-pressed="false">${u.ikon('list', 'ic-16')}Tablo</button></div></div>
        <div class="panel-govde"><div class="grafik-kap" style="height:300px"><canvas id="bd-grafik" role="img" aria-label="Bakiye ${u.para(acilis)} değerinden ${u.para(kapanis)} değerine değişti; en yüksek ${u.para(enY.y)}, en düşük ${u.para(enD.y)}"></canvas></div>
          <div data-tablo hidden>${list.length ? V.hesapDetay.hareketTablo(list.slice().reverse()) : u.bos({ ikon: 'calendar-blank', baslik: 'Bu dönemde hareket yok', metin: 'Bakiye dönem boyunca sabit kaldı.' })}</div></div></section>`;
    HM.grafik.bakiye(sonuc.querySelector('#bd-grafik'), noktalar);
    tabloGecis(sonuc, sinyal);
    HM.iz.ekran('bakiyeDegisimi', { id: h.id, bas: u.tarih(bas), bit: u.tarih(bit), satir: list.length });
  }

  /* En aktif müşteriler / hesaplar */
  function aktif(govde, q, sinyal) {
    const tur = q.tur === 'hesap' ? 'hesap' : 'musteri';
    const n = [5, 10, 20].includes(Number(q.n)) ? Number(q.n) : 10;
    const donem = ['30', 'yil', 'tum'].includes(q.donem) ? q.donem : '30';
    const bas = donem === '30' ? new Date(db.bugun.getTime() - 29 * db.GUN) : donem === 'yil' ? new Date(db.bugun.getFullYear(), 0, 1) : new Date(0);
    const donemAd = { 30: 'son 30 gün', yil: 'bu yıl', tum: 'tüm kayıtlar' }[donem];
    const git = (degis) => HM.r.git('/Rapor/EnAktif', Object.assign({ tur, n, donem }, degis), { replace: true });
    govde.innerHTML = `<section class="panel mb-3"><div class="filtre-cubugu">
        <div class="segment" role="radiogroup" aria-label="Rapor türü"><input type="radio" name="ea-tur" id="ea-m" value="musteri"${tur === 'musteri' ? ' checked' : ''}><label for="ea-m">Müşteriler</label><input type="radio" name="ea-tur" id="ea-h" value="hesap"${tur === 'hesap' ? ' checked' : ''}><label for="ea-h">Hesaplar</label></div>
        <div class="segment" role="radiogroup" aria-label="Gösterilecek kayıt">${[5, 10, 20].map((x) => `<input type="radio" name="ea-n" id="ea-n${x}" value="${x}"${n === x ? ' checked' : ''}><label for="ea-n${x}">İlk ${x}</label>`).join('')}</div>
        <label class="visually-hidden" for="ea-donem">Dönem</label><select id="ea-donem" class="form-select">${[['30', 'Son 30 gün'], ['yil', 'Bu yıl'], ['tum', 'Tüm kayıtlar']].map(([k, ad]) => `<option value="${k}"${donem === k ? ' selected' : ''}>${ad}</option>`).join('')}</select>
      </div></section><div id="ea-sonuc"></div>`;
    govde.querySelectorAll('[name="ea-tur"]').forEach((r) => r.addEventListener('change', () => git({ tur: r.value }), { signal: sinyal }));
    govde.querySelectorAll('[name="ea-n"]').forEach((r) => r.addEventListener('change', () => git({ n: r.value }), { signal: sinyal }));
    govde.querySelector('#ea-donem').addEventListener('change', (e) => git({ donem: e.target.value }), { signal: sinyal });

    const sonuc = govde.querySelector('#ea-sonuc');
    if (durumPaneli(sonuc)) return;
    const say = new Map();
    for (const i of db.islemler) {
      if (i.zaman < bas) continue;
      const k = tur === 'hesap' ? i.hesapId : db.hesap(i.hesapId).musteriId;
      const r = say.get(k) || { adet: 0, hacim: 0, son: i.zaman };
      r.adet++; r.hacim += i.tutar; if (i.zaman > r.son) r.son = i.zaman; say.set(k, r);
    }
    const sirali = HM.demo.durum === 'bos' ? [] : [...say.entries()].sort((a, b) => b[1].adet - a[1].adet || b[1].hacim - a[1].hacim).slice(0, n);
    const enCok = sirali.length ? sirali[0][1].adet : 1;
    sonuc.innerHTML = `<section class="panel"><div class="panel-bas"><div><h2>${tur === 'hesap' ? 'En çok işlem yapılan hesaplar' : 'En aktif müşteriler'}</h2><div class="aciklama">İşlem adedine göre, ${donemAd}. Transferin iki kaydı ayrı sayılır.</div></div>
        <div class="d-flex gap-2 flex-wrap baski-gizle"><button type="button" class="btn btn-ghost btn-sm" data-iz-ac>${u.ikon('database', 'ic-16')}Sorguyu göster</button><button type="button" class="btn btn-outline-secondary btn-sm" data-csv>${u.ikon('file-csv', 'ic-16')}CSV</button><button type="button" class="btn btn-outline-secondary btn-sm" data-baski>${u.ikon('printer', 'ic-16')}Yazdır</button></div></div>
      ${sirali.length ? `<div class="tablo-kap"><table class="table table-hover tablo"><thead><tr><th scope="col" class="num">Sıra</th><th scope="col">${tur === 'hesap' ? 'Hesap' : 'Müşteri'}</th><th scope="col">İşlem adedi</th><th scope="col" class="num">Hacim</th><th scope="col">Son işlem</th></tr></thead>
        <tbody>${sirali.map(([k, r], i) => {
          const ad = tur === 'hesap' ? (() => { const h = db.hesap(k); return `<a class="mono" href="#/Hesap/Detay/${h.id}">${h.no}</a><div class="form-text m-0">${u.e(db.musteri(h.musteriId).ad)}</div>`; })() : u.kimlik(db.musteri(k), { alt: db.musteri(k).no });
          return `<tr><td class="num text-secondary">${i + 1}</td><td>${ad}</td><td><span class="satir-bar"><i style="width:${Math.round((r.adet / enCok) * 120)}px" aria-hidden="true"></i><span class="num">${u.sayi(r.adet)}</span></span></td><td class="num">${u.para(r.hacim)}</td><td class="num sessiz">${u.tarihSaat(r.son)}</td></tr>`; }).join('')}</tbody></table></div>`
        : u.bos({ ikon: 'chart-bar-horizontal', baslik: 'Bu dönemde işlem yok', metin: 'Daha geniş bir dönem seçin.' })}</section>`;
    sonuc.addEventListener('click', (e) => {
      if (e.target.closest('[data-csv]')) u.csvGoster(`en-aktif-${tur}-${donem}.csv`, [['SIRA', tur === 'hesap' ? 'HESAP_NO' : 'AD_SOYAD', 'TOPLAM_ISLEM', 'HACIM'], ...sirali.map(([k, r], i) => [i + 1, tur === 'hesap' ? db.hesap(k).no : db.musteri(k).ad, r.adet, u.tlGirdi(r.hacim)])]);
    }, { signal: sinyal });
    HM.iz.ekran('enAktif', { tur, n, bas: u.tarih(bas) });
  }

  V.rapor = {
    kirinti: (p) => [['Raporlar', '#/Rapor/AylikOzet'], [SEKMELER.find((s) => s[0] === p.sekme)[2], '']],
    ciz(kok, p, q, sinyal) {
      kok.innerHTML = u.sayfaBasligi({ baslik: 'Raporlar', alt: 'Sonuçlar PL/SQL paketleri, view\'lar ve parametreli sorgulardan okunur. Çalışan komut Oracle izinde görünür.' }) +
        `<nav class="sekmeler panel mb-3" aria-label="Rapor türleri">${SEKMELER.map(([k, yol, ad]) => `<a href="#${yol}"${p.sekme === k ? ' aria-current="page"' : ''}>${ad}</a>`).join('')}</nav><div id="rapor-govde"></div>`;
      const govde = kok.querySelector('#rapor-govde');
      if (p.sekme === 'bakiye') bakiye(govde, q, sinyal);
      else if (p.sekme === 'aktif') aktif(govde, q, sinyal);
      else aylik(govde, q, sinyal);
    }
  };
})();
