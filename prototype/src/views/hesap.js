/* HesapController: Index, Detay, Yeni, Ekstre */
(function () {
  'use strict';
  const HM = window.HM; const u = HM.u; const db = HM.db; const api = HM.api;
  const V = HM.views;
  const urlYaz = (yol, q) => { try { history.replaceState(null, '', HM.r.link(yol, q)); } catch (e) { /* sandbox */ } };
  const kucuk = (s) => String(s).toLocaleLowerCase('tr-TR');

  /* Liste */
  V.hesapListe = {
    kirinti: () => [['Hesaplar', '#/Hesap']],
    ciz(kok, p, q0, sinyal) {
      const q = Object.assign({ q: '', tip: '', durum: 'aktif', sirala: 'no', yon: 'artan', sayfa: '1', boyut: '25' }, q0);
      kok.innerHTML = u.sayfaBasligi({ baslik: 'Hesaplar', alt: '<span id="h-sayac"></span>', eylemler: `<a class="btn btn-primary" href="#/Hesap/Yeni">${u.ikon('plus', 'ic-16')}Hesap aç</a>` }) +
        `<section class="panel"><div class="filtre-cubugu" role="search">
          <div class="arama">${u.ikon('magnifying-glass', 'ic-16')}<label class="visually-hidden" for="h-ara">Hesap ara</label><input id="h-ara" class="form-control" type="search" placeholder="Hesap no veya müşteri adı" value="${u.e(q.q)}"></div>
          <div class="segment" role="radiogroup" aria-label="Hesap tipi">${[['', 'Tümü'], ['VADESIZ', 'Vadesiz'], ['YATIRIM', 'Yatırım']].map(([v, ad], i) => `<input type="radio" name="h-tip" id="h-tip-${i}" value="${v}"${q.tip === v ? ' checked' : ''}><label for="h-tip-${i}">${ad}</label>`).join('')}</div>
          <label class="visually-hidden" for="h-durum">Durum</label><select id="h-durum" class="form-select">${[['aktif', 'Açık hesaplar'], ['pasif', 'Pasif hesaplar'], ['tumu', 'Tüm durumlar']].map(([v, ad]) => `<option value="${v}"${q.durum === v ? ' selected' : ''}>${ad}</option>`).join('')}</select></div>
          <div id="h-tablo"></div></section>`;
      const alan = kok.querySelector('#h-tablo');
      const erisim = (h, k) => (k === 'no' ? h.no : k === 'musteri' ? db.musteri(h.musteriId).ad : k === 'bakiye' ? h.bakiye : k === 'acilis' ? h.acilis.getTime() : (db.sonIslem(h.id) || { zaman: new Date(0) }).zaman.getTime());
      function ciz() {
        urlYaz('/Hesap', Object.assign({}, q, { durum: q.durum === 'aktif' ? '' : q.durum, sirala: q.sirala === 'no' ? '' : q.sirala, yon: q.yon === 'artan' ? '' : q.yon, sayfa: q.sayfa === '1' ? '' : q.sayfa, boyut: q.boyut === '25' ? '' : q.boyut }));
        if (HM.hesapla.durumAlani(alan, 8)) return;
        const k = kucuk(q.q.trim()); const rakam = k.replace(/\D/g, '');
        const liste = HM.demo.durum === 'bos' ? [] : db.hesaplar.filter((h) => (!q.tip || h.tip === q.tip) && (q.durum === 'tumu' || (q.durum === 'pasif' ? !h.aktif : h.aktif)) &&
          (!k || (rakam.length >= 3 && h.no.replace(/-/g, '').includes(rakam)) || kucuk(db.musteri(h.musteriId).ad).includes(k))).sort(u.siralaFn(q.sirala, q.yon, erisim));
        const boyut = Number(q.boyut); const son = Math.max(1, Math.ceil(liste.length / boyut));
        const sayfa = Math.min(son, Math.max(1, Number(q.sayfa) || 1)); q.sayfa = String(sayfa);
        const parca = liste.slice((sayfa - 1) * boyut, sayfa * boyut);
        kok.querySelector('#h-sayac').textContent = `${u.sayi(liste.length)} hesap`;
        if (!liste.length) { alan.innerHTML = u.bos({ ikon: 'wallet', baslik: 'Bu filtrelerle hesap yok', metin: 'Aramayı değiştirin veya başka bir hesap tipi seçin.' }); return; }
        const toplam = liste.reduce((s, h) => s + h.bakiye, 0);
        alan.innerHTML = `<div class="tablo-kap"><table class="table table-hover tablo"><thead><tr>${u.thSirala('no', 'Hesap no', q)}${u.thSirala('musteri', 'Müşteri', q)}<th scope="col">Tip</th>
          ${u.thSirala('bakiye', 'Bakiye', q, { num: true })}${u.thSirala('acilis', 'Açılış', q)}${u.thSirala('son', 'Son hareket', q)}<th scope="col">Durum</th><th scope="col"><span class="visually-hidden">Eylemler</span></th></tr></thead>
          <tbody>${parca.map((h) => { const m = db.musteri(h.musteriId); const s = db.sonIslem(h.id);
            return `<tr class="tiklanir" data-href="#/Hesap/Detay/${h.id}"><td><a class="mono" href="#/Hesap/Detay/${h.id}">${h.no}</a></td><td>${u.kimlik(m)}</td><td>${u.hesapTipRozet(h.tip)}</td><td class="num">${u.tutar(h.bakiye)}</td>
            <td class="num sessiz">${u.tarih(h.acilis)}</td><td class="num sessiz">${s ? u.tarih(s.zaman) : 'Yok'}</td><td>${u.durumRozet(h.aktif)}</td>
            <td class="text-end text-nowrap"><a class="btn btn-ghost btn-sm" href="#/Hesap/Ekstre/${h.id}">Ekstre</a>${h.aktif ? `<a class="btn btn-ghost btn-sm" href="#/Islem/Yeni?hesapId=${h.id}">İşlem yap</a>` : ''}</td></tr>`; }).join('')}</tbody></table></div>
          <div class="panel-alt"><span>Filtrelenen ${u.sayi(liste.length)} hesabın toplam bakiyesi</span><span class="num fw-semibold">${u.para(toplam)}</span></div>${u.sayfalama(liste.length, sayfa, boyut)}`;
        HM.iz.ekran('hesapListe', { tip: q.tip, offset: (sayfa - 1) * boyut, boyut, satir: parca.length });
      }
      kok.querySelector('#h-ara').addEventListener('input', u.debounce((e) => { q.q = e.target.value; q.sayfa = '1'; ciz(); }, 300), { signal: sinyal });
      kok.querySelectorAll('[name="h-tip"]').forEach((r) => r.addEventListener('change', () => { q.tip = r.value; q.sayfa = '1'; ciz(); }, { signal: sinyal }));
      kok.querySelector('#h-durum').addEventListener('change', (e) => { q.durum = e.target.value; q.sayfa = '1'; ciz(); }, { signal: sinyal });
      alan.addEventListener('click', (e) => {
        const s = e.target.closest('[data-sirala]');
        if (s) { const k = s.dataset.sirala; q.yon = q.sirala === k ? (q.yon === 'artan' ? 'azalan' : 'artan') : (['bakiye', 'acilis', 'son'].includes(k) ? 'azalan' : 'artan'); q.sirala = k; ciz(); return; }
        const sy = e.target.closest('[data-sayfa]'); if (sy) { q.sayfa = sy.dataset.sayfa; ciz(); }
      }, { signal: sinyal });
      alan.addEventListener('change', (e) => { if (e.target.matches('[data-sayfa-boyut]')) { q.boyut = e.target.value; q.sayfa = '1'; ciz(); } }, { signal: sinyal });
      ciz();
    }
  };

  /* Detay */
  function hareketTablo(list, opt) {
    const o = opt || {};
    return `<div class="tablo-kap"><table class="table table-hover tablo"><thead><tr><th scope="col">Zaman</th>${o.kompakt ? '' : '<th scope="col">İşlem no</th>'}<th scope="col">İşlem</th><th scope="col">Açıklama</th><th scope="col">Karşı hesap</th><th scope="col" class="num">Tutar</th><th scope="col" class="num">Bakiye</th></tr></thead>
      <tbody>${list.map((i) => { const k = i.karsiHesapId ? db.hesap(i.karsiHesapId) : null;
        return `${o.gunAyrac && o.gunAyrac(i) ? `<tr class="gun-ayrac"><td colspan="${o.kompakt ? 6 : 7}">${u.uzunGun(i.zaman)}</td></tr>` : ''}<tr class="tiklanir" data-href="#/Islem/Dekont/${i.id}"><td class="num sessiz">${o.saatYalniz ? u.saat(i.zaman) : u.tarihSaat(i.zaman)}</td>${o.kompakt ? '' : `<td class="num sessiz">${i.id}</td>`}<td>${u.islemRozet(i.tip)}</td><td class="text-truncate" style="max-width:${o.kompakt ? 200 : 280}px">${u.e(i.aciklama)}</td>
          <td>${k ? `<a class="mono" href="#/Hesap/Detay/${k.id}">${k.no}</a>` : '<span class="text-secondary">Yok</span>'}</td><td class="num">${u.islemTutar(i)}</td><td class="num">${u.tutar(i.bakiyeSonra)}</td></tr>`; }).join('')}</tbody></table></div>`;
  }
  V.hesapDetay = {
    kirinti: (p) => { const h = db.hesap(p.id); return [['Hesaplar', '#/Hesap'], [h ? h.no : 'Bulunamadı', '']]; },
    ciz(kok, p, q, sinyal) {
      const h = db.hesap(p.id);
      if (!h) { V.bulunamadi.ciz(kok); return; }
      HM.durum.sonHesapId = h.id;
      const m = db.musteri(h.musteriId);
      const tum = db.hesapIslemleri(h.id);
      const yirmi = tum.slice(-20).reverse();
      const otuz = new Date(db.bugun.getTime() - 29 * db.GUN);
      const giris = tum.filter((i) => i.zaman >= otuz && db.isaret(i.tip) > 0).reduce((s, i) => s + i.tutar, 0);
      const cikis = tum.filter((i) => i.zaman >= otuz && db.isaret(i.tip) < 0).reduce((s, i) => s + i.tutar, 0);
      const poz = Object.entries(h.portfoy);
      const pas = api.hesapPasifeAlinabilir(h);
      const sekmeler = [['hareket', 'Hareketler'], ...(h.tip === 'YATIRIM' ? [['portfoy', 'Portföy']] : []), ['ozet', 'Aylık özet']];
      const sekme = sekmeler.some(([k]) => k === q.sekme) ? q.sekme : 'hareket';
      const islemMenu = [['YATIRMA', 'Para yatır', 'arrow-down-left'], ['CEKME', 'Para çek', 'arrow-up-right'], ['TRANSFER', 'Transfer', 'arrows-left-right'], ...(h.tip === 'YATIRIM' ? [['ALIM', 'Hisse al', 'trend-up'], ['SATIM', 'Hisse sat', 'trend-down']] : [])];
      kok.innerHTML = u.sayfaBasligi({
        baslik: `<span class="mono">${h.no}</span>`,
        alt: `${u.hesapTipRozet(h.tip)}${u.durumRozet(h.aktif)}<a href="#/Musteri/Detay/${m.id}">${u.e(m.ad)}</a><span class="mono">${m.no}</span>`,
        eylemler: `<a class="btn btn-outline-secondary" href="#/Hesap/Ekstre/${h.id}">${u.ikon('receipt', 'ic-16')}Ekstre</a>
          ${h.aktif ? `<div class="btn-group"><a class="btn btn-primary" href="#/Islem/Yeni?hesapId=${h.id}">${u.ikon('arrows-left-right', 'ic-16')}İşlem yap</a><button type="button" class="btn btn-primary dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false"><span class="visually-hidden">İşlem tipini seç</span></button>
            <ul class="dropdown-menu dropdown-menu-end">${islemMenu.map(([t, ad, ik]) => `<li><a class="dropdown-item" href="#/Islem/Yeni?hesapId=${h.id}&tip=${t}">${u.ikon(ik)}${ad}</a></li>`).join('')}</ul></div>` : ''}
          <div class="dropdown"><button type="button" class="btn btn-ghost btn-icon" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Diğer eylemler">${u.ikon('dots-three-vertical')}</button>
            <ul class="dropdown-menu dropdown-menu-end"><li><button type="button" class="dropdown-item" data-kopyala="${h.no}">${u.ikon('copy')}Hesap no kopyala</button></li>
            <li><button type="button" class="dropdown-item" data-hesap-pasif${pas.olur ? '' : ' disabled aria-disabled="true"'}>${u.ikon('prohibit')}Hesabı pasife al</button>${pas.olur ? '' : `<p class="form-text px-3 mb-1" style="max-width:240px">${u.e(pas.neden)}</p>`}</li></ul></div>`
      }) + `<div class="izgara-3-9">
        <div class="izgara">
          <section class="panel" aria-labelledby="bakiye-baslik"><div class="panel-govde d-grid gap-3">
            <div class="bakiye-blok"><span class="etiket" id="bakiye-baslik">Bakiye</span><span class="deger">${u.para(h.bakiye)}</span>
              <span class="ek"><span class="w-100">Son 30 gün</span>${u.tutar(giris, { isaret: true })}${u.tutar(-cikis, { isaret: true })}</span></div>
            <div><div class="grafik-kap kucuk"><canvas id="spark" role="img" aria-label="Son 90 günde bakiye değişimi"></canvas></div><div class="form-text mt-1">Son 90 gün, her işlemden sonraki bakiye</div></div>
          </div></section>
          <section class="panel" aria-labelledby="hb-baslik"><div class="panel-bas"><h2 id="hb-baslik">Hesap bilgileri</h2></div><div class="panel-govde">
            <dl class="dl-liste"><dt>Hesap tipi</dt><dd>${h.tip === 'YATIRIM' ? 'Yatırım' : 'Vadesiz'}</dd><dt>Açılış tarihi</dt><dd class="num">${u.tarih(h.acilis)}</dd>
              <dt>Şube kodu</dt><dd class="num">1001</dd><dt>Ek no</dt><dd class="num">${String(h.ek).padStart(2, '0')}</dd><dt>Toplam hareket</dt><dd class="num">${u.sayi(tum.length)}</dd></dl></div></section>
        </div>
        <section class="panel"><div class="sekmeler" role="tablist" aria-label="Hesap kayıtları">${sekmeler.map(([k, ad]) => `<button type="button" role="tab" id="t-${k}" aria-controls="tp" aria-selected="${sekme === k}" data-sekme="${k}">${ad}${k === 'portfoy' ? `<span class="sayi">${poz.length}</span>` : ''}</button>`).join('')}</div><div id="tp" role="tabpanel"></div></section>
      </div>`;
      const tp = kok.querySelector('#tp');
      function sekmeCiz(s) {
        kok.querySelectorAll('[data-sekme]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.sekme === s)));
        tp.setAttribute('aria-labelledby', 't-' + s);
        urlYaz(`/Hesap/Detay/${h.id}`, s === 'hareket' ? {} : { sekme: s });
        if (s === 'hareket') {
          tp.innerHTML = yirmi.length ? hareketTablo(yirmi, { kompakt: true }) + `<div class="panel-alt"><span>Son 20 hareket</span><a href="#/Hesap/Ekstre/${h.id}">Tüm hareketler: ekstre</a></div>`
            : u.bos({ ikon: 'receipt', baslik: 'Henüz hareket yok', metin: 'İlk işlemle birlikte hareketler burada listelenir.', eylem: h.aktif ? `<a class="btn btn-primary" href="#/Islem/Yeni?hesapId=${h.id}">İşlem yap</a>` : '' });
        } else if (s === 'portfoy') {
          if (!poz.length) { tp.innerHTML = u.bos({ ikon: 'chart-line-up', baslik: 'Portföy boş', metin: 'Bu yatırım hesabında açık hisse pozisyonu yok.', eylem: h.aktif ? `<a class="btn btn-primary" href="#/Islem/Yeni?hesapId=${h.id}&tip=ALIM">Hisse al</a>` : '' }); return; }
          let topD = 0; let topM = 0;
          tp.innerHTML = `<div class="tablo-kap"><table class="table tablo"><thead><tr><th scope="col">Hisse</th><th scope="col" class="num">Adet</th><th scope="col" class="num">Ort. maliyet</th><th scope="col" class="num">Temsili fiyat</th><th scope="col" class="num">Piyasa değeri</th><th scope="col" class="num">Kâr/zarar</th></tr></thead>
            <tbody>${poz.map(([kod, x]) => { const hs = db.hisseMap.get(kod); const deger = x.adet * hs.guncel; const kz = deger - x.maliyet; topD += deger; topM += x.maliyet;
              return `<tr><td><span class="mono fw-semibold">${kod}</span> <span class="text-secondary">${u.e(hs.ad)}</span></td><td class="num">${u.sayi(x.adet)}</td><td class="num">${u.para(Math.round(x.maliyet / x.adet))}</td><td class="num">${u.para(hs.guncel)}</td><td class="num">${u.para(deger)}</td>
              <td class="num">${u.tutar(kz, { isaret: true })} <span class="text-secondary">%${(x.maliyet ? (kz / x.maliyet) * 100 : 0).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}</span></td></tr>`; }).join('')}</tbody>
            <tfoot><tr><td colspan="4">Toplam</td><td class="num">${u.para(topD)}</td><td class="num">${u.tutar(topD - topM, { isaret: true })}</td></tr></tfoot></table></div>
            <div class="panel-alt"><span>Fiyatlar temsilidir; gerçek piyasa verisi kullanılmaz. VW_PORTFOY görünümünden okunur.</span></div>`;
        } else {
          const ozet = HM.hesapla.aylikOzet([h.id], db.bugun.getFullYear(), db.bugun.getMonth() + 1);
          tp.innerHTML = `<div class="panel-bas border-0"><div><h2>${u.ayYil(db.bugun)}</h2><div class="aciklama">PKG_RAPOR.AYLIK_OZET_HESAP sonucu</div></div><a class="btn btn-outline-secondary btn-sm" href="${HM.r.link('/Rapor/AylikOzet', { kapsam: 'hesap', id: h.id })}">Raporda aç</a></div>${HM.hesapla.ozetTablo(ozet)}`;
        }
      }
      kok.querySelector('.sekmeler').addEventListener('click', (e) => { const b = e.target.closest('[data-sekme]'); if (b) sekmeCiz(b.dataset.sekme); }, { signal: sinyal });
      kok.addEventListener('click', async (e) => {
        if (!e.target.closest('[data-hesap-pasif]')) return;
        const ok = await u.onay({ baslik: 'Hesap pasife alınsın mı?', govde: `<p class="mb-0"><span class="mono">${h.no}</span> pasife alınacak. Hareket geçmişi korunur, yeni işlem yapılamaz.</p>`, onayMetni: 'Pasife al', tehlikeli: true });
        if (!ok) return;
        try { api.hesapPasifeAl(h.id); HM.r.yenile(); u.toast('Hesap pasife alındı.'); } catch (err) { u.toast(err.message, { ikon: 'warning', hata: true }); }
      }, { signal: sinyal });
      sekmeCiz(sekme);
      // 90 günlük sparkline
      const bas90 = new Date(db.bugun.getTime() - 89 * db.GUN);
      const noktalar = [{ x: bas90, y: db.bakiyeTarihte(h.id, bas90) }, ...tum.filter((i) => i.zaman >= bas90).map((i) => ({ x: i.zaman, y: i.bakiyeSonra })), { x: new Date(), y: h.bakiye }];
      HM.grafik.bakiye(kok.querySelector('#spark'), noktalar, { kucuk: true });
      HM.iz.ekran('hesapDetay', { id: h.id, hareket: yirmi.length, yatirim: h.tip === 'YATIRIM', pozisyon: poz.length });
    }
  };
  V.hesapDetay.hareketTablo = hareketTablo;

  /* Yeni hesap */
  V.hesapYeni = {
    kirinti: () => [['Hesaplar', '#/Hesap'], ['Hesap aç', '']],
    ciz(kok, p, q, sinyal) {
      let musteri = q.musteriId ? db.musteri(q.musteriId) : null;
      if (musteri && !musteri.aktif) musteri = null;
      kok.innerHTML = u.sayfaBasligi({ baslik: 'Hesap aç', alt: 'Hesap numarası şube, müşteri no ve ek no ile oluşur.' }) +
        `<form class="panel form-dar" id="hf" novalidate><div id="hf-ozet"></div>
          <div class="alan-grubu"><h2>Hesap sahibi</h2>${HM.secici.html({ id: 'hf-musteri', etiket: 'Müşteri', zorunlu: true, yerTutucu: 'Ad veya müşteri no ile arayın', deger: musteri ? musteri.ad : '', yardim: 'Yalnız aktif müşteriler seçilebilir.' })}</div>
          <div class="alan-grubu"><h2>Hesap</h2>
            <fieldset><legend class="form-label">Hesap tipi<span class="zorunlu" aria-hidden="true">*</span></legend><div class="secim-kartlari">
              <div class="secim-kart"><input type="radio" name="htip" id="htip-v" value="VADESIZ" checked><label for="htip-v">${u.ikon('wallet')}<strong>Vadesiz</strong><span>Para yatırma, çekme ve hesaplar arası transfer.</span></label></div>
              <div class="secim-kart"><input type="radio" name="htip" id="htip-y" value="YATIRIM"><label for="htip-y">${u.ikon('chart-line-up')}<strong>Yatırım</strong><span>Bunlara ek olarak hisse alım ve satımı.</span></label></div></div></fieldset>
            <div class="alan"><label class="form-label" for="hf-no">Hesap no</label><input id="hf-no" class="form-control mono" readonly value="" aria-describedby="hf-no-yardim"><div class="form-text" id="hf-no-yardim">Şube kodu 1001, müşteri no ve sıradaki ek no. Kayıtta HESAP_NO olarak yazılır.</div></div>
            <div class="alan"><label class="form-label" for="hf-tutar">Açılış tutarı</label><div class="giris-grubu" style="max-width:240px"><span class="onek">₺</span><input id="hf-tutar" class="form-control tutar-girdi" inputmode="decimal" placeholder="0,00" aria-describedby="hf-tutar-yardim hf-tutar-hata"></div>
              <div class="form-text" id="hf-tutar-yardim">İsteğe bağlı. Girilirse "Açılış bakiyesi" açıklamalı bir YATIRMA işlemi oluşur; bakiye trigger ile güncellenir.</div><div class="invalid-feedback" id="hf-tutar-hata"></div></div>
          </div>
          <div class="form-eylem-cubugu"><a class="btn btn-ghost" href="${musteri ? `#/Musteri/Detay/${musteri.id}` : '#/Hesap'}">Vazgeç</a><button type="submit" class="btn btn-primary">Hesabı aç</button></div></form>`;
      const f = kok.querySelector('#hf');
      const noYaz = () => { f.querySelector('#hf-no').value = musteri ? api.hesapNoOnizle(musteri.id).no : 'Müşteri seçince oluşur'; };
      HM.secici.bagla(f, { id: 'hf-musteri', sinyal, ara: (x) => HM.ara.musteri(x || '', 8).map((m) => ({ id: m.id, deger: m, baslik: m.ad, alt: `${m.no}, ${m.tip === 'KURUMSAL' ? 'kurumsal' : 'bireysel'}`, pasif: !m.aktif, sag: m.aktif ? '' : '<span class="rozet rozet--pasif">Pasif</span>' })),
        sec: (o) => { musteri = o ? o.deger : null; noYaz(); f.querySelector('#hf-musteri').classList.remove('is-invalid'); } });
      noYaz();
      const tutarAlan = f.querySelector('#hf-tutar');
      tutarAlan.addEventListener('blur', () => { const k = u.tutarParse(tutarAlan.value); if (tutarAlan.value && !isNaN(k)) tutarAlan.value = u.tlGirdi(k); }, { signal: sinyal });
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const hatalar = [];
        if (!musteri) { f.querySelector('#hf-musteri').classList.add('is-invalid'); f.querySelector('#hf-musteri-hata').textContent = 'Listeden bir müşteri seçin.'; hatalar.push('hf-musteri'); }
        const k = tutarAlan.value.trim() ? u.tutarParse(tutarAlan.value) : 0;
        if (isNaN(k) || k < 0) { tutarAlan.classList.add('is-invalid'); f.querySelector('#hf-tutar-hata').textContent = 'Tutarı 1.250,00 biçiminde, en fazla 2 ondalıkla girin.'; hatalar.push('hf-tutar'); }
        else tutarAlan.classList.remove('is-invalid');
        if (hatalar.length) { f.querySelector('#' + hatalar[0]).focus(); return; }
        try {
          const r = api.hesapAc({ musteriId: musteri.id, tip: f.querySelector('[name="htip"]:checked').value, acilisTutar: k });
          kok.innerHTML = u.sayfaBasligi({ baslik: 'Hesap açıldı' }) + `<section class="panel form-dar"><div class="bos-durum"><div class="ikon-kap" style="color:var(--credit)">${u.ikon('check-circle')}</div>
            <h3>Hesap açıldı: <span class="mono">${r.hesap.no}</span></h3><p>${u.e(musteri.ad)} için ${r.hesap.tip === 'YATIRIM' ? 'yatırım' : 'vadesiz'} hesap oluşturuldu.${r.islem ? ` Açılış bakiyesi ${u.para(r.islem.tutar)} olarak işlendi.` : ''}</p>
            <div class="d-flex gap-2"><a class="btn btn-outline-secondary" href="#/Hesap/Detay/${r.hesap.id}">Hesaba git</a><a class="btn btn-primary" href="#/Islem/Yeni?hesapId=${r.hesap.id}">İlk işlemi yap</a></div></div></section>`;
        } catch (err) { u.toast(err.message, { ikon: 'warning', hata: true }); }
      }, { signal: sinyal });
    }
  };

  /* Ekstre */
  function aralik(on) {
    const b = db.bugun;
    if (on === 'gecen') return [new Date(b.getFullYear(), b.getMonth() - 1, 1), new Date(b.getFullYear(), b.getMonth(), 0)];
    if (on === 'uc') return [new Date(b.getFullYear(), b.getMonth() - 2, 1), b];
    return [new Date(b.getFullYear(), b.getMonth(), 1), b];
  }
  V.ekstre = {
    kirinti: (p) => { const h = p.id && db.hesap(p.id); return h ? [['Hesaplar', '#/Hesap'], [h.no, `#/Hesap/Detay/${h.id}`], ['Ekstre', '']] : [['Ekstre', '']]; },
    ciz(kok, p, q, sinyal) {
      if (!p.id) {
        const son = HM.durum.sonHesapId && db.hesap(HM.durum.sonHesapId);
        kok.innerHTML = u.sayfaBasligi({ baslik: 'Hesap ekstresi', alt: 'Bir hesabın tarih aralığındaki tüm hareketleri ve yürüyen bakiyesi.' }) +
          `<section class="panel form-dar"><div class="alan-grubu">${HM.secici.html({ id: 'e-hesap', etiket: 'Hesap', yerTutucu: 'Hesap no veya müşteri adı', yardim: son ? `Son görüntülenen: <a href="#/Hesap/Ekstre/${son.id}" class="mono">${son.no}</a>` : 'Pasif hesapların ekstresi de görüntülenebilir.' })}</div></section>`;
        HM.secici.bagla(kok, { id: 'e-hesap', sinyal, ara: (x) => HM.ara.hesap(x || '', { n: 8 }).map((h) => Object.assign(HM.secici.hesapOgesi(h), { mono: true })), sec: (o) => { if (o) location.hash = `#/Hesap/Ekstre/${o.id}`; } });
        return;
      }
      const h = db.hesap(p.id); if (!h) { V.bulunamadi.ciz(kok); return; }
      HM.durum.sonHesapId = h.id;
      const m = db.musteri(h.musteriId);
      const on = ['bu', 'gecen', 'uc', 'ozel'].includes(q.on) ? q.on : (q.bas || q.bit ? 'ozel' : 'bu');
      let [bas, bit] = aralik(on);
      if (on === 'ozel') { bas = u.gunParse(q.bas) || bas; bit = u.gunParse(q.bit) || bit; }
      if (bas > bit) [bas, bit] = [bit, bas];
      const bitSon = new Date(bit.getTime() + db.GUN);
      const tipler = (q.tip || '').split(',').filter((t) => u.ISLEM_TIPI[t]);
      const tum = db.hesapIslemleri(h.id).filter((i) => i.zaman >= bas && i.zaman < bitSon);
      const satirlar = tipler.length ? tum.filter((i) => tipler.includes(i.tip)) : tum;
      const acilis = db.bakiyeTarihte(h.id, bas);
      const giris = tum.filter((i) => db.isaret(i.tip) > 0).reduce((s, i) => s + i.tutar, 0);
      const cikis = tum.filter((i) => db.isaret(i.tip) < 0).reduce((s, i) => s + i.tutar, 0);
      const kapanis = acilis + giris - cikis;
      const presetler = [['bu', 'Bu ay'], ['gecen', 'Geçen ay'], ['uc', 'Son 3 ay'], ['ozel', 'Özel']];
      kok.innerHTML = `<div class="baski-bas"><div><strong>Demo Menkul Değerler A.Ş. (kurgusal)</strong><br>Hesap ekstresi</div><div class="text-end mono">${h.no}<br>${u.tarih(bas)} - ${u.tarih(bit)}</div></div>` +
        u.sayfaBasligi({ baslik: 'Hesap ekstresi', alt: `<a class="mono" href="#/Hesap/Detay/${h.id}">${h.no}</a><a href="#/Musteri/Detay/${m.id}">${u.e(m.ad)}</a>${u.hesapTipRozet(h.tip)}<span>${u.tarih(bas)} - ${u.tarih(bit)}</span>`,
          eylemler: `<button type="button" class="btn btn-outline-secondary" data-csv>${u.ikon('file-csv', 'ic-16')}CSV</button><button type="button" class="btn btn-outline-secondary" data-baski>${u.ikon('printer', 'ic-16')}Yazdır</button>` }) +
        `<section class="panel mb-3"><div class="filtre-cubugu">
          <div class="segment" role="radiogroup" aria-label="Dönem">${presetler.map(([k, ad]) => `<input type="radio" name="e-on" id="e-on-${k}" value="${k}"${on === k ? ' checked' : ''}><label for="e-on-${k}">${ad}</label>`).join('')}</div>
          <div class="d-flex align-items-center gap-2"><label class="visually-hidden" for="e-bas">Başlangıç</label><input type="date" id="e-bas" class="form-control" value="${u.isoGun(bas)}" max="${u.isoGun(db.bugun)}">
          <span class="text-secondary">-</span><label class="visually-hidden" for="e-bit">Bitiş</label><input type="date" id="e-bit" class="form-control" value="${u.isoGun(bit)}" max="${u.isoGun(db.bugun)}"></div>
          <div class="dropdown"><button type="button" class="btn btn-outline-secondary btn-sm" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false">${u.ikon('funnel-simple', 'ic-16')}${tipler.length ? `${tipler.length} işlem tipi` : 'Tüm işlem tipleri'}</button>
            <div class="dropdown-menu p-2" style="min-width:220px">${Object.entries(u.ISLEM_TIPI).map(([k, t]) => `<div class="form-check dropdown-item"><input class="form-check-input" type="checkbox" id="et-${k}" value="${k}"${tipler.includes(k) ? ' checked' : ''} data-tip-filtre><label class="form-check-label flex-grow-1" for="et-${k}">${t.ad}</label></div>`).join('')}</div></div>
        </div>
        <div class="kpi-serit"><div class="kpi"><span class="etiket">Dönem başı bakiye</span><span class="deger tutar">${u.para(acilis)}</span></div>
          <div class="kpi"><span class="etiket">Toplam giriş</span><span class="deger">${u.tutar(giris, { isaret: true })}</span><span class="ek">${tum.filter((i) => db.isaret(i.tip) > 0).length} işlem</span></div>
          <div class="kpi"><span class="etiket">Toplam çıkış</span><span class="deger">${u.tutar(-cikis, { isaret: true })}</span><span class="ek">${tum.filter((i) => db.isaret(i.tip) < 0).length} işlem</span></div>
          <div class="kpi"><span class="etiket">Dönem sonu bakiye</span><span class="deger tutar">${u.para(kapanis)}</span></div></div></section>
        <section class="panel" id="e-tablo"></section>
        <p class="demo-not mt-2">${tipler.length ? 'Tip filtresi uygulandı; özet ve yürüyen bakiye tüm işlemleri içerir. ' : ''}Dönem başı + giriş - çıkış = dönem sonu. Demo belgesidir.</p>`;
      const alan = kok.querySelector('#e-tablo');
      if (!HM.hesapla.durumAlani(alan, 7)) {
        if (!satirlar.length || HM.demo.durum === 'bos') alan.innerHTML = u.bos({ ikon: 'calendar-blank', baslik: 'Bu aralıkta hareket yok', metin: 'Tarih aralığını genişletin veya tip filtresini kaldırın.', eylem: '<button type="button" class="btn btn-outline-secondary" data-genislet>Son 3 ayı göster</button>' });
        else { let onceki = ''; alan.innerHTML = hareketTablo(satirlar, { saatYalniz: true, gunAyrac: (i) => { const g = u.isoGun(i.zaman); const yeni = g !== onceki; onceki = g; return yeni; } }); }
      }
      const git = (degis) => HM.r.git(`/Hesap/Ekstre/${h.id}`, Object.assign({ on, bas: on === 'ozel' ? u.isoGun(bas) : '', bit: on === 'ozel' ? u.isoGun(bit) : '', tip: tipler.join(',') }, degis), { replace: true });
      kok.querySelectorAll('[name="e-on"]').forEach((r) => r.addEventListener('change', () => { if (r.value === 'ozel') git({ on: 'ozel', bas: u.isoGun(bas), bit: u.isoGun(bit) }); else git({ on: r.value, bas: '', bit: '' }); }, { signal: sinyal }));
      ['e-bas', 'e-bit'].forEach((id) => kok.querySelector('#' + id).addEventListener('change', () => git({ on: 'ozel', bas: kok.querySelector('#e-bas').value, bit: kok.querySelector('#e-bit').value }), { signal: sinyal }));
      kok.addEventListener('change', (e) => { if (e.target.matches('[data-tip-filtre]')) git({ tip: [...kok.querySelectorAll('[data-tip-filtre]:checked')].map((x) => x.value).join(',') }); }, { signal: sinyal });
      kok.addEventListener('click', (e) => {
        if (e.target.closest('[data-genislet]')) git({ on: 'uc', tip: '' });
        else if (e.target.closest('[data-csv]')) u.csvGoster(`ekstre-${h.no}-${u.isoGun(bas)}-${u.isoGun(bit)}.csv`, [['ISLEM_ID', 'ISLEM_TARIHI', 'ISLEM_TIPI', 'ACIKLAMA', 'KARSI_HESAP_NO', 'TUTAR', 'BAKIYE'],
          ...satirlar.map((i) => [i.id, u.tarihSaat(i.zaman), i.tip, i.aciklama, i.karsiHesapId ? db.hesap(i.karsiHesapId).no : '', u.tlGirdi(db.isaret(i.tip) * i.tutar), u.tlGirdi(i.bakiyeSonra)])]);
      }, { signal: sinyal });
      HM.iz.ekran('ekstre', { id: h.id, bas: u.tarih(bas), bit: u.tarih(bit), acilis: (acilis / 100).toFixed(2), satir: satirlar.length });
    }
  };
})();
