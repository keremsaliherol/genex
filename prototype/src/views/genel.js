/* HomeController.Index, GirisController, hata sayfaları */
(function () {
  'use strict';
  const HM = window.HM; const u = HM.u; const db = HM.db;
  const V = HM.views;

  /* Genel bakış */
  V.genelBakis = {
    kirinti: () => [['Genel bakış', '#/']],
    ciz(kok, p, q, sinyal) {
      const durum = HM.demo.durum;
      const baslik = u.sayfaBasligi({
        baslik: 'Genel bakış',
        alt: `<span>${u.uzunGun(db.bugun)}</span>`,
        eylemler: `<a class="btn btn-outline-secondary" href="#/Musteri/Yeni">${u.ikon('plus', 'ic-16')}Yeni müşteri</a><a class="btn btn-primary" href="#/Islem/Yeni">${u.ikon('arrows-left-right', 'ic-16')}İşlem yap</a>`
      });
      if (durum === 'hata') { kok.innerHTML = baslik + u.baglantiHatasi(); return; }
      if (durum === 'bos') {
        kok.innerHTML = baslik + `<div class="panel">${u.bos({ ikon: 'users', baslik: 'Henüz müşteri yok', metin: 'Müşteri ekledikten sonra hesap açabilir ve işlem yapabilirsiniz. Özet göstergeler ilk işlemle birlikte dolar.', eylem: `<a class="btn btn-primary" href="#/Musteri/Yeni">${u.ikon('plus', 'ic-16')}İlk müşteriyi ekle</a>` })}</div>`;
        return;
      }
      if (durum === 'yukleniyor') {
        kok.innerHTML = baslik + `<div class="panel mb-3"><div class="kpi-serit">${[1, 2, 3, 4].map(() => '<div class="kpi"><span class="iskelet" style="width:50%"></span><span class="iskelet" style="width:70%;height:22px"></span><span class="iskelet" style="width:40%"></span></div>').join('')}</div></div>
          <div class="izgara-8-4"><div class="panel"><div class="panel-govde"><span class="iskelet" style="height:260px"></span></div></div><div class="panel"><div class="panel-govde"><span class="iskelet" style="height:260px"></span></div></div></div>`;
        return;
      }

      const aktifM = db.musteriler.filter((m) => m.aktif);
      const kurumsal = aktifM.filter((m) => m.tip === 'KURUMSAL').length;
      const aktifH = db.hesaplar.filter((h) => h.aktif);
      const yatirim = aktifH.filter((h) => h.tip === 'YATIRIM').length;
      const toplam = aktifH.reduce((s, h) => s + h.bakiye, 0);
      const bugunkuler = db.islemler.filter((i) => i.zaman >= db.bugun && i.tip !== 'TRANSFER_GELEN');
      const hacim = bugunkuler.reduce((s, i) => s + i.tutar, 0);

      // Son 30 gün nakit akışı (YATIRMA / CEKME)
      const gunler = [];
      for (let d = 29; d >= 0; d--) gunler.push({ tarih: new Date(db.bugun.getTime() - d * db.GUN), giris: 0, cikis: 0 });
      const ilk = gunler[0].tarih;
      const otuzGun = db.islemler.filter((i) => i.zaman >= ilk);
      for (const i of otuzGun) {
        if (i.tip !== 'YATIRMA' && i.tip !== 'CEKME') continue;
        const g = gunler[Math.floor((new Date(i.zaman.getFullYear(), i.zaman.getMonth(), i.zaman.getDate()) - ilk) / db.GUN)];
        if (!g) continue;
        if (i.tip === 'YATIRMA') g.giris += i.tutar; else g.cikis += i.tutar;
      }
      const topGiris = gunler.reduce((s, g) => s + g.giris, 0); const topCikis = gunler.reduce((s, g) => s + g.cikis, 0);

      // En aktif müşteriler (30 gün, transfer çifti tek işlem)
      const sayac = new Map();
      for (const i of otuzGun) { const m = db.hesap(i.hesapId).musteriId; sayac.set(m, (sayac.get(m) || 0) + 1); }
      const enAktif = [...sayac.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      const enCok = enAktif.length ? enAktif[0][1] : 1;

      const son = db.islemler.slice(-10).reverse();
      const vadesiz = aktifH.length - yatirim;
      const yuzde = (n) => `%${Math.round((n / Math.max(1, aktifH.length)) * 100)}`;

      kok.innerHTML = baslik + `
        <section class="panel mb-3" aria-label="Özet göstergeler"><div class="kpi-serit">
          <div class="kpi"><span class="etiket">Aktif müşteri</span><span class="deger">${u.sayi(aktifM.length)}</span><span class="ek">${u.sayi(aktifM.length - kurumsal)} bireysel, ${u.sayi(kurumsal)} kurumsal</span></div>
          <div class="kpi"><span class="etiket">Açık hesap</span><span class="deger">${u.sayi(aktifH.length)}</span><span class="ek">${u.sayi(vadesiz)} vadesiz, ${u.sayi(yatirim)} yatırım</span></div>
          <div class="kpi"><span class="etiket">Toplam bakiye</span><span class="deger">${u.paraKisa(toplam)}</span><span class="ek">${u.para(toplam)}</span></div>
          <div class="kpi"><span class="etiket">Bugünkü işlemler</span><span class="deger">${u.sayi(bugunkuler.length)}</span><span class="ek">Hacim ${u.paraKisa(hacim)}</span></div>
        </div></section>
        <div class="izgara-8-4">
          <div class="izgara">
            <section class="panel" aria-labelledby="akis-baslik">
              <div class="panel-bas"><div><h2 id="akis-baslik">Nakit akışı, son 30 gün</h2><div class="aciklama">Günlük para yatırma ve çekme toplamı. Transfer ve hisse işlemleri dahil değil.</div></div>
                <div class="d-flex align-items-center gap-3"><div class="grafik-lejant"><span><i style="background:var(--viz-1)"></i>Yatırma ${u.paraKisa(topGiris)}</span><span><i style="background:var(--viz-neg)"></i>Çekme ${u.paraKisa(topCikis)}</span></div>
                <button type="button" class="btn btn-ghost btn-sm" data-tablo-gorunum aria-pressed="false">${u.ikon('list', 'ic-16')}Tablo</button></div></div>
              <div class="panel-govde"><div class="grafik-kap"><canvas id="akis-grafik" role="img" aria-label="Son 30 günde günlük para yatırma ve çekme; toplam yatırma ${u.para(topGiris)}, toplam çekme ${u.para(topCikis)}"></canvas></div>
                <div class="tablo-kap mt-2" data-tablo hidden><table class="table tablo"><thead><tr><th scope="col">Gün</th><th scope="col" class="num">Yatırma</th><th scope="col" class="num">Çekme</th><th scope="col" class="num">Net</th></tr></thead>
                <tbody>${gunler.map((g) => `<tr><td>${u.tarih(g.tarih)}</td><td class="num">${u.tutar(g.giris)}</td><td class="num">${u.tutar(-g.cikis)}</td><td class="num">${u.tutar(g.giris - g.cikis, { isaret: true })}</td></tr>`).join('')}</tbody></table></div></div>
            </section>
            <section class="panel" aria-labelledby="son-baslik">
              <div class="panel-bas"><h2 id="son-baslik">Son işlemler</h2><span class="aciklama">Transferler iki kayıt olarak görünür: giden ve gelen.</span></div>
              <div class="tablo-kap"><table class="table table-hover tablo"><thead><tr><th scope="col">Zaman</th><th scope="col">Hesap no</th><th scope="col">Müşteri</th><th scope="col">İşlem</th><th scope="col" class="num">Tutar</th><th scope="col">Açıklama</th></tr></thead>
              <tbody>${son.map((i) => { const h = db.hesap(i.hesapId); const m = db.musteri(h.musteriId);
                return `<tr class="tiklanir" data-href="#/Islem/Dekont/${i.id}"><td class="num sessiz">${i.zaman >= db.bugun ? u.saat(i.zaman) : u.tarihSaat(i.zaman)}</td><td><a class="mono" href="#/Hesap/Detay/${h.id}">${h.no}</a></td><td class="text-truncate" style="max-width:180px">${u.e(m.ad)}</td><td>${u.islemRozet(i.tip)}</td><td class="num">${u.islemTutar(i)}</td><td class="sessiz text-truncate" style="max-width:220px">${u.e(i.aciklama)}</td></tr>`; }).join('')}</tbody></table></div>
            </section>
          </div>
          <div class="izgara">
            <section class="panel" aria-labelledby="aktif-baslik">
              <div class="panel-bas"><div><h2 id="aktif-baslik">En aktif müşteriler</h2><div class="aciklama">Son 30 gün, işlem adedine göre</div></div></div>
              <ol class="list-unstyled m-0">${enAktif.map(([mid, n], i) => { const m = db.musteri(mid);
                return `<li class="d-grid align-items-center gap-2 px-3 py-2${i ? ' border-top' : ''}" style="grid-template-columns:20px minmax(0,1fr) auto"><span class="num text-secondary">${i + 1}</span>${u.kimlik(m)}<span class="satir-bar"><i style="width:${Math.round((n / enCok) * 64)}px" aria-hidden="true"></i><span class="num">${n}</span></span></li>`; }).join('')}</ol>
              <div class="panel-alt"><span>VW_EN_AKTIF_MUSTERILER</span><a href="#/Rapor/EnAktif">Raporda aç</a></div>
            </section>
            <section class="panel" aria-labelledby="dagilim-baslik">
              <div class="panel-bas"><h2 id="dagilim-baslik">Açık hesapların dağılımı</h2></div>
              <div class="panel-govde d-grid gap-3">
                <div class="oran-bar" role="img" aria-label="Vadesiz ${vadesiz}, yatırım ${yatirim}"><i style="width:${(vadesiz / Math.max(1, aktifH.length)) * 100}%;background:var(--viz-1)"></i><i style="width:${(yatirim / Math.max(1, aktifH.length)) * 100}%;background:var(--viz-2)"></i></div>
                <dl class="dl-liste"><dt><span class="grafik-lejant"><span><i style="background:var(--viz-1)"></i>Vadesiz</span></span></dt><dd class="num text-end">${u.sayi(vadesiz)} <span class="text-secondary">${yuzde(vadesiz)}</span></dd>
                <dt><span class="grafik-lejant"><span><i style="background:var(--viz-2)"></i>Yatırım</span></span></dt><dd class="num text-end">${u.sayi(yatirim)} <span class="text-secondary">${yuzde(yatirim)}</span></dd></dl>
              </div>
            </section>
          </div>
        </div>`;

      HM.grafik.akis(kok.querySelector('#akis-grafik'), gunler);
      kok.querySelector('[data-tablo-gorunum]').addEventListener('click', (e) => {
        const b = e.currentTarget; const t = kok.querySelector('[data-tablo]'); const ac = t.hidden;
        t.hidden = !ac; b.setAttribute('aria-pressed', String(ac)); b.lastChild.textContent = ac ? 'Grafik' : 'Tablo';
        kok.querySelector('.grafik-kap').hidden = ac;
      }, { signal: sinyal });
      HM.iz.ekran('genelBakis', { son: 10 });
    }
  };

  /* Giriş (ASP.NET Core Identity) */
  let hataliDeneme = 0;
  V.giris = {
    kirinti: () => [['Giriş', '#/Giris']],
    ciz(kok, p, q, sinyal) {
      const doku = db.islemler.slice(-18).map((i) => `${u.tarihSaat(i.zaman)}  ${db.hesap(i.hesapId).no}  ${i.tip.padEnd(15, ' ')} ${u.para(db.isaret(i.tip) * i.tutar, { isaret: true }).padStart(16, ' ')}`).join('\n');
      kok.innerHTML = `<div class="giris-sayfa">
        <div class="giris-form">
          <div class="d-flex align-items-center gap-2"><span class="hm-brand-mark">${u.ikon('vault')}</span><span class="fw-semibold">Hesap Masası</span></div>
          <form novalidate id="giris-formu">
            <h1>Oturum açın</h1>
            <div id="giris-hata" role="alert"></div>
            <div class="alan"><label class="form-label" for="g-eposta">E-posta<span class="zorunlu" aria-hidden="true">*</span></label>
              <input id="g-eposta" class="form-control" type="email" autocomplete="username" value="admin@hesapmasasi.local" required aria-describedby="g-eposta-hata"><div id="g-eposta-hata" class="invalid-feedback"></div></div>
            <div class="alan"><label class="form-label" for="g-parola">Parola<span class="zorunlu" aria-hidden="true">*</span></label>
              <div class="giris-grubu"><input id="g-parola" class="form-control" type="password" autocomplete="current-password" required aria-describedby="g-parola-hata" style="padding-right:44px">
              <button type="button" class="btn btn-ghost btn-sm btn-icon sonek" id="g-goster" aria-label="Parolayı göster" aria-pressed="false">${u.ikon('eye', 'ic-16')}</button></div>
              <div id="g-parola-hata" class="invalid-feedback"></div></div>
            <div class="form-check"><input class="form-check-input" type="checkbox" id="g-hatirla" checked><label class="form-check-label" for="g-hatirla">Beni hatırla</label></div>
            <button type="submit" class="btn btn-primary w-100" id="g-gonder">Giriş yap</button>
            <p class="ipucu m-0">Demo hesabı: <span class="mono">admin@hesapmasasi.local</span>, parola: <span class="mono">demo</span></p>
          </form>
          <p class="demo-not m-0">Demo verisi, kurgusal. Gerçek müşteri bilgisi içermez.</p>
        </div>
        <div class="giris-panel" aria-hidden="false"><div class="dokusu" aria-hidden="true">${u.e(doku)}</div>
          <h2>Müşteri, hesap ve işlem yönetimi.</h2>
          <p>Aracı kurum ve banka operasyonları için örnek uygulama. Veriler Oracle'da, bakiye ve transfer kuralları PL/SQL paketlerinde çalışır.</p>
          <div class="yigin"><span>ASP.NET Core MVC</span><span>Oracle XE 21c</span><span>PL/SQL</span><span>EF Core + Dapper</span><span>Bootstrap 5.3</span></div></div>
      </div>`;
      const f = kok.querySelector('#giris-formu'); const e = kok.querySelector('#g-eposta'); const pw = kok.querySelector('#g-parola');
      kok.querySelector('#g-goster').addEventListener('click', (ev) => {
        const b = ev.currentTarget; const goster = pw.type === 'password'; pw.type = goster ? 'text' : 'password';
        b.setAttribute('aria-pressed', String(goster)); b.setAttribute('aria-label', goster ? 'Parolayı gizle' : 'Parolayı göster');
        b.innerHTML = u.ikon(goster ? 'eye-slash' : 'eye', 'ic-16');
      }, { signal: sinyal });
      f.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const hata = kok.querySelector('#giris-hata'); hata.innerHTML = '';
        [e, pw].forEach((x) => x.classList.remove('is-invalid'));
        kok.querySelector('#g-eposta-hata').textContent = ''; kok.querySelector('#g-parola-hata').textContent = '';
        let ok = true;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.value)) { e.classList.add('is-invalid'); kok.querySelector('#g-eposta-hata').textContent = 'Geçerli bir e-posta adresi girin.'; ok = false; }
        if (!pw.value) { pw.classList.add('is-invalid'); kok.querySelector('#g-parola-hata').textContent = 'Parolayı girin.'; ok = false; }
        if (!ok) { f.querySelector('.is-invalid').focus(); return; }
        if (hataliDeneme >= 5) { hata.innerHTML = u.hataUyari({ baslik: 'Hesap geçici olarak kilitlendi.', metin: '5 hatalı denemeden sonra giriş 5 dakika kapalıdır. Süre dolunca tekrar deneyin.' }); return; }
        const btn = kok.querySelector('#g-gonder'); btn.disabled = true; btn.innerHTML = '<span class="yukleniyor-nokta" aria-hidden="true"></span>Kontrol ediliyor';
        setTimeout(() => {
          btn.disabled = false; btn.textContent = 'Giriş yap';
          if (e.value.toLowerCase() === 'admin@hesapmasasi.local' && pw.value === 'demo') { hataliDeneme = 0; location.hash = '#/'; setTimeout(() => u.toast('Oturum açıldı. Hoş geldiniz, admin.'), 50); }
          else { hataliDeneme++; hata.innerHTML = u.hataUyari({ baslik: 'E-posta veya parola hatalı.', metin: `Bilgileri kontrol edip tekrar deneyin. Kalan deneme: ${Math.max(0, 5 - hataliDeneme)}.` }); pw.value = ''; pw.focus(); }
        }, 450);
      }, { signal: sinyal });
    }
  };

  V.bulunamadi = {
    kirinti: () => [['Sayfa bulunamadı', '#/']],
    ciz(kok) {
      kok.innerHTML = `<div class="panel">${u.bos({ ikon: 'compass', baslik: 'Sayfa bulunamadı', metin: 'Adres yanlış yazılmış ya da kayıt artık yok. Menüden devam edebilir veya genel bakışa dönebilirsiniz.', eylem: '<a class="btn btn-primary" href="#/">Genel bakışa dön</a>' })}</div>`;
    }
  };
  V.hata = {
    kirinti: () => [['Hata', '#/Hata']],
    ciz(kok) {
      kok.innerHTML = u.sayfaBasligi({ baslik: 'Bir şeyler ters gitti' }) + `<div class="form-dar">${u.hataUyari({ baslik: 'İstek tamamlanamadı (500).', metin: 'Hata kaydedildi. Sorun sürerse sistem yöneticisine istek kimliğini iletin.', kod: 'Oracle.ManagedDataAccess.Client.OracleException (0x80004005): ORA-06550: line 1, column 7: PLS-00201', eylem: '<a class="btn btn-outline-secondary btn-sm" href="#/">Genel bakışa dön</a>' })}</div>`;
    }
  };
})();
