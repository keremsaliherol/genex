/* Grafikler (Chart.js 4). Sunucu veriyi canvas'ın data-veri özniteliğine JSON olarak yazar, türü data-grafik'te.
   Renkler tema token'larından okunur; tema değişince grafikler yeniden kurulur (uygulama.js "hm:tema" olayı).
   Kurallar (dataviz): tek eksen, ince işaretler (çubuk en fazla 18px, 4px uç yuvarlama, çizgi 2px), saç teli ızgara,
   hover katmanı varsayılan, metin veri rengini giymez. Her grafiğin tablo karşılığı sayfada vardır.
   İlk açılışta grafik kısa bir çizimle gelir (verinin nereden büyüdüğünü gösterir); tema değişiminde ve hareket
   azaltma tercihinde animasyon yoktur.
   prototype/src/charts.js'in karşılığı; tutarlar burada TL (sunucudaki decimal), prototipte kuruş. */
(function () {
  'use strict';
  const HM = window.HM;
  if (!window.Chart || !HM) return;
  const kok = document.documentElement;
  const css = (ad) => getComputedStyle(kok).getPropertyValue(ad).trim();
  const tl = (x, isaretli) => HM.para(Math.round(x * 100), isaretli);
  const hareket = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cizim = (ilk) => (ilk && hareket ? { duration: 700, easing: 'easeOutQuart' } : false);

  /* TurkceBicim.ParaKisa ile aynı: ₺157,6 mn, ₺48,2 bin */
  const nf1 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nf0 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
  const tlKisa = (x) => {
    const a = Math.abs(x); const i = x < 0 ? '−' : '';
    if (a >= 1e9) return `${i}₺${nf1.format(a / 1e9)} mr`;
    if (a >= 1e6) return `${i}₺${nf1.format(a / 1e6)} mn`;
    if (a >= 1e4) return `${i}₺${nf1.format(a / 1e3)} bin`;
    return `${i}₺${nf0.format(a)}`;
  };
  const gunAyBicim = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });
  const uzunTarihBicim = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
  const tarihSaatBicim = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  // Sunucu tarihleri "2026-09-11T14:32:05" biçiminde, saat dilimi eki olmadan gelir: tarayıcı yerel saat olarak okur
  const tarih = (s) => new Date(s);

  function renk() {
    return {
      v1: css('--viz-1'), wash: css('--viz-1-wash'), neg: css('--viz-neg'),
      grid: css('--viz-grid'), axis: css('--viz-axis'), text: css('--viz-text'),
      ink: css('--ink'), surface: css('--surface'), line: css('--line')
    };
  }
  function temel() {
    const c = renk();
    Chart.defaults.font.family = css('--font-sans') || 'system-ui, sans-serif';
    Chart.defaults.font.size = 12;
    Chart.defaults.color = c.text;
    Chart.defaults.animation = false;
    Chart.defaults.maintainAspectRatio = false;
    return c;
  }
  function tooltip(c) {
    return {
      backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, padding: 10, cornerRadius: 10,
      titleColor: c.text, titleFont: { weight: '500', size: 12 }, bodyColor: c.ink, bodyFont: { size: 12.5, family: css('--font-mono') },
      footerColor: c.text, footerFont: { weight: '500', size: 12 },
      usePointStyle: true, boxWidth: 14, boxHeight: 2, caretSize: 5
    };
  }
  /* Çizgi ve sütun grafiğinde imlecin altındaki güne dikey saç teli */
  const crosshair = {
    id: 'crosshair',
    afterDatasetsDraw(chart) {
      const aktif = chart.tooltip && chart.tooltip.getActiveElements();
      if (!aktif || !aktif.length) return;
      const x = aktif[0].element.x; const { top, bottom } = chart.chartArea; const ctx = chart.ctx;
      ctx.save(); ctx.strokeStyle = chart.options.plugins.crosshair.color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, top); ctx.lineTo(Math.round(x) + 0.5, bottom); ctx.stroke(); ctx.restore();
    }
  };
  /* Yatay çubuğun ucunda değer; sığmazsa çubuğun içine yazılır. Metin rengi veri rengi değil, metin token'ı. */
  const ucEtiket = {
    id: 'ucEtiket',
    afterDatasetsDraw(chart) {
      const o = chart.options.plugins.ucEtiket; if (!o) return;
      const ctx = chart.ctx; const meta = chart.getDatasetMeta(0);
      ctx.save(); ctx.font = `500 12px ${css('--font-mono')}`; ctx.textBaseline = 'middle';
      meta.data.forEach((bar, i) => {
        const metin = tlKisa(chart.data.datasets[0].data[i]); const w = ctx.measureText(metin).width;
        let x = bar.x + 6; ctx.textAlign = 'left'; ctx.fillStyle = o.renk;
        if (x + w > chart.chartArea.right) { x = bar.x - 6; ctx.textAlign = 'right'; ctx.fillStyle = o.icRenk; }
        ctx.fillText(metin, x, bar.y);
      });
      ctx.restore();
    }
  };

  /* Iraksak çubuk: yatırma yukarı, çekme aşağı; konum kutupluluğu zaten kodlar. veri: [{ gun, giris, cikis }] */
  function akis(canvas, veri, ilk) {
    const c = temel();
    const gunler = veri.map((g) => ({ tarih: tarih(g.gun), giris: g.giris, cikis: g.cikis }));
    const seri = (label, data, renkDegeri) => ({
      label, data, backgroundColor: renkDegeri, hoverBackgroundColor: renkDegeri,
      borderRadius: 4, borderSkipped: 'start', maxBarThickness: 14, stack: 's', pointStyle: 'line'
    });
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: gunler.map((g) => gunAyBicim.format(g.tarih)),
        datasets: [seri('Yatırma', gunler.map((g) => g.giris), c.v1), seri('Çekme', gunler.map((g) => -g.cikis), c.neg)]
      },
      options: {
        animation: cizim(ilk),
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { stacked: true, grid: { display: false }, border: { color: c.axis }, ticks: { maxRotation: 0, autoSkipPadding: 16 } },
          y: {
            stacked: true, border: { display: false }, ticks: { callback: (v) => (v === 0 ? '0' : tlKisa(v)), maxTicksLimit: 6 },
            grid: { color: (ctx) => (ctx.tick && ctx.tick.value === 0 ? c.axis : c.grid), lineWidth: 1 }
          }
        },
        plugins: {
          legend: { display: false },
          crosshair: { color: c.axis },
          tooltip: Object.assign(tooltip(c), {
            callbacks: {
              title: (it) => uzunTarihBicim.format(gunler[it[0].dataIndex].tarih),
              label: (it) => ` ${it.dataset.label}: ${tl(Math.abs(it.raw))}`,
              footer: (it) => { const g = gunler[it[0].dataIndex]; return `Net: ${tl(g.giris - g.cikis, true)}`; }
            }
          })
        }
      },
      plugins: [crosshair]
    });
  }

  /* Basamaklı bakiye çizgisi: bakiye yalnız işlem anında değişir. veri: [{ x: tarih, y: bakiye }] */
  function bakiye(canvas, veri, ilk) {
    const c = temel();
    const son = veri.length - 1;
    return new Chart(canvas, {
      type: 'line',
      data: {
        datasets: [{
          label: 'Bakiye', data: veri.map((p) => ({ x: tarih(p.x).getTime(), y: p.y })),
          borderColor: c.v1, borderWidth: 2, stepped: 'after', fill: 'start', backgroundColor: c.wash,
          pointRadius: veri.map((_, i) => (i === son ? 4 : 0)), pointBackgroundColor: c.v1, pointBorderColor: c.surface, pointBorderWidth: 2,
          pointHoverRadius: 4, pointHoverBorderWidth: 2, pointHitRadius: 12, pointStyle: 'line'
        }]
      },
      options: {
        animation: cizim(ilk),
        parsing: false,
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        layout: { padding: { top: 8, right: 8 } },
        scales: {
          x: {
            type: 'linear', grid: { display: false }, border: { color: c.axis },
            ticks: { maxTicksLimit: 6, maxRotation: 0, callback: (v) => gunAyBicim.format(new Date(v)) }
          },
          y: { border: { display: false }, grid: { color: c.grid }, ticks: { maxTicksLimit: 5, callback: (v) => tlKisa(v) }, grace: '8%' }
        },
        plugins: {
          legend: { display: false },
          crosshair: { color: c.axis },
          tooltip: Object.assign(tooltip(c), {
            callbacks: {
              title: (it) => tarihSaatBicim.format(new Date(it[0].raw.x)),
              label: (it) => ` Bakiye: ${tl(it.raw.y)}`
            }
          })
        }
      },
      plugins: [crosshair]
    });
  }

  /* Yatay çubuk: tek seri (lejant yok, başlık adlandırır), değer çubuk ucunda. veri: [{ etiket, deger }] */
  function yatay(canvas, veri, ilk) {
    const c = temel();
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: veri.map((s) => s.etiket),
        datasets: [{
          label: 'Toplam tutar', data: veri.map((s) => s.deger), backgroundColor: c.v1, hoverBackgroundColor: c.v1,
          borderRadius: 4, borderSkipped: 'start', maxBarThickness: 18, pointStyle: 'line'
        }]
      },
      options: {
        animation: cizim(ilk),
        indexAxis: 'y',
        layout: { padding: { right: 8 } },
        scales: {
          x: { beginAtZero: true, border: { display: false }, grid: { color: c.grid }, ticks: { maxTicksLimit: 5, callback: (v) => tlKisa(v) }, grace: '18%' },
          y: { grid: { display: false }, border: { color: c.axis } }
        },
        plugins: {
          legend: { display: false },
          ucEtiket: { renk: c.text, icRenk: c.surface },
          tooltip: Object.assign(tooltip(c), { callbacks: { label: (it) => ` Toplam: ${tl(it.raw)}` } })
        }
      },
      plugins: [ucEtiket]
    });
  }

  const kurucular = { akis, bakiye, yatay };
  const grafikler = [];
  document.querySelectorAll('canvas[data-grafik]').forEach((canvas) => {
    const kurucu = kurucular[canvas.dataset.grafik];
    if (!kurucu) return;
    let veri;
    try { veri = JSON.parse(canvas.dataset.veri || '[]'); } catch (_) { return; }
    const g = { kur: (ilk) => kurucu(canvas, veri, ilk) };
    g.chart = g.kur(true);
    grafikler.push(g);
  });
  document.addEventListener('hm:tema', () => grafikler.forEach((g) => { g.chart.destroy(); g.chart = g.kur(false); }));
})();
