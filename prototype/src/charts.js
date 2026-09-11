/* Chart.js sarmalayıcıları. Renkler tema token'larından okunur; tema değişince grafikler yeniden kurulur.
   Kurallar (dataviz): tek eksen, ince işaretler (çubuk ≤ 24px, 4px uç yuvarlama, çizgi 2px),
   saç teli ızgara, hover katmanı varsayılan, metin veri rengini giymez. */
(function () {
  'use strict';
  const HM = (window.HM = window.HM || {});
  const u = HM.u;
  const kayitli = [];

  function renk() {
    return {
      v1: u.css('--viz-1'), wash: u.css('--viz-1-wash'), neg: u.css('--viz-neg'), v2: u.css('--viz-2'),
      grid: u.css('--viz-grid'), axis: u.css('--viz-axis'), text: u.css('--viz-text'),
      ink: u.css('--ink'), surface: u.css('--surface'), line: u.css('--line')
    };
  }
  function temel() {
    const c = renk();
    Chart.defaults.font.family = u.css('--font-sans') || 'system-ui, sans-serif';
    Chart.defaults.font.size = 12;
    Chart.defaults.color = c.text;
    Chart.defaults.animation = false;
    Chart.defaults.maintainAspectRatio = false;
    return c;
  }
  function tooltip(c) {
    return {
      backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, padding: 10, cornerRadius: 6,
      titleColor: c.text, titleFont: { weight: '500', size: 12 }, bodyColor: c.ink, bodyFont: { size: 12.5, family: u.css('--font-mono') },
      footerColor: c.text, footerFont: { weight: '500', size: 12 },
      usePointStyle: true, boxWidth: 14, boxHeight: 2, caretSize: 5
    };
  }
  const crosshair = {
    id: 'crosshair',
    afterDatasetsDraw(chart) {
      const act = chart.tooltip && chart.tooltip.getActiveElements();
      if (!act || !act.length) return;
      const x = act[0].element.x; const { top, bottom } = chart.chartArea; const ctx = chart.ctx;
      ctx.save(); ctx.strokeStyle = chart.options.plugins.crosshair.color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, top); ctx.lineTo(Math.round(x) + 0.5, bottom); ctx.stroke(); ctx.restore();
    }
  };
  // Biçimlendirici closure ile verilir: eklenti seçeneğindeki fonksiyonları Chart.js "scriptable" sayıp bağlamla çağırır
  const ucEtiket = (bicim) => ({
    id: 'ucEtiket',
    afterDatasetsDraw(chart) {
      const o = chart.options.plugins.ucEtiket; if (!o) return;
      const ctx = chart.ctx; const meta = chart.getDatasetMeta(0);
      ctx.save(); ctx.fillStyle = o.renk; ctx.font = `500 12px ${u.css('--font-mono')}`; ctx.textBaseline = 'middle';
      meta.data.forEach((bar, i) => {
        const deger = chart.data.datasets[0].data[i];
        const metin = bicim(deger); const w = ctx.measureText(metin).width;
        const sag = chart.chartArea.right;
        let x = bar.x + 6; ctx.textAlign = 'left';
        if (x + w > sag) { x = bar.x - 6; ctx.textAlign = 'right'; ctx.fillStyle = o.icRenk; }
        else ctx.fillStyle = o.renk;
        ctx.fillText(metin, x, bar.y);
      });
      ctx.restore();
    }
  });

  function kaydet(canvas, kur) {
    const kayit = { canvas, kur, chart: kur() };
    kayitli.push(kayit);
    return kayit.chart;
  }
  document.addEventListener('hm:tema', () => {
    for (let i = kayitli.length - 1; i >= 0; i--) {
      const k = kayitli[i];
      if (!k.canvas.isConnected) { k.chart.destroy(); kayitli.splice(i, 1); continue; }
      k.chart.destroy(); k.chart = k.kur();
    }
  });
  function temizle() {
    for (let i = kayitli.length - 1; i >= 0; i--) if (!kayitli[i].canvas.isConnected) { kayitli[i].chart.destroy(); kayitli.splice(i, 1); }
  }
  const tlKisa = (tl) => u.paraKisa(Math.round(tl * 100));

  const grafik = {
    temizle,
    /* Iraksak çubuk: yatırma yukarı, çekme aşağı; konum kutupluluğu zaten kodlar */
    akis(canvas, gunler) {
      return kaydet(canvas, () => {
        const c = temel();
        return new Chart(canvas, {
          type: 'bar',
          data: {
            labels: gunler.map((g) => u.gunAy(g.tarih)),
            datasets: [
              { label: 'Yatırma', data: gunler.map((g) => g.giris / 100), backgroundColor: c.v1, hoverBackgroundColor: c.v1, borderRadius: 4, borderSkipped: 'start', maxBarThickness: 14, stack: 's', pointStyle: 'line' },
              { label: 'Çekme', data: gunler.map((g) => -g.cikis / 100), backgroundColor: c.neg, hoverBackgroundColor: c.neg, borderRadius: 4, borderSkipped: 'start', maxBarThickness: 14, stack: 's', pointStyle: 'line' }
            ]
          },
          options: {
            interaction: { mode: 'index', intersect: false },
            scales: {
              x: { stacked: true, grid: { display: false }, border: { color: c.axis }, ticks: { maxRotation: 0, autoSkipPadding: 16 } },
              y: { stacked: true, border: { display: false }, ticks: { callback: (v) => (v === 0 ? '0' : tlKisa(v)), maxTicksLimit: 6 },
                grid: { color: (ctx) => (ctx.tick && ctx.tick.value === 0 ? c.axis : c.grid), lineWidth: 1 } }
            },
            plugins: {
              legend: { display: false },
              crosshair: { color: c.axis },
              tooltip: Object.assign(tooltip(c), {
                callbacks: {
                  title: (it) => u.uzunTarih(gunler[it[0].dataIndex].tarih),
                  label: (it) => ` ${it.dataset.label}: ${u.para(Math.round(Math.abs(it.raw) * 100))}`,
                  footer: (it) => { const g = gunler[it[0].dataIndex]; return `Net: ${u.para(g.giris - g.cikis, { isaret: true })}`; }
                }
              })
            }
          },
          plugins: [crosshair]
        });
      });
    },
    /* Basamaklı bakiye çizgisi: bakiye yalnız işlem anında değişir */
    bakiye(canvas, noktalar, opt) {
      const o = opt || {};
      return kaydet(canvas, () => {
        const c = temel();
        const son = noktalar.length - 1;
        return new Chart(canvas, {
          type: 'line',
          data: { datasets: [{
            label: 'Bakiye', data: noktalar.map((p) => ({ x: p.x.getTime(), y: p.y / 100 })),
            borderColor: c.v1, borderWidth: 2, stepped: 'after', fill: 'start', backgroundColor: c.wash,
            pointRadius: noktalar.map((_, i) => (i === son ? 4 : 0)), pointBackgroundColor: c.v1, pointBorderColor: c.surface, pointBorderWidth: 2,
            pointHoverRadius: 4, pointHoverBorderWidth: 2, pointHitRadius: 12, pointStyle: 'line'
          }] },
          options: {
            parsing: false,
            interaction: { mode: 'nearest', axis: 'x', intersect: false },
            layout: { padding: o.kucuk ? { top: 6, bottom: 2, right: 6 } : { top: 8, right: 8 } },
            scales: {
              x: { type: 'linear', display: !o.kucuk, grid: { display: false }, border: { color: c.axis },
                ticks: { maxTicksLimit: 6, maxRotation: 0, callback: (v) => u.gunAy(new Date(v)) } },
              y: { display: !o.kucuk, border: { display: false }, grid: { color: c.grid }, ticks: { maxTicksLimit: 5, callback: (v) => tlKisa(v) },
                grace: '8%' }
            },
            plugins: {
              legend: { display: false },
              crosshair: { color: c.axis },
              tooltip: Object.assign(tooltip(c), {
                callbacks: {
                  title: (it) => u.tarihSaat(new Date(it[0].raw.x)),
                  label: (it) => ` Bakiye: ${u.para(Math.round(it.raw.y * 100))}`
                }
              })
            }
          },
          plugins: [crosshair]
        });
      });
    },
    /* Yatay çubuk: tek seri, değer çubuk ucunda */
    yatay(canvas, satirlar) {
      return kaydet(canvas, () => {
        const c = temel();
        return new Chart(canvas, {
          type: 'bar',
          data: { labels: satirlar.map((s) => s.etiket), datasets: [{ label: 'Toplam tutar', data: satirlar.map((s) => s.deger / 100), backgroundColor: c.v1, hoverBackgroundColor: c.v1, borderRadius: 4, borderSkipped: 'start', maxBarThickness: 18, pointStyle: 'line' }] },
          options: {
            indexAxis: 'y',
            layout: { padding: { right: 8 } },
            scales: {
              x: { beginAtZero: true, border: { display: false }, grid: { color: c.grid }, ticks: { maxTicksLimit: 5, callback: (v) => tlKisa(v) }, grace: '18%' },
              y: { grid: { display: false }, border: { color: c.axis } }
            },
            plugins: {
              legend: { display: false },
              ucEtiket: { renk: c.text, icRenk: c.surface },
              tooltip: Object.assign(tooltip(c), { callbacks: { label: (it) => ` Toplam: ${u.para(Math.round(it.raw * 100))}` } })
            }
          },
          plugins: [ucEtiket(tlKisa)]
        });
      });
    }
  };
  HM.grafik = grafik;
})();
