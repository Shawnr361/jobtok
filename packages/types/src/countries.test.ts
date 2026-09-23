import { describe, expect, it } from 'vitest';
import { canTransitionApplication } from './enums.js';
import { toE164 } from './countries.js';

describe('toE164', () => {
  it.each([
    ['08031234567', '+2348031234567'],
    ['0803 123 4567', '+2348031234567'],
    ['+2348031234567', '+2348031234567'],
    ['2348031234567', '+2348031234567'],
  ])('normalises %s', (input, expected) => {
    expect(toE164(input)).toBe(expected);
  });

  it.each(['12345', '+14155552671', '06031234567'])('rejects %s', (input) => {
    expect(toE164(input)).toBeNull();
  });
});

describe('canTransitionApplication', () => {
  it('allows forward moves and blocks moves out of terminal states', () => {
    expect(canTransitionApplication('applied', 'reviewing')).toBe(true);
    expect(canTransitionApplication('offer', 'hired')).toBe(true);
    expect(canTransitionApplication('interview', 'rejected')).toBe(true);
    expect(canTransitionApplication('hired', 'rejected')).toBe(false);
    expect(canTransitionApplication('applied', 'hired')).toBe(false);
  });

  it('only advances one stage at a time', () => {
    expect(canTransitionApplication('applied', 'shortlisted')).toBe(false);
    expect(canTransitionApplication('shortlisted', 'offer')).toBe(false);
    expect(canTransitionApplication('offer', 'interview')).toBe(false);
  });
});
