import { describe, it, expectTypeOf } from 'vitest';
import type { Verifier } from '../src/index.js';

describe('Verifier payload type', () => {
  it('is string | Uint8Array', () => {
    expectTypeOf<Parameters<Verifier>[0]>().toEqualTypeOf<string | Uint8Array>();
  });

  it('accepts a verifier written for string | Uint8Array', () => {
    expectTypeOf<(payload: string | Uint8Array, headers: Record<string, string | undefined>) => never>().toExtend<Verifier>();
  });

  it('no longer accepts a verifier that requires a Buffer (breaking change)', () => {
    expectTypeOf<(payload: string | Buffer, headers: Record<string, string | undefined>) => never>().not.toExtend<Verifier>();
  });
});
