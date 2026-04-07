/**
 * Dev overlay for `@gwenjs/input`.
 *
 * Injects a fixed DOM panel into `document.body` that displays live input
 * state each frame via `InputDebugAPI.onFrame()`.
 *
 * Only created when `devOverlay` is configured, `import.meta.env.PROD` is
 * false, and `typeof window !== 'undefined'`.
 *
 * @module
 */

import type { InputDebugAPI, InputDebugSnapshot } from "./debug-api.js";
import type { NormalizedDevOverlayConfig } from "../plugin/config.js";

// ─── DevOverlay ───────────────────────────────────────────────────────────────

/**
 * A fixed-position DOM panel that renders live input state each frame.
 *
 * Attach to the page with `attach()` and remove with `detach()`.
 * The plugin calls `detach()` automatically on teardown.
 *
 * @example
 * ```typescript
 * const overlay = new DevOverlay(debugAPI, normalizedConfig)
 * overlay.attach()
 * // later:
 * overlay.detach()
 * ```
 */
export class DevOverlay {
  /** The injected DOM element, or null when detached. */
  private _el: HTMLDivElement | null = null;
  /** Unsubscribe function returned by `debugAPI.onFrame()`. */
  private _unsubscribe: (() => void) | null = null;

  constructor(
    private readonly _debugAPI: InputDebugAPI,
    private readonly _config: NormalizedDevOverlayConfig,
  ) {}

  /**
   * Creates the overlay element and appends it to `document.body`.
   * Subscribes to `debugAPI.onFrame()` to update the panel each frame.
   * No-op in SSR (when `window` is not defined).
   */
  attach(): void {
    if (typeof window === "undefined") return;

    const el = document.createElement("div");
    el.id = "gwen-input-debug";
    applyStyles(el, this._config);
    document.body.appendChild(el);
    this._el = el;

    this._unsubscribe = this._debugAPI.onFrame((snap) => this._render(snap));
  }

  /**
   * Removes the overlay element from the DOM and unsubscribes from
   * `debugAPI.onFrame()`. Safe to call multiple times.
   */
  detach(): void {
    this._unsubscribe?.();
    this._unsubscribe = null;
    this._el?.remove();
    this._el = null;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _render(snap: InputDebugSnapshot): void {
    if (!this._el) return;
    const cfg = this._config;
    const playerIdx = cfg.player;
    const playerSnap = snap.players[playerIdx];

    const lines: string[] = [`<b>gwen:input</b> frame ${snap.frame}`];

    if (cfg.showDevices) {
      const d = snap.devices;
      const gpStr = d.gamepads.map((c, i) => (c ? `GP${i}✓` : `GP${i}✗`)).join(" ");
      lines.push(
        `<span style="color:#aaa">─ devices ─</span>`,
        `kbd:${d.keyboard ? "✓" : "✗"} mouse:${d.mouse ? "✓" : "✗"} touch:${d.touch ? "✓" : "✗"} gyro:${d.gyro ? "✓" : "✗"}`,
        gpStr,
      );
    }

    if (playerSnap) {
      if (cfg.showContexts) {
        const ctxStr =
          playerSnap.activeContexts.length > 0 ? playerSnap.activeContexts.join(", ") : "(none)";
        lines.push(`<span style="color:#aaa">─ P${playerIdx} contexts ─</span>`, escHtml(ctxStr));
      }

      if (cfg.showActions) {
        const activeActions = playerSnap.actions.filter((a) => {
          if (typeof a.value === "boolean") return a.value;
          if (typeof a.value === "number") return a.value !== 0;
          return a.value.x !== 0 || a.value.y !== 0;
        });
        lines.push(`<span style="color:#aaa">─ P${playerIdx} actions ─</span>`);
        if (activeActions.length === 0) {
          lines.push('<span style="color:#555">(none active)</span>');
        } else {
          for (const a of activeActions) {
            const valStr = formatValue(a.value);
            const triggered = a.isJustTriggered ? ' <span style="color:#4f4">▲</span>' : "";
            const released = a.isJustReleased ? ' <span style="color:#f44">▼</span>' : "";
            lines.push(
              `${escHtml(a.name)}: <span style="color:#ff0">${escHtml(valStr)}</span>${triggered}${released}`,
            );
          }
        }
      }

      if (cfg.showRecording) {
        const r = playerSnap.recording;
        const stateColor =
          r.state === "recording" ? "#f44" : r.state === "playing" ? "#4f4" : "#aaa";
        lines.push(
          `<span style="color:#aaa">─ recording ─</span>`,
          `<span style="color:${stateColor}">${r.state}</span> ${r.frame}/${r.totalFrames}`,
        );
      }
    }

    this._el.innerHTML = lines.join("<br>");
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Maps a config corner to CSS position properties. */
const POSITION_STYLES: Record<NormalizedDevOverlayConfig["position"], string> = {
  "top-left": "top:8px;left:8px",
  "top-right": "top:8px;right:8px",
  "bottom-left": "bottom:8px;left:8px",
  "bottom-right": "bottom:8px;right:8px",
};

function applyStyles(el: HTMLDivElement, cfg: NormalizedDevOverlayConfig): void {
  const pos = POSITION_STYLES[cfg.position];
  el.setAttribute(
    "style",
    [
      "position:fixed",
      pos,
      `opacity:${cfg.opacity}`,
      "background:rgba(0,0,0,0.82)",
      "color:#e0e0e0",
      "font-family:monospace",
      "font-size:11px",
      "line-height:1.5",
      "padding:8px 10px",
      "border-radius:4px",
      "z-index:10000",
      "pointer-events:none",
      "white-space:pre",
      "min-width:160px",
    ].join(";"),
  );
}

function escHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatValue(value: boolean | number | { x: number; y: number }): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return value.toFixed(3);
  return `(${value.x.toFixed(2)}, ${value.y.toFixed(2)})`;
}
