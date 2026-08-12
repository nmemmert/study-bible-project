import { useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext.js';
import { renderInkToCanvas } from '../utils/inkRender.js';

const INK_COLORS = ['#0f172a', '#ef4444', '#3b82f6', '#16a34a', '#f59e0b', '#a855f7'];
const INK_SIZES = [
  { label: 'S', value: 0.006 },
  { label: 'M', value: 0.012 },
  { label: 'L', value: 0.025 },
];

// Standalone notebook-style draw canvas.
// strokes: array of saved stroke objects
// onStrokesChange: (newStrokes) => void
// onDone: optional () => void — shows "Done" button when provided
// headerContent: optional JSX rendered above the notebook area.
// The canvas extends over it so you can draw directly on the content.
export default function DrawCanvas({ strokes, onStrokesChange, onDone, headerContent }) {
  const { drawTool, setDrawTool, drawColor, setDrawColor, drawSize, setDrawSize } = useApp();

  const canvasRef = useRef(null);
  const activeStrokeRef = useRef([]);
  const isDrawingRef = useRef(false);

  // Refs prevent stale closures in stable callbacks
  const strokesRef = useRef(strokes);
  const onStrokesChangeRef = useRef(onStrokesChange);
  const drawToolRef = useRef(drawTool);
  const drawColorRef = useRef(drawColor);
  const drawSizeRef = useRef(drawSize);
  strokesRef.current = strokes;
  onStrokesChangeRef.current = onStrokesChange;
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

  useEffect(() => { render(); }, [strokes, drawTool, drawColor, drawSize, render]);

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

  // Use native addEventListener (not React synthetic events) so that
  // passive:false works correctly on iOS Safari and events are handled
  // directly on the canvas element rather than via document-root delegation.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function down(e) {
      if (e.pointerType === 'touch') return;
      isDrawingRef.current = true;
      activeStrokeRef.current = [getPoint(e)];
      render();
    }

    function move(e) {
      if (e.pointerType === 'touch') return;
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const pt = getPoint(e);
      activeStrokeRef.current = [...activeStrokeRef.current, pt];
      if (drawToolRef.current === 'eraser') {
        const [ex, ey] = pt;
        const r = drawSizeRef.current * 3;
        const remaining = strokesRef.current.filter(
          (s) => !s.points.some(([sx, sy]) => Math.hypot(sx - ex, sy - ey) < r),
        );
        if (remaining.length !== strokesRef.current.length)
          onStrokesChangeRef.current(remaining);
      }
      render();
    }

    function up(e) {
      if (e.pointerType === 'touch') return;
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      const pts = activeStrokeRef.current;
      if (drawToolRef.current !== 'eraser' && pts.length > 1) {
        onStrokesChangeRef.current([
          ...strokesRef.current,
          {
            id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
            tool: drawToolRef.current,
            color: drawColorRef.current,
            size: drawSizeRef.current,
            points: pts,
          },
        ]);
      }
      activeStrokeRef.current = [];
      render();
    }

    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move, { passive: false });
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    return () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
    };
  }, [getPoint, render]);

  const undo = () => strokes.length > 0 && onStrokesChange(strokes.slice(0, -1));
  const clear = () =>
    strokes.length > 0 &&
    window.confirm('Clear all ink notes?') &&
    onStrokesChange([]);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm select-none" style={{ WebkitUserSelect: 'none' }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-3 py-2">
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
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold transition ${
              drawTool === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}

        <div className="mx-1 h-5 w-px bg-slate-200" />

        {INK_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => { setDrawColor(c); if (drawTool === 'eraser') setDrawTool('pen'); }}
            style={{ background: c }}
            className={`h-5 w-5 rounded-full border-2 transition ${
              drawColor === c && drawTool !== 'eraser' ? 'scale-125 border-slate-900' : 'border-white shadow-sm'
            }`}
          />
        ))}

        <div className="mx-1 h-5 w-px bg-slate-200" />

        {INK_SIZES.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setDrawSize(s.value)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition ${
              drawSize === s.value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
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
          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={strokes.length === 0}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40"
        >
          Clear
        </button>

        {onDone && (
          <>
            <div className="mx-1 h-5 w-px bg-slate-200" />
            <button
              type="button"
              onClick={onDone}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Done ✓
            </button>
          </>
        )}
      </div>

      {/* Draw surface: optional scripture header + ruled notebook, one canvas over both */}
      <div className="relative">
        {/* Scripture content — canvas sits on top so you can draw directly on the text */}
        {headerContent && (
          <div
            className="border-b border-slate-200 bg-slate-50 p-4 font-serif text-sm leading-relaxed text-slate-800"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {headerContent}
          </div>
        )}
        {/* Ruled notebook area */}
        <div
          style={{
            minHeight: 640,
            background: 'white',
            backgroundImage: 'repeating-linear-gradient(transparent 0px, transparent 31px, #dde3ec 31px, #dde3ec 32px)',
          }}
        />
        {/* Red margin line — only in pure-notebook mode */}
        {!headerContent && (
          <div className="absolute bottom-0 left-10 top-0 w-px bg-rose-200" style={{ zIndex: 1 }} />
        )}
        {/* Single canvas spanning the entire area (scripture + notebook) */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          style={{
            zIndex: 2,
            cursor: drawTool === 'eraser' ? 'cell' : 'crosshair',
            touchAction: 'none',
          }}
        />
      </div>
    </div>
  );
}
