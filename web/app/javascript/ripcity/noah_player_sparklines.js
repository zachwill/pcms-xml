const MIN_SPARKLINE_POINTS = 2;
const FALLBACK_POINTS = [0, 0];
const FALLBACK_COLOR = "#737373";
const SPARKLINE_WIDTH_PX = 48;
const SPARKLINE_GAP_PX = 6;

function parseSparklineValues(host) {
  const raw = host.getAttribute("data-noah-sparkline-values");
  if (!raw) return FALLBACK_POINTS.slice();

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return FALLBACK_POINTS.slice();

    const numeric = parsed
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (numeric.length === 0) return FALLBACK_POINTS.slice();
    if (numeric.length === 1) return [numeric[0], numeric[0]];

    return numeric;
  } catch (_error) {
    return FALLBACK_POINTS.slice();
  }
}

function resolveLineColor(host) {
  const color = getComputedStyle(host).color;

  if (!color || color === "inherit" || color === "transparent" || color === "rgba(0, 0, 0, 0)") {
    return FALLBACK_COLOR;
  }

  return color;
}

function hideSparklineHost(host) {
  host.style.width = "0px";
  host.style.marginRight = "0px";
}

function showSparklineHost(host) {
  host.style.width = `${SPARKLINE_WIDTH_PX}px`;
  host.style.marginRight = `${SPARKLINE_GAP_PX}px`;
}

function sparklineOption(values, lineColor) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min;
  const padding = spread > 0
    ? spread * 0.18
    : Math.max(Math.abs(max) * 0.08, 1);

  return {
    animation: false,
    tooltip: { show: false },
    grid: {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0
    },
    xAxis: {
      type: "category",
      data: values.map((_value, index) => index),
      boundaryGap: false,
      show: false
    },
    yAxis: {
      type: "value",
      show: false,
      min: min - padding,
      max: max + padding
    },
    series: [
      {
        type: "line",
        data: values,
        showSymbol: false,
        symbol: "none",
        smooth: 0.3,
        silent: true,
        lineStyle: {
          width: 1.5,
          color: lineColor,
          cap: "round",
          join: "round"
        },
        animation: false,
        emphasis: { disabled: true }
      }
    ]
  };
}

function init() {
  const root = document.getElementById("noah-workspace");
  if (!root) return;

  if (typeof root.__noahSparklinesCleanup === "function") {
    root.__noahSparklinesCleanup();
  }

  const echarts = window.echarts;
  if (!echarts) {
    console.warn("[noah-sparklines] ECharts not available on window.");
    return;
  }

  const hosts = Array.from(root.querySelectorAll("[data-noah-sparkline]"));
  if (hosts.length === 0) return;

  hosts.forEach((host) => hideSparklineHost(host));

  const rows = [];

  hosts.forEach((host) => {
    const values = parseSparklineValues(host);
    if (values.length < MIN_SPARKLINE_POINTS) return;

    try {
      const chart = echarts.init(host);
      showSparklineHost(host);
      rows.push({ host, chart, values });
    } catch (_error) {
      hideSparklineHost(host);
    }
  });

  if (rows.length === 0) return;

  const rowByHost = new Map(rows.map((row) => [row.host, row]));

  const applyTheme = () => {
    rows.forEach(({ host, chart, values }) => {
      const lineColor = resolveLineColor(host);
      chart.setOption(sparklineOption(values, lineColor), true);
    });
  };

  const resizeObserver = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      const row = rowByHost.get(entry.target);
      if (!row) return;
      row.chart.resize();
    });
  });

  rows.forEach(({ host }) => resizeObserver.observe(host));

  const themeObserver = new MutationObserver((mutations) => {
    const classChanged = mutations.some((mutation) => mutation.type === "attributes" && mutation.attributeName === "class");
    if (!classChanged) return;

    applyTheme();
    rows.forEach(({ chart }) => chart.resize());
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  applyTheme();

  root.__noahSparklinesCleanup = () => {
    resizeObserver.disconnect();
    themeObserver.disconnect();
    rows.forEach(({ host, chart }) => {
      chart.dispose();
      hideSparklineHost(host);
    });
    delete root.__noahSparklinesCleanup;
  };
}

window.__noahSparklinesInit = init;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

window.addEventListener("pageshow", init);

export { init };
