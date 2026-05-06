import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCountUp } from './useCountUp';

describe('useCountUp', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 immediately when target is 0', () => {
    const { result } = renderHook(() => useCountUp(0));
    expect(result.current).toBe(0);
  });

  it('animates from 0 → integer target via rAF', async () => {
    let frameCallback: FrameRequestCallback | null = null;
    let now = 1000;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frameCallback = cb;
      return 1;
    });

    const { result } = renderHook(() => useCountUp(100, 500));
    expect(result.current).toBe(0);

    // First frame at t=1000 (start)
    await act(async () => { frameCallback?.(now); });
    expect(result.current).toBe(0);

    // Halfway (250ms)
    now = 1250;
    await act(async () => { frameCallback?.(now); });
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(100);

    // Final frame past duration
    now = 1600;
    await act(async () => { frameCallback?.(now); });
    expect(result.current).toBe(100);
  });

  it('rounds non-integer targets to 1 decimal', async () => {
    let frameCallback: FrameRequestCallback | null = null;
    let now = 1000; // non-zero so startRef sentinel works
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frameCallback = cb;
      return 1;
    });

    const { result } = renderHook(() => useCountUp(12.5, 100));
    // first frame anchors start
    await act(async () => { frameCallback?.(now); });
    // second frame past duration
    now = 1300;
    await act(async () => { frameCallback?.(now); });
    expect(result.current).toBe(12.5);
  });

  it('cancels animation on unmount', () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
    let frameId = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => ++frameId);

    const { unmount } = renderHook(() => useCountUp(100, 500));
    unmount();

    expect(cancelSpy).toHaveBeenCalled();
  });
});
