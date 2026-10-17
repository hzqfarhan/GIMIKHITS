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
    const luminous = material.blending === THREE.AdditiveBlending;
    // Keep saturated indigo surfaces, blue edge light, and red energy accents.
    // Mixing every material with white made the dark theme drift back to lilac.
    color.set(red ? '#fe0008' : luminous && hsl.l > .5 ? '#364dff' : '#2e1fa8');
    if (theme === 'hits-dark' && field === 'color' && red && luminous) color.set('#ff2539');
  }
  if (theme === 'hits-light' && material.blending === THREE.AdditiveBlending) material.blending = THREE.NormalBlending;
  return value;
}
