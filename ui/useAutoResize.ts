import { useCallback, useLayoutEffect, useRef } from "preact/hooks";
import { send } from "./bridge";

export const WIDTH = 360;
export const RESIZE_MIN = 460;
export const RESIZE_MAX = 720;

const clamp = (h: number) => Math.min(RESIZE_MAX, Math.max(RESIZE_MIN, h));

/**
 * Fits the plugin window to its content (grow and shrink) after every render,
 * until the user drags the resize handle. Returns the handle's mousedown handler.
 */
export function useAutoResize() {
  const height = useRef(0);
  const userResized = useRef(false);

  const resize = (h: number) => {
    height.current = h;
    send({ type: "RESIZE", width: WIDTH, height: h });
  };

  useLayoutEffect(() => {
    if (userResized.current) return;
    const h = clamp(document.body.scrollHeight + 24);
    if (h !== height.current) resize(h);
  });

  return useCallback((e: MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = height.current || clamp(document.body.scrollHeight + 24);
    const onMove = (ev: MouseEvent) => {
      userResized.current = true;
      resize(clamp(startHeight + ev.clientY - startY));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);
}
