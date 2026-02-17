// src/Liveline.tsx

// src/theme.ts
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function rgba(r, g, b, a) {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function resolveTheme(color, mode) {
  const [r, g, b] = hexToRgb(color);
  const isDark = mode === "dark";
  return {
    // Line
    line: color,
    lineWidth: 2,
    // Fill gradient
    fillTop: rgba(r, g, b, isDark ? 0.12 : 0.08),
    fillBottom: rgba(r, g, b, 0),
    // Grid
    gridLine: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)",
    gridLabel: isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.35)",
    // Dot — always semantic
    dotUp: "#22c55e",
    dotDown: "#ef4444",
    dotFlat: color,
    glowUp: "rgba(34, 197, 94, 0.18)",
    glowDown: "rgba(239, 68, 68, 0.18)",
    glowFlat: rgba(r, g, b, 0.12),
    // Badge
    badgeOuterBg: isDark ? "rgba(40, 40, 40, 0.95)" : "rgba(255, 255, 255, 0.95)",
    badgeOuterShadow: isDark ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.15)",
    badgeBg: color,
    badgeText: "#ffffff",
    // Dash line
    dashLine: rgba(r, g, b, 0.4),
    // Reference line
    refLine: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.12)",
    refLabel: isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(0, 0, 0, 0.4)",
    // Time axis
    timeLabel: isDark ? "rgba(255, 255, 255, 0.35)" : "rgba(0, 0, 0, 0.3)",
    // Crosshair
    crosshairLine: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.12)",
    tooltipBg: isDark ? "rgba(30, 30, 30, 0.95)" : "rgba(255, 255, 255, 0.95)",
    tooltipText: isDark ? "#e5e5e5" : "#1a1a1a",
    tooltipBorder: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
    // Background
    bgRgb: isDark ? [10, 10, 10] : [255, 255, 255],
    // Fonts
    labelFont: '11px "SF Mono", Menlo, Monaco, "Cascadia Code", monospace',
    valueFont: '600 11px "SF Mono", Menlo, monospace',
    badgeFont: '500 11px "SF Mono", Menlo, monospace'
  };
}

// src/useLivelineEngine.ts

// src/math/lerp.ts
function lerp(current, target, speed, dt = 16.67) {
  const factor = 1 - Math.pow(1 - speed, dt / 16.67);
  return current + (target - current) * factor;
}

// src/math/range.ts
function computeRange(visible, currentValue, referenceValue, exaggerate) {
  let targetMin = Infinity;
  let targetMax = -Infinity;
  for (const p of visible) {
    if (p.value < targetMin) targetMin = p.value;
    if (p.value > targetMax) targetMax = p.value;
  }
  if (currentValue < targetMin) targetMin = currentValue;
  if (currentValue > targetMax) targetMax = currentValue;
  if (referenceValue !== void 0) {
    if (referenceValue < targetMin) targetMin = referenceValue;
    if (referenceValue > targetMax) targetMax = referenceValue;
  }
  const rawRange = targetMax - targetMin;
  const marginFactor = exaggerate ? 0.01 : 0.12;
  const minRange = rawRange * (exaggerate ? 0.02 : 0.1) || (exaggerate ? 0.04 : 0.4);
  if (rawRange < minRange) {
    const mid = (targetMin + targetMax) / 2;
    targetMin = mid - minRange / 2;
    targetMax = mid + minRange / 2;
  } else {
    const margin = rawRange * marginFactor;
    targetMin -= margin;
    targetMax += margin;
  }
  return { min: targetMin, max: targetMax };
}

// src/math/momentum.ts
function detectMomentum(points, lookback = 20) {
  if (points.length < 5) return "flat";
  const recent = points.slice(-lookback);
  let min = Infinity;
  let max = -Infinity;
  for (const p of recent) {
    if (p.value < min) min = p.value;
    if (p.value > max) max = p.value;
  }
  const range = max - min;
  if (range === 0) return "flat";
  const tail = recent.slice(-5);
  const first = tail[0].value;
  const last = tail[tail.length - 1].value;
  const delta = last - first;
  const threshold = range * 0.12;
  if (delta > threshold) return "up";
  if (delta < -threshold) return "down";
  return "flat";
}

// src/math/interpolate.ts
function interpolateAtTime(points, time) {
  if (points.length === 0) return null;
  if (time <= points[0].time) return points[0].value;
  if (time >= points[points.length - 1].time) return points[points.length - 1].value;
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = lo + hi >> 1;
    if (points[mid].time <= time) lo = mid;
    else hi = mid;
  }
  const p1 = points[lo];
  const p2 = points[hi];
  const t = (time - p1.time) / (p2.time - p1.time);
  return p1.value + (p2.value - p1.value) * t;
}

// src/canvas/dpr.ts
function getDpr() {
  if (typeof window === "undefined") return 1;
  return Math.min(window.devicePixelRatio || 1, 3);
}
function applyDpr(ctx, dpr, w, h) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
}

// src/draw/grid.ts
function pickInterval(valRange, pxPerUnit, minGap, prev) {
  if (prev > 0) {
    const px = prev * pxPerUnit;
    if (px >= minGap * 0.5 && px <= minGap * 4) return prev;
  }
  const divisorSets = [[2, 2.5, 2], [2, 2, 2.5], [2.5, 2, 2]];
  let best = Infinity;
  for (const divs of divisorSets) {
    let span = Math.pow(10, Math.ceil(Math.log10(valRange)));
    let i = 0;
    while (span / divs[i % 3] * pxPerUnit >= minGap) {
      span /= divs[i % 3];
      i++;
    }
    if (span < best) best = span;
  }
  return best === Infinity ? valRange / 5 : best;
}
function divisible(val, interval) {
  const ratio = val / interval;
  return Math.abs(ratio - Math.round(ratio)) < 0.01;
}
var FADE_IN = 0.18;
var FADE_OUT = 0.12;
function drawGrid(ctx, layout, palette, formatValue, state, dt) {
  const { w, h, pad, valRange, minVal, maxVal, toY } = layout;
  const chartH = h - pad.top - pad.bottom;
  if (chartH <= 0 || valRange <= 0) return;
  const pxPerUnit = chartH / valRange;
  const coarse = pickInterval(valRange, pxPerUnit, 36, state.interval);
  state.interval = coarse;
  const fine = coarse / 2;
  const finePx = fine * pxPerUnit;
  const fineTarget = finePx < 40 ? 0 : finePx >= 60 ? 1 : (finePx - 40) / 20;
  const fadeZone = 32;
  const edgeAlpha = (y) => {
    const fromEdge = Math.min(y - pad.top, h - pad.bottom - y);
    if (fromEdge >= fadeZone) return 1;
    if (fromEdge <= 0) return 0;
    return fromEdge / fadeZone;
  };
  const targets = /* @__PURE__ */ new Map();
  const first = Math.ceil(minVal / fine) * fine;
  for (let val = first; val <= maxVal; val += fine) {
    const y = toY(val);
    if (y < pad.top - 2 || y > h - pad.bottom + 2) continue;
    const isCoarse = divisible(val, coarse);
    const target = (isCoarse ? 1 : fineTarget) * edgeAlpha(y);
    const key = Math.round(val * 1e3);
    targets.set(key, target);
  }
  for (const [key, alpha] of state.labels) {
    const target = targets.get(key) ?? 0;
    const speed = target >= alpha ? FADE_IN : FADE_OUT;
    let next = lerp(alpha, target, speed, dt);
    if (Math.abs(next - target) < 0.02) next = target;
    if (next < 0.01 && target === 0) {
      state.labels.delete(key);
    } else {
      state.labels.set(key, next);
    }
  }
  for (const [key, target] of targets) {
    if (!state.labels.has(key)) {
      state.labels.set(key, target * FADE_IN);
    }
  }
  ctx.setLineDash([1, 3]);
  ctx.lineWidth = 1;
  ctx.font = palette.labelFont;
  ctx.textAlign = "left";
  for (const [key, alpha] of state.labels) {
    if (alpha < 0.02) continue;
    const val = key / 1e3;
    const y = toY(val);
    if (y < pad.top - 10 || y > h - pad.bottom + 10) continue;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = palette.gridLine;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    ctx.fillStyle = palette.gridLabel;
    ctx.fillText(formatValue(val), w - pad.right + 8, y + 4);
    ctx.restore();
  }
  ctx.setLineDash([]);
}

// src/math/spline.ts
function drawSpline(ctx, pts) {
  if (pts.length < 2) return;
  if (pts.length === 2) {
    ctx.lineTo(pts[1][0], pts[1][1]);
    return;
  }
  const n = pts.length;
  const delta = new Array(n - 1);
  const h = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    h[i] = pts[i + 1][0] - pts[i][0];
    delta[i] = h[i] === 0 ? 0 : (pts[i + 1][1] - pts[i][1]) / h[i];
  }
  const m = new Array(n);
  m[0] = delta[0];
  m[n - 1] = delta[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (delta[i - 1] * delta[i] <= 0) {
      m[i] = 0;
    } else {
      m[i] = (delta[i - 1] + delta[i]) / 2;
    }
  }
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const alpha = m[i] / delta[i];
      const beta = m[i + 1] / delta[i];
      const s2 = alpha * alpha + beta * beta;
      if (s2 > 9) {
        const s = 3 / Math.sqrt(s2);
        m[i] = s * alpha * delta[i];
        m[i + 1] = s * beta * delta[i];
      }
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const hi = h[i];
    ctx.bezierCurveTo(
      pts[i][0] + hi / 3,
      pts[i][1] + m[i] * hi / 3,
      pts[i + 1][0] - hi / 3,
      pts[i + 1][1] - m[i + 1] * hi / 3,
      pts[i + 1][0],
      pts[i + 1][1]
    );
  }
}

// src/draw/line.ts
function renderCurve(ctx, layout, palette, pts, showFill) {
  const { h, pad } = layout;
  if (showFill) {
    const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
    grad.addColorStop(0, palette.fillTop);
    grad.addColorStop(1, palette.fillBottom);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], h - pad.bottom);
    ctx.lineTo(pts[0][0], pts[0][1]);
    drawSpline(ctx, pts);
    ctx.lineTo(pts[pts.length - 1][0], h - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  drawSpline(ctx, pts);
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = palette.lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}
function drawLine(ctx, layout, palette, visible, smoothValue, now, showFill, scrubX, scrubAmount = 0) {
  const { w, h, pad, toX, toY, chartW, chartH } = layout;
  const yMin = pad.top;
  const yMax = h - pad.bottom;
  const clampY = (y) => Math.max(yMin, Math.min(yMax, y));
  const pts = visible.map(
    (p, i) => i === visible.length - 1 ? [toX(p.time), clampY(toY(smoothValue))] : [toX(p.time), clampY(toY(p.value))]
  );
  pts.push([toX(now), clampY(toY(smoothValue))]);
  if (pts.length < 2) return;
  const isScrubbing = scrubX !== null;
  ctx.save();
  ctx.beginPath();
  ctx.rect(pad.left - 1, pad.top, chartW + 2, chartH);
  ctx.clip();
  if (isScrubbing) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, scrubX, h);
    ctx.clip();
    renderCurve(ctx, layout, palette, pts, showFill);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.rect(scrubX, 0, layout.w - scrubX, h);
    ctx.clip();
    ctx.globalAlpha = 1 - scrubAmount * 0.6;
    renderCurve(ctx, layout, palette, pts, showFill);
    ctx.restore();
  } else {
    renderCurve(ctx, layout, palette, pts, showFill);
  }
  ctx.restore();
  const currentY = Math.max(pad.top, Math.min(h - pad.bottom, toY(smoothValue)));
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = palette.dashLine;
  ctx.lineWidth = 1;
  if (isScrubbing) ctx.globalAlpha = 1 - scrubAmount * 0.2;
  ctx.beginPath();
  ctx.moveTo(pad.left, currentY);
  ctx.lineTo(layout.w - pad.right, currentY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  const last = pts[pts.length - 1];
  last[1] = Math.max(10, Math.min(h - 10, last[1]));
  return pts;
}

// src/draw/dot.ts
var PULSE_INTERVAL = 1500;
var PULSE_DURATION = 900;
function parseColor(color) {
  const hex = color.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const rgb = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3]];
  return null;
}
function lerpColor(a, b, t) {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}
function drawDot(ctx, x, y, palette, pulse = true, scrubAmount = 0) {
  const dim = scrubAmount * 0.7;
  if (pulse && dim < 0.3) {
    const t = Date.now() % PULSE_INTERVAL / PULSE_DURATION;
    if (t < 1) {
      const radius = 9 + t * 12;
      const pulseAlpha = 0.35 * (1 - t) * (1 - dim * 3);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = pulseAlpha;
      ctx.stroke();
    }
  }
  const outerRgb = parseColor(palette.badgeOuterBg) ?? [255, 255, 255];
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.shadowColor = palette.badgeOuterShadow;
  ctx.shadowBlur = 6 * (1 - dim);
  ctx.shadowOffsetY = 1;
  ctx.beginPath();
  ctx.arc(x, y, 6.5, 0, Math.PI * 2);
  ctx.fillStyle = palette.badgeOuterBg;
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(x, y, 3.5, 0, Math.PI * 2);
  if (dim > 0.01) {
    const lineRgb = parseColor(palette.line) ?? [100, 100, 255];
    ctx.fillStyle = lerpColor(lineRgb, outerRgb, dim);
  } else {
    ctx.fillStyle = palette.line;
  }
  ctx.fill();
}
function drawArrows(ctx, x, y, momentum, palette, arrows, dt) {
  const upTarget = momentum === "up" ? 1 : 0;
  const downTarget = momentum === "down" ? 1 : 0;
  const canFadeInUp = arrows.down < 0.02;
  const canFadeInDown = arrows.up < 0.02;
  arrows.up = lerp(arrows.up, canFadeInUp ? upTarget : 0, upTarget > arrows.up ? 0.08 : 0.04, dt);
  arrows.down = lerp(arrows.down, canFadeInDown ? downTarget : 0, downTarget > arrows.down ? 0.08 : 0.04, dt);
  if (arrows.up < 0.01) arrows.up = 0;
  if (arrows.down < 0.01) arrows.down = 0;
  if (arrows.up > 0.99) arrows.up = 1;
  if (arrows.down > 0.99) arrows.down = 1;
  const cycle = Date.now() % 1400 / 1400;
  const drawChevrons = (dir, opacity) => {
    if (opacity < 0.01) return;
    const baseX = x + 19;
    const baseY = y;
    ctx.save();
    ctx.strokeStyle = palette.gridLabel;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 0; i < 2; i++) {
      const start = i * 0.2;
      const dur = 0.35;
      const localT = cycle - start;
      const wave = localT >= 0 && localT < dur ? Math.sin(localT / dur * Math.PI) : 0;
      const pulse = 0.3 + 0.7 * wave;
      ctx.globalAlpha = opacity * pulse;
      const nudge = dir === -1 ? -3 : 3;
      const cy = baseY + dir * (i * 8 - 4) + nudge;
      ctx.beginPath();
      ctx.moveTo(baseX - 5, cy - dir * 3.5);
      ctx.lineTo(baseX, cy);
      ctx.lineTo(baseX + 5, cy - dir * 3.5);
      ctx.stroke();
    }
    ctx.restore();
  };
  drawChevrons(-1, arrows.up);
  drawChevrons(1, arrows.down);
  ctx.globalAlpha = 1;
}

// src/draw/crosshair.ts
function drawCrosshair(ctx, layout, palette, hoverX, hoverValue, hoverTime, formatValue, formatTime, scrubOpacity, tooltipY, liveDotX, tooltipOutline) {
  if (scrubOpacity < 0.01) return;
  const { w, h, pad, toY } = layout;
  const y = toY(hoverValue);
  ctx.save();
  ctx.globalAlpha = scrubOpacity * 0.5;
  ctx.strokeStyle = palette.crosshairLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(hoverX, pad.top);
  ctx.lineTo(hoverX, h - pad.bottom);
  ctx.stroke();
  ctx.restore();
  const dotRadius = 4 * Math.min(scrubOpacity * 3, 1);
  if (dotRadius > 0.5) {
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(hoverX, y, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = palette.line;
    ctx.fill();
  }
  if (scrubOpacity < 0.1 || layout.w < 300) return;
  const valueText = formatValue(hoverValue);
  const timeText = formatTime(hoverTime);
  const separator = "  \xB7  ";
  ctx.save();
  ctx.globalAlpha = scrubOpacity;
  ctx.font = '400 13px "SF Mono", Menlo, monospace';
  const valueW = ctx.measureText(valueText).width;
  const sepW = ctx.measureText(separator).width;
  const timeW = ctx.measureText(timeText).width;
  const totalW = valueW + sepW + timeW;
  let tx = hoverX - totalW / 2;
  const minX = pad.left + 4;
  const dotRightEdge = liveDotX != null ? liveDotX + 7 : w - pad.right;
  const maxX = dotRightEdge - totalW;
  if (tx < minX) tx = minX;
  if (tx > maxX) tx = maxX;
  const ty = pad.top + (tooltipY ?? 14) + 10;
  ctx.textAlign = "left";
  if (tooltipOutline) {
    ctx.strokeStyle = palette.tooltipBg;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.strokeText(valueText, tx, ty);
    ctx.strokeText(separator + timeText, tx + valueW, ty);
  }
  ctx.fillStyle = palette.tooltipText;
  ctx.fillText(valueText, tx, ty);
  ctx.fillStyle = palette.gridLabel;
  ctx.fillText(separator + timeText, tx + valueW, ty);
  ctx.restore();
}

// src/draw/referenceLine.ts
function drawReferenceLine(ctx, layout, palette, ref) {
  const { w, h, pad, toY, chartW } = layout;
  const y = toY(ref.value);
  if (y < pad.top - 10 || y > h - pad.bottom + 10) return;
  const label = ref.label ?? "";
  if (label) {
    ctx.font = "500 11px system-ui, sans-serif";
    const textW = ctx.measureText(label).width;
    const centerX = pad.left + chartW / 2;
    const gapPad = 8;
    ctx.strokeStyle = palette.refLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(centerX - textW / 2 - gapPad, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX + textW / 2 + gapPad, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    ctx.fillStyle = palette.refLabel;
    ctx.textAlign = "center";
    ctx.fillText(label, centerX, y + 4);
  } else {
    ctx.strokeStyle = palette.refLine;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// src/math/intervals.ts
function niceTimeInterval(windowSecs) {
  if (windowSecs <= 15) return 2;
  if (windowSecs <= 30) return 5;
  if (windowSecs <= 60) return 10;
  if (windowSecs <= 120) return 15;
  if (windowSecs <= 300) return 30;
  if (windowSecs <= 600) return 60;
  if (windowSecs <= 1800) return 300;
  if (windowSecs <= 3600) return 600;
  if (windowSecs <= 14400) return 1800;
  if (windowSecs <= 43200) return 3600;
  if (windowSecs <= 86400) return 7200;
  if (windowSecs <= 604800) return 86400;
  return 604800;
}

// src/draw/timeAxis.ts
var FADE = 0.08;
function drawTimeAxis(ctx, layout, palette, windowSecs, _targetWindowSecs, formatTime, state, dt) {
  const { h, pad, leftEdge, rightEdge, toX } = layout;
  const chartLeft = pad.left;
  const chartRight = layout.w - pad.right;
  const chartW = chartRight - chartLeft;
  const fadeZone = 50;
  const edgeAlpha = (x) => {
    const fromLeft = x - chartLeft;
    const fromRight = chartRight - x;
    const fromEdge = Math.min(fromLeft, fromRight);
    if (fromEdge >= fadeZone) return 1;
    if (fromEdge <= 0) return 0;
    return fromEdge / fadeZone;
  };
  ctx.font = palette.labelFont;
  const targetPxPerSec = chartW / _targetWindowSecs;
  let interval = niceTimeInterval(_targetWindowSecs);
  while (interval * targetPxPerSec < 60 && interval < _targetWindowSecs) {
    interval *= 2;
  }
  const useLocalDays = interval >= 86400;
  let firstTime;
  if (useLocalDays) {
    const d = new Date((leftEdge - interval) * 1e3);
    d.setHours(0, 0, 0, 0);
    firstTime = d.getTime() / 1e3;
  } else {
    firstTime = Math.ceil((leftEdge - interval) / interval) * interval;
  }
  const targets = /* @__PURE__ */ new Set();
  for (let t = firstTime; t <= rightEdge + interval && targets.size < 30; t += interval) {
    targets.add(Math.round(t * 100));
  }
  for (const key of targets) {
    const text = formatTime(key / 100);
    const existing = state.labels.get(key);
    if (!existing) {
      state.labels.set(key, { alpha: 0, text });
    } else {
      existing.text = text;
    }
  }
  for (const [key, label] of state.labels) {
    const x = toX(key / 100);
    const isTarget = targets.has(key);
    const target = isTarget ? edgeAlpha(x) : 0;
    let next = lerp(label.alpha, target, FADE, dt);
    if (Math.abs(next - target) < 0.02) next = target;
    if (next < 0.01 && target === 0) {
      state.labels.delete(key);
    } else {
      label.alpha = next;
    }
  }
  const lineY = h - pad.bottom;
  const tickLen = 5;
  ctx.strokeStyle = palette.gridLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(chartLeft, lineY);
  ctx.lineTo(chartRight, lineY);
  ctx.stroke();
  ctx.textAlign = "center";
  const labels = [];
  for (const [key, label] of state.labels) {
    if (label.alpha < 0.02) continue;
    const x = toX(key / 100);
    if (x < chartLeft - 20 || x > chartRight) continue;
    const w = ctx.measureText(label.text).width;
    labels.push({ x, alpha: label.alpha, text: label.text, w });
  }
  labels.sort((a, b) => a.x - b.x);
  const drawn = [];
  for (const label of labels) {
    const left = label.x - label.w / 2;
    if (drawn.length > 0) {
      const prev = drawn[drawn.length - 1];
      const prevRight = prev.x + prev.w / 2;
      if (left < prevRight + 8) {
        if (label.alpha > prev.alpha) {
          drawn[drawn.length - 1] = label;
        }
        continue;
      }
    }
    drawn.push(label);
  }
  for (const label of drawn) {
    ctx.save();
    ctx.globalAlpha = label.alpha;
    ctx.strokeStyle = palette.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(label.x, lineY);
    ctx.lineTo(label.x, lineY + tickLen);
    ctx.stroke();
    ctx.fillStyle = palette.timeLabel;
    ctx.fillText(label.text, label.x, lineY + tickLen + 14);
    ctx.restore();
  }
}

// src/draw/orderbook.ts
var GREEN = [34, 197, 94];
var RED = [239, 68, 68];
function createOrderbookState() {
  return {
    labels: [],
    spawnTimer: 0,
    smoothSpeed: BASE_SPEED,
    prevBidTotal: 0,
    prevAskTotal: 0,
    churnRate: 0
  };
}
var MAX_LABELS = 50;
var LABEL_LIFETIME = 6;
var SPAWN_INTERVAL = 40;
var MIN_LABEL_GAP = 22;
var BASE_SPEED = 60;
var MAX_SPEED = 160;
function mixColor(from, to, t) {
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r},${g},${b})`;
}
function drawOrderbook(ctx, layout, palette, orderbook, dt, state, swingMagnitude) {
  const { pad, h, chartH } = layout;
  const dtSec = dt / 1e3;
  if (orderbook.bids.length === 0 && orderbook.asks.length === 0) return;
  let maxSize = 0;
  let bidTotal = 0;
  let askTotal = 0;
  for (const [, size] of orderbook.bids) {
    bidTotal += size;
    if (size > maxSize) maxSize = size;
  }
  for (const [, size] of orderbook.asks) {
    askTotal += size;
    if (size > maxSize) maxSize = size;
  }
  if (maxSize === 0) return;
  const totalSize = bidTotal + askTotal;
  const prevTotal = state.prevBidTotal + state.prevAskTotal;
  let churnSignal = 0;
  if (prevTotal > 0) {
    const delta = Math.abs(bidTotal - state.prevBidTotal) + Math.abs(askTotal - state.prevAskTotal);
    churnSignal = Math.min(delta / prevTotal, 1);
  }
  state.prevBidTotal = bidTotal;
  state.prevAskTotal = askTotal;
  const churnLerp = churnSignal > state.churnRate ? 0.3 : 0.05;
  state.churnRate += (churnSignal - state.churnRate) * churnLerp;
  const activity = Math.max(Math.min(swingMagnitude * 5, 1), state.churnRate);
  const targetSpeed = BASE_SPEED + activity * (MAX_SPEED - BASE_SPEED);
  const speedLerp = 1 - Math.pow(0.95, dt / 16.67);
  state.smoothSpeed += (targetSpeed - state.smoothSpeed) * speedLerp;
  const speed = state.smoothSpeed;
  const labelX = pad.left + 8;
  const bottomY = h - pad.bottom - 6;
  const topY = pad.top;
  const bg = palette.bgRgb;
  state.spawnTimer += dt;
  while (state.spawnTimer >= SPAWN_INTERVAL && state.labels.length < MAX_LABELS) {
    state.spawnTimer -= SPAWN_INTERVAL;
    let tooClose = false;
    for (let j = 0; j < state.labels.length; j++) {
      if (Math.abs(state.labels[j].y - bottomY) < MIN_LABEL_GAP) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) break;
    const allLevels = [];
    for (const [, size] of orderbook.bids) allLevels.push({ size, green: true });
    for (const [, size] of orderbook.asks) allLevels.push({ size, green: false });
    let totalWeight = 0;
    for (const l of allLevels) totalWeight += l.size;
    let r = Math.random() * totalWeight;
    let picked = allLevels[0];
    for (const l of allLevels) {
      r -= l.size;
      if (r <= 0) {
        picked = l;
        break;
      }
    }
    const sizeRatio = picked.size / maxSize;
    state.labels.push({
      y: bottomY,
      text: `+ ${formatSize(picked.size)}`,
      green: picked.green,
      life: LABEL_LIFETIME,
      maxLife: LABEL_LIFETIME,
      intensity: 0.5 + sizeRatio * 0.5
    });
  }
  const range = bottomY - topY;
  let writeIdx = 0;
  for (let i = 0; i < state.labels.length; i++) {
    const l = state.labels[i];
    l.life -= dtSec;
    if (l.life <= 0) continue;
    const yProgress = range > 0 ? (l.y - topY) / range : 1;
    l.y -= speed * (0.7 + 0.3 * yProgress) * dtSec;
    if (l.y < topY - 14) continue;
    state.labels[writeIdx++] = l;
  }
  state.labels.length = writeIdx;
  ctx.save();
  ctx.font = '600 13px "SF Mono", Menlo, monospace';
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = 1;
  const outlineColor = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
  for (let i = 0; i < state.labels.length; i++) {
    const l = state.labels[i];
    const lifeRatio = l.life / l.maxLife;
    const fadeIn = Math.min((1 - lifeRatio) * 10, 1);
    const yRatio = (l.y - topY) / chartH;
    const fadeOut = yRatio < 0.45 ? yRatio / 0.45 : 1;
    const colorStrength = l.intensity * fadeIn * fadeOut;
    const baseColor = l.green ? GREEN : RED;
    const fillColor = mixColor(baseColor, bg, 1 - colorStrength);
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.strokeText(l.text, labelX, l.y);
    ctx.fillStyle = fillColor;
    ctx.fillText(l.text, labelX, l.y);
  }
  ctx.restore();
}
function formatSize(size) {
  if (size >= 10) return `$${Math.round(size)}`;
  if (size >= 1) return `$${size.toFixed(1)}`;
  return `$${size.toFixed(2)}`;
}

// src/draw/particles.ts
function createParticleState() {
  return { particles: [], cooldown: 0, burstCount: 0 };
}
var MAX_PARTICLES = 80;
var PARTICLE_LIFETIME = 1;
var COOLDOWN_MS = 400;
var MAGNITUDE_THRESHOLD = 0.08;
var MAX_BURSTS = 3;
function spawnOnSwing(state, momentum, dotX, dotY, swingMagnitude, accentColor, dt, options) {
  state.cooldown = Math.max(0, state.cooldown - dt);
  if (momentum === "flat") return 0;
  if (state.cooldown > 0) return 0;
  if (swingMagnitude < MAGNITUDE_THRESHOLD) {
    state.burstCount = 0;
    return 0;
  }
  if (momentum === "down" && options?.downMomentum !== true) return 0;
  if (state.burstCount >= MAX_BURSTS) return 0;
  state.cooldown = COOLDOWN_MS;
  const scale = options?.scale ?? 1;
  const isUp = momentum === "up";
  const mag = Math.min(swingMagnitude * 5, 1);
  const burstFalloff = mag > 0.6 ? 1 : [1, 0.6, 0.35][state.burstCount] ?? 0.35;
  state.burstCount++;
  const count = Math.round((12 + mag * 20) * scale * burstFalloff);
  const speedMultiplier = 1 + mag * 0.8;
  for (let i = 0; i < count && state.particles.length < MAX_PARTICLES; i++) {
    const baseAngle = isUp ? -Math.PI / 2 : Math.PI / 2;
    const spread = Math.PI * 1.2;
    const angle = baseAngle + (Math.random() - 0.5) * spread;
    const speed = (60 + Math.random() * 100) * speedMultiplier;
    state.particles.push({
      x: dotX + (Math.random() - 0.5) * 24,
      y: dotY + (Math.random() - 0.5) * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      size: (1 + Math.random() * 1.2) * scale * burstFalloff,
      color: accentColor
    });
  }
  return burstFalloff;
}
function drawParticles(ctx, state, dt) {
  if (state.particles.length === 0) return;
  const dtSec = dt / 1e3;
  ctx.save();
  let writeIdx = 0;
  for (let i = 0; i < state.particles.length; i++) {
    const p = state.particles[i];
    p.life -= dtSec / PARTICLE_LIFETIME;
    if (p.life <= 0) continue;
    p.x += p.vx * dtSec;
    p.y += p.vy * dtSec;
    p.vx *= 0.95;
    p.vy *= 0.95;
    ctx.globalAlpha = p.life * 0.55;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.5 + p.life * 0.5), 0, Math.PI * 2);
    ctx.fill();
    state.particles[writeIdx++] = p;
  }
  state.particles.length = writeIdx;
  ctx.restore();
}

// src/draw/index.ts
var SHAKE_DECAY_RATE = 2e-3;
var SHAKE_MIN_AMPLITUDE = 0.2;
var FADE_EDGE_WIDTH = 40;
var CROSSHAIR_FADE_MIN_PX = 5;
function createShakeState() {
  return { amplitude: 0 };
}
function drawFrame(ctx, layout, palette, opts) {
  const shake = opts.shakeState;
  let shakeX = 0;
  let shakeY = 0;
  if (shake && shake.amplitude > SHAKE_MIN_AMPLITUDE) {
    shakeX = (Math.random() - 0.5) * 2 * shake.amplitude;
    shakeY = (Math.random() - 0.5) * 2 * shake.amplitude;
    ctx.save();
    ctx.translate(shakeX, shakeY);
  }
  if (shake) {
    const decayRate = Math.pow(SHAKE_DECAY_RATE, opts.dt / 1e3);
    shake.amplitude *= decayRate;
    if (shake.amplitude < SHAKE_MIN_AMPLITUDE) shake.amplitude = 0;
  }
  if (opts.referenceLine) {
    drawReferenceLine(ctx, layout, palette, opts.referenceLine);
  }
  if (opts.showGrid) {
    drawGrid(ctx, layout, palette, opts.formatValue, opts.gridState, opts.dt);
  }
  if (opts.orderbookData && opts.orderbookState) {
    drawOrderbook(ctx, layout, palette, opts.orderbookData, opts.dt, opts.orderbookState, opts.swingMagnitude);
  }
  const scrubX = opts.scrubAmount > 0.05 ? opts.hoverX : null;
  const pts = drawLine(ctx, layout, palette, opts.visible, opts.smoothValue, opts.now, opts.showFill, scrubX, opts.scrubAmount);
  drawTimeAxis(ctx, layout, palette, opts.windowSecs, opts.targetWindowSecs, opts.formatTime, opts.timeAxisState, opts.dt);
  if (pts && pts.length > 0) {
    const lastPt = pts[pts.length - 1];
    let dotScrub = opts.scrubAmount;
    if (opts.hoverX !== null && dotScrub > 0) {
      const distToLive = lastPt[0] - opts.hoverX;
      const fadeStart = Math.min(80, layout.chartW * 0.3);
      dotScrub = distToLive < CROSSHAIR_FADE_MIN_PX ? 0 : distToLive >= fadeStart ? opts.scrubAmount : (distToLive - CROSSHAIR_FADE_MIN_PX) / (fadeStart - CROSSHAIR_FADE_MIN_PX) * opts.scrubAmount;
    }
    drawDot(ctx, lastPt[0], lastPt[1], palette, opts.showPulse, dotScrub);
    if (opts.showMomentum) {
      drawArrows(
        ctx,
        lastPt[0],
        lastPt[1],
        opts.momentum,
        palette,
        opts.arrowState,
        opts.dt
      );
    }
    if (opts.particleState) {
      const burstIntensity = spawnOnSwing(
        opts.particleState,
        opts.momentum,
        lastPt[0],
        lastPt[1],
        opts.swingMagnitude,
        palette.line,
        opts.dt,
        opts.particleOptions
      );
      if (burstIntensity > 0 && shake) {
        shake.amplitude = (3 + opts.swingMagnitude * 4) * burstIntensity;
      }
      drawParticles(ctx, opts.particleState, opts.dt);
    }
  }
  const fadeW = FADE_EDGE_WIDTH;
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  const fadeGrad = ctx.createLinearGradient(layout.pad.left, 0, layout.pad.left + fadeW, 0);
  fadeGrad.addColorStop(0, "rgba(0, 0, 0, 1)");
  fadeGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = fadeGrad;
  ctx.fillRect(0, 0, layout.pad.left + fadeW, layout.h);
  ctx.restore();
  if (opts.hoverX !== null && opts.hoverValue !== null && opts.hoverTime !== null && pts && pts.length > 0) {
    const lastPt = pts[pts.length - 1];
    const distToLive = lastPt[0] - opts.hoverX;
    const fadeStart = Math.min(80, layout.chartW * 0.3);
    const scrubOpacity = distToLive < CROSSHAIR_FADE_MIN_PX ? 0 : distToLive >= fadeStart ? opts.scrubAmount : (distToLive - CROSSHAIR_FADE_MIN_PX) / (fadeStart - CROSSHAIR_FADE_MIN_PX) * opts.scrubAmount;
    if (scrubOpacity > 0.01) {
      drawCrosshair(
        ctx,
        layout,
        palette,
        opts.hoverX,
        opts.hoverValue,
        opts.hoverTime,
        opts.formatValue,
        opts.formatTime,
        scrubOpacity,
        opts.tooltipY,
        lastPt[0],
        // liveDotX — tooltip right edge stops here
        opts.tooltipOutline
      );
    }
  }
  if (shake && (shakeX !== 0 || shakeY !== 0)) {
    ctx.restore();
  }
}

// src/draw/badge.ts
function badgeSvgPath(pillW, pillH, tailLen, tailSpread) {
  const r = pillH / 2;
  const cx = tailLen + pillW - r;
  const tl = tailLen + r;
  return [
    `M${tl},0`,
    `L${cx},0`,
    `A${r},${r},0,0,1,${cx},${pillH}`,
    `L${tl},${pillH}`,
    `C${tailLen + 2},${pillH},${3},${r + tailSpread},0,${r}`,
    `C${3},${r - tailSpread},${tailLen + 2},0,${tl},0`,
    "Z"
  ].join(" ");
}
function badgePillOnly(pillW, pillH) {
  const r = pillH / 2;
  return [
    `M${r},0`,
    `L${pillW - r},0`,
    `A${r},${r},0,0,1,${pillW - r},${pillH}`,
    `L${r},${pillH}`,
    `A${r},${r},0,0,1,${r},0`,
    "Z"
  ].join(" ");
}
var BADGE_PAD_X = 10;
var BADGE_PAD_Y = 3;
var BADGE_TAIL_LEN = 5;
var BADGE_TAIL_SPREAD = 2.5;
var BADGE_LINE_H = 16;

// src/useLivelineEngine.ts
var SVG_NS = "http://www.w3.org/2000/svg";
var MAX_DELTA_MS = 50;
var SCRUB_LERP_SPEED = 0.12;
var BADGE_WIDTH_LERP = 0.15;
var BADGE_Y_LERP = 0.35;
var BADGE_Y_LERP_TRANSITIONING = 0.5;
var MOMENTUM_COLOR_LERP = 0.12;
var WINDOW_TRANSITION_MS = 750;
var WINDOW_BUFFER = 0.05;
var VALUE_SNAP_THRESHOLD = 1e-3;
var ADAPTIVE_SPEED_BOOST = 0.2;
var MOMENTUM_GREEN = [34, 197, 94];
var MOMENTUM_RED = [239, 68, 68];
function computeAdaptiveSpeed(value, displayValue, displayMin, displayMax, lerpSpeed, noMotion) {
  const valGap = Math.abs(value - displayValue);
  const prevRange = displayMax - displayMin || 1;
  const gapRatio = Math.min(valGap / prevRange, 1);
  return noMotion ? 1 : lerpSpeed + (1 - gapRatio) * ADAPTIVE_SPEED_BOOST;
}
function updateWindowTransition(cfg, wt, displayWindow, displayMin, displayMax, noMotion, now_ms, now, points, smoothValue, buffer) {
  if (wt.to !== cfg.windowSecs) {
    wt.from = displayWindow;
    wt.to = cfg.windowSecs;
    wt.startMs = now_ms;
    wt.rangeFromMin = displayMin;
    wt.rangeFromMax = displayMax;
    const targetRightEdge = now + cfg.windowSecs * buffer;
    const targetLeftEdge = targetRightEdge - cfg.windowSecs;
    const targetVisible = [];
    for (const p of points) {
      if (p.time >= targetLeftEdge - 2 && p.time <= targetRightEdge) {
        targetVisible.push(p);
      }
    }
    if (targetVisible.length > 0) {
      const targetRange = computeRange(targetVisible, smoothValue, cfg.referenceLine?.value, cfg.exaggerate);
      wt.rangeToMin = targetRange.min;
      wt.rangeToMax = targetRange.max;
    }
  }
  let windowTransProgress = 0;
  let resultWindow;
  if (noMotion || wt.startMs === 0) {
    resultWindow = cfg.windowSecs;
  } else {
    const elapsed = now_ms - wt.startMs;
    const duration = WINDOW_TRANSITION_MS;
    const t = Math.min(elapsed / duration, 1);
    const eased = (1 - Math.cos(t * Math.PI)) / 2;
    windowTransProgress = eased;
    const logFrom = Math.log(wt.from);
    const logTo = Math.log(wt.to);
    resultWindow = Math.exp(logFrom + (logTo - logFrom) * eased);
    if (t >= 1) {
      resultWindow = cfg.windowSecs;
      wt.startMs = 0;
      windowTransProgress = 0;
    }
  }
  return { windowSecs: resultWindow, windowTransProgress };
}
function updateRange(computedRange, rangeInited, targetMin, targetMax, displayMin, displayMax, isTransitioning, windowTransProgress, wt, adaptiveSpeed, chartH, dt) {
  if (!rangeInited) {
    return {
      minVal: computedRange.min,
      maxVal: computedRange.max,
      valRange: computedRange.max - computedRange.min || 1e-3,
      targetMin: computedRange.min,
      targetMax: computedRange.max,
      displayMin: computedRange.min,
      displayMax: computedRange.max,
      rangeInited: true
    };
  }
  if (isTransitioning) {
    displayMin = wt.rangeFromMin + (wt.rangeToMin - wt.rangeFromMin) * windowTransProgress;
    displayMax = wt.rangeFromMax + (wt.rangeToMax - wt.rangeFromMax) * windowTransProgress;
    targetMin = computedRange.min;
    targetMax = computedRange.max;
  } else {
    const curRange = displayMax - displayMin;
    targetMin = computedRange.min;
    targetMax = computedRange.max;
    displayMin = lerp(displayMin, targetMin, adaptiveSpeed, dt);
    displayMax = lerp(displayMax, targetMax, adaptiveSpeed, dt);
    const pxThreshold = 0.5 * curRange / chartH || 1e-3;
    if (Math.abs(displayMin - targetMin) < pxThreshold) displayMin = targetMin;
    if (Math.abs(displayMax - targetMax) < pxThreshold) displayMax = targetMax;
  }
  return {
    minVal: displayMin,
    maxVal: displayMax,
    valRange: displayMax - displayMin || 1e-3,
    targetMin,
    targetMax,
    displayMin,
    displayMax,
    rangeInited: true
  };
}
function updateHoverState(hoverPixelX, pad, w, layout, now, visible, scrubAmount, lastHover, cfg, noMotion, leftEdge, rightEdge, chartW, dt) {
  let hoverValue = null;
  let hoverTime = null;
  let hoverChartX = null;
  let isActiveHover = false;
  if (hoverPixelX !== null && hoverPixelX >= pad.left && hoverPixelX <= w - pad.right) {
    const maxHoverX = layout.toX(now);
    const clampedX = Math.min(hoverPixelX, maxHoverX);
    const t = leftEdge + (clampedX - pad.left) / chartW * (rightEdge - leftEdge);
    const v = interpolateAtTime(visible, t);
    if (v !== null) {
      hoverValue = v;
      hoverTime = t;
      hoverChartX = clampedX;
      isActiveHover = true;
      lastHover = { x: clampedX, value: v, time: t };
      cfg.onHover?.({ time: t, value: v, x: clampedX, y: layout.toY(v) });
    }
  }
  const scrubTarget = isActiveHover ? 1 : 0;
  if (noMotion) {
    scrubAmount = scrubTarget;
  } else {
    scrubAmount += (scrubTarget - scrubAmount) * SCRUB_LERP_SPEED;
    if (scrubAmount < 0.01) scrubAmount = 0;
    if (scrubAmount > 0.99) scrubAmount = 1;
  }
  let drawHoverX = hoverChartX;
  let drawHoverValue = hoverValue;
  let drawHoverTime = hoverTime;
  if (!isActiveHover && scrubAmount > 0 && lastHover) {
    drawHoverX = lastHover.x;
    drawHoverValue = lastHover.value;
    drawHoverTime = lastHover.time;
  }
  return {
    hoverX: drawHoverX,
    hoverValue: drawHoverValue,
    hoverTime: drawHoverTime,
    scrubAmount,
    isActiveHover,
    lastHover
  };
}
function updateBadgeDOM(badge, cfg, smoothValue, layout, momentum, badgeY, badgeColor, isWindowTransitioning, noMotion, ctx, dt) {
  if (!cfg.showBadge) {
    badge.container.style.display = "none";
    return badgeY;
  }
  badge.container.style.display = "";
  const { w, h, pad } = layout;
  const text = cfg.formatValue(smoothValue);
  badge.text.textContent = text;
  badge.text.style.font = cfg.palette.labelFont;
  badge.text.style.lineHeight = `${BADGE_LINE_H}px`;
  const tailLen = cfg.badgeTail ? BADGE_TAIL_LEN : 0;
  badge.text.style.padding = `${BADGE_PAD_Y}px ${BADGE_PAD_X}px ${BADGE_PAD_Y}px ${tailLen + BADGE_PAD_X}px`;
  ctx.font = cfg.palette.labelFont;
  const template = text.replace(/[0-9]/g, "8");
  const targetTextW = ctx.measureText(template).width;
  badge.targetW = targetTextW;
  if (badge.displayW === 0) badge.displayW = targetTextW;
  badge.displayW = lerp(badge.displayW, badge.targetW, BADGE_WIDTH_LERP, dt);
  if (Math.abs(badge.displayW - badge.targetW) < 0.3) badge.displayW = badge.targetW;
  const textW = badge.displayW;
  const pillW = textW + BADGE_PAD_X * 2;
  const pillH = BADGE_LINE_H + BADGE_PAD_Y * 2;
  const totalW = tailLen + pillW;
  badge.svg.setAttribute("width", String(Math.ceil(totalW)));
  badge.svg.setAttribute("height", String(pillH));
  badge.svg.setAttribute("viewBox", `0 0 ${totalW} ${pillH}`);
  badge.path.setAttribute("d", cfg.badgeTail ? badgeSvgPath(pillW, pillH, BADGE_TAIL_LEN, BADGE_TAIL_SPREAD) : badgePillOnly(pillW, pillH));
  const targetBadgeY = Math.max(pad.top, Math.min(h - pad.bottom, layout.toY(smoothValue)));
  if (badgeY === null || noMotion) {
    badgeY = targetBadgeY;
  } else {
    const badgeSpeed = isWindowTransitioning ? BADGE_Y_LERP_TRANSITIONING : BADGE_Y_LERP;
    badgeY = lerp(badgeY, targetBadgeY, badgeSpeed, dt);
  }
  const badgeLeft = w - pad.right + 8 - BADGE_PAD_X - tailLen;
  const badgeTop = badgeY - pillH / 2;
  badge.container.style.transform = `translate3d(${badgeLeft}px, ${badgeTop}px, 0)`;
  if (cfg.badgeVariant === "minimal") {
    badge.path.setAttribute("fill", cfg.palette.badgeOuterBg);
    badge.text.style.color = cfg.palette.tooltipText;
    badge.container.style.filter = `drop-shadow(0 1px 4px ${cfg.palette.badgeOuterShadow})`;
  } else {
    badge.container.style.filter = "";
    badge.text.style.color = "#fff";
    const bs = badgeColor;
    let fillColor;
    if (!cfg.showMomentum) {
      fillColor = cfg.palette.line;
    } else {
      const target = momentum === "up" ? 1 : momentum === "down" ? 0 : bs.green;
      bs.green = noMotion ? target : lerp(bs.green, target, MOMENTUM_COLOR_LERP, dt);
      if (bs.green > 0.99) bs.green = 1;
      if (bs.green < 0.01) bs.green = 0;
      const g = bs.green;
      const rr = Math.round(MOMENTUM_RED[0] + (MOMENTUM_GREEN[0] - MOMENTUM_RED[0]) * g);
      const gg = Math.round(MOMENTUM_RED[1] + (MOMENTUM_GREEN[1] - MOMENTUM_RED[1]) * g);
      const bb = Math.round(MOMENTUM_RED[2] + (MOMENTUM_GREEN[2] - MOMENTUM_RED[2]) * g);
      fillColor = `rgb(${rr},${gg},${bb})`;
    }
    badge.path.setAttribute("fill", fillColor);
  }
  return badgeY;
}

function createLivelineEngine(canvas, container, getConfig) {
  if (!canvas || !container) {
    return {
      requestRedraw() {},
      destroy() {}
    };
  }

  const initialConfig = getConfig();

  const displayValueRef = { current: initialConfig.value };
  const displayMinRef = { current: 0 };
  const displayMaxRef = { current: 0 };
  const targetMinRef = { current: 0 };
  const targetMaxRef = { current: 0 };
  const rangeInitedRef = { current: false };
  const displayWindowRef = { current: initialConfig.windowSecs };
  const windowTransitionRef = {
    current: {
      from: initialConfig.windowSecs,
      to: initialConfig.windowSecs,
      startMs: 0,
      rangeFromMin: 0,
      rangeFromMax: 0,
      rangeToMin: 0,
      rangeToMax: 0
    }
  };
  const arrowStateRef = { current: { up: 0, down: 0 } };
  const gridStateRef = { current: { interval: 0, labels: /* @__PURE__ */ new Map() } };
  const timeAxisStateRef = { current: { labels: /* @__PURE__ */ new Map() } };
  const orderbookStateRef = { current: createOrderbookState() };
  const particleStateRef = { current: createParticleState() };
  const shakeStateRef = { current: createShakeState() };
  const badgeColorRef = { current: { green: 1 } };
  const badgeYRef = { current: null };
  const reducedMotionRef = { current: false };
  const sizeRef = { current: { w: 0, h: 0 } };
  const rafRef = { current: 0 };
  const lastFrameRef = { current: 0 };
  const badgeRef = { current: null };
  const hoverXRef = { current: null };
  const scrubAmountRef = { current: 0 };
  const lastHoverRef = { current: null };

  let destroyed = false;
  let resizeObserver = null;
  let motionMediaQuery = null;
  let motionListener = null;

  const mountBadge = () => {
    const el = document.createElement("div");
    el.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;will-change:transform;display:none;z-index:1;";

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.style.cssText = "position:absolute;top:0;left:0;";

    const path = document.createElementNS(SVG_NS, "path");
    svg.appendChild(path);

    const text = document.createElement("span");
    text.style.cssText = "position:relative;display:block;color:#fff;white-space:nowrap;";

    el.appendChild(svg);
    el.appendChild(text);
    container.appendChild(el);

    badgeRef.current = { container: el, svg, path, text, displayW: 0, targetW: 0 };
  };

  const unmountBadge = () => {
    const badge = badgeRef.current;
    if (!badge) return;
    if (badge.container.parentNode === container) {
      container.removeChild(badge.container);
    }
    badgeRef.current = null;
  };

  const updateContainerSize = () => {
    const rect = container.getBoundingClientRect();
    sizeRef.current = { w: rect.width, h: rect.height };
  };

  const onMove = (e) => {
    const cfg = getConfig();
    if (!cfg.scrub) return;
    const rect = container.getBoundingClientRect();
    hoverXRef.current = e.clientX - rect.left;
  };

  const onLeave = () => {
    hoverXRef.current = null;
    const cfg = getConfig();
    if (cfg.onHover) cfg.onHover(null);
  };

  const onTouchStart = (e) => {
    const cfg = getConfig();
    if (!cfg.scrub) return;
    if (e.touches.length !== 1) return;
    const rect = container.getBoundingClientRect();
    hoverXRef.current = e.touches[0].clientX - rect.left;
  };

  const onTouchMove = (e) => {
    const cfg = getConfig();
    if (!cfg.scrub) return;
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    hoverXRef.current = e.touches[0].clientX - rect.left;
  };

  const onTouchEnd = () => {
    hoverXRef.current = null;
    const cfg = getConfig();
    if (cfg.onHover) cfg.onHover(null);
  };

  const onVisibility = () => {
    if (!document.hidden && !rafRef.current && !destroyed) {
      rafRef.current = requestAnimationFrame(draw);
    }
  };

  const draw = () => {
    if (destroyed) {
      rafRef.current = 0;
      return;
    }

    if (document.hidden) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    let { w, h } = sizeRef.current;

    if (w === 0 || h === 0) {
      updateContainerSize();
      w = sizeRef.current.w;
      h = sizeRef.current.h;
    }

    if (w === 0 || h === 0) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const cfg = getConfig();
    const dpr = getDpr();
    const nowMs = performance.now();
    const dt = lastFrameRef.current ? Math.min(nowMs - lastFrameRef.current, MAX_DELTA_MS) : 16.67;
    lastFrameRef.current = nowMs;

    const targetW = Math.round(w * dpr);
    const targetH = Math.round(h * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    applyDpr(ctx, dpr, w, h);

    const noMotion = reducedMotionRef.current;
    const points = cfg.data;

    if (!Array.isArray(points) || points.length < 2) {
      if (badgeRef.current) badgeRef.current.container.style.display = "none";
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const adaptiveSpeed = computeAdaptiveSpeed(
      cfg.value,
      displayValueRef.current,
      displayMinRef.current,
      displayMaxRef.current,
      cfg.lerpSpeed,
      noMotion
    );

    displayValueRef.current = lerp(displayValueRef.current, cfg.value, adaptiveSpeed, dt);

    const prevRange = displayMaxRef.current - displayMinRef.current || 1;
    if (Math.abs(displayValueRef.current - cfg.value) < prevRange * VALUE_SNAP_THRESHOLD) {
      displayValueRef.current = cfg.value;
    }

    const smoothValue = displayValueRef.current;
    const pad = cfg.padding;
    const chartW = w - pad.left - pad.right;

    const needsArrowRoom = cfg.showMomentum;
    const buffer = needsArrowRoom ? Math.max(WINDOW_BUFFER, 37 / Math.max(chartW, 1)) : WINDOW_BUFFER;

    const transition = windowTransitionRef.current;
    const now = Date.now() / 1e3;

    const windowResult = updateWindowTransition(
      cfg,
      transition,
      displayWindowRef.current,
      displayMinRef.current,
      displayMaxRef.current,
      noMotion,
      nowMs,
      now,
      points,
      smoothValue,
      buffer
    );

    displayWindowRef.current = windowResult.windowSecs;
    const windowSecs = windowResult.windowSecs;
    const windowTransProgress = windowResult.windowTransProgress;

    const rightEdge = now + windowSecs * buffer;
    const leftEdge = rightEdge - windowSecs;

    const visible = [];
    for (const p of points) {
      if (p.time >= leftEdge - 2 && p.time <= rightEdge) {
        visible.push(p);
      }
    }

    if (visible.length < 2) {
      if (badgeRef.current) badgeRef.current.container.style.display = "none";
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const chartH = h - pad.top - pad.bottom;

    const computedRange = computeRange(visible, smoothValue, cfg.referenceLine?.value, cfg.exaggerate);

    const isWindowTransitioning = transition.startMs > 0;

    const rangeResult = updateRange(
      computedRange,
      rangeInitedRef.current,
      targetMinRef.current,
      targetMaxRef.current,
      displayMinRef.current,
      displayMaxRef.current,
      isWindowTransitioning,
      windowTransProgress,
      transition,
      adaptiveSpeed,
      chartH,
      dt
    );

    rangeInitedRef.current = rangeResult.rangeInited;
    targetMinRef.current = rangeResult.targetMin;
    targetMaxRef.current = rangeResult.targetMax;
    displayMinRef.current = rangeResult.displayMin;
    displayMaxRef.current = rangeResult.displayMax;

    const { minVal, maxVal, valRange } = rangeResult;

    const layout = {
      w,
      h,
      pad,
      chartW,
      chartH,
      leftEdge,
      rightEdge,
      minVal,
      maxVal,
      valRange,
      toX: (t) => pad.left + (t - leftEdge) / (rightEdge - leftEdge) * chartW,
      toY: (v) => pad.top + (1 - (v - minVal) / valRange) * chartH
    };

    const momentum = cfg.momentumOverride ?? detectMomentum(visible);

    const hoverResult = updateHoverState(
      hoverXRef.current,
      pad,
      w,
      layout,
      now,
      visible,
      scrubAmountRef.current,
      lastHoverRef.current,
      cfg,
      noMotion,
      leftEdge,
      rightEdge,
      chartW,
      dt
    );

    scrubAmountRef.current = hoverResult.scrubAmount;
    lastHoverRef.current = hoverResult.lastHover;

    const { hoverX: drawHoverX, hoverValue: drawHoverValue, hoverTime: drawHoverTime } = hoverResult;

    const lookback = Math.min(5, visible.length - 1);
    const recentDelta = lookback > 0 ? Math.abs(visible[visible.length - 1].value - visible[visible.length - 1 - lookback].value) : 0;
    const swingMagnitude = valRange > 0 ? Math.min(recentDelta / valRange, 1) : 0;

    drawFrame(ctx, layout, cfg.palette, {
      visible,
      smoothValue,
      now,
      momentum,
      arrowState: arrowStateRef.current,
      showGrid: cfg.showGrid,
      showMomentum: cfg.showMomentum,
      showPulse: cfg.showPulse,
      showFill: cfg.showFill,
      referenceLine: cfg.referenceLine,
      hoverX: drawHoverX,
      hoverValue: drawHoverValue,
      hoverTime: drawHoverTime,
      scrubAmount: scrubAmountRef.current,
      windowSecs,
      formatValue: cfg.formatValue,
      formatTime: cfg.formatTime,
      gridState: gridStateRef.current,
      timeAxisState: timeAxisStateRef.current,
      dt,
      targetWindowSecs: cfg.windowSecs,
      tooltipY: cfg.tooltipY,
      tooltipOutline: cfg.tooltipOutline,
      orderbookData: cfg.orderbookData,
      orderbookState: cfg.orderbookData ? orderbookStateRef.current : void 0,
      particleState: cfg.degenOptions ? particleStateRef.current : void 0,
      particleOptions: cfg.degenOptions,
      swingMagnitude,
      shakeState: cfg.degenOptions ? shakeStateRef.current : void 0
    });

    const badge = badgeRef.current;
    if (badge) {
      badgeYRef.current = updateBadgeDOM(
        badge,
        cfg,
        smoothValue,
        layout,
        momentum,
        badgeYRef.current,
        badgeColorRef.current,
        isWindowTransitioning,
        noMotion,
        ctx,
        dt
      );
    }

    if (cfg.valueDisplayEl) {
      const displayVal = cfg.valueMomentumColor ? Math.abs(smoothValue) : smoothValue;
      cfg.valueDisplayEl.textContent = cfg.formatValue(displayVal);

      if (cfg.valueMomentumColor) {
        const mc = momentum === "up" ? "#22c55e" : momentum === "down" ? "#ef4444" : "";
        if (mc) cfg.valueDisplayEl.style.color = mc;
        else cfg.valueDisplayEl.style.removeProperty("color");
      }
    }

    rafRef.current = requestAnimationFrame(draw);
  };

  mountBadge();

  updateContainerSize();

  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      sizeRef.current = { w: width, h: height };
    });
    resizeObserver.observe(container);
  }

  container.addEventListener("mousemove", onMove);
  container.addEventListener("mouseleave", onLeave);
  container.addEventListener("touchstart", onTouchStart, { passive: true });
  container.addEventListener("touchmove", onTouchMove, { passive: false });
  container.addEventListener("touchend", onTouchEnd);
  container.addEventListener("touchcancel", onTouchEnd);

  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    motionMediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = motionMediaQuery.matches;
    motionListener = (e) => {
      reducedMotionRef.current = e.matches;
    };

    if (typeof motionMediaQuery.addEventListener === "function") {
      motionMediaQuery.addEventListener("change", motionListener);
    } else if (typeof motionMediaQuery.addListener === "function") {
      motionMediaQuery.addListener(motionListener);
    }
  }

  document.addEventListener("visibilitychange", onVisibility);

  rafRef.current = requestAnimationFrame(draw);

  return {
    requestRedraw() {
      if (destroyed) return;
      if (!rafRef.current && !document.hidden) {
        rafRef.current = requestAnimationFrame(draw);
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;

      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);

      document.removeEventListener("visibilitychange", onVisibility);

      if (motionMediaQuery && motionListener) {
        if (typeof motionMediaQuery.removeEventListener === "function") {
          motionMediaQuery.removeEventListener("change", motionListener);
        } else if (typeof motionMediaQuery.removeListener === "function") {
          motionMediaQuery.removeListener(motionListener);
        }
      }

      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }

      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;

      unmountBadge();
    }
  };
}

const DEFAULT_FORMAT_VALUE = (v) => Number.isFinite(v) ? v.toFixed(2) : "—";
const DEFAULT_FORMAT_TIME = (t) => {
  const d = new Date(t * 1e3);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
};

const BASE_CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
  position: "relative",
  flex: "1 1 auto",
  minHeight: "0"
};

class LivelineDatastar {
  constructor(host, options = {}) {
    if (!host) {
      throw new Error("LivelineDatastar requires a host element");
    }

    this.host = host;
    this.options = normalizeOptions(options);
    this.activeWindowSecs = null;

    this.ui = {
      shell: null,
      valueDisplay: null,
      windowBar: null,
      windowIndicator: null,
      chartContainer: null,
      canvas: null,
      windowButtonMap: new Map()
    };

    this._destroyed = false;
    this._onWindowResize = () => this.syncWindowIndicator();

    this.buildUi();
    this.applyOptions(this.options, { forceWindowRender: true });

    this.engine = createLivelineEngine(this.ui.canvas, this.ui.chartContainer, () => this.runtimeConfig);

    window.addEventListener("resize", this._onWindowResize, { passive: true });
  }

  buildUi() {
    this.host.innerHTML = "";
    this.host.dataset.livelineReady = "true";

    const shell = document.createElement("div");
    shell.style.cssText = "display:flex;flex-direction:column;width:100%;height:100%;min-height:0;";

    const valueDisplay = document.createElement("span");
    valueDisplay.style.display = "none";

    const windowBar = document.createElement("div");
    windowBar.style.display = "none";

    const chartContainer = document.createElement("div");
    Object.assign(chartContainer.style, BASE_CONTAINER_STYLE);

    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    chartContainer.appendChild(canvas);

    shell.appendChild(valueDisplay);
    shell.appendChild(windowBar);
    shell.appendChild(chartContainer);

    this.host.appendChild(shell);

    this.ui.shell = shell;
    this.ui.valueDisplay = valueDisplay;
    this.ui.windowBar = windowBar;
    this.ui.chartContainer = chartContainer;
    this.ui.canvas = canvas;
  }

  syncActiveWindow() {
    const windows = this.options.windows;

    if (Array.isArray(windows) && windows.length > 0) {
      const hasCurrent = windows.some((entry) => entry.secs === this.activeWindowSecs);
      if (!hasCurrent) {
        this.activeWindowSecs = windows[0].secs;
      }
      return;
    }

    this.activeWindowSecs = null;
  }

  renderWindowButtons(force = false) {
    const bar = this.ui.windowBar;
    const windows = this.options.windows;

    if (!Array.isArray(windows) || windows.length === 0) {
      bar.style.display = "none";
      bar.innerHTML = "";
      this.ui.windowIndicator = null;
      this.ui.windowButtonMap.clear();
      return;
    }

    this.ui.windowButtonMap.clear();
    bar.innerHTML = "";
    bar.style.display = "inline-flex";

    const ws = this.options.windowStyle;
    const isDark = this.options.theme === "dark";

    bar.style.position = "relative";
    bar.style.gap = ws === "text" ? "4px" : "2px";
    bar.style.background = ws === "text" ? "transparent" : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
    bar.style.borderRadius = ws === "rounded" ? "999px" : "6px";
    bar.style.padding = ws === "text" ? "0" : ws === "rounded" ? "3px" : "2px";
    bar.style.marginBottom = "6px";
    bar.style.marginLeft = `${this.runtimePadding.left}px`;

    let indicator = null;
    if (ws !== "text") {
      indicator = document.createElement("div");
      indicator.style.position = "absolute";
      indicator.style.top = ws === "rounded" ? "3px" : "2px";
      indicator.style.height = ws === "rounded" ? "calc(100% - 6px)" : "calc(100% - 4px)";
      indicator.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.035)";
      indicator.style.borderRadius = ws === "rounded" ? "999px" : "4px";
      indicator.style.transition = "left 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1)";
      indicator.style.pointerEvents = "none";
      bar.appendChild(indicator);
      this.ui.windowIndicator = indicator;
    }

    windows.forEach((entry) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = entry.label;

      btn.style.position = "relative";
      btn.style.zIndex = "1";
      btn.style.fontSize = "11px";
      btn.style.padding = ws === "text" ? "2px 6px" : "3px 10px";
      btn.style.borderRadius = ws === "rounded" ? "999px" : "4px";
      btn.style.border = "none";
      btn.style.cursor = "pointer";
      btn.style.fontFamily = "system-ui, -apple-system, sans-serif";
      btn.style.background = "transparent";
      btn.style.transition = "color 0.2s, background 0.15s";
      btn.style.lineHeight = "16px";

      btn.addEventListener("click", () => {
        this.activeWindowSecs = entry.secs;
        this.styleWindowButtons();
        this.syncWindowIndicator();

        if (typeof this.options.onWindowChange === "function") {
          this.options.onWindowChange(entry.secs);
        }

        this.refreshRuntimeConfig();
      });

      bar.appendChild(btn);
      this.ui.windowButtonMap.set(entry.secs, btn);
    });

    bar.dataset.windowSignature = JSON.stringify(windows);

    this.styleWindowButtons();
    requestAnimationFrame(() => this.syncWindowIndicator());
  }

  styleWindowButtons() {
    const isDark = this.options.theme === "dark";

    this.ui.windowButtonMap.forEach((btn, secs) => {
      const isActive = secs === this.activeWindowSecs;
      btn.style.fontWeight = isActive ? "600" : "400";
      btn.style.color = isActive
        ? isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)"
        : isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.22)";
    });
  }

  syncWindowIndicator() {
    const indicator = this.ui.windowIndicator;
    const bar = this.ui.windowBar;
    if (!indicator || !bar) return;

    const activeBtn = this.ui.windowButtonMap.get(this.activeWindowSecs);
    if (!activeBtn) return;

    const barRect = bar.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();

    indicator.style.left = `${btnRect.left - barRect.left}px`;
    indicator.style.width = `${btnRect.width}px`;
  }

  refreshRuntimeConfig() {
    this.runtimeConfig = this.buildRuntimeConfig();
    if (this.engine) this.engine.requestRedraw();
  }

  buildRuntimeConfig() {
    const opts = this.options;

    const pad = {
      top: opts.padding.top,
      right: opts.padding.right,
      bottom: opts.padding.bottom,
      left: opts.padding.left
    };

    const palette = resolveTheme(opts.color, opts.theme);

    const showMomentum = opts.momentum !== false;
    const momentumOverride = typeof opts.momentum === "string" ? opts.momentum : void 0;

    const degenEnabled = opts.degen != null ? opts.degen !== false : false;
    const degenOptions = degenEnabled ? typeof opts.degen === "object" ? opts.degen : {} : void 0;

    const effectiveWindowSecs = Array.isArray(opts.windows) && opts.windows.length > 0
      ? this.activeWindowSecs
      : opts.window;

    const containerStyle = { ...BASE_CONTAINER_STYLE, ...(opts.style || {}) };
    Object.assign(this.ui.chartContainer.style, containerStyle);

    this.ui.canvas.style.cursor = opts.scrub ? opts.cursor : "default";

    return {
      data: opts.data,
      value: opts.value,
      palette,
      windowSecs: effectiveWindowSecs,
      lerpSpeed: opts.lerpSpeed,
      showGrid: opts.grid,
      showBadge: opts.badge,
      showMomentum,
      momentumOverride,
      showFill: opts.fill,
      referenceLine: opts.referenceLine,
      formatValue: opts.formatValue,
      formatTime: opts.formatTime,
      padding: pad,
      onHover: opts.onHover,
      showPulse: opts.pulse,
      scrub: opts.scrub,
      exaggerate: opts.exaggerate,
      degenOptions,
      badgeTail: opts.badgeTail,
      badgeVariant: opts.badgeVariant,
      tooltipY: opts.tooltipY,
      tooltipOutline: opts.tooltipOutline,
      valueMomentumColor: opts.valueMomentumColor,
      valueDisplayEl: opts.showValue ? this.ui.valueDisplay : void 0,
      orderbookData: opts.orderbook
    };
  }

  applyValueDisplayStyles() {
    const opts = this.options;
    const isDark = opts.theme === "dark";

    this.ui.valueDisplay.style.display = opts.showValue ? "block" : "none";
    this.ui.valueDisplay.style.fontSize = "20px";
    this.ui.valueDisplay.style.fontWeight = "500";
    this.ui.valueDisplay.style.fontFamily = '"SF Mono", Menlo, monospace';
    this.ui.valueDisplay.style.color = isDark ? "rgba(255,255,255,0.85)" : "#111";
    this.ui.valueDisplay.style.transition = "color 0.3s";
    this.ui.valueDisplay.style.letterSpacing = "-0.01em";
    this.ui.valueDisplay.style.marginBottom = "8px";
    this.ui.valueDisplay.style.paddingTop = "4px";
    this.ui.valueDisplay.style.paddingLeft = `${this.runtimePadding.left}px`;

    const displayVal = opts.valueMomentumColor ? Math.abs(opts.value) : opts.value;
    this.ui.valueDisplay.textContent = opts.formatValue(displayVal);
  }

  applyOptions(nextOptions, { forceWindowRender = false } = {}) {
    this.options = normalizeOptions(nextOptions);
    this.runtimePadding = this.options.padding;

    this.syncActiveWindow();

    this.applyValueDisplayStyles();

    if (this.options.className) {
      this.ui.chartContainer.className = this.options.className;
    } else {
      this.ui.chartContainer.removeAttribute("class");
    }

    this.renderWindowButtons(forceWindowRender);
    this.styleWindowButtons();

    this.refreshRuntimeConfig();
  }

  setOptions(partial = {}) {
    if (this._destroyed) return;
    const merged = { ...this.options, ...partial };
    this.applyOptions(merged);
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    if (this.engine) {
      this.engine.destroy();
      this.engine = null;
    }

    window.removeEventListener("resize", this._onWindowResize);

    this.host.removeAttribute("data-liveline-ready");
    this.host.innerHTML = "";
  }
}

function normalizePoint(point) {
  if (!point || typeof point !== "object") return null;

  const time = Number(point.time);
  const value = Number(point.value);

  if (!Number.isFinite(time) || !Number.isFinite(value)) return null;

  return { time, value };
}

function normalizeWindows(windows) {
  if (!Array.isArray(windows)) return undefined;

  const normalized = windows
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const label = String(entry.label ?? "").trim();
      const secs = Number(entry.secs);
      if (!label || !Number.isFinite(secs) || secs <= 0) return null;
      return { label, secs };
    })
    .filter(Boolean);

  return normalized.length > 0 ? normalized : undefined;
}

function normalizePadding(padding) {
  return {
    top: Number.isFinite(Number(padding?.top)) ? Number(padding.top) : 12,
    right: Number.isFinite(Number(padding?.right)) ? Number(padding.right) : 80,
    bottom: Number.isFinite(Number(padding?.bottom)) ? Number(padding.bottom) : 28,
    left: Number.isFinite(Number(padding?.left)) ? Number(padding.left) : 12
  };
}

function normalizeOptions(options = {}) {
  const normalizedData = Array.isArray(options.data)
    ? options.data.map(normalizePoint).filter(Boolean)
    : [];

  const lerpSpeed = Number(options.lerpSpeed);
  const tooltipY = Number(options.tooltipY);
  const windowSecs = Number(options.window);

  return {
    data: normalizedData,
    value: Number.isFinite(Number(options.value)) ? Number(options.value) : 0,
    theme: options.theme === "light" ? "light" : "dark",
    color: typeof options.color === "string" && options.color.trim() ? options.color : "#3b82f6",
    window: Number.isFinite(windowSecs) && windowSecs > 0 ? windowSecs : 30,
    grid: options.grid !== false,
    badge: options.badge !== false,
    momentum: options.momentum === false || options.momentum === "up" || options.momentum === "down" || options.momentum === "flat"
      ? options.momentum
      : true,
    fill: options.fill !== false,
    scrub: options.scrub !== false,
    exaggerate: options.exaggerate === true,
    showValue: options.showValue === true,
    valueMomentumColor: options.valueMomentumColor === true,
    degen: options.degen ?? false,
    badgeTail: options.badgeTail !== false,
    windows: normalizeWindows(options.windows),
    onWindowChange: typeof options.onWindowChange === "function" ? options.onWindowChange : undefined,
    windowStyle: options.windowStyle === "rounded" || options.windowStyle === "text" ? options.windowStyle : "default",
    badgeVariant: options.badgeVariant === "minimal" ? "minimal" : "default",
    tooltipY: Number.isFinite(tooltipY) ? tooltipY : 14,
    tooltipOutline: options.tooltipOutline !== false,
    orderbook: options.orderbook,
    referenceLine: options.referenceLine,
    formatValue: typeof options.formatValue === "function" ? options.formatValue : DEFAULT_FORMAT_VALUE,
    formatTime: typeof options.formatTime === "function" ? options.formatTime : DEFAULT_FORMAT_TIME,
    lerpSpeed: Number.isFinite(lerpSpeed) ? Math.max(0, Math.min(lerpSpeed, 1)) : 0.08,
    padding: normalizePadding(options.padding),
    onHover: typeof options.onHover === "function" ? options.onHover : undefined,
    cursor: typeof options.cursor === "string" && options.cursor.trim() ? options.cursor : "crosshair",
    pulse: options.pulse !== false,
    className: typeof options.className === "string" ? options.className : undefined,
    style: options.style && typeof options.style === "object" ? options.style : undefined
  };
}

const livelineInstances = new WeakMap();

function mountLiveline(host, options = {}) {
  if (!host) {
    throw new Error("mountLiveline requires a host element");
  }

  const existing = livelineInstances.get(host);
  if (existing) {
    if (existing._destroyed) {
      livelineInstances.delete(host);
    } else {
      existing.setOptions({ ...existing.options, ...options });
      return existing;
    }
  }

  const instance = new LivelineDatastar(host, options);
  livelineInstances.set(host, instance);
  return instance;
}

function unmountLiveline(host) {
  const instance = livelineInstances.get(host);
  if (!instance) return;

  instance.destroy();
  livelineInstances.delete(host);
}

function parseLivelineConfig(host) {
  const raw = host.getAttribute("data-liveline-config");
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

function initLivelineIn(scope = document) {
  if (!scope || typeof scope.querySelectorAll !== "function") return;

  scope.querySelectorAll("[data-liveline]").forEach((host) => {
    if (livelineInstances.has(host)) return;

    const config = parseLivelineConfig(host);
    mountLiveline(host, config);
  });
}

function cleanupLivelineIn(node) {
  if (!node || node.nodeType !== 1) return;

  if (node.matches && node.matches("[data-liveline]")) {
    unmountLiveline(node);
  }

  if (typeof node.querySelectorAll === "function") {
    node.querySelectorAll("[data-liveline]").forEach((host) => {
      unmountLiveline(host);
    });
  }
}

let livelineObserver = null;

function startLivelineAutoInit() {
  if (typeof MutationObserver === "undefined") {
    initLivelineIn(document);
    return;
  }

  if (livelineObserver) return;

  initLivelineIn(document);

  livelineObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;

        if (node.matches && node.matches("[data-liveline]")) {
          const config = parseLivelineConfig(node);
          mountLiveline(node, config);
        }

        if (typeof node.querySelectorAll === "function") {
          node.querySelectorAll("[data-liveline]").forEach((host) => {
            if (livelineInstances.has(host)) return;
            const config = parseLivelineConfig(host);
            mountLiveline(host, config);
          });
        }
      });

      mutation.removedNodes.forEach((node) => cleanupLivelineIn(node));
    }
  });

  livelineObserver.observe(document.body, { childList: true, subtree: true });
}

function stopLivelineAutoInit() {
  if (!livelineObserver) return;
  livelineObserver.disconnect();
  livelineObserver = null;
}

export {
  LivelineDatastar,
  mountLiveline,
  unmountLiveline,
  initLivelineIn,
  startLivelineAutoInit,
  stopLivelineAutoInit
};
