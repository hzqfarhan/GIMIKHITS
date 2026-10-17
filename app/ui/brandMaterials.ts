import * as THREE from 'three';
import type { Theme } from './ThemeProvider';

/** Retain the scene's shading while replacing violet/cyan accents with HITS inks. */
export function brandMaterial<T extends {dispose: () => void}>(value: T, theme: Theme): T {
  if (theme === 'purple') return value;
  const material = value as T & {color?: InstanceType<typeof THREE.Color>; emissive?: InstanceType<typeof THREE.Color>; blending?: number};
  for (const field of ['color', 'emissive'] as const) {
    const color = material[field];
    if (!color?.isColor) continue;
    const hsl = color.getHSL({h:0,s:0,l:0});
    if (hsl.s < .08) continue;
    // Cyan energy becomes red; violet structures become the logo's indigo.
    const red = hsl.h < .58 || hsl.h > .82;
    color.set(red ? '#fe0008' : '#2e1fa8');
    if (theme === 'hits-dark' && field === 'color') color.lerp(new THREE.Color('#ffffff'), hsl.l > .65 ? .38 : .08);
  }
  if (theme === 'hits-light' && material.blending === THREE.AdditiveBlending) material.blending = THREE.NormalBlending;
  return value;
}
