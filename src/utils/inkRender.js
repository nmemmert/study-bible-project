import { getStroke } from 'perfect-freehand';

export function pathFromStroke(points) {
  if (!points.length) return '';
  const d = [`M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`];
  for (let i = 1; i < points.length - 1; i++) {
    const mx = ((points[i][0] + points[i + 1][0]) / 2).toFixed(2);
    const my = ((points[i][1] + points[i + 1][1]) / 2).toFixed(2);
    d.push(`Q ${points[i][0].toFixed(2)} ${points[i][1].toFixed(2)} ${mx} ${my}`);
  }
  d.push('Z');
  return d.join(' ');
}

// Renders saved strokes + optional active stroke onto a canvas element.
// Coordinates are stored as fractions [0,1] of the draw canvas dimensions.
// size is stored as a fraction of canvas height (e.g. 0.012 ≈ 8px on a 600px canvas).
export function renderInkToCanvas(
  canvas,
  strokes,
  activeStroke = [],
  activeTool = 'pen',
  activeColor = '#0f172a',
  activeSize = 0.012,
) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;

  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  function strokeOpts(tool, baseSize, points) {
    const avgTilt = points.length
      ? points.reduce((s, p) => s + (p[3] ?? 0), 0) / points.length
      : 0;
    return {
      // Tilt widens the stroke and reduces pressure-thinning (pencil-shading feel)
      size: tool === 'pen' ? baseSize * (1 + avgTilt * 2.5) : baseSize,
      thinning: tool === 'highlighter' ? 0 : 0.5 * (1 - (tool === 'pen' ? avgTilt * 0.8 : 0)),
      smoothing: 0.5,
      streamline: 0.4,
    };
  }

  for (const s of strokes) {
    const pts = s.points.map(([x, y, p]) => [x * w, y * h, p]);
    const outline = getStroke(pts, strokeOpts(s.tool, s.size * h, s.points));
    ctx.globalAlpha = s.tool === 'highlighter' ? 0.35 : 1;
    ctx.fillStyle = s.color;
    ctx.fill(new Path2D(pathFromStroke(outline)));
  }

  if (activeStroke.length > 1 && activeTool !== 'eraser') {
    const pts = activeStroke.map(([x, y, p]) => [x * w, y * h, p]);
    const outline = getStroke(pts, strokeOpts(activeTool, activeSize * h, activeStroke));
    ctx.globalAlpha = activeTool === 'highlighter' ? 0.35 : 1;
    ctx.fillStyle = activeColor;
    ctx.fill(new Path2D(pathFromStroke(outline)));
  }

  ctx.globalAlpha = 1;
}
