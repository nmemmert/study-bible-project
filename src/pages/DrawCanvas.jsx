import { useEffect, useRef, useCallback, useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { renderInkToCanvas } from '../utils/inkRender.js';

const INK_COLORS = ['#0f172a', '#ef4444', '#3b82f6', '#16a34a', '#f59e0b', '#a855f7'];
const INK_SIZES = [
  { label: 'S', value: 0.006 },
  { label: 'M', value: 0.012 },
  { label: 'L', value: 0.025 },
];
const PAGE_HEIGHT = 640; // px per notebook page

// Page count is persisted as a hidden metadata stroke at strokes[0]
// so the canvas size survives navigation without a separate state key.
function extractMeta(strokes) {
  if (strokes.length > 0 && strokes[0]?._meta) {
    return { pageCount: strokes[0].pageCount ?? 1, realStrokes: strokes.slice(1) };
  }
  return { pageCount: 1, realStrokes: strokes };
}
function packStrokes(realStrokes, pageCount) {
  return [{ _meta: true, pageCount }, ...realStrokes];
}

// Standalone notebook-style draw canvas.
// strokes: array of saved stroke objects (may include a leading metadata object)
// onStrokesChange: (newStrokes) => void
// onDone: optional () => void — shows "Done" button when provided
// headerContent: optional JSX rendered above the notebook area.
// The canvas extends over it so you can draw directly on the content.
export default function DrawCanvas({ strokes, onStrokesChange, onDone, headerContent }) {
  const { drawTool, setDrawTool, drawColor, setDrawColor, drawSize, setDrawSize } = useApp();

  const { pageCount: initPages } = extractMeta(strokes);
  const [pageCount, setPageCount] = useState(initPages);

  // realStrokes = strokes without the metadata header
  const { realStrokes } = extractMeta(strokes);

  const canvasRef = useRef(null);
  const activeStrokeRef = useRef([]);
  const isDrawingRef = useRef(false);

  // Refs prevent stale closures in stable callbacks
  const strokesRef = useRef(realStrokes);
  const onStrokesChangeRef = useRef(onStrokesChange);
  const drawToolRef = useRef(drawTool);
  const drawColorRef = useRef(drawColor);
  const drawSizeRef = useRef(drawSize);
  strokesRef.current = realStrokes;
  onStrokesChangeRef.current = onStrokesChange;
  const pageCountRef = useRef(pageCount);
  pageCountRef.current = pageCount;
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

  useEffect(() => { render(); }, [realStrokes, drawTool, drawColor, drawSize, render]);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function commitStroke() {
      const pts = activeStrokeRef.current;
      if (drawToolRef.current !== 'eraser' && pts.length > 1) {
        onStrokesChangeRef.current(packStrokes(
          [
            ...strokesRef.current,
            {
              id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
              tool: drawToolRef.current,
              color: drawColorRef.current,
              size: drawSizeRef.current,
              points: pts,
            },
          ],
          pageCountRef.current,
        ));
      }
      activeStrokeRef.current = [];
      isDrawingRef.current = false;
      render();
    }

    function eraseAt(pt) {
      const [ex, ey] = pt;
      const r = drawSizeRef.current * 3;
      const remaining = strokesRef.current.filter(
        (s) => !s.points.some(([sx, sy]) => Math.hypot(sx - ex, sy - ey) < r),
      );
      if (remaining.length !== strokesRef.current.length)
        onStrokesChangeRef.current(packStrokes(remaining, pageCountRef.current));
    }

    // iOS Safari: Apple Pencil fires Touch Events with touchType === 'stylus'.
    // Pointer Events on iPadOS emit pointercancel immediately after pointerdown
    // (palm detection or canvas-width resets from React re-renders), which forces
    // a double-tap to start every stroke. Touch Events bypass this entirely.
    if (typeof Touch !== 'undefined' && 'touchType' in Touch.prototype) {
      function pointFromTouch(t) {
        const rect = canvas.getBoundingClientRect();
        return [
          (t.clientX - rect.left) / rect.width,
          (t.clientY - rect.top) / rect.height,
          t.force ?? 0.5,
        ];
      }

      function tStart(e) {
        for (const t of e.changedTouches) {
          if (t.touchType !== 'stylus') continue;
          e.preventDefault();
          isDrawingRef.current = true;
          activeStrokeRef.current = [pointFromTouch(t)];
          render();
          return;
        }
      }

      function tMove(e) {
        if (!isDrawingRef.current) return;
        for (const t of e.changedTouches) {
          if (t.touchType !== 'stylus') continue;
          e.preventDefault();
          const pt = pointFromTouch(t);
          activeStrokeRef.current = [...activeStrokeRef.current, pt];
          if (drawToolRef.current === 'eraser') eraseAt(pt);
          render();
          return;
        }
      }

      function tEnd(e) {
        if (!isDrawingRef.current) return;
        for (const t of e.changedTouches) {
          if (t.touchType !== 'stylus') continue;
          e.preventDefault();
          commitStroke();
          return;
        }
      }

      canvas.addEventListener('touchstart', tStart, { passive: false });
      canvas.addEventListener('touchmove', tMove, { passive: false });
      canvas.addEventListener('touchend', tEnd, { passive: false });
      canvas.addEventListener('touchcancel', tEnd, { passive: false });
      return () => {
        canvas.removeEventListener('touchstart', tStart);
        canvas.removeEventListener('touchmove', tMove);
        canvas.removeEventListener('touchend', tEnd);
        canvas.removeEventListener('touchcancel', tEnd);
      };
    }

    // Non-iOS: Pointer Events (mouse, Windows pen, etc.)
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
      if (drawToolRef.current === 'eraser') eraseAt(pt);
      render();
    }

    function up(e) {
      if (e.pointerType === 'touch') return;
      if (!isDrawingRef.current) return;
      commitStroke();
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

  const undo = () =>
    realStrokes.length > 0 &&
    onStrokesChange(packStrokes(realStrokes.slice(0, -1), pageCount));

  const clear = () =>
    realStrokes.length > 0 &&
    window.confirm('Clear all ink notes?') &&
    onStrokesChange(packStrokes([], pageCount));

  // Add another notebook page below existing content.
  // Rescales all stroke y-coords so existing ink stays at the same pixel position.
  const addSpace = () => {
    const newCount = pageCount + 1;
    const ratio = pageCount / newCount;
    const rescaled = realStrokes.map((s) => ({
      ...s,
      points: s.points.map(([x, y, p]) => [x, y * ratio, p]),
    }));
    onStrokesChange(packStrokes(rescaled, newCount));
    setPageCount(newCount);
  };

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
          disabled={realStrokes.length === 0}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={realStrokes.length === 0}
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
        {/* Ruled notebook area — height grows with pageCount */}
        <div
          style={{
            minHeight: PAGE_HEIGHT * pageCount,
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

      {/* Add more notebook space */}
      <button
        type="button"
        onClick={addSpace}
        className="w-full border-t border-slate-200 bg-slate-50 py-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
      >
        + Add More Space
      </button>
    </div>
  );
}
