import { useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext.js';
import { renderInkToCanvas } from '../utils/inkRender.js';

const INK_COLORS = ['#0f172a', '#ef4444', '#3b82f6', '#16a34a', '#f59e0b', '#a855f7'];
const INK_SIZES = [
  { label: 'S', value: 0.006 },
  { label: 'M', value: 0.012 },
  { label: 'L', value: 0.025 },
];

// Read-only ink overlay shown in Stacked / Split mode.
export function InkLayer({ strokes }) {
  const canvasRef = useRef(null);
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderInkToCanvas(canvas, strokesRef.current);
  }, []);

  useEffect(() => { render(); }, [strokes, render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obs = new ResizeObserver(render);
    obs.observe(canvas);
    return () => obs.disconnect();
  }, [render]);

  if (!strokes.length) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 5 }}
    />
  );
}

// Interactive draw canvas overlay for Draw mode.
export default function DrawCanvas() {
  const {
    selectedChunk,
    updateChunk,
    drawTool, setDrawTool,
    drawColor, setDrawColor,
    drawSize, setDrawSize,
    setStudyLayout,
  } = useApp();

  const canvasRef = useRef(null);
  const activeStrokeRef = useRef([]);

  // Refs prevent stale closures in ResizeObserver callback
  const strokesRef = useRef([]);
  const drawToolRef = useRef(drawTool);
  const drawColorRef = useRef(drawColor);
  const drawSizeRef = useRef(drawSize);
  strokesRef.current = selectedChunk?.inkStrokes ?? [];
  drawToolRef.current = drawTool;
  drawColorRef.current = drawColor;
  drawSizeRef.current = drawSize;

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderInkToCanvas(
      canvas,
      strokesRef.current,
      activeStrokeRef.current,
      drawToolRef.current,
      drawColorRef.current,
      drawSizeRef.current,
    );
  }, []);

  useEffect(() => { render(); }, [selectedChunk?.inkStrokes, drawTool, drawColor, drawSize, render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obs = new ResizeObserver(render);
    obs.observe(canvas);
    return () => obs.disconnect();
  }, [render]);

  const getPoint = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0, 0.5];
    const rect = canvas.getBoundingClientRect();
    return [
      (e.clientX - rect.left) / rect.width,
      (e.clientY - rect.top) / rect.height,
      e.pressure ?? 0.5,
    ];
  }, []);

  const onPointerDown = useCallback((e) => {
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    activeStrokeRef.current = [getPoint(e)];
    render();
  }, [getPoint, render]);

  const onPointerMove = useCallback((e) => {
    if (e.pointerType === 'touch') return;
    if (!canvasRef.current?.hasPointerCapture(e.pointerId)) return;
    e.preventDefault();
    const pt = getPoint(e);
    activeStrokeRef.current = [...activeStrokeRef.current, pt];

    if (drawToolRef.current === 'eraser') {
      const [ex, ey] = pt;
      const r = drawSizeRef.current * 3;
      const remaining = strokesRef.current.filter((s) =>
        !s.points.some(([sx, sy]) => Math.hypot(sx - ex, sy - ey) < r),
      );
      if (remaining.length !== strokesRef.current.length) {
        updateChunk(selectedChunk.id, { inkStrokes: remaining });
      }
    }
    render();
  }, [getPoint, render, updateChunk, selectedChunk]);

  const onPointerUp = useCallback((e) => {
    if (e.pointerType === 'touch') return;
    const pts = activeStrokeRef.current;
    if (drawToolRef.current !== 'eraser' && pts.length > 1) {
      updateChunk(selectedChunk.id, {
        inkStrokes: [
          ...strokesRef.current,
          {
            id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
            tool: drawToolRef.current,
            color: drawColorRef.current,
            size: drawSizeRef.current,
            points: pts,
          },
        ],
      });
    }
    activeStrokeRef.current = [];
    render();
  }, [render, updateChunk, selectedChunk]);

  const strokes = selectedChunk?.inkStrokes ?? [];

  const undo = () => {
    if (strokes.length > 0)
      updateChunk(selectedChunk.id, { inkStrokes: strokes.slice(0, -1) });
  };

  const clear = () => {
    if (strokes.length > 0 && window.confirm('Clear all annotations on this chunk?'))
      updateChunk(selectedChunk.id, { inkStrokes: [] });
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10 h-full w-full cursor-crosshair"
        style={{ touchAction: 'pan-y pinch-zoom' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {/* Floating toolbar */}
      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-xl backdrop-blur-sm">
        {/* Tool buttons */}
        {[
          { id: 'pen', label: '✒', title: 'Pen' },
          { id: 'highlighter', label: '▐', title: 'Highlighter' },
          { id: 'eraser', label: '⌫', title: 'Eraser' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.title}
            onClick={() => setDrawTool(t.id)}
            className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold transition ${
              drawTool === t.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}

        <div className="mx-1 h-5 w-px bg-slate-200" />

        {/* Color swatches */}
        {INK_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => { setDrawColor(c); if (drawTool === 'eraser') setDrawTool('pen'); }}
            style={{ background: c }}
            className={`h-5 w-5 rounded-full border-2 transition ${
              drawColor === c && drawTool !== 'eraser'
                ? 'scale-125 border-slate-900'
                : 'border-white shadow-sm'
            }`}
          />
        ))}

        <div className="mx-1 h-5 w-px bg-slate-200" />

        {/* Size buttons */}
        {INK_SIZES.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setDrawSize(s.value)}
            className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition ${
              drawSize === s.value
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {s.label}
          </button>
        ))}

        <div className="mx-1 h-5 w-px bg-slate-200" />

        <button
          type="button"
          onClick={undo}
          disabled={strokes.length === 0}
          className="rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={strokes.length === 0}
          className="rounded-xl px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40"
        >
          Clear
        </button>

        <div className="mx-1 h-5 w-px bg-slate-200" />

        <button
          type="button"
          onClick={() => setStudyLayout('stacked')}
          className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
        >
          Done ✓
        </button>
      </div>
    </>
  );
}
