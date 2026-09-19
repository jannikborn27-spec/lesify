import { describe, expect, it } from 'vitest';
import { usageRatio, usageStufe } from './index.js';

describe('usageRatio', () => {
  it('null-Limit (unbegrenzt) → 0', () => {
    expect(usageRatio(999, null)).toBe(0);
  });
  it('klemmt auf [0,1]', () => {
    expect(usageRatio(0, 100)).toBe(0);
    expect(usageRatio(50, 100)).toBe(0.5);
    expect(usageRatio(250, 100)).toBe(1);
  });
});

describe('usageStufe — Schwellen wie usageRatioClass in app.js', () => {
  it('grün < 0.33', () => {
    expect(usageStufe(0)).toBe('gruen');
    expect(usageStufe(0.32)).toBe('gruen');
  });
  it('gelb 0.33–0.66', () => {
    expect(usageStufe(0.33)).toBe('gelb');
    expect(usageStufe(0.65)).toBe('gelb');
  });
  it('rot ≥ 0.66', () => {
    expect(usageStufe(0.66)).toBe('rot');
    expect(usageStufe(1)).toBe('rot');
  });
});
