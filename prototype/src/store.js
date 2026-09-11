/* Servis katmanı (Application/Service karşılığı) + olay günlüğü.
   Kullanıcı eylemleri localStorage'da olay olarak tutulur ve tohum verinin üstüne yeniden oynatılır.
   Kurallar PKG_ISLEM'in raise ettiği hatalarla aynı kodları üretir. */
(function () {
  'use strict';
  const HM = (window.HM = window.HM || {});
  const db = HM.db; const u = HM.u;

  class OraHata extends Error {
    constructor(kod, mesaj, alan) { super(mesaj); this.kod = kod; this.alan = alan || null; }
  }

  const ANAHTAR = 'hm-olaylar-v1';
  const kayit = { gun: u.isoGun(db.bugun), olaylar: [] };
  let oynatiliyor = false;
  const izEkle = (g) => { if (!oynatiliyor) HM.iz.ekle(g); };
  const kaydetOlay = (t, veri) => {
    if (oynatiliyor) return;
    kayit.olaylar.push({ t, veri });
    try { localStorage.setItem(ANAHTAR, JSON.stringify(kayit)); } catch (e) { /* depolama kapalıysa oturum içi kalır */ }
  };
  const tl = (k) => (k / 100).toFixed(2);
  const maxId = (arr) => arr.reduce((m, x) => Math.max(m, x.id), 0);

  function commitIz(not) {
    izEkle({ katman: 'Dapper', baslik: 'Transaction onayı', sql: 'COMMIT', not: not || '.NET: using var tx = conn.BeginTransaction(); ... tx.Commit(); hata olursa tx.Rollback() ile hiçbir kayıt yazılmaz.' });
  }
  function triggerIz(islem, once) {
    const arti = db.ARTI.has(islem.tip);
    izEkle({ katman: 'Trigger', baslik: 'TRG_ISLEM_BAKIYE_GUNCELLE', satir: 1,
      sql: `-- AFTER INSERT ON ISLEM FOR EACH ROW (ISLEM_TIPI = '${islem.tip}')\nUPDATE HESAP SET BAKIYE = BAKIYE ${arti ? '+' : '-'} :NEW.TUTAR\nWHERE HESAP_ID = :NEW.HESAP_ID`,
      binds: { 'NEW.TUTAR': tl(islem.tutar), 'NEW.HESAP_ID': islem.hesapId },
      not: `Bakiye ${u.para(once)} → ${u.para(islem.bakiyeSonra)}` });
  }
  function hataIz(paket, hata) {
    izEkle({ katman: 'PL/SQL paket', baslik: `${paket} (reddedildi)`,
      sql: `-- ${hata.kod}: ${hata.message}\nROLLBACK`, not: 'Transaction geri alındı; ISLEM tablosuna kayıt yazılmadı, bakiyeler değişmedi.' });
  }

  const api = {
    OraHata,
    musteriNoUret() {
      let no; do { no = String(30000000 + Math.floor(Math.random() * 40000000)); } while (db.musteriler.some((m) => m.no === no));
      return no;
    },
    musteriNoSahibi(no, haricId) { return db.musteriler.find((m) => m.no === no && m.id !== haricId) || null; },

    musteriEkle(v) {
      const sahip = api.musteriNoSahibi(v.no);
      if (sahip) throw new OraHata('ORA-00001', `Bu müşteri no kayıtlı: ${sahip.no} (${sahip.ad})`, 'no');
      const m = { id: v.id || maxId(db.musteriler) + 1, no: v.no, ad: v.ad.trim(), tip: v.tip, eposta: v.eposta || '', telefon: v.telefon || '', kayit: v.kayit ? new Date(v.kayit) : new Date(), aktif: true };
      db.ekle.musteri(m);
      kaydetOlay('musteriEkle', Object.assign({}, v, { id: m.id, kayit: m.kayit.toISOString() }));
      izEkle({ katman: 'EF Core', baslik: 'Müşteri ekleme', satir: 1,
        sql: 'INSERT INTO "MUSTERI" ("MUSTERI_NO", "AD_SOYAD", "MUSTERI_TIPI", "EPOSTA", "TELEFON")\nVALUES (:p0, :p1, :p2, :p3, :p4)\nRETURNING "MUSTERI_ID", "KAYIT_TARIHI" INTO :p5, :p6',
        binds: { p0: m.no, p1: m.ad, p2: m.tip, p3: m.eposta || 'NULL', p4: m.telefon || 'NULL', p5: m.id } });
      return m;
    },
    musteriGuncelle(id, v) {
      const m = db.musteri(id);
      const sahip = api.musteriNoSahibi(v.no, m.id);
      if (sahip) throw new OraHata('ORA-00001', `Bu müşteri no kayıtlı: ${sahip.no} (${sahip.ad})`, 'no');
      Object.assign(m, { no: v.no, ad: v.ad.trim(), tip: v.tip, eposta: v.eposta || '', telefon: v.telefon || '' });
      kaydetOlay('musteriGuncelle', Object.assign({ id: m.id }, v));
      izEkle({ katman: 'EF Core', baslik: 'Müşteri güncelleme', satir: 1,
        sql: 'UPDATE "MUSTERI" SET "MUSTERI_NO" = :p0, "AD_SOYAD" = :p1, "MUSTERI_TIPI" = :p2, "EPOSTA" = :p3, "TELEFON" = :p4\nWHERE "MUSTERI_ID" = :p5',
        binds: { p0: m.no, p1: m.ad, p2: m.tip, p3: m.eposta || 'NULL', p4: m.telefon || 'NULL', p5: m.id } });
      return m;
    },
    musteriPasifeAlinabilir(id) {
      const bakiyeli = db.musteriHesaplari(id).filter((h) => h.aktif && (h.bakiye !== 0 || Object.keys(h.portfoy).length));
      return bakiyeli.length ? { olur: false, neden: `${bakiyeli.length} hesabında bakiye var. Önce bakiyeleri sıfırlayın.` } : { olur: true };
    },
    musteriDurum(id, aktif) {
      const m = db.musteri(id);
      if (!aktif) { const k = api.musteriPasifeAlinabilir(id); if (!k.olur) throw new OraHata('ORA-20004', k.neden); }
      m.aktif = aktif;
      kaydetOlay('musteriDurum', { id: m.id, aktif });
      izEkle({ katman: 'EF Core', baslik: aktif ? 'Müşteriyi aktifleştirme' : 'Müşteriyi pasife alma (soft delete)', satir: 1,
        sql: 'UPDATE "MUSTERI" SET "AKTIF" = :p0 WHERE "MUSTERI_ID" = :p1', binds: { p0: aktif ? 1 : 0, p1: m.id },
        not: 'Kayıt silinmez; hesaplar ve işlem geçmişi korunur. PKG_ISLEM pasif müşterinin hesaplarında işlem yapılmasına izin vermez.' });
      return m;
    },

    hesapNoOnizle(musteriId) {
      const m = db.musteri(musteriId);
      const ek = db.musteriHesaplari(musteriId).reduce((x, h) => Math.max(x, h.ek), 0) + 1;
      return { ek, no: `1001-${m.no}-${String(ek).padStart(2, '0')}` };
    },
    hesapAc(v) {
      const m = db.musteri(v.musteriId);
      if (!m || !m.aktif) throw new OraHata('ORA-20007', 'Pasif müşteriye hesap açılamaz.');
      const { ek, no } = api.hesapNoOnizle(m.id);
      const h = { id: v.id || maxId(db.hesaplar) + 1, musteriId: m.id, ek, no, tip: v.tip, bakiye: 0, acilis: v.acilis ? new Date(v.acilis) : new Date(), aktif: true, portfoy: {} };
      db.ekle.hesap(h);
      izEkle({ katman: 'EF Core', baslik: 'Hesap açma', satir: 1,
        sql: 'INSERT INTO "HESAP" ("MUSTERI_ID", "HESAP_NO", "HESAP_TIPI")\nVALUES (:p0, :p1, :p2)\nRETURNING "HESAP_ID", "ACILIS_TARIHI" INTO :p3, :p4',
        binds: { p0: m.id, p1: no, p2: h.tip, p3: h.id }, not: 'BAKIYE varsayılan 0; açılış tutarı ayrı bir YATIRMA işlemiyle eklenir.' });
      kaydetOlay('hesapAc', { musteriId: m.id, tip: v.tip, id: h.id, acilis: h.acilis.toISOString() });
      let islem = null;
      if (v.acilisTutar > 0) islem = api.islem({ tip: 'YATIRMA', hesapId: h.id, tutar: v.acilisTutar, aciklama: 'Açılış bakiyesi' }).islem;
      return { hesap: h, islem };
    },
    hesapPasifeAlinabilir(h) {
      if (!h.aktif) return { olur: false, neden: 'Hesap zaten pasif.' };
      if (h.bakiye !== 0 || Object.keys(h.portfoy).length) return { olur: false, neden: 'Bakiyesi sıfır olmayan hesap pasife alınamaz.' };
      return { olur: true };
    },
    hesapPasifeAl(id) {
      const h = db.hesap(id); const k = api.hesapPasifeAlinabilir(h);
      if (!k.olur) throw new OraHata('ORA-20005', k.neden);
      h.aktif = false;
      kaydetOlay('hesapPasifeAl', { id: h.id });
      izEkle({ katman: 'EF Core', baslik: 'Hesabı pasife alma', satir: 1, sql: 'UPDATE "HESAP" SET "AKTIF" = 0 WHERE "HESAP_ID" = :p0 AND "BAKIYE" = 0', binds: { p0: h.id } });
      return h;
    },

    /* İşlem: PKG_ISLEM.YATIR / CEK / TRANSFER / HISSE_AL / HISSE_SAT */
    kontrol(v) {
      const h = db.hesap(v.hesapId);
      if (!h) throw new OraHata('ORA-20008', 'Hesap bulunamadı.', 'hesap');
      if (!h.aktif) throw new OraHata('ORA-20002', 'Bu hesap pasif. İşlem yapılamaz.', 'hesap');
      if (!db.musteri(h.musteriId).aktif) throw new OraHata('ORA-20002', 'Hesap sahibi müşteri pasif. İşlem yapılamaz.', 'hesap');
      if (v.tip === 'ALIM' || v.tip === 'SATIM') {
        if (h.tip !== 'YATIRIM') throw new OraHata('ORA-20006', 'Hisse işlemi yalnız yatırım hesabında yapılır.', 'tip');
        const hs = db.hisseMap.get(v.hisse);
        if (!hs) throw new OraHata('ORA-20009', 'Hisse seçin.', 'hisse');
        if (!(v.adet > 0)) throw new OraHata('ORA-20010', 'Adet 1 veya daha büyük olmalı.', 'adet');
        if (v.tip === 'ALIM' && v.adet * hs.guncel > h.bakiye) throw new OraHata('ORA-20001', `Yetersiz bakiye. Kullanılabilir: ${u.para(h.bakiye)}`, 'adet');
        const poz = h.portfoy[v.hisse] ? h.portfoy[v.hisse].adet : 0;
        if (v.tip === 'SATIM' && v.adet > poz) throw new OraHata('ORA-20003', `Satılabilir adet: ${u.sayi(poz)}`, 'adet');
        return h;
      }
      if (!(v.tutar > 0)) throw new OraHata('ORA-20011', 'Tutar sıfırdan büyük olmalı.', 'tutar');
      if ((v.tip === 'CEKME' || v.tip === 'TRANSFER') && v.tutar > h.bakiye) throw new OraHata('ORA-20001', `Yetersiz bakiye. Kullanılabilir: ${u.para(h.bakiye)}`, 'tutar');
      if (v.tip === 'TRANSFER') {
        const hd = db.hesap(v.hedefId);
        if (!hd) throw new OraHata('ORA-20008', 'Hedef hesabı seçin.', 'hedef');
        if (hd.id === h.id) throw new OraHata('ORA-20012', 'Aynı hesaba transfer yapılamaz.', 'hedef');
        if (!hd.aktif || !db.musteri(hd.musteriId).aktif) throw new OraHata('ORA-20002', 'Hedef hesap pasif. Transfer yapılamaz.', 'hedef');
      }
      return h;
    },
    islem(v) {
      const paket = { YATIRMA: 'PKG_ISLEM.YATIR', CEKME: 'PKG_ISLEM.CEK', TRANSFER: 'PKG_ISLEM.TRANSFER', ALIM: 'PKG_ISLEM.HISSE_AL', SATIM: 'PKG_ISLEM.HISSE_SAT' }[v.tip];
      let h;
      try { h = api.kontrol(v); } catch (e) { if (e instanceof OraHata && !oynatiliyor) hataIz(paket, e); throw e; }
      const zaman = v.zaman ? new Date(v.zaman) : new Date();
      const once = h.bakiye;
      let islem; let ikinci = null;
      if (v.tip === 'YATIRMA' || v.tip === 'CEKME') {
        islem = db.kaydet(h, v.tip, v.tutar, zaman, v.aciklama || (v.tip === 'YATIRMA' ? 'Para yatırma' : 'Para çekme'));
        izEkle({ katman: 'PL/SQL paket', baslik: paket, satir: 1,
          sql: `BEGIN\n  ${paket}(p_hesap_id => :hesap_id, p_tutar => :tutar,\n  ${' '.repeat(paket.length)}p_aciklama => :aciklama, p_islem_id => :islem_id);\nEND;\n-- Gövde (özet):\n--   SELECT AKTIF, BAKIYE INTO v_aktif, v_bakiye FROM HESAP WHERE HESAP_ID = p_hesap_id FOR UPDATE;\n--   INSERT INTO ISLEM (HESAP_ID, ISLEM_TIPI, TUTAR, ACIKLAMA)\n--   VALUES (p_hesap_id, '${v.tip}', p_tutar, p_aciklama) RETURNING ISLEM_ID INTO p_islem_id;`,
          binds: { hesap_id: h.id, tutar: tl(v.tutar), aciklama: islem.aciklama, islem_id: `${islem.id} (çıktı)` } });
        triggerIz(islem, once);
      } else if (v.tip === 'TRANSFER') {
        const hd = db.hesap(v.hedefId); const hdOnce = hd.bakiye;
        const acik = v.aciklama || 'Hesaplar arası transfer';
        islem = db.transfer(h, hd, v.tutar, zaman, acik, acik);
        ikinci = db.islemler[db.islemler.length - 1];
        izEkle({ katman: 'PL/SQL paket', baslik: paket, satir: 2,
          sql: 'BEGIN\n  PKG_ISLEM.TRANSFER(p_kaynak => :kaynak, p_hedef => :hedef, p_tutar => :tutar,\n                     p_aciklama => :aciklama, p_referans => :ref);\nEND;\n-- Gövde (özet):\n--   SELECT HESAP_ID, BAKIYE FROM HESAP WHERE HESAP_ID IN (p_kaynak, p_hedef)\n--   ORDER BY HESAP_ID FOR UPDATE;           -- sabit kilit sırası, deadlock olmaz\n--   IF v_bakiye < p_tutar THEN RAISE_APPLICATION_ERROR(-20001, \'Yetersiz bakiye\'); END IF;\n--   INSERT INTO ISLEM (..., \'TRANSFER_GIDEN\', KARSI_HESAP_ID => p_hedef, REFERANS_NO => p_referans);\n--   INSERT INTO ISLEM (..., \'TRANSFER_GELEN\', KARSI_HESAP_ID => p_kaynak, REFERANS_NO => p_referans);',
          binds: { kaynak: h.id, hedef: hd.id, tutar: tl(v.tutar), aciklama: acik, ref: islem.ref } });
        triggerIz(islem, once);
        triggerIz(ikinci, hdOnce);
      } else {
        const hs = db.hisseMap.get(v.hisse);
        islem = v.tip === 'ALIM' ? db.hisseAl(h, hs.kod, v.adet, hs.guncel, zaman) : db.hisseSat(h, hs.kod, v.adet, hs.guncel, zaman);
        izEkle({ katman: 'PL/SQL paket', baslik: paket, satir: 1,
          sql: `BEGIN\n  ${paket}(p_hesap_id => :hesap_id, p_hisse_kodu => :hisse, p_adet => :adet, p_islem_id => :islem_id);\nEND;\n-- Gövde (özet):\n--   SELECT TEMSILI_FIYAT INTO v_fiyat FROM HISSE WHERE HISSE_KODU = p_hisse_kodu;\n--   INSERT INTO ISLEM (HESAP_ID, ISLEM_TIPI, TUTAR, HISSE_KODU, ADET, BIRIM_FIYAT)\n--   VALUES (p_hesap_id, '${v.tip}', p_adet * v_fiyat, p_hisse_kodu, p_adet, v_fiyat);`,
          binds: { hesap_id: h.id, hisse: hs.kod, adet: v.adet, islem_id: `${islem.id} (çıktı)` } });
        triggerIz(islem, once);
      }
      commitIz();
      kaydetOlay('islem', Object.assign({}, v, { zaman: zaman.toISOString() }));
      return { islem, ikinci };
    },

    sifirla() {
      try { localStorage.removeItem(ANAHTAR); } catch (e) { /* yok */ }
      location.hash = '#/';
      location.reload();
    },
    olaySayisi: () => kayit.olaylar.length
  };

  /* Açılışta olay günlüğünü yeniden oynat (aynı gün içindeyse) */
  (function oynat() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(ANAHTAR) || 'null'); } catch (e) { s = null; }
    if (!s || s.gun !== kayit.gun || !Array.isArray(s.olaylar)) return;
    oynatiliyor = true;
    for (const o of s.olaylar) {
      try {
        if (o.t === 'musteriEkle') api.musteriEkle(o.veri);
        else if (o.t === 'musteriGuncelle') api.musteriGuncelle(o.veri.id, o.veri);
        else if (o.t === 'musteriDurum') api.musteriDurum(o.veri.id, o.veri.aktif);
        else if (o.t === 'hesapAc') api.hesapAc(Object.assign({}, o.veri, { acilisTutar: 0 }));
        else if (o.t === 'hesapPasifeAl') api.hesapPasifeAl(o.veri.id);
        else if (o.t === 'islem') api.islem(o.veri);
        kayit.olaylar.push(o);
      } catch (e) { /* tutarsız olay atlanır */ }
    }
    oynatiliyor = false;
  })();

  HM.api = api;
})();
