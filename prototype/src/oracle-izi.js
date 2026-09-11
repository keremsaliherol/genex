/* Oracle izi: ekranın veya aksiyonun veritabanında çalıştırdığı komutlar.
   Gerçek uygulamada: EF Core DbCommandInterceptor + Dapper sarmalayıcısı → istek kapsamlı toplayıcı
   → yalnız Development/Demo ortamında görünen OracleIzi ViewComponent. */
(function () {
  'use strict';
  const HM = (window.HM = window.HM || {});
  const u = HM.u;

  const KW = new Set(('SELECT FROM WHERE AND OR NOT IN IS NULL AS ON JOIN INNER LEFT GROUP BY ORDER ASC DESC OFFSET ROWS ROW FETCH FIRST NEXT ONLY ' +
    'INSERT INTO VALUES UPDATE SET DELETE BEGIN END FOR RETURNING CASE WHEN THEN ELSE COUNT SUM NVL OVER PARTITION UNBOUNDED PRECEDING ' +
    'TRUNC ADD_MONTHS TO_DATE SYSDATE SYSTIMESTAMP DUAL COMMIT ROLLBACK SAVEPOINT IF RAISE_APPLICATION_ERROR LIKE UPPER EXISTS DISTINCT ' +
    'MAX MIN LAG AFTER EACH TRIGGER PROCEDURE PACKAGE CREATE REPLACE OPEN CURSOR').split(' '));

  function renklendir(sql) {
    const re = /(--[^\n]*)|('(?:[^']|'')*')|(:[A-Za-z_][\w]*)|("[^"]*")|([A-Za-z_][\w$#.]*)|(\d+(?:\.\d+)?)|([\s\S])/g;
    let out = ''; let m;
    while ((m = re.exec(sql))) {
      if (m[1]) out += `<span class="cmt">${u.e(m[1])}</span>`;
      else if (m[2]) out += `<span class="str">${u.e(m[2])}</span>`;
      else if (m[3]) out += `<span class="bind">${u.e(m[3])}</span>`;
      else if (m[4]) out += u.e(m[4]);
      else if (m[5]) out += KW.has(m[5].toUpperCase()) && m[5] === m[5].toUpperCase() ? `<span class="kw">${m[5]}</span>` : u.e(m[5]);
      else out += u.e(m[6] || m[7]);
    }
    return out;
  }

  const PLSQL = new Set(['PL/SQL paket', 'Trigger', 'View']);
  const girdiler = [];
  let sayac = 0;
  let acik = false;
  const sure = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return 2 + (h % 14); };

  function girdiHtml(g) {
    const binds = g.binds ? Object.entries(g.binds).map(([k, v]) => `<span><b>:${u.e(k)}</b> = ${u.e(v)}</span>`).join('') : '';
    return `<article class="iz-girdi">
      <header><span class="katman${PLSQL.has(g.katman) ? ' katman--plsql' : ''}">${u.e(g.katman)}</span><span class="baslik">${u.e(g.baslik)}</span>
      <span class="meta">${u.saatSn(g.zaman)}${g.satir != null ? ` · ${u.sayi(g.satir)} satır` : ''} · temsili ${g.sure} ms</span></header>
      <pre class="sql"><code>${renklendir(g.sql)}</code></pre>
      ${binds ? `<div class="iz-binds">${binds}</div>` : ''}
      ${g.not ? `<div class="iz-not">${u.e(g.not)}</div>` : ''}
    </article>`;
  }

  const iz = {
    renklendir,
    ekle(g) {
      g.zaman = new Date(); g.no = ++sayac; g.sure = g.sure || sure(g.sql);
      girdiler.unshift(g);
      if (girdiler.length > 40) girdiler.length = 40;
      iz.render();
    },
    ekran(ad, ctx) { const f = SABLON[ad]; if (f) f(ctx || {}).forEach(iz.ekle); },
    render() {
      const kok = document.getElementById('iz');
      if (!kok) return;
      const son = girdiler[0];
      kok.querySelector('.iz-son').textContent = son ? `${son.katman}: ${son.baslik}` : 'Henüz komut yok';
      kok.querySelector('.iz-govde').innerHTML = girdiler.length ? girdiler.map(girdiHtml).join('') : '<p class="iz-bos">Bu oturumda henüz bir veritabanı komutu çalışmadı.</p>';
      const s = document.getElementById('iz-sayac'); if (s) s.textContent = String(girdiler.length);
    },
    ac(durum) {
      acik = durum == null ? !acik : durum;
      const kok = document.getElementById('iz');
      kok.setAttribute('data-acik', String(acik));
      kok.querySelector('.iz-bar-btn').setAttribute('aria-expanded', String(acik));
      document.getElementById('iz-dugme').setAttribute('aria-pressed', String(acik));
      if (acik) kok.querySelector('.iz-govde').scrollTop = 0;
    },
    temizle() { girdiler.length = 0; iz.render(); }
  };

  const TUR = "'YATIRMA','TRANSFER_GELEN','SATIM'";

  /* Ekran sorguları: her ekranın okuma komutları */
  const SABLON = {
    genelBakis: (c) => [
      { katman: 'EF Core', baslik: 'Son işlemler', satir: c.son,
        sql: 'SELECT i."ISLEM_ID", i."ISLEM_TIPI", i."TUTAR", i."ISLEM_TARIHI", h."HESAP_NO", m."AD_SOYAD"\nFROM "ISLEM" i\nINNER JOIN "HESAP" h ON i."HESAP_ID" = h."HESAP_ID"\nINNER JOIN "MUSTERI" m ON h."MUSTERI_ID" = m."MUSTERI_ID"\nORDER BY i."ISLEM_TARIHI" DESC\nFETCH FIRST :p0 ROWS ONLY',
        binds: { p0: c.son } },
      { katman: 'View', baslik: 'En aktif müşteriler', satir: 5,
        sql: 'SELECT MUSTERI_ID, AD_SOYAD, TOPLAM_ISLEM\nFROM VW_EN_AKTIF_MUSTERILER\nORDER BY TOPLAM_ISLEM DESC   -- sıralama view içinde değil, sorguda\nFETCH FIRST 5 ROWS ONLY',
        not: 'Şartnamedeki view ORDER BY içeriyor; view içindeki sıralama tüketen sorgu için garanti değildir, bu yüzden sıralama sorguya taşındı.' },
      { katman: 'Dapper', baslik: 'Günlük nakit akışı (30 gün)', satir: 30,
        sql: "SELECT TRUNC(ISLEM_TARIHI) AS GUN,\n       SUM(CASE WHEN ISLEM_TIPI = 'YATIRMA' THEN TUTAR ELSE 0 END) AS GIRIS,\n       SUM(CASE WHEN ISLEM_TIPI = 'CEKME'   THEN TUTAR ELSE 0 END) AS CIKIS\nFROM ISLEM\nWHERE ISLEM_TARIHI >= TRUNC(SYSDATE) - :gun   -- IDX_ISLEM_TARIH kullanılır\n  AND ISLEM_TIPI IN ('YATIRMA', 'CEKME')\nGROUP BY TRUNC(ISLEM_TARIHI)\nORDER BY GUN",
        binds: { gun: 29 } },
      { katman: 'Dapper', baslik: 'Özet göstergeler', satir: 1,
        sql: 'SELECT (SELECT COUNT(*) FROM MUSTERI WHERE AKTIF = 1)          AS AKTIF_MUSTERI,\n       (SELECT COUNT(*) FROM HESAP   WHERE AKTIF = 1)          AS ACIK_HESAP,\n       (SELECT NVL(SUM(BAKIYE), 0) FROM HESAP WHERE AKTIF = 1) AS TOPLAM_BAKIYE\nFROM DUAL' }
    ],
    musteriListe: (c) => [
      { katman: 'EF Core', baslik: 'Müşteri listesi (sayfa)', satir: c.satir,
        sql: 'SELECT m."MUSTERI_ID", m."MUSTERI_NO", m."AD_SOYAD", m."MUSTERI_TIPI", m."EPOSTA", m."TELEFON",\n       m."KAYIT_TARIHI", m."AKTIF",\n       (SELECT COUNT(*) FROM "HESAP" h WHERE h."MUSTERI_ID" = m."MUSTERI_ID") AS "HESAP_SAYISI",\n       (SELECT NVL(SUM(h0."BAKIYE"), 0) FROM "HESAP" h0 WHERE h0."MUSTERI_ID" = m."MUSTERI_ID") AS "TOPLAM_BAKIYE"\nFROM "MUSTERI" m\nWHERE (:q IS NULL OR UPPER(m."AD_SOYAD") LIKE \'%\' || UPPER(:q) || \'%\' OR m."MUSTERI_NO" LIKE :q || \'%\')\n  AND (:tip IS NULL OR m."MUSTERI_TIPI" = :tip)\nORDER BY m."AD_SOYAD"\nOFFSET :p0 ROWS FETCH NEXT :p1 ROWS ONLY',
        binds: { q: c.q || 'NULL', tip: c.tip || 'NULL', p0: c.offset, p1: c.boyut },
        not: 'Türkçe sıralama için oturumda NLS_SORT = XTURKISH ayarlanır.' },
      { katman: 'EF Core', baslik: 'Toplam kayıt sayısı', satir: 1,
        sql: 'SELECT COUNT(*)\nFROM "MUSTERI" m\nWHERE (:q IS NULL OR UPPER(m."AD_SOYAD") LIKE \'%\' || UPPER(:q) || \'%\')\n  AND (:tip IS NULL OR m."MUSTERI_TIPI" = :tip)', binds: { q: c.q || 'NULL', tip: c.tip || 'NULL' } }
    ],
    musteriDetay: (c) => [
      { katman: 'EF Core', baslik: 'Müşteri ve hesapları (Include)', satir: c.hesap + 1,
        sql: 'SELECT m."MUSTERI_ID", m."MUSTERI_NO", m."AD_SOYAD", m."MUSTERI_TIPI", m."EPOSTA", m."TELEFON",\n       m."KAYIT_TARIHI", m."AKTIF", h."HESAP_ID", h."HESAP_NO", h."HESAP_TIPI", h."BAKIYE", h."ACILIS_TARIHI", h."AKTIF"\nFROM "MUSTERI" m\nLEFT JOIN "HESAP" h ON m."MUSTERI_ID" = h."MUSTERI_ID"\nWHERE m."MUSTERI_ID" = :p0\nORDER BY h."HESAP_NO"', binds: { p0: c.id } }
    ],
    hesapListe: (c) => [
      { katman: 'EF Core', baslik: 'Hesap listesi (sayfa)', satir: c.satir,
        sql: 'SELECT h."HESAP_ID", h."HESAP_NO", h."HESAP_TIPI", h."BAKIYE", h."ACILIS_TARIHI", h."AKTIF",\n       m."MUSTERI_ID", m."AD_SOYAD"\nFROM "HESAP" h\nINNER JOIN "MUSTERI" m ON h."MUSTERI_ID" = m."MUSTERI_ID"\nWHERE (:tip IS NULL OR h."HESAP_TIPI" = :tip)\nORDER BY h."HESAP_NO"\nOFFSET :p0 ROWS FETCH NEXT :p1 ROWS ONLY',
        binds: { tip: c.tip || 'NULL', p0: c.offset, p1: c.boyut } }
    ],
    hesapDetay: (c) => {
      const l = [{ katman: 'EF Core', baslik: 'Hesap ve sahibi', satir: 1,
        sql: 'SELECT h."HESAP_ID", h."HESAP_NO", h."HESAP_TIPI", h."BAKIYE", h."ACILIS_TARIHI", h."AKTIF", m."AD_SOYAD"\nFROM "HESAP" h\nINNER JOIN "MUSTERI" m ON h."MUSTERI_ID" = m."MUSTERI_ID"\nWHERE h."HESAP_ID" = :p0', binds: { p0: c.id } },
      { katman: 'Dapper', baslik: 'Son hareketler', satir: c.hareket,
        sql: 'SELECT ISLEM_ID, ISLEM_TARIHI, ISLEM_TIPI, TUTAR, ACIKLAMA, KARSI_HESAP_ID\nFROM ISLEM\nWHERE HESAP_ID = :hesap_id\nORDER BY ISLEM_TARIHI DESC, ISLEM_ID DESC\nFETCH FIRST 20 ROWS ONLY', binds: { hesap_id: c.id } }];
      if (c.yatirim) l.unshift({ katman: 'View', baslik: 'Portföy pozisyonları', satir: c.pozisyon,
        sql: "SELECT HISSE_KODU, NET_ADET, ORT_MALIYET\nFROM VW_PORTFOY\nWHERE HESAP_ID = :hesap_id AND NET_ADET > 0\n-- VW_PORTFOY: SUM(CASE ISLEM_TIPI WHEN 'ALIM' THEN ADET ELSE -ADET END) GROUP BY HESAP_ID, HISSE_KODU",
        binds: { hesap_id: c.id } });
      return l;
    },
    ekstre: (c) => [
      { katman: 'Dapper', baslik: 'Ekstre satırları, yürüyen bakiye', satir: c.satir,
        sql: `SELECT ISLEM_ID, ISLEM_TARIHI, ISLEM_TIPI, TUTAR, ACIKLAMA, KARSI_HESAP_ID,\n       :acilis + SUM(CASE WHEN ISLEM_TIPI IN (${TUR}) THEN TUTAR ELSE -TUTAR END)\n                 OVER (ORDER BY ISLEM_TARIHI, ISLEM_ID ROWS UNBOUNDED PRECEDING) AS BAKIYE\nFROM ISLEM\nWHERE HESAP_ID = :hesap_id\n  AND ISLEM_TARIHI >= :bas\n  AND ISLEM_TARIHI <  :bit + 1\nORDER BY ISLEM_TARIHI, ISLEM_ID`,
        binds: { hesap_id: c.id, bas: c.bas, bit: c.bit, acilis: c.acilis } },
      { katman: 'Dapper', baslik: 'Dönem başı bakiye', satir: 1,
        sql: `SELECT NVL(SUM(CASE WHEN ISLEM_TIPI IN (${TUR}) THEN TUTAR ELSE -TUTAR END), 0)\nFROM ISLEM\nWHERE HESAP_ID = :hesap_id\n  AND ISLEM_TARIHI < :bas`, binds: { hesap_id: c.id, bas: c.bas } }
    ],
    aylikOzet: (c) => [
      { katman: 'PL/SQL paket', baslik: c.kapsam === 'musteri' ? 'PKG_RAPOR.AYLIK_OZET_MUSTERI' : 'PKG_RAPOR.AYLIK_OZET_HESAP', satir: c.satir,
        sql: `BEGIN\n  PKG_RAPOR.${c.kapsam === 'musteri' ? 'AYLIK_OZET_MUSTERI(p_musteri_id' : 'AYLIK_OZET_HESAP(p_hesap_id'} => :id, p_yil => :yil, p_ay => :ay, p_sonuc => :cur);\nEND;\n-- Gövdedeki sorgu (index dostu tarih aralığı):\n--   SELECT ISLEM_TIPI, COUNT(*) AS ISLEM_ADEDI, SUM(TUTAR) AS TOPLAM_TUTAR\n--   FROM ISLEM\n--   WHERE HESAP_ID = p_hesap_id\n--     AND ISLEM_TARIHI >= TO_DATE(p_yil || '-' || p_ay || '-01', 'YYYY-MM-DD')\n--     AND ISLEM_TARIHI <  ADD_MONTHS(TO_DATE(p_yil || '-' || p_ay || '-01', 'YYYY-MM-DD'), 1)\n--   GROUP BY ISLEM_TIPI;`,
        binds: { id: c.id, yil: c.yil, ay: c.ay, cur: 'OracleRefCursor (çıktı)' },
        not: 'Şartnamedeki EXTRACT(YEAR/MONTH FROM ISLEM_TARIHI) koşulu IDX_ISLEM_TARIH index\'ini kullanamaz; paket aralık koşuluyla yazıldı. .NET tarafında Dapper, OracleDynamicParameters ile REF CURSOR okur.' }
    ],
    bakiyeDegisimi: (c) => [
      { katman: 'PL/SQL paket', baslik: 'PKG_RAPOR.BAKIYE_DEGISIMI', satir: c.satir,
        sql: `BEGIN\n  PKG_RAPOR.BAKIYE_DEGISIMI(p_hesap_id => :hesap_id, p_bas => :bas, p_bit => :bit, p_sonuc => :cur);\nEND;\n-- Gövde: dönem başı bakiye + yürüyen toplam\n--   SELECT ISLEM_TARIHI,\n--          v_acilis + SUM(CASE WHEN ISLEM_TIPI IN (${TUR}) THEN TUTAR ELSE -TUTAR END)\n--            OVER (ORDER BY ISLEM_TARIHI, ISLEM_ID) AS BAKIYE\n--   FROM ISLEM WHERE HESAP_ID = p_hesap_id AND ISLEM_TARIHI BETWEEN p_bas AND p_bit;`,
        binds: { hesap_id: c.id, bas: c.bas, bit: c.bit, cur: 'OracleRefCursor (çıktı)' } }
    ],
    enAktif: (c) => [
      { katman: 'Dapper', baslik: c.tur === 'hesap' ? 'En çok işlem yapılan hesaplar' : 'En aktif müşteriler', satir: c.n,
        sql: c.tur === 'hesap'
          ? 'SELECT h.HESAP_ID, h.HESAP_NO, COUNT(i.ISLEM_ID) AS TOPLAM_ISLEM, SUM(i.TUTAR) AS HACIM\nFROM HESAP h\nJOIN ISLEM i ON i.HESAP_ID = h.HESAP_ID\nWHERE i.ISLEM_TARIHI >= :bas\nGROUP BY h.HESAP_ID, h.HESAP_NO\nORDER BY TOPLAM_ISLEM DESC\nFETCH FIRST :n ROWS ONLY'
          : 'SELECT m.MUSTERI_ID, m.AD_SOYAD, COUNT(i.ISLEM_ID) AS TOPLAM_ISLEM, SUM(i.TUTAR) AS HACIM\nFROM MUSTERI m\nJOIN HESAP h ON h.MUSTERI_ID = m.MUSTERI_ID\nJOIN ISLEM i ON i.HESAP_ID = h.HESAP_ID\nWHERE i.ISLEM_TARIHI >= :bas\nGROUP BY m.MUSTERI_ID, m.AD_SOYAD\nORDER BY TOPLAM_ISLEM DESC\nFETCH FIRST :n ROWS ONLY',
        binds: { bas: c.bas, n: c.n },
        not: 'VW_EN_AKTIF_MUSTERILER tarih filtresi almadığı için dönem seçilebilen rapor parametreli sorgu kullanır.' }
    ]
  };

  HM.iz = iz;
})();
