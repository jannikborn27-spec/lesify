import { describe, expect, it } from 'vitest';
import { noteAmpel, noteLabel, prozentZuNote } from './noten.js';

describe('prozentZuNote — Werte aus data.js SEED', () => {
  it.each([
    [56, 3.2],
    [92, 1.4],
    [18, 5.1],
    [58, 3.1],
    [66, 2.7],
    [55, 3.3],
    [85, 1.8], // 1.75 → Math.round(17.5) = 18
    [88, 1.6],
    [82, 1.9],
    [78, 2.1],
    [61, 3.0], // 2.95 → 3.0
    [100, 1],
    [0, 6],
    [70, 2.5],
  ])('%i%% → Note %f', (prozent, note) => {
    expect(prozentZuNote(prozent)).toBe(note);
  });

  it('klemmt außerhalb 0–100', () => {
    expect(prozentZuNote(120)).toBe(1);
    expect(prozentZuNote(-10)).toBe(6);
  });
});

describe('noteAmpel — ≤2.5 grün · ≤4.0 gelb · sonst rot', () => {
  it.each([
    [1.4, 'gruen'],
    [2.5, 'gruen'],
    [2.6, 'gelb'],
    [3.1, 'gelb'],
    [4.0, 'gelb'],
    [4.1, 'rot'],
    [5.1, 'rot'],
  ] as const)('Note %f → %s', (note, ampel) => {
    expect(noteAmpel(note)).toBe(ampel);
  });
});

describe('noteLabel', () => {
  it.each([
    [1.0, 'sehr gut'],
    [1.5, 'sehr gut'],
    [2.5, 'gut'],
    [2.6, 'befriedigend'],
    [3.5, 'befriedigend'],
    [4.5, 'ausreichend'],
    [5.5, 'mangelhaft'],
    [6.0, 'ungenügend'],
  ])('Note %f → %s', (note, label) => {
    expect(noteLabel(note)).toBe(label);
  });
});
