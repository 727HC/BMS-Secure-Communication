import { useEffect, useRef, useState } from 'react';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * 0에서 target까지 requestAnimationFrame으로 count-up 애니메이션.
 * - target이 정수이면 정수 반환, 소수점이 있으면 소수 1자리
 * - target 변경 시 현재 값에서 새 target으로 tween
 * - SSR safe
 */
export function useCountUp(target: number, durationMs = 500): number {
  const [displayed, setDisplayed] = useState(0);
  const startRef = useRef<number>(0);
  const fromRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // target이 0이면 즉시 0 표시 (불필요한 렌더 방지)
    if (target === 0) {
      setDisplayed(0);
      return;
    }

    fromRef.current = displayed;
    startRef.current = 0; // 첫 프레임에서 타임스탬프 기록

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    const isInteger = Number.isInteger(target);

    function tick(timestamp: number) {
      if (startRef.current === 0) {
        startRef.current = timestamp;
      }
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = easeOutCubic(progress);
      const current = fromRef.current + (target - fromRef.current) * eased;

      if (isInteger) {
        setDisplayed(Math.round(current));
      } else {
        setDisplayed(Math.round(current * 10) / 10);
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayed(target);
        rafRef.current = null;
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return displayed;
}
