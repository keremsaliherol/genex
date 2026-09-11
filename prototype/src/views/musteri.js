/* MusteriController: Index, Detay, Yeni, Duzenle */
(function () {
  'use strict';
  const HM = window.HM; const u = HM.u; const db = HM.db; const api = HM.api;
  const V = HM.views;

  const urlYaz = (yol, q) => { try { history.replaceState(null, '', HM.r.link(yol, q)); } catch (e) { /* sandbox */ } };
  const kucuk = (s) => String(s).toLocaleLowerCase('tr-TR');

  /* Ortak hesaplamalar (rapor ekranı da kullanır) */
  HM.hesapla = {
    aylikOzet(hesapIdler, yil, ay) {
      const bas = new Date(yil, ay - 1, 1); const bit = new Date(yil, ay, 1);
      const m = new Map(Object.keys(u.ISLEM_TIPI).map((t) => [t, { tip: t, adet: 0, toplam: 0 }]));
      for (const id of hesapIdler) for (const i of db.hesapIslemleri(id)) if (i.zaman >= bas && i.zaman < bit) { const r = m.get(i.tip); r.adet++; r.toplam += i.tutar; }
      return [...m.values()].filter((r) => r.adet);
    },
    ozetTablo(satirlar) {
      if (!satirlar.length) return u.bos({ ikon: 'calendar-blank', baslik: 'Bu ay işlem yok', metin: 'Seçilen dönemde kayıtlı hareket bulunmuyor.' });
      const net = satirlar.reduce((s, r) => s + db.isaret(r.tip) * r.toplam, 0);
      return `<div class="tablo-kap"><table class="table tablo"><thead><tr><th scope="col">İşlem tipi</th><th scope="col" class="num">Adet</th><th scope="col" class="num">Toplam tutar</th></tr></thead>
        <tbody>${satirlar.map((r) => `<tr><td>${u.islemRozet(r.tip)}</td><td class="num">${u.sayi(r.adet)}</td><td class="num">${u.tutar(db.isaret(r.tip) * r.toplam, { isaret: true })}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>Net bakiye etkisi</td><td class="num">${u.sayi(satirlar.reduce((s, r) => s + r.adet, 0))}</td><td class="num">${u.tutar(net, { isaret: true })}</td></tr></tfoot></table></div>`;
    },
    durumAlani(alan, sutun) {
      const d = HM.demo.durum;
      if (d === 'yukleniyor') { alan.innerHTML = `<div class="tablo-kap"><table class="table tablo"><tbody>${u.iskeletSatirlar(sutun, 8)}</tbody></table></div>`; return true; }
      if (d === 'hata') { alan.innerHTML = `<div class="panel-govde">${u.baglantiHatasi()}</div>`; return true; }
      return false;
    }
  };

  async function pasifeAl(m, sonra) {
    const k = api.musteriPasifeAlinabilir(m.id);
    if (!k.olur) { u.toast(`Pasife alınamadı. ${k.neden}`, { ikon: 'warning', hata: true }); return; }
    const ok = await u.onay({ baslik: 'Müşteri pasife alınsın mı?', govde: `<p class="mb-0"><strong>${u.e(m.ad)}</strong> pasife alınacak. Kayıt silinmez; hesaplar ve işlem geçmişi korunur, yeni işlem yapılamaz.</p>`, onayMetni: 'Pasife al', tehlikeli: true });
    if (!ok) return;
    api.musteriDurum(m.id, false); sonra();
    u.toast('Müşteri pasife alındı.', { geriAl: () => { api.musteriDurum(m.id, true); sonra(); u.toast('Müşteri yeniden aktif.'); } });
  }

  /* Liste */
  V.musteriListe = {
    kirinti: () => [['Müşteriler', '#/Musteri']],
    ciz(kok, p, q0, sinyal) {
      const q = Object.assign({ q: '', tip: '', durum: 'aktif', sirala: 'ad', yon: 'artan', sayfa: '1', boyut: '25' }, q0);
      kok.innerHTML = u.sayfaBasligi({ baslik: 'Müşteriler', alt: '<span id="m-sayac"></span>', eylemler: `<a class="btn btn-primary" href="#/Musteri/Yeni">${u.ikon('plus', 'ic-16')}Yeni müşteri</a>` }) +
        `<section class="panel"><div class="filtre-cubugu" role="search">
          <div class="arama">${u.ikon('magnifying-glass', 'ic-16')}<label class="visually-hidden" for="m-ara">Müşteri ara</label><input id="m-ara" class="form-control" type="search" placeholder="Ad, müşteri no, e-posta veya telefon" value="${u.e(q.q)}"></div>
          <div class="segment" role="radiogroup" aria-label="Müşteri tipi">${[['', 'Tümü'], ['BIREYSEL', 'Bireysel'], ['KURUMSAL', 'Kurumsal']].map(([v, ad], i) => `<input type="radio" name="m-tip" id="m-tip-${i}" value="${v}"${q.tip === v ? ' checked' : ''}><label for="m-tip-${i}">${ad}</label>`).join('')}</div>
          <label class="visually-hidden" for="m-durum">Durum</label><select id="m-durum" class="form-select">${[['aktif', 'Aktif müşteriler'], ['pasif', 'Pasif müşteriler'], ['tumu', 'Tüm durumlar']].map(([v, ad]) => `<option value="${v}"${q.durum === v ? ' selected' : ''}>${ad}</option>`).join('')}</select>
          <button type="button" class="btn btn-ghost btn-sm ms-auto" id="m-temizle">Filtreleri temizle</button></div>
          <div id="m-tablo"></div></section>`;
      const alan = kok.querySelector('#m-tablo');
      const erisim = (m, k) => (k === 'ad' ? m.ad : k === 'no' ? m.no : k === 'kayit' ? m.kayit.getTime() : k === 'bakiye' ? db.musteriBakiye(m.id) : db.musteriHesaplari(m.id).length);
      const filtrele = () => {
        const k = kucuk(q.q.trim()); const rakam = k.replace(/\D/g, '');
        return db.musteriler.filter((m) => (!q.tip || m.tip === q.tip) && (q.durum === 'tumu' || (q.durum === 'pasif' ? !m.aktif : m.aktif)) &&
          (!k || kucuk(m.ad).includes(k) || m.eposta.includes(k) || (rakam.length >= 3 && (m.no.includes(rakam) || m.telefon.replace(/\D/g, '').includes(rakam)))));
      };
      function ciz() {
        urlYaz('/Musteri', Object.assign({}, q, { durum: q.durum === 'aktif' ? '' : q.durum, sirala: q.sirala === 'ad' ? '' : q.sirala, yon: q.yon === 'artan' ? '' : q.yon, sayfa: q.sayfa === '1' ? '' : q.sayfa, boyut: q.boyut === '25' ? '' : q.boyut }));
        if (HM.hesapla.durumAlani(alan, 9)) return;
        const liste = HM.demo.durum === 'bos' ? [] : filtrele().sort(u.siralaFn(q.sirala, q.yon, erisim));
        const boyut = Number(q.boyut); const son = Math.max(1, Math.ceil(liste.length / boyut));
        const sayfa = Math.min(son, Math.max(1, Number(q.sayfa) || 1)); q.sayfa = String(sayfa);
        const parca = liste.slice((sayfa - 1) * boyut, sayfa * boyut);
        kok.querySelector('#m-sayac').textContent = `${u.sayi(liste.length)} müşteri`;
        if (!liste.length) {
          alan.innerHTML = q.q || q.tip || q.durum !== 'aktif'
            ? u.bos({ baslik: q.q ? `"${u.e(q.q)}" için sonuç yok` : 'Bu filtrelerle müşteri yok', metin: 'Yazımı kontrol edin ya da filtreleri temizleyin. Müşteri no 8 hanelidir.', eylem: '<button type="button" class="btn btn-outline-secondary" data-temizle>Filtreleri temizle</button>' })
            : u.bos({ ikon: 'users', baslik: 'Henüz müşteri yok', metin: 'İlk müşteriyi ekleyerek başlayın. Hesap açma ve işlemler müşteri kaydından sonra kullanılabilir.', eylem: `<a class="btn btn-primary" href="#/Musteri/Yeni">${u.ikon('plus', 'ic-16')}Yeni müşteri</a>` });
          return;
        }
        alan.innerHTML = `<div class="tablo-kap"><table class="table table-hover tablo"><thead><tr>
          ${u.thSirala('no', 'Müşteri no', q)}${u.thSirala('ad', 'Ad soyad / Ünvan', q)}<th scope="col">Tip</th><th scope="col">Telefon</th>
          ${u.thSirala('hesap', 'Hesap', q, { num: true })}${u.thSirala('bakiye', 'Toplam bakiye', q, { num: true })}${u.thSirala('kayit', 'Kayıt tarihi', q)}<th scope="col">Durum</th><th scope="col"><span class="visually-hidden">Eylemler</span></th></tr></thead>
          <tbody>${parca.map((m) => { const hs = db.musteriHesaplari(m.id);
            return `<tr class="tiklanir" data-href="#/Musteri/Detay/${m.id}"><td class="num">${m.no}</td><td>${u.kimlik(m, { alt: u.e(m.eposta) })}</td><td>${u.musteriTipRozet(m.tip)}</td><td class="num sessiz">${u.e(m.telefon)}</td>
            <td class="num">${hs.length}</td><td class="num">${u.tutar(db.musteriBakiye(m.id))}</td><td class="num sessiz">${u.tarih(m.kayit)}</td><td>${u.durumRozet(m.aktif)}</td>
            <td class="text-end satir-menu"><div class="dropdown"><button type="button" class="btn btn-ghost btn-sm btn-icon" data-bs-toggle="dropdown" data-bs-popper-config='{"strategy":"fixed"}' aria-expanded="false" aria-label="${u.e(m.ad)} için eylemler">${u.ikon('dots-three-vertical', 'ic-16')}</button>
              <ul class="dropdown-menu dropdown-menu-end"><li><a class="dropdown-item" href="#/Musteri/Detay/${m.id}">${u.ikon('identification-card')}Detay</a></li><li><a class="dropdown-item" href="#/Musteri/Duzenle/${m.id}">${u.ikon('pencil-simple')}Düzenle</a></li>
              ${m.aktif ? `<li><a class="dropdown-item" href="#/Hesap/Yeni?musteriId=${m.id}">${u.ikon('plus')}Hesap aç</a></li><li><hr class="dropdown-divider"></li><li><button type="button" class="dropdown-item" data-pasif="${m.id}">${u.ikon('prohibit')}Pasife al</button></li>`
                : `<li><button type="button" class="dropdown-item" data-aktif="${m.id}">${u.ikon('arrow-counter-clockwise')}Aktifleştir</button></li>`}</ul></div></td></tr>`; }).join('')}</tbody></table></div>
          ${u.sayfalama(liste.length, sayfa, boyut)}`;
        HM.iz.ekran('musteriListe', { q: q.q, tip: q.tip, offset: (sayfa - 1) * boyut, boyut, satir: parca.length });
      }
      const temizle = () => { Object.assign(q, { q: '', tip: '', durum: 'aktif', sayfa: '1' }); kok.querySelector('#m-ara').value = ''; kok.querySelector('#m-tip-0').checked = true; kok.querySelector('#m-durum').value = 'aktif'; ciz(); };
      kok.querySelector('#m-ara').addEventListener('input', u.debounce((e) => { q.q = e.target.value; q.sayfa = '1'; ciz(); }, 300), { signal: sinyal });
      kok.querySelectorAll('[name="m-tip"]').forEach((r) => r.addEventListener('change', () => { q.tip = r.value; q.sayfa = '1'; ciz(); }, { signal: sinyal }));
      kok.querySelector('#m-durum').addEventListener('change', (e) => { q.durum = e.target.value; q.sayfa = '1'; ciz(); }, { signal: sinyal });
      kok.querySelector('#m-temizle').addEventListener('click', temizle, { signal: sinyal });
      alan.addEventListener('click', (e) => {
        const s = e.target.closest('[data-sirala]');
        if (s) { const k = s.dataset.sirala; q.yon = q.sirala === k ? (q.yon === 'artan' ? 'azalan' : 'artan') : (k === 'bakiye' || k === 'kayit' || k === 'hesap' ? 'azalan' : 'artan'); q.sirala = k; ciz(); return; }
        const sy = e.target.closest('[data-sayfa]'); if (sy) { q.sayfa = sy.dataset.sayfa; ciz(); return; }
        if (e.target.closest('[data-temizle]')) { temizle(); return; }
        const ps = e.target.closest('[data-pasif]'); if (ps) { pasifeAl(db.musteri(ps.dataset.pasif), ciz); return; }
        const ak = e.target.closest('[data-aktif]'); if (ak) { api.musteriDurum(Number(ak.dataset.aktif), true); ciz(); u.toast('Müşteri aktifleştirildi.'); }
      }, { signal: sinyal });
      alan.addEventListener('change', (e) => { if (e.target.matches('[data-sayfa-boyut]')) { q.boyut = e.target.value; q.sayfa = '1'; ciz(); } }, { signal: sinyal });
      ciz();
    }
  };

  /* Detay */
  V.musteriDetay = {
    kirinti: (p) => { const m = db.musteri(p.id); return [['Müşteriler', '#/Musteri'], [m ? m.ad : 'Bulunamadı', '']]; },
    ciz(kok, p, q, sinyal) {
      const m = db.musteri(p.id);
      if (!m) { V.bulunamadi.ciz(kok); return; }
      const hs = db.musteriHesaplari(m.id);
      const sonIslemler = hs.flatMap((h) => db.hesapIslemleri(h.id).slice(-15)).sort((a, b) => b.zaman - a.zaman || b.id - a.id).slice(0, 15);
      const sekme = ['hesaplar', 'islemler', 'ozet'].includes(q.sekme) ? q.sekme : 'hesaplar';
      const bugun = db.bugun;
      kok.innerHTML = u.sayfaBasligi({
        baslik: u.e(m.ad),
        alt: `${u.noKopya(m.no, 'Müşteri no')}${u.musteriTipRozet(m.tip)}${u.durumRozet(m.aktif)}`,
        eylemler: `<a class="btn btn-outline-secondary" href="#/Musteri/Duzenle/${m.id}">${u.ikon('pencil-simple', 'ic-16')}Düzenle</a>
          ${m.aktif ? `<a class="btn btn-primary" href="#/Hesap/Yeni?musteriId=${m.id}">${u.ikon('plus', 'ic-16')}Hesap aç</a>` : '<button type="button" class="btn btn-primary" disabled title="Pasif müşteriye hesap açılamaz">Hesap aç</button>'}
          <div class="dropdown"><button type="button" class="btn btn-ghost btn-icon" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Diğer eylemler">${u.ikon('dots-three-vertical')}</button>
          <ul class="dropdown-menu dropdown-menu-end">${m.aktif ? `<li><button type="button" class="dropdown-item" data-pasif>${u.ikon('prohibit')}Pasife al</button></li>` : `<li><button type="button" class="dropdown-item" data-aktif>${u.ikon('arrow-counter-clockwise')}Aktifleştir</button></li>`}</ul></div>`
      }) + `<div class="izgara-3-9">
        <section class="panel" aria-labelledby="bilgi-baslik"><div class="panel-bas"><h2 id="bilgi-baslik">Müşteri bilgileri</h2></div>
          <div class="panel-govde d-grid gap-3">
            <div class="bakiye-blok"><span class="etiket">Toplam bakiye</span><span class="deger">${u.para(db.musteriBakiye(m.id))}</span><span class="ek"><span>${hs.filter((h) => h.aktif).length} açık, ${hs.filter((h) => !h.aktif).length} pasif hesap</span></span></div>
            <dl class="dl-liste"><dt>Müşteri no</dt><dd class="num">${m.no}</dd><dt>Müşteri tipi</dt><dd>${m.tip === 'KURUMSAL' ? 'Kurumsal' : 'Bireysel'}</dd>
              <dt>E-posta</dt><dd>${m.eposta ? u.e(m.eposta) : '<span class="text-secondary">Girilmemiş</span>'}</dd><dt>Telefon</dt><dd class="num">${m.telefon ? u.e(m.telefon) : '<span class="text-secondary">Girilmemiş</span>'}</dd>
              <dt>Kayıt tarihi</dt><dd class="num">${u.tarih(m.kayit)}</dd><dt>Son işlem</dt><dd class="num">${sonIslemler[0] ? u.tarihSaat(sonIslemler[0].zaman) : '<span class="text-secondary">Yok</span>'}</dd></dl>
          </div></section>
        <section class="panel"><div class="sekmeler" role="tablist" aria-label="Müşteri kayıtları">
          ${[['hesaplar', 'Hesaplar', hs.length], ['islemler', 'Son işlemler', null], ['ozet', 'Aylık özet', null]].map(([k, ad, n]) => `<button type="button" role="tab" id="t-${k}" aria-controls="tp" aria-selected="${sekme === k}" data-sekme="${k}">${ad}${n != null ? `<span class="sayi">${n}</span>` : ''}</button>`).join('')}</div>
          <div id="tp" role="tabpanel"></div></section></div>`;
      const tp = kok.querySelector('#tp');
      function sekmeCiz(s) {
        kok.querySelectorAll('[data-sekme]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.sekme === s)));
        tp.setAttribute('aria-labelledby', 't-' + s);
        urlYaz(`/Musteri/Detay/${m.id}`, s === 'hesaplar' ? {} : { sekme: s });
        if (s === 'hesaplar') {
          tp.innerHTML = hs.length ? `<div class="tablo-kap"><table class="table table-hover tablo"><thead><tr><th scope="col">Hesap no</th><th scope="col">Tip</th><th scope="col" class="num">Bakiye</th><th scope="col">Açılış</th><th scope="col">Son hareket</th><th scope="col">Durum</th><th scope="col"><span class="visually-hidden">Eylemler</span></th></tr></thead>
            <tbody>${hs.map((h) => { const s2 = db.sonIslem(h.id); return `<tr class="tiklanir" data-href="#/Hesap/Detay/${h.id}"><td><a class="mono" href="#/Hesap/Detay/${h.id}">${h.no}</a></td><td>${u.hesapTipRozet(h.tip)}</td><td class="num">${u.tutar(h.bakiye)}</td><td class="num sessiz">${u.tarih(h.acilis)}</td><td class="num sessiz">${s2 ? u.tarih(s2.zaman) : 'Yok'}</td><td>${u.durumRozet(h.aktif)}</td>
              <td class="text-end text-nowrap"><a class="btn btn-ghost btn-sm" href="#/Hesap/Ekstre/${h.id}">Ekstre</a>${h.aktif ? `<a class="btn btn-ghost btn-sm" href="#/Islem/Yeni?hesapId=${h.id}">İşlem yap</a>` : ''}</td></tr>`; }).join('')}</tbody></table></div>`
            : u.bos({ ikon: 'wallet', baslik: 'Bu müşterinin hesabı yok', metin: 'Vadesiz veya yatırım hesabı açarak işlem yapmaya başlayabilirsiniz.', eylem: m.aktif ? `<a class="btn btn-primary" href="#/Hesap/Yeni?musteriId=${m.id}">Hesap aç</a>` : '' });
        } else if (s === 'islemler') {
          tp.innerHTML = sonIslemler.length ? `<div class="tablo-kap"><table class="table table-hover tablo"><thead><tr><th scope="col">Zaman</th><th scope="col">Hesap no</th><th scope="col">İşlem</th><th scope="col" class="num">Tutar</th><th scope="col">Açıklama</th></tr></thead>
            <tbody>${sonIslemler.map((i) => `<tr class="tiklanir" data-href="#/Islem/Dekont/${i.id}"><td class="num sessiz">${u.tarihSaat(i.zaman)}</td><td class="mono">${db.hesap(i.hesapId).no}</td><td>${u.islemRozet(i.tip)}</td><td class="num">${u.islemTutar(i)}</td><td class="sessiz text-truncate" style="max-width:260px">${u.e(i.aciklama)}</td></tr>`).join('')}</tbody></table></div>`
            : u.bos({ ikon: 'receipt', baslik: 'Henüz işlem yok', metin: 'Bu müşterinin hesaplarında kayıtlı hareket bulunmuyor.' });
        } else {
          const ozet = HM.hesapla.aylikOzet(hs.map((h) => h.id), bugun.getFullYear(), bugun.getMonth() + 1);
          tp.innerHTML = `<div class="panel-bas border-0"><div><h2>${u.ayYil(bugun)}</h2><div class="aciklama">Tüm hesaplar, PKG_RAPOR.AYLIK_OZET_MUSTERI sonucu</div></div><a class="btn btn-outline-secondary btn-sm" href="${HM.r.link('/Rapor/AylikOzet', { kapsam: 'musteri', id: m.id })}">Raporda aç</a></div>${HM.hesapla.ozetTablo(ozet)}`;
        }
      }
      kok.querySelector('.sekmeler').addEventListener('click', (e) => { const b = e.target.closest('[data-sekme]'); if (b) sekmeCiz(b.dataset.sekme); }, { signal: sinyal });
      kok.querySelector('.sekmeler').addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const b = [...kok.querySelectorAll('[data-sekme]')]; const i = b.findIndex((x) => x.getAttribute('aria-selected') === 'true');
        const n = b[(i + (e.key === 'ArrowRight' ? 1 : b.length - 1)) % b.length]; n.focus(); sekmeCiz(n.dataset.sekme);
      }, { signal: sinyal });
      kok.addEventListener('click', (e) => {
        if (e.target.closest('[data-pasif]')) pasifeAl(m, HM.r.yenile);
        else if (e.target.closest('[data-aktif]')) { api.musteriDurum(m.id, true); HM.r.yenile(); u.toast('Müşteri aktifleştirildi.'); }
      }, { signal: sinyal });
      sekmeCiz(sekme);
      HM.iz.ekran('musteriDetay', { id: m.id, hesap: hs.length });
    }
  };

  /* Ekle / düzenle */
  const telefonBicimle = (v) => {
    let d = v.replace(/\D/g, ''); if (d.startsWith('90')) d = d.slice(2); if (d.startsWith('0')) d = d.slice(1);
    return d.length === 10 ? `+90 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}` : v.trim();
  };
  V.musteriForm = {
    kirinti: (p) => { const m = p.id && db.musteri(p.id); return m ? [['Müşteriler', '#/Musteri'], [m.ad, `#/Musteri/Detay/${m.id}`], ['Düzenle', '']] : [['Müşteriler', '#/Musteri'], ['Yeni müşteri', '']]; },
    ciz(kok, p, q, sinyal) {
      const m = p.id ? db.musteri(p.id) : null;
      if (p.id && !m) { V.bulunamadi.ciz(kok); return; }
      const v = m ? { tip: m.tip, ad: m.ad, no: m.no, eposta: m.eposta, telefon: m.telefon } : { tip: 'BIREYSEL', ad: '', no: api.musteriNoUret(), eposta: '', telefon: '' };
      const geri = m ? `#/Musteri/Detay/${m.id}` : '#/Musteri';
      const alan = (id, etiket, input, yardim, zorunlu) => `<div class="alan"><label class="form-label" for="${id}">${etiket}${zorunlu ? '<span class="zorunlu" aria-hidden="true">*</span>' : ''}</label>${input}<div id="${id}-yardim" class="form-text">${yardim || ''}</div><div id="${id}-hata" class="invalid-feedback"></div></div>`;
      kok.innerHTML = u.sayfaBasligi({ baslik: m ? 'Müşteriyi düzenle' : 'Yeni müşteri', alt: m ? `${u.e(m.ad)}, kayıt ${u.tarih(m.kayit)}` : 'Zorunlu alanlar yıldızla işaretli.' }) +
        `<form class="panel form-dar" id="mf" novalidate>
          <div id="mf-ozet"></div>
          <div class="alan-grubu"><h2>Kimlik</h2>
            <div class="alan"><span class="form-label" id="tip-etiket">Müşteri tipi</span><div class="segment segment-buyuk" role="radiogroup" aria-labelledby="tip-etiket">
              <input type="radio" name="tip" id="tip-b" value="BIREYSEL"${v.tip === 'BIREYSEL' ? ' checked' : ''}><label for="tip-b">${u.ikon('user', 'ic-16')}Bireysel</label>
              <input type="radio" name="tip" id="tip-k" value="KURUMSAL"${v.tip === 'KURUMSAL' ? ' checked' : ''}><label for="tip-k">${u.ikon('buildings', 'ic-16')}Kurumsal</label></div></div>
            ${alan('ad', `<span id="ad-etiket">${v.tip === 'KURUMSAL' ? 'Ünvan' : 'Ad soyad'}</span>`, `<input id="ad" name="ad" class="form-control" maxlength="150" autocomplete="name" required aria-describedby="ad-yardim ad-hata" value="${u.e(v.ad)}">`, 'AD_SOYAD, en fazla 150 karakter.', true)}
            ${alan('no', 'Müşteri no', `<div class="d-flex gap-2"><input id="no" name="no" class="form-control mono" inputmode="numeric" maxlength="8" required aria-describedby="no-yardim no-hata" value="${u.e(v.no)}" style="max-width:180px"><button type="button" class="btn btn-outline-secondary" id="no-uret">Otomatik oluştur</button></div>`, '8 haneli, benzersiz. Hesap numarasının ortasında kullanılır.', true)}
          </div>
          <div class="alan-grubu"><h2>İletişim</h2><div class="alan-satir">
            ${alan('eposta', 'E-posta', `<input id="eposta" name="eposta" type="email" class="form-control" maxlength="150" autocomplete="email" aria-describedby="eposta-yardim eposta-hata" value="${u.e(v.eposta)}">`, 'İsteğe bağlı.')}
            ${alan('telefon', 'Telefon', `<input id="telefon" name="telefon" type="tel" class="form-control mono" maxlength="20" autocomplete="tel" placeholder="+90 5xx xxx xx xx" aria-describedby="telefon-yardim telefon-hata" value="${u.e(v.telefon)}">`, 'İsteğe bağlı, +90 ile biçimlenir.')}
          </div></div>
          <div class="form-eylem-cubugu"><span class="durum-metni" id="mf-durum">${m ? 'Değişiklik yok' : 'KAYIT_TARIHI kayıtta SYSDATE ile atanır.'}</span><a class="btn btn-ghost" href="${geri}">Vazgeç</a><button type="submit" class="btn btn-primary">${m ? 'Değişiklikleri kaydet' : 'Müşteriyi kaydet'}</button></div>
        </form>`;
      const f = kok.querySelector('#mf'); let kirli = false;
      const hataGoster = (id, mesaj) => { const el = f.querySelector('#' + id); el.classList.toggle('is-invalid', !!mesaj); el.setAttribute('aria-invalid', String(!!mesaj)); f.querySelector(`#${id}-hata`).textContent = mesaj || ''; };
      const kurallar = {
        ad: (x) => (!x.trim() ? (tipDeger() === 'KURUMSAL' ? 'Ünvanı girin.' : 'Ad ve soyadı girin.') : x.trim().length < 3 ? 'En az 3 karakter girin.' : tipDeger() === 'BIREYSEL' && x.trim().split(/\s+/).length < 2 ? 'Ad ve soyadı birlikte girin.' : ''),
        no: (x) => { if (!/^\d{8}$/.test(x)) return 'Müşteri no 8 haneli olmalı ve yalnız rakam içermeli.'; const s = api.musteriNoSahibi(x, m ? m.id : undefined); return s ? `Bu müşteri no kayıtlı: ${s.no} (${s.ad})` : ''; },
        eposta: (x) => (x && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x) ? 'Geçerli bir e-posta girin, örneğin ad.soyad@example.com.' : ''),
        telefon: (x) => (x && x.replace(/\D/g, '').length < 10 ? 'Telefon numarası en az 10 haneli olmalı.' : '')
      };
      const tipDeger = () => f.querySelector('[name="tip"]:checked').value;
      const dogrula = (id) => { const msg = kurallar[id](f.querySelector('#' + id).value); hataGoster(id, msg); return msg; };
      f.querySelectorAll('[name="tip"]').forEach((r) => r.addEventListener('change', () => { f.querySelector('#ad-etiket').textContent = tipDeger() === 'KURUMSAL' ? 'Ünvan' : 'Ad soyad'; }, { signal: sinyal }));
      ['ad', 'no', 'eposta', 'telefon'].forEach((id) => f.querySelector('#' + id).addEventListener('blur', (e) => { if (id === 'telefon' && e.target.value) e.target.value = telefonBicimle(e.target.value); if (e.target.value || e.target.classList.contains('is-invalid')) dogrula(id); }, { signal: sinyal }));
      f.addEventListener('input', () => { kirli = true; f.querySelector('#mf-durum').textContent = 'Kaydedilmemiş değişiklik var'; }, { signal: sinyal });
      f.querySelector('#no-uret').addEventListener('click', () => { f.querySelector('#no').value = api.musteriNoUret(); hataGoster('no', ''); kirli = true; }, { signal: sinyal });
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const hatalar = ['ad', 'no', 'eposta', 'telefon'].map((id) => [id, dogrula(id)]).filter(([, msg]) => msg);
        const ozet = f.querySelector('#mf-ozet');
        if (hatalar.length) {
          ozet.innerHTML = `<div class="p-3 pb-0"><div class="uyari uyari--hata hata-ozeti" role="alert">${u.ikon('warning-circle')}<div><strong>${hatalar.length} alan düzeltilmeli.</strong><ul>${hatalar.map(([id, msg]) => `<li><a href="javascript:void(0)" data-odak="${id}">${u.e(msg)}</a></li>`).join('')}</ul></div></div></div>`;
          f.querySelector('#' + hatalar[0][0]).focus(); return;
        }
        ozet.innerHTML = '';
        const veri = { tip: tipDeger(), ad: f.querySelector('#ad').value, no: f.querySelector('#no').value, eposta: f.querySelector('#eposta').value.trim(), telefon: f.querySelector('#telefon').value.trim() };
        try {
          const sonuc = m ? api.musteriGuncelle(m.id, veri) : api.musteriEkle(veri);
          kirli = false; location.hash = `#/Musteri/Detay/${sonuc.id}`;
          setTimeout(() => u.toast(m ? 'Değişiklikler kaydedildi.' : 'Müşteri kaydedildi.'), 30);
        } catch (err) { if (err.alan) { hataGoster(err.alan, err.message); f.querySelector('#' + err.alan).focus(); } else throw err; }
      }, { signal: sinyal });
      f.addEventListener('click', (e) => { const a = e.target.closest('[data-odak]'); if (a) f.querySelector('#' + a.dataset.odak).focus(); }, { signal: sinyal });
      // Kaydedilmemiş değişiklikle ayrılma uyarısı
      document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#/"]'); if (!a || !kirli) return;
        e.preventDefault(); e.stopPropagation();
        u.onay({ baslik: 'Değişiklikler kaydedilmedi', govde: '<p class="mb-0">Sayfadan ayrılırsanız girdiğiniz bilgiler kaybolur.</p>', onayMetni: 'Kaydetmeden ayrıl', tehlikeli: true })
          .then((ok) => { if (ok) { kirli = false; location.hash = a.getAttribute('href'); } });
      }, { capture: true, signal: sinyal });
      window.addEventListener('beforeunload', (e) => { if (kirli) { e.preventDefault(); e.returnValue = ''; } }, { signal: sinyal });
      f.querySelector('#ad').focus();
    }
  };
})();
