import timeline from "./combatAnimation.json";
export { timeline };

export function blinkDistance(stageWidth: number, enemy: boolean): number {
  return Math.min(timeline.maxBlinkPx, stageWidth * timeline.blinkWidthFraction) * (enemy ? -1 : 1);
}

export function attackKeyframes(distance: number): Keyframe[] {
  return timeline.frames.map(frame => ({
    offset: frame.offset,
    transform: `translateX(${distance * frame.travel}px) scale(${frame.scale})`,
    opacity: frame.opacity,
  }));
}

interface Motion { active: boolean; key: number; ultimate: boolean; distance: number }
/** One shared blink/strike/return choreography for every attack type. */
export function attackMotion(node: HTMLElement, initial: Motion) {
  let animation: Animation | undefined;
  let previousKey = -1;
  function update(motion: Motion) {
    if (!motion.active) { animation?.cancel(); previousKey = -1; return; }
    if (previousKey === motion.key) return;
    previousKey = motion.key;
    animation?.cancel();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    animation = node.animate(attackKeyframes(motion.distance), {
      duration: motion.ultimate ? timeline.ultimateMs : timeline.attackMs,
      easing: "linear",
    });
  }
  update(initial);
  return { update, destroy() { animation?.cancel(); } };
}

export interface Point { x: number; y: number }
export function projectilePath(source: Point, target: Point) {
  return { x: source.x, y: source.y, dx: target.x - source.x, dy: target.y - source.y,
    angle: Math.atan2(target.y - source.y, target.x - source.x) * 180 / Math.PI };
}
