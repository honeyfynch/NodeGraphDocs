/** 50% alpha blend with canvas — disabled node header/body fills. */
export function translucentFill50(base: string): string {
  return `color-mix(in srgb, ${base} 50%, transparent)`;
}
