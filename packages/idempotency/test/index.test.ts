import { PACKAGE_NAME } from '../src/index';

describe('@kotodayori/idempotency scaffold', () => {
  it('exposes the package name placeholder', () => {
    expect(PACKAGE_NAME).toBe('@kotodayori/idempotency');
  });
});
