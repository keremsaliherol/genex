/* IslemController: Yeni (işlem ekranı) ve Dekont */
(function () {
  'use strict';
  const HM = window.HM; const u = HM.u; const db = HM.db; const api = HM.api;
  const V = HM.views;

  const TIPLER = [['YATIRMA', 'Para yatır', 'arrow-down-left'], ['CEKME', 'Para çek', 'arrow-up-right'], ['TRANSFER', 'Transfer', 'arrows-left-right'], ['ALIM', 'Hisse al', 'trend-up'], ['SATIM', 'Hisse sat', 'trend-down']];
  const HISSE = (t) => t === 'ALIM' || t === 'SATIM';

  V.islemYeni = {
    kirinti: () => [['İşlem yap', '#/Islem/Yeni']],
    ciz(kok, p, q, sinyal) {
      let hesap = q.hesapId ? db.hesap(q.hesapId) : null;
      if (hesap && !hesap.aktif) hesap = null;
      let hedef = null;
      let tip = TIPLER.some(([t]) => t === q.tip) ? q.tip : 'YATIRMA';
      if (HISSE(tip) && hesap && hesap.tip !== 'YATIRIM') tip = 'YATIRMA';
      const dokunulan = new Set();
      let zorla = false;

      kok.innerHTML = u.sayfaBasligi({ baslik: 'İşlem yap', alt: 'Her işlem PKG_ISLEM paketinden geçer; bakiye trigger ile güncellenir.' }) +
        `<div class="izgara-7-5"><form class="panel" id="if" novalidate>
          <div id="if-uyari"></div>
          <div class="alan-grubu"><h2>Hesap</h2>${HM.secici.html({ id: 'i-hesap', etiket: 'Kaynak hesap', zorunlu: true, yerTutucu: 'Hesap no veya müşteri adı', deger: hesap ? hesap.no : '', yardim: 'Pasif hesaplar listede seçilemez.' })}<div id="i-secili"></div></div>
          <div class="alan-grubu"><h2 id="tip-baslik">İşlem tipi</h2><div class="segment segment-buyuk" role="radiogroup" aria-labelledby="tip-baslik">
            ${TIPLER.map(([t, ad, ik]) => `<input type="radio" name="itip" id="itip-${t}" value="${t}"${t === tip ? ' checked' : ''}><label for="itip-${t}">${u.ikon(ik, 'ic-16')}${ad}</label>`).join('')}</div>
            <div class="form-text" id="tip-not"></div></div>
          <div class="alan-grubu" id="i-alanlar"></div>
          <div class="form-eylem-cubugu"><span class="durum-metni">Onaydan önce özet gösterilir.</span><a class="btn btn-ghost" href="${hesap ? `#/Hesap/Detay/${hesap.id}` : '#/'}">Vazgeç</a></div>
        </form>
        <aside class="panel onizleme" aria-labelledby="oniz-baslik"><div class="panel-bas"><h2 id="oniz-baslik">Önizleme</h2><span class="aciklama" id="oniz-alt"></span></div>
          <div id="oniz" aria-live="polite"></div>
          <div class="p-3 border-top d-grid gap-2"><button type="submit" form="if" class="btn btn-primary" id="i-onayla">İşlemi onayla</button><div id="i-zorla"></div></div></aside></div>`;

      const f = kok.querySelector('#if'); const alanlar = kok.querySelector('#i-alanlar');
      const deger = () => {
        const g = (id) => { const el = f.querySelector('#' + id); return el ? el.value : ''; };
        const hs = db.hisseMap.get(g('i-hisse'));
        const adet = parseInt(g('i-adet'), 10);
        return { tip, hesapId: hesap && hesap.id, hedefId: hedef && hedef.id, tutar: HISSE(tip) ? (hs && adet > 0 ? hs.guncel * adet : NaN) : u.tutarParse(g('i-tutar')), aciklama: g('i-aciklama').trim(), hisse: hs && hs.kod, adet };
      };
      function hatalar(v) {
        const h = {};
        if (!hesap) h['i-hesap'] = 'Listeden bir hesap seçin.';
        if (tip === 'TRANSFER') { if (!hedef) h['i-hedef'] = 'Hedef hesabı seçin.'; else if (hesap && hedef.id === hesap.id) h['i-hedef'] = 'Aynı hesaba transfer yapılamaz.'; }
        if (HISSE(tip)) {
          if (!v.hisse) h['i-hisse'] = 'Bir hisse seçin.';
          if (!(v.adet >= 1)) h['i-adet'] = 'Adet 1 veya daha büyük tam sayı olmalı.';
          else if (hesap && tip === 'ALIM' && v.tutar > hesap.bakiye) h['i-adet'] = `Yetersiz bakiye. Kullanılabilir: ${u.para(hesap.bakiye)}`;
          else if (hesap && tip === 'SATIM' && v.hisse) { const poz = hesap.portfoy[v.hisse] ? hesap.portfoy[v.hisse].adet : 0; if (v.adet > poz) h['i-adet'] = `Satılabilir adet: ${u.sayi(poz)}`; }
        } else {
          const ham = (f.querySelector('#i-tutar') || {}).value || '';
          if (!ham.trim()) h['i-tutar'] = 'Tutarı girin.';
          else if (isNaN(v.tutar)) h['i-tutar'] = 'Tutarı 1.250,00 biçiminde, en fazla 2 ondalıkla girin.';
          else if (v.tutar <= 0) h['i-tutar'] = 'Tutar sıfırdan büyük olmalı.';
          else if (hesap && (tip === 'CEKME' || tip === 'TRANSFER') && v.tutar > hesap.bakiye) h['i-tutar'] = `Yetersiz bakiye. Kullanılabilir: ${u.para(hesap.bakiye)}`;
        }
        return h;
      }

      function seciliCiz() {
        const el = kok.querySelector('#i-secili');
        if (!hesap) { el.innerHTML = ''; return; }
        const m = db.musteri(hesap.musteriId);
        el.innerHTML = `<div class="secili-hesap"><span>${u.e(m.ad)}, ${hesap.tip === 'YATIRIM' ? 'yatırım' : 'vadesiz'}</span><span>Kullanılabilir bakiye <strong class="tutar">${u.para(hesap.bakiye)}</strong></span></div>`;
      }
      function tipKisitla() {
        const vadesiz = hesap && hesap.tip !== 'YATIRIM';
        ['ALIM', 'SATIM'].forEach((t) => { f.querySelector('#itip-' + t).disabled = !!vadesiz; });
        f.querySelector('#tip-not').textContent = vadesiz ? 'Hisse işlemleri yalnız yatırım hesabında yapılır.' : '';
        if (vadesiz && HISSE(tip)) { tip = 'YATIRMA'; f.querySelector('#itip-YATIRMA').checked = true; alanCiz(); }
      }
      function alanCiz() {
        const tutarAlani = `<div class="alan"><label class="form-label" for="i-tutar">Tutar<span class="zorunlu" aria-hidden="true">*</span></label><div class="giris-grubu" style="max-width:260px"><span class="onek">₺</span><input id="i-tutar" class="form-control tutar-girdi" inputmode="decimal" placeholder="0,00" autocomplete="off" aria-describedby="i-tutar-hata"></div><div class="invalid-feedback" id="i-tutar-hata"></div></div>`;
        const aciklama = `<div class="alan"><label class="form-label" for="i-aciklama">Açıklama</label><input id="i-aciklama" class="form-control" maxlength="300" placeholder="${tip === 'TRANSFER' ? 'Örnek: Kira ödemesi, Eylül' : 'Örnek: Nakit yatırma, Kadıköy şube'}" aria-describedby="i-aciklama-sayac"><div class="form-text d-flex justify-content-between"><span>ACIKLAMA, en fazla 300 karakter.</span><span id="i-aciklama-sayac" class="num">0/300</span></div></div>`;
        if (HISSE(tip)) {
          const secenek = db.hisseler.filter((h) => tip === 'ALIM' || (hesap && hesap.portfoy[h.kod]));
          alanlar.innerHTML = `<h2>Hisse</h2><div class="alan-satir">
            <div class="alan"><label class="form-label" for="i-hisse">Hisse<span class="zorunlu" aria-hidden="true">*</span></label><select id="i-hisse" class="form-select" aria-describedby="i-hisse-hata"><option value="">Seçin</option>
              ${secenek.map((h) => `<option value="${h.kod}">${h.kod}, ${u.e(h.ad)} (${u.para(h.guncel)}${tip === 'SATIM' ? `, ${u.sayi(hesap.portfoy[h.kod].adet)} adet` : ''})</option>`).join('')}</select><div class="invalid-feedback" id="i-hisse-hata"></div>
              ${tip === 'SATIM' && !secenek.length ? '<div class="form-text">Bu hesapta satılabilir pozisyon yok.</div>' : ''}</div>
            <div class="alan"><label class="form-label" for="i-adet">Adet<span class="zorunlu" aria-hidden="true">*</span></label><input id="i-adet" class="form-control mono" type="number" min="1" step="1" inputmode="numeric" aria-describedby="i-adet-hata" style="max-width:160px"><div class="invalid-feedback" id="i-adet-hata"></div></div></div>
            <div class="alan"><label class="form-label" for="i-hesaplanan">Hesaplanan tutar</label><input id="i-hesaplanan" class="form-control mono" readonly style="max-width:260px"><div class="form-text">Adet × temsili fiyat. Fiyatlar gerçek piyasa verisi değildir.</div></div>`;
        } else {
          alanlar.innerHTML = `<h2>${tip === 'TRANSFER' ? 'Transfer' : 'Tutar'}</h2>${tip === 'TRANSFER' ? HM.secici.html({ id: 'i-hedef', etiket: 'Hedef hesap', zorunlu: true, yerTutucu: 'Hesap no veya müşteri adı', yardim: 'Başka bir müşterinin hesabı da olabilir.' }) : ''}${tutarAlani}${aciklama}`;
          if (tip === 'TRANSFER') HM.secici.bagla(alanlar, { id: 'i-hedef', sinyal, ara: (x) => HM.ara.hesap(x || '', { n: 8, haric: hesap && hesap.id }).map((h) => HM.secici.hesapOgesi(h, { pasifFn: (hh) => !hh.aktif || !db.musteri(hh.musteriId).aktif })), sec: (o) => { hedef = o ? o.deger : null; guncelle(); } });
          hedef = null;
        }
        guncelle();
      }

      function hataYaz(h) {
        f.querySelectorAll('.is-invalid').forEach((el) => { el.classList.remove('is-invalid'); el.removeAttribute('aria-invalid'); });
        Object.entries(h).forEach(([id, msg]) => {
          const el = f.querySelector('#' + id); if (!el) return;
          const goster = dokunulan.has(id);
          if (goster) { el.classList.add('is-invalid'); el.setAttribute('aria-invalid', 'true'); }
          const he = f.querySelector(`#${id}-hata`); if (he) he.textContent = goster ? msg : '';
        });
        f.querySelectorAll('.invalid-feedback').forEach((he) => { const id = he.id.replace(/-hata$/, ''); if (!h[id] || !dokunulan.has(id)) he.textContent = ''; });
      }
      function satir(h, islemTip, tutar, sonra, poz) {
        const m = db.musteri(h.musteriId);
        return `<div class="defter-satir"><div><div class="hesap">${h.no}</div><div class="kim">${u.e(m.ad)}</div></div><div class="text-end">${u.islemRozet(islemTip)}<div class="mt-1">${u.tutar(db.isaret(islemTip) * tutar, { isaret: true })}</div></div>
          <div class="bakiye-gecis"><span>${u.para(h.bakiye)}</span>${u.ikon('arrow-right', 'ic-14')}<span class="sonra">${u.para(sonra)}</span>${poz || ''}</div></div>`;
      }
      function guncelle() {
        const v = deger(); const h = hatalar(v);
        hataYaz(h);
        const oniz = kok.querySelector('#oniz'); const alt = kok.querySelector('#oniz-alt');
        const hesaplanan = f.querySelector('#i-hesaplanan'); if (hesaplanan) hesaplanan.value = isNaN(v.tutar) ? '' : u.para(v.tutar);
        const sayac = f.querySelector('#i-aciklama-sayac'); if (sayac) sayac.textContent = `${v.aciklama.length}/300`;
        const gecerliTutar = !isNaN(v.tutar) && v.tutar > 0;
        if (!hesap) { oniz.innerHTML = u.bos({ ikon: 'wallet', baslik: 'Hesap seçin', metin: 'Önizleme; işlemin hangi kayıtları oluşturacağını ve bakiyeyi nasıl değiştireceğini gösterir.' }); alt.textContent = ''; }
        else if (tip === 'TRANSFER') {
          alt.textContent = 'Transfer, çift kayıt';
          const t = gecerliTutar ? v.tutar : 0;
          oniz.innerHTML = `<div class="defter">${satir(hesap, 'TRANSFER_GIDEN', t, hesap.bakiye - t)}${hedef ? satir(hedef, 'TRANSFER_GELEN', t, hedef.bakiye + t) : '<div class="defter-satir"><div class="kim">Hedef hesap seçilmedi</div></div>'}</div>
            <div class="atomik-not">${u.ikon('lock-simple', 'ic-16')}<span>İki kayıt tek transaction içinde yazılır ya da hiçbiri yazılmaz. Kayıtlar aynı referans numarasıyla bağlanır.</span></div>`;
        } else {
          const t = gecerliTutar ? v.tutar : 0; const islemTip = tip;
          let poz = '';
          if (HISSE(tip) && v.hisse) { const once = hesap.portfoy[v.hisse] ? hesap.portfoy[v.hisse].adet : 0; const sonra = once + (tip === 'ALIM' ? 1 : -1) * (v.adet > 0 ? v.adet : 0); poz = `<span class="ms-2">${v.hisse}: ${u.sayi(once)} → ${u.sayi(Math.max(0, sonra))} adet</span>`; }
          alt.textContent = u.ISLEM_TIPI[islemTip].ad;
          oniz.innerHTML = `<div class="defter">${satir(hesap, islemTip, t, hesap.bakiye + db.isaret(islemTip) * t, poz)}</div>
            <div class="atomik-not">${u.ikon('database', 'ic-16')}<span>${HISSE(tip) ? `PKG_ISLEM.${tip === 'ALIM' ? 'HISSE_AL' : 'HISSE_SAT'}` : `PKG_ISLEM.${tip === 'YATIRMA' ? 'YATIR' : 'CEK'}`} bir ISLEM kaydı ekler; TRG_ISLEM_BAKIYE_GUNCELLE bakiyeyi günceller.</span></div>`;
        }
        const yetersiz = Object.values(h).some((m) => m.startsWith('Yetersiz'));
        kok.querySelector('#i-zorla').innerHTML = yetersiz && dokunulan.size ? '<button type="button" class="btn btn-ghost btn-sm w-100" data-zorla>Yine de gönder: veritabanı kontrolünü göster</button>' : '';
        return h;
      }

      async function gonder() {
        const v = deger();
        const h = hatalar(v); const uyari = kok.querySelector('#if-uyari'); uyari.innerHTML = '';
        if (!zorla && Object.keys(h).length) { Object.keys(h).forEach((k) => dokunulan.add(k)); guncelle(); const ilk = f.querySelector('#' + Object.keys(h)[0]); if (ilk) ilk.focus(); return; }
        const m = db.musteri(hesap.musteriId);
        const ozet = `<dl class="dl-liste"><dt>İşlem</dt><dd>${u.ISLEM_TIPI[tip === 'TRANSFER' ? 'TRANSFER_GIDEN' : tip].ad}</dd><dt>Hesap</dt><dd><span class="mono">${hesap.no}</span><br><span class="text-secondary">${u.e(m.ad)}</span></dd>
          ${tip === 'TRANSFER' ? `<dt>Hedef</dt><dd>${hedef ? `<span class="mono">${hedef.no}</span><br><span class="text-secondary">${u.e(db.musteri(hedef.musteriId).ad)}</span>` : '<span class="text-secondary">Seçilmedi</span>'}</dd>` : ''}
          ${HISSE(tip) ? `<dt>Hisse</dt><dd class="mono">${v.hisse} × ${u.sayi(v.adet)}</dd>` : ''}<dt>Tutar</dt><dd class="tutar fw-semibold">${isNaN(v.tutar) ? '-' : u.para(v.tutar)}</dd>${v.aciklama ? `<dt>Açıklama</dt><dd>${u.e(v.aciklama)}</dd>` : ''}</dl>`;
        const ok = await u.onay({ baslik: 'İşlemi onaylıyor musunuz?', govde: ozet + (zorla ? '<div class="uyari uyari--uyari mt-3">' + u.ikon('warning') + '<p>İstemci doğrulaması atlanıyor. Veritabanının işlemi nasıl reddettiğini görmek için gönderiliyor.</p></div>' : ''), onayMetni: 'Onayla ve gönder' });
        if (!ok) { zorla = false; return; }
        const btn = kok.querySelector('#i-onayla'); btn.disabled = true; btn.innerHTML = '<span class="yukleniyor-nokta" aria-hidden="true"></span>İşleniyor';
        await new Promise((r) => setTimeout(r, 450));
        btn.disabled = false; btn.textContent = 'İşlemi onayla';
        try {
          const r = api.islem(Object.assign({}, v, { tip }));
          location.hash = `#/Islem/Dekont/${r.islem.id}`;
          setTimeout(() => u.toast('İşlem tamamlandı. Dekont oluşturuldu.'), 30);
        } catch (err) {
          if (!(err instanceof api.OraHata)) throw err;
          uyari.innerHTML = `<div class="p-3 pb-0">${u.hataUyari({ baslik: 'İşlem veritabanında reddedildi.', metin: `${err.message} Hiçbir kayıt yazılmadı, bakiyeler değişmedi.`, kod: `${err.kod}: ${err.message} (PKG_ISLEM, RAISE_APPLICATION_ERROR)`, eylem: '<button type="button" class="btn btn-outline-secondary btn-sm" data-iz-ac>Oracle izini aç</button>' })}</div>`;
          uyari.querySelector('[role="alert"]').scrollIntoView({ block: 'nearest' });
        } finally { zorla = false; }
      }

      HM.secici.bagla(f, { id: 'i-hesap', sinyal, ara: (x) => HM.ara.hesap(x || '', { n: 8 }).map((h) => HM.secici.hesapOgesi(h, { pasifFn: (hh) => !hh.aktif || !db.musteri(hh.musteriId).aktif })),
        sec: (o) => { hesap = o ? o.deger : null; seciliCiz(); tipKisitla(); if (HISSE(tip) || tip === 'TRANSFER') alanCiz(); else guncelle(); } });
      f.addEventListener('change', (e) => { if (e.target.name === 'itip') { tip = e.target.value; alanCiz(); } else guncelle(); }, { signal: sinyal });
      f.addEventListener('input', (e) => { if (e.target.name !== 'itip') guncelle(); }, { signal: sinyal });
      f.addEventListener('focusout', (e) => {
        if (!e.target.id || e.target.id === 'i-hesap' || e.target.id === 'i-hedef') { if (e.target.id) setTimeout(() => { dokunulan.add(e.target.id); guncelle(); }, 150); return; }
        if (e.target.id === 'i-tutar') { const k = u.tutarParse(e.target.value); if (!isNaN(k) && k > 0) e.target.value = u.tlGirdi(k); }
        if (e.target.value) dokunulan.add(e.target.id);
        guncelle();
      }, { signal: sinyal });
      f.addEventListener('submit', (e) => { e.preventDefault(); gonder(); }, { signal: sinyal });
      kok.addEventListener('click', (e) => { if (e.target.closest('[data-zorla]')) { zorla = true; gonder(); } }, { signal: sinyal });
      seciliCiz(); tipKisitla(); alanCiz();
      (hesap ? (f.querySelector('#i-tutar') || f.querySelector('#i-hisse')) : f.querySelector('#i-hesap')).focus();
    }
  };

  /* Dekont */
  V.dekont = {
    kirinti: (p) => [['İşlem yap', '#/Islem/Yeni'], [`Dekont ${p.id}`, '']],
    ciz(kok, p) {
      const i = db.islemler.find((x) => x.id === p.id);
      if (!i) { V.bulunamadi.ciz(kok); return; }
      const h = db.hesap(i.hesapId); const m = db.musteri(h.musteriId);
      const cift = i.ref ? db.islemler.filter((x) => x.ref === i.ref).sort((a, b) => a.id - b.id) : [i];
      const k = i.karsiHesapId ? db.hesap(i.karsiHesapId) : null;
      const zaman = `${u.tarih(i.zaman)} ${u.saatSn(i.zaman)}.${String(i.zaman.getMilliseconds()).padStart(3, '0')}`;
      kok.innerHTML = `<div class="baski-bas"><div><strong>Demo Menkul Değerler A.Ş. (kurgusal)</strong><br>İşlem dekontu</div><div class="text-end mono">No ${i.id}<br>${u.tarihSaat(i.zaman)}</div></div>` +
        u.sayfaBasligi({ baslik: 'İşlem dekontu', alt: `<span class="mono">İşlem no ${i.id}</span>${u.islemRozet(i.tip)}`,
          eylemler: `<button type="button" class="btn btn-outline-secondary" data-baski>${u.ikon('printer', 'ic-16')}Yazdır</button><a class="btn btn-outline-secondary" href="#/Hesap/Detay/${h.id}">Hesaba git</a>${h.aktif ? `<a class="btn btn-primary" href="#/Islem/Yeni?hesapId=${h.id}">Yeni işlem</a>` : ''}` }) +
        `<section class="panel dekont"><div class="dekont-bas"><div><h2>${u.ISLEM_TIPI[i.tip].ad}</h2><div class="form-text m-0">${u.e(i.aciklama)}</div></div><div class="text-end"><div class="dekont-tutar">${u.para(i.tutar)}</div><div class="form-text m-0">${db.isaret(i.tip) > 0 ? 'Hesaba giriş' : 'Hesaptan çıkış'}</div></div></div>
          <dl class="dl-liste"><dt>İşlem zamanı</dt><dd class="num">${zaman}</dd>${i.ref ? `<dt>Referans no</dt><dd class="num">${i.ref}</dd>` : ''}
            <dt>Hesap</dt><dd><a class="mono" href="#/Hesap/Detay/${h.id}">${h.no}</a><br><span class="text-secondary">${u.e(m.ad)}, ${m.no}</span></dd>
            ${k ? `<dt>Karşı hesap</dt><dd><a class="mono" href="#/Hesap/Detay/${k.id}">${k.no}</a><br><span class="text-secondary">${u.e(db.musteri(k.musteriId).ad)}</span></dd>` : ''}
            ${i.hisse ? `<dt>Hisse</dt><dd class="num">${i.hisse}, ${u.sayi(i.adet)} adet × ${u.para(i.fiyat)} (temsili)</dd>` : ''}
            <dt>İşlem sonrası bakiye</dt><dd class="num fw-semibold">${u.para(i.bakiyeSonra)}</dd></dl>
          ${cift.length > 1 ? `<div class="panel-bas border-top"><div><h2>Oluşan kayıtlar</h2><div class="aciklama">${cift.length} kayıt, tek transaction, aynı referans</div></div></div>
            <div class="tablo-kap"><table class="table tablo"><thead><tr><th scope="col">ISLEM_ID</th><th scope="col">Hesap</th><th scope="col">Tip</th><th scope="col" class="num">Tutar</th><th scope="col" class="num">Sonraki bakiye</th></tr></thead>
            <tbody>${cift.map((x) => `<tr${x.id === i.id ? ' class="table-active"' : ''}><td class="num">${x.id}</td><td class="mono">${db.hesap(x.hesapId).no}</td><td>${u.islemRozet(x.tip)}</td><td class="num">${u.islemTutar(x)}</td><td class="num">${u.tutar(x.bakiyeSonra)}</td></tr>`).join('')}</tbody></table></div>` : ''}
          <div class="panel-alt"><span>Bu dekont demo amaçlıdır; kurgusal veriler içerir.</span><button type="button" class="btn btn-ghost btn-sm baski-gizle" data-iz-ac>${u.ikon('database', 'ic-16')}Oracle izi</button></div></section>`;
      HM.iz.ekle({ katman: 'EF Core', baslik: 'Dekont kaydı', satir: cift.length,
        sql: i.ref ? 'SELECT i."ISLEM_ID", i."HESAP_ID", i."ISLEM_TIPI", i."TUTAR", i."ISLEM_TARIHI", i."ACIKLAMA", i."KARSI_HESAP_ID"\nFROM "ISLEM" i\nWHERE i."REFERANS_NO" = :p0\nORDER BY i."ISLEM_ID"' : 'SELECT i."ISLEM_ID", i."HESAP_ID", i."ISLEM_TIPI", i."TUTAR", i."ISLEM_TARIHI", i."ACIKLAMA"\nFROM "ISLEM" i\nWHERE i."ISLEM_ID" = :p0',
        binds: { p0: i.ref || i.id } });
    }
  };
})();
