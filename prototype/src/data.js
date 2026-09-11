/* Demo verisi: tohumlu üretici.
   Tutarlar kuruş cinsinden tamsayıdır. Bakiyeler doğrudan yazılmaz; her işlem
   TRG_ISLEM_BAKIYE_GUNCELLE kuralıyla uygulanır (YATIRMA/TRANSFER_GELEN/SATIM +, diğerleri -). */
(function () {
  'use strict';
  const HM = (window.HM = window.HM || {});

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = mulberry32(20260910);
  const pick = (a) => a[Math.floor(rng() * a.length)];
  const randInt = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const skew = (min, max) => min * Math.pow(max / min, rng()); // log dağılımlı
  const kurus = (tl) => Math.round(tl * 100);

  const ADLAR = ['Deniz', 'Selin', 'Elif', 'Zeynep', 'Ece', 'Aslı', 'İpek', 'Derya', 'Gizem', 'Pelin', 'Nazlı', 'Ceren', 'Melis', 'Seda', 'Buse', 'Ilgın', 'Duygu', 'Esra', 'Gökçe', 'Sinem', 'Irmak', 'Defne', 'Başak', 'Tuğçe', 'Yasemin', 'Özge', 'Hande', 'Cansu', 'Ebru', 'Nehir',
    'Kaan', 'Mert', 'Burak', 'Onur', 'Emre', 'Can', 'Tolga', 'Serkan', 'Barış', 'Umut', 'Oğuz', 'Hakan', 'Volkan', 'Kerem', 'Alper', 'Levent', 'Cem', 'Yiğit', 'Tuna', 'Berk', 'Arda', 'Efe', 'Doruk', 'Sarp', 'Batuhan', 'Egemen', 'Koray', 'Mete', 'Ozan', 'Selim'];
  const SOYADLAR = ['Aksoy', 'Ertürk', 'Demirtaş', 'Karaca', 'Özkan', 'Tekin', 'Yalçın', 'Sarı', 'Çelebi', 'Korkmaz', 'Güler', 'Aydın', 'Erdem', 'Kılıç', 'Şahin', 'Arslan', 'Uysal', 'Doğan', 'Kaya', 'Öztürk', 'Bayram', 'Aktaş', 'Yavuz', 'Coşkun', 'Tuncer', 'Çınar', 'Erol', 'Taş', 'Polat', 'Sezer',
    'Kurt', 'Keskin', 'Akın', 'Bulut', 'Ünal', 'Eren', 'Aslan', 'Işık', 'Şen', 'Koç', 'Kalkan', 'Baysal', 'Ekinci', 'Gündoğdu', 'Sönmez', 'Uçar', 'Vural', 'Yazıcı', 'Altun', 'Başaran', 'Cengiz', 'Duman', 'Esen', 'Günay', 'Karakaya', 'Metin', 'Orhan', 'Pekcan', 'Tan', 'Varol'];
  const SIRKETLER = ['Karadeniz Lojistik A.Ş.', 'Mavikule Gıda San. ve Tic. Ltd. Şti.', 'Ergin Makina A.Ş.', 'Toros Tekstil A.Ş.', 'Beyazsu Enerji A.Ş.', 'Ilgaz Yapı Ltd. Şti.', 'Kuzey Ege Tarım A.Ş.', 'Datça Turizm Ltd. Şti.', 'Anadolu Kablo Sistemleri A.Ş.',
    'Palandöken Otomotiv A.Ş.', 'Mercan Medikal Ltd. Şti.', 'Sarıyer Ambalaj A.Ş.', 'Göksu Mobilya Ltd. Şti.', 'Kapadokya Seramik A.Ş.', 'Uludağ Soğuk Zincir A.Ş.', 'Kıyı Denizcilik A.Ş.', 'Mimaroba İnşaat Ltd. Şti.', 'Pirinç Yazılım A.Ş.',
    'Bozcaada Bağcılık Ltd. Şti.', 'Harran Pamuk A.Ş.', 'Munzur Su Ürünleri Ltd. Şti.', 'Tuzla Metal Döküm A.Ş.', 'Kaçkar Kırtasiye Ltd. Şti.', 'Eflatun Ecza Deposu A.Ş.', 'Salda Kimya A.Ş.', 'Gediz Elektrik Taahhüt Ltd. Şti.', 'Yamaç Mimarlık Ltd. Şti.'];
  const SEMTLER = ['Kadıköy', 'Beşiktaş', 'Çankaya', 'Karşıyaka', 'Nilüfer', 'Ataşehir', 'Bornova', 'Muratpaşa', 'Şişli', 'Üsküdar', 'Konak', 'Yenimahalle'];
  const FATURALAR = ['Elektrik faturası', 'Doğalgaz faturası', 'İnternet faturası', 'Su faturası', 'GSM faturası', 'Aidat ödemesi'];
  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const HISSE_TANIM = [
    { kod: 'THYAO', ad: 'Türk Hava Yolları', f0: 298.5 }, { kod: 'ASELS', ad: 'Aselsan', f0: 132.4 },
    { kod: 'GARAN', ad: 'Garanti BBVA', f0: 118.9 }, { kod: 'EREGL', ad: 'Ereğli Demir Çelik', f0: 27.36 },
    { kod: 'KCHOL', ad: 'Koç Holding', f0: 184.2 }, { kod: 'SISE', ad: 'Şişecam', f0: 41.18 },
    { kod: 'TUPRS', ad: 'Tüpraş', f0: 162.7 }, { kod: 'BIMAS', ad: 'BİM Mağazalar', f0: 512.0 }
  ];

  const TR = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'i̇': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a' };
  const ascii = (s) => s.toLocaleLowerCase('tr-TR').replace(/[çğıöşüâ]/g, (c) => TR[c] || c).replace(/[^a-z0-9]+/g, '');

  /* Zaman penceresi: bugünden geriye 190 gün */
  const GUN = 86400000;
  const simdi = new Date();
  const bugun = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate());
  const PENCERE = 190;
  const baslangic = new Date(bugun.getTime() - (PENCERE - 1) * GUN);
  const gunTarihi = (d) => new Date(baslangic.getFullYear(), baslangic.getMonth(), baslangic.getDate() + d);
  const simdiDk = simdi.getHours() * 60 + simdi.getMinutes();
  function zamanUret(d) {
    const ust = d === PENCERE - 1 ? Math.min(1230, simdiDk - 5) : 1230;
    if (ust < 510) return null;
    const dk = randInt(510, ust);
    const t = gunTarihi(d);
    t.setHours(Math.floor(dk / 60), dk % 60, randInt(0, 59), randInt(0, 999));
    return t;
  }

  /* Hisseler: günlük temsili fiyat serisi (kuruş) */
  const hisseler = HISSE_TANIM.map((h) => {
    const fiyatlar = [];
    let p = h.f0;
    for (let d = 0; d < PENCERE; d++) {
      p = Math.max(1, p * (1 + (rng() - 0.485) * 0.032));
      fiyatlar.push(kurus(p));
    }
    return { kod: h.kod, ad: h.ad, fiyatlar, guncel: fiyatlar[PENCERE - 1] };
  });
  const hisseMap = new Map(hisseler.map((h) => [h.kod, h]));

  /* Müşteriler */
  const musteriler = [];
  const kullanilanNo = new Set();
  const kullanilanAd = new Set();
  let sirketSira = 0;
  const PASIF_MUSTERI = new Set([19, 65, 122, 152, 173]); // hepsi bireysel (sıra % 7 !== 3)
  for (let i = 0; i < 180; i++) {
    const kurumsal = i % 7 === 3 && sirketSira < SIRKETLER.length;
    let ad;
    if (kurumsal) ad = SIRKETLER[sirketSira++];
    else { do { ad = pick(ADLAR) + ' ' + pick(SOYADLAR); } while (kullanilanAd.has(ad)); }
    kullanilanAd.add(ad);
    let no; do { no = String(randInt(30000000, 69999999)); } while (kullanilanNo.has(no));
    kullanilanNo.add(no);
    const yeni = rng() < 0.12;
    const kayit = yeni
      ? new Date(baslangic.getTime() + randInt(2, PENCERE - 20) * GUN + randInt(9, 17) * 3600000)
      : new Date(2018, 1, 1 + randInt(0, 2900), randInt(9, 17), randInt(0, 59));
    const parca = ad.split(' ');
    const eposta = kurumsal
      ? 'finans@' + ascii(parca.slice(0, 2).join('')) + '.example.com'
      : ascii(parca[0]) + '.' + ascii(parca[1]) + '@example.com';
    const telefon = kurumsal
      ? `+90 ${pick(['212', '216', '312', '232', '224'])} ${randInt(200, 699)} ${String(randInt(10, 99))} ${String(randInt(10, 99))}`
      : `+90 5${pick(['32', '33', '35', '36', '42', '44', '05', '06', '53', '54'])} ${randInt(200, 989)} ${String(randInt(10, 99))} ${String(randInt(10, 99))}`;
    musteriler.push({ id: i + 1, no, ad, tip: kurumsal ? 'KURUMSAL' : 'BIREYSEL', eposta, telefon, kayit, aktif: !PASIF_MUSTERI.has(i + 1) });
  }

  /* Hesaplar */
  const hesaplar = [];
  let hesapId = 5001;
  for (const m of musteriler) {
    const r = rng();
    const adet = m.tip === 'KURUMSAL' ? randInt(2, 3) : r < 0.52 ? 1 : r < 0.9 ? 2 : 3;
    for (let ek = 1; ek <= adet; ek++) {
      const tip = ek === 1 ? 'VADESIZ' : ek === 2 ? (rng() < 0.75 ? 'YATIRIM' : 'VADESIZ') : (rng() < 0.5 ? 'VADESIZ' : 'YATIRIM');
      const acilis = ek === 1
        ? new Date(m.kayit.getTime() + randInt(0, 3) * GUN)
        : new Date(m.kayit.getTime() + randInt(10, 900) * GUN);
      if (acilis > bugun) continue;
      let aktivite;
      if (m.tip === 'KURUMSAL') aktivite = tip === 'VADESIZ' ? 0.15 + rng() * 0.3 : 0.03 + rng() * 0.05;
      else aktivite = tip === 'VADESIZ' ? 0.05 + rng() * 0.14 : 0.02 + rng() * 0.05;
      if (rng() < 0.06) aktivite *= 2.6; // birkaç çok aktif hesap
      hesaplar.push({
        id: hesapId++, musteriId: m.id, ek, no: `1001-${m.no}-${String(ek).padStart(2, '0')}`,
        tip, bakiye: 0, acilis, aktif: true, portfoy: {},
        _aktivite: aktivite, _maas: m.tip === 'BIREYSEL' && ek === 1 && rng() < 0.72,
        _maasGunu: rng() < 0.5 ? 1 : 15, _maasTutar: kurus(skew(19000, 96000)),
        _kapanis: null
      });
    }
  }
  const hesapMap = new Map(hesaplar.map((h) => [h.id, h]));
  const hesaplarByMusteri = new Map();
  for (const h of hesaplar) {
    if (!hesaplarByMusteri.has(h.musteriId)) hesaplarByMusteri.set(h.musteriId, []);
    hesaplarByMusteri.get(h.musteriId).push(h);
  }
  const musteriMap = new Map(musteriler.map((m) => [m.id, m]));

  // Kapanacak hesaplar: pasif müşterilerin tüm hesapları + birkaç ek hesap
  // Kapanış günü hesabın açılışından sonra olmalı; pasif hesapların bakiyesi sıfırdır
  const acilisGunu = (h) => Math.max(0, Math.ceil((h.acilis - baslangic) / GUN));
  for (const m of musteriler) {
    const hs = hesaplarByMusteri.get(m.id) || [];
    if (!m.aktif) hs.forEach((h) => { h._kapanis = Math.min(PENCERE - 2, Math.max(randInt(120, PENCERE - 12), acilisGunu(h) + 3)); });
    else if (m.tip === 'BIREYSEL' && hs.length > 1 && rng() < 0.05) { const h = hs[hs.length - 1]; h._kapanis = Math.min(PENCERE - 2, Math.max(randInt(100, PENCERE - 5), acilisGunu(h) + 3)); }
  }

  /* İşlem motoru (PKG_ISLEM + trigger'ın JS karşılığı) */
  const islemler = [];
  const islemlerByHesap = new Map(hesaplar.map((h) => [h.id, []]));
  let islemId = 1000001;
  let refSira = 4100;
  const ARTI = new Set(['YATIRMA', 'TRANSFER_GELEN', 'SATIM']);

  function kaydet(h, tip, tutar, zaman, aciklama, ek) {
    const kayit = Object.assign({ id: islemId++, hesapId: h.id, tip, tutar, zaman, aciklama, karsiHesapId: null, ref: null, hisse: null, adet: null, fiyat: null }, ek || {});
    h.bakiye += ARTI.has(tip) ? tutar : -tutar;
    kayit.bakiyeSonra = h.bakiye;
    islemler.push(kayit);
    if (!islemlerByHesap.has(h.id)) islemlerByHesap.set(h.id, []);
    islemlerByHesap.get(h.id).push(kayit);
    return kayit;
  }
  function referans(zaman) {
    const y = zaman.getFullYear().toString().slice(2);
    const a = String(zaman.getMonth() + 1).padStart(2, '0');
    const g = String(zaman.getDate()).padStart(2, '0');
    return `TRF${y}${a}${g}${String(refSira++).padStart(5, '0')}`;
  }
  function transfer(kaynak, hedef, tutar, zaman, acikGiden, acikGelen) {
    const ref = referans(zaman);
    const g = kaydet(kaynak, 'TRANSFER_GIDEN', tutar, zaman, acikGiden, { karsiHesapId: hedef.id, ref });
    kaydet(hedef, 'TRANSFER_GELEN', tutar, zaman, acikGelen, { karsiHesapId: kaynak.id, ref });
    return g;
  }
  function hisseAl(h, kod, adet, fiyat, zaman) {
    const tutar = adet * fiyat;
    const k = kaydet(h, 'ALIM', tutar, zaman, `${kod} ${adet} adet alım`, { hisse: kod, adet, fiyat });
    const p = h.portfoy[kod] || (h.portfoy[kod] = { adet: 0, maliyet: 0 });
    p.adet += adet; p.maliyet += tutar;
    return k;
  }
  function hisseSat(h, kod, adet, fiyat, zaman) {
    const p = h.portfoy[kod];
    const tutar = adet * fiyat;
    const ortalama = p.maliyet / p.adet;
    p.maliyet = Math.round(p.maliyet - ortalama * adet); p.adet -= adet;
    if (p.adet === 0) delete h.portfoy[kod];
    return kaydet(h, 'SATIM', tutar, zaman, `${kod} ${adet} adet satım`, { hisse: kod, adet, fiyat });
  }

  const adKisa = (m) => (m.tip === 'KURUMSAL' ? m.ad.split(' ').slice(0, 2).join(' ') : m.ad);
  const aktifVadesizler = () => hesaplar.filter((h) => h.aktif && h.tip === 'VADESIZ');

  function gunlukIslem(h, d, zaman) {
    const m = musteriMap.get(h.musteriId);
    const kendi = hesaplarByMusteri.get(m.id).filter((x) => x.id !== h.id && x.aktif && x.acilis <= zaman);
    const r = rng();
    if (h.tip === 'YATIRIM') {
      const hisseKodlari = Object.keys(h.portfoy);
      if (r < 0.46 && h.bakiye > 150000) {
        const hs = pick(hisseler); const f = hs.fiyatlar[d];
        const adet = Math.max(1, Math.floor((h.bakiye * (0.08 + rng() * 0.35)) / f));
        if (adet * f <= h.bakiye) hisseAl(h, hs.kod, adet, f, zaman);
      } else if (r < 0.82 && hisseKodlari.length) {
        const kod = pick(hisseKodlari); const p = h.portfoy[kod];
        const adet = rng() < 0.4 ? p.adet : Math.max(1, Math.floor(p.adet * (0.2 + rng() * 0.5)));
        hisseSat(h, kod, adet, hisseMap.get(kod).fiyatlar[d], zaman);
      } else {
        const vadesiz = kendi.find((x) => x.tip === 'VADESIZ');
        if (vadesiz && h.bakiye > 200000) {
          const t = Math.min(h.bakiye, kurus(Math.round(skew(1000, 60000) / 100) * 100));
          transfer(h, vadesiz, t, zaman, 'Vadesiz hesaba aktarım', 'Yatırım hesabından aktarım');
        }
      }
      return;
    }
    if (m.tip === 'KURUMSAL') {
      if (r < 0.42) kaydet(h, 'YATIRMA', kurus(skew(4200, 380000)), zaman, `Müşteri tahsilatı, fatura no ${zaman.getFullYear()}/${randInt(1000, 9999)}`);
      else if (r < 0.66) {
        const t = kurus(skew(2500, 190000));
        if (t <= h.bakiye) kaydet(h, 'CEKME', t, zaman, pick(['Tedarikçi ödemesi (EFT)', 'Vergi ödemesi (KDV)', 'Kira ödemesi', 'Nakliye gideri', 'Hammadde ödemesi (EFT)']));
      } else if (r < 0.86) {
        const hedefler = aktifVadesizler().filter((x) => x.musteriId !== m.id && x.acilis <= zaman);
        const hedef = pick(hedefler); const hm = musteriMap.get(hedef.musteriId);
        const t = kurus(skew(1500, hm.tip === 'KURUMSAL' ? 240000 : 38000));
        if (t <= h.bakiye) transfer(h, hedef, t, zaman, `${adKisa(hm)} hesabına havale`, `${adKisa(m)} hesabından havale`);
      } else {
        const t = kurus(skew(900, 26000));
        if (t <= h.bakiye) kaydet(h, 'CEKME', t, zaman, `ATM nakit çekim, ${pick(SEMTLER)}`);
      }
      return;
    }
    // Bireysel vadesiz
    if (r < 0.26) {
      const t = kurus(Math.round(skew(500, 6000) / 50) * 50);
      if (t <= h.bakiye) kaydet(h, 'CEKME', t, zaman, `ATM nakit çekim, ${pick(SEMTLER)}`);
    } else if (r < 0.5) {
      const t = kurus(skew(180, 3200));
      if (t <= h.bakiye) kaydet(h, 'CEKME', t, zaman, pick(FATURALAR));
    } else if (r < 0.62) {
      const t = kurus(skew(1800, 28000));
      if (t <= h.bakiye) kaydet(h, 'CEKME', t, zaman, 'Kredi kartı borç ödemesi');
    } else if (r < 0.76) {
      const hedef = pick(aktifVadesizler().filter((x) => x.musteriId !== m.id && x.acilis <= zaman));
      const hm = musteriMap.get(hedef.musteriId);
      const t = kurus(Math.round(skew(250, 24000)));
      if (t <= h.bakiye) transfer(h, hedef, t, zaman, `${adKisa(hm)} hesabına havale`, `${adKisa(m)} hesabından havale`);
    } else if (r < 0.88) {
      const yatirim = kendi.find((x) => x.tip === 'YATIRIM');
      const t = kurus(Math.round(skew(1000, 40000) / 100) * 100);
      if (yatirim && t <= h.bakiye) transfer(h, yatirim, t, zaman, 'Yatırım hesabına aktarım', 'Vadesiz hesaptan aktarım');
      else kaydet(h, 'YATIRMA', kurus(Math.round(skew(1000, 18000) / 50) * 50), zaman, `Nakit yatırma, ${pick(SEMTLER)} şube`);
    } else {
      kaydet(h, 'YATIRMA', kurus(Math.round(skew(1000, 25000) / 50) * 50), zaman, `Nakit yatırma, ${pick(SEMTLER)} şube`);
    }
  }

  // Gün gün, zaman sırasıyla üret
  for (let d = 0; d < PENCERE; d++) {
    const gunBas = gunTarihi(d);
    const gunSon = new Date(gunBas.getTime() + GUN);
    const olaylar = [];
    for (const h of hesaplar) {
      if (!h.aktif) continue;
      const m = musteriMap.get(h.musteriId);
      if (d === 0 && h.acilis < gunBas) {
        const t = h.tip === 'YATIRIM' ? skew(8000, 420000) : m.tip === 'KURUMSAL' ? skew(160000, 4800000) : skew(1500, 140000);
        const z = new Date(gunBas); z.setHours(9, 0, 0, 0);
        olaylar.push({ z, f: () => kaydet(h, 'YATIRMA', kurus(t), z, 'Devir bakiyesi (önceki dönem)') });
      }
      if (h.acilis >= gunBas && h.acilis < gunSon) {
        const z = new Date(h.acilis); if (z.getHours() < 9) z.setHours(10, randInt(0, 59));
        const t = h.tip === 'YATIRIM' ? skew(5000, 150000) : m.tip === 'KURUMSAL' ? skew(50000, 900000) : skew(500, 25000);
        olaylar.push({ z, f: () => kaydet(h, 'YATIRMA', kurus(Math.round(t / 10) * 10), z, 'Açılış bakiyesi') });
      }
      if (h.acilis >= gunSon) continue;
      if (h._kapanis === d) {
        const z = zamanUret(d) || new Date(gunBas.getTime() + 11 * 3600000);
        olaylar.push({ z, son: true, f: () => {
          for (const kod of Object.keys(h.portfoy)) hisseSat(h, kod, h.portfoy[kod].adet, hisseMap.get(kod).fiyatlar[d], z);
          if (h.bakiye > 0) kaydet(h, 'CEKME', h.bakiye, z, 'Hesap kapanışı, bakiye ödemesi');
          h.aktif = false;
        } });
        continue;
      }
      if (h._maas && gunBas.getDate() === h._maasGunu) {
        const z = new Date(gunBas); z.setHours(randInt(8, 10), randInt(0, 59), randInt(0, 59));
        if (d < PENCERE - 1 || z.getHours() * 60 + z.getMinutes() < simdiDk) {
          olaylar.push({ z, f: () => kaydet(h, 'YATIRMA', h._maasTutar, z, `Maaş ödemesi, ${AYLAR[gunBas.getMonth()]}`) });
        }
      }
      let n = 0; let lam = h._aktivite; while (rng() < lam && n < 4) { n++; lam *= 0.55; }
      for (let k = 0; k < n; k++) {
        const z = zamanUret(d);
        if (z) olaylar.push({ z, f: () => { if (h.aktif) gunlukIslem(h, d, z); } });
      }
    }
    olaylar.sort((a, b) => a.z - b.z || (a.son ? 1 : 0) - (b.son ? 1 : 0));
    for (const o of olaylar) o.f();
  }
  for (const m of musteriler) {
    const hs = hesaplarByMusteri.get(m.id) || [];
    if (!m.aktif) hs.forEach((h) => { h.aktif = false; });
  }
  for (const h of hesaplar) { delete h._aktivite; delete h._maas; delete h._maasGunu; delete h._maasTutar; delete h._kapanis; }

  /* Sorgu yardımcıları (repository katmanının karşılığı) */
  const db = {
    musteriler, hesaplar, islemler, hisseler,
    musteriMap, hesapMap, hisseMap, hesaplarByMusteri, islemlerByHesap,
    bugun, simdi, baslangic, PENCERE, GUN, ARTI,
    kaydet, transfer, hisseAl, hisseSat, referans,
    sonrakiIslemId: () => islemId,
    musteri: (id) => musteriMap.get(Number(id)),
    hesap: (id) => hesapMap.get(Number(id)),
    musteriHesaplari: (id) => hesaplarByMusteri.get(Number(id)) || [],
    hesapIslemleri: (id) => islemlerByHesap.get(Number(id)) || [],
    isaret: (tip) => (ARTI.has(tip) ? 1 : -1),
    bakiyeTarihte(hesapId, tarih) {
      const list = islemlerByHesap.get(Number(hesapId)) || [];
      let b = 0;
      for (const i of list) { if (i.zaman < tarih) b = i.bakiyeSonra; else break; }
      return b;
    },
    musteriBakiye: (id) => (hesaplarByMusteri.get(Number(id)) || []).reduce((s, h) => s + h.bakiye, 0),
    sonIslem(hesapId) { const l = islemlerByHesap.get(Number(hesapId)) || []; return l[l.length - 1] || null; },
    gunIndex(tarih) { return Math.max(0, Math.min(PENCERE - 1, Math.floor((new Date(tarih.getFullYear(), tarih.getMonth(), tarih.getDate()) - baslangic) / GUN))); },
    ekle: { musteri(m) { musteriler.push(m); musteriMap.set(m.id, m); hesaplarByMusteri.set(m.id, []); },
      hesap(h) { hesaplar.push(h); hesapMap.set(h.id, h); islemlerByHesap.set(h.id, []); (hesaplarByMusteri.get(h.musteriId) || hesaplarByMusteri.set(h.musteriId, []).get(h.musteriId)).push(h); } },

    /* Tutarlılık doğrulaması: BAKIYE = işlemlerin trigger kuralına göre toplamı */
    dogrula() {
      let hata = 0;
      for (const h of hesaplar) {
        const list = islemlerByHesap.get(h.id) || [];
        let s = 0;
        for (const i of list) { s += ARTI.has(i.tip) ? i.tutar : -i.tutar; if (s < 0 || s !== i.bakiyeSonra) hata++; }
        if (s !== h.bakiye) hata++;
      }
      const ciftler = new Map();
      for (const i of islemler) if (i.ref) ciftler.set(i.ref, (ciftler.get(i.ref) || 0) + (i.tip === 'TRANSFER_GIDEN' ? -i.tutar : i.tutar));
      for (const v of ciftler.values()) if (v !== 0) hata++;
      const ozet = { hesap: hesaplar.length, islem: islemler.length, transferCifti: ciftler.size, hata };
      (hata ? console.error : console.info)('[Hesap Masası] Tutarlılık kontrolü', ozet);
      return ozet;
    }
  };
  HM.db = db;
})();
