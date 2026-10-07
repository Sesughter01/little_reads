import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const readSrc = (relative: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf-8');

describe('admin layout shell', () => {
  it('offsets content below the fixed top bar exactly once', () => {
    const layout = readSrc('app/(admin)/admin/layout.tsx');
    // Content row carries the single top offset matching the fixed bar.
    expect(layout).toContain('pt-[53px]');
    expect(layout).toContain('h-[53px]');
    expect(layout).toContain('top-[53px]');
    // No double offset: exactly one pt-[53px] occurrence.
    expect(layout.match(/pt-\[53px\]/g)?.length).toBe(1);
  });

  it('main can shrink so wide tables do not force page overflow', () => {
    const layout = readSrc('app/(admin)/admin/layout.tsx');
    expect(layout).toContain('min-w-0');
    expect(layout).toContain('lg:ml-64');
  });

  it('sidebar stays fixed below the header and the mobile drawer is intact', () => {
    const layout = readSrc('app/(admin)/admin/layout.tsx');
    expect(layout).toContain('fixed');
    expect(layout).toContain('h-[calc(100vh-53px)]');
    expect(layout).toContain('lg:hidden');
  });

  it('tables already scroll inside their own wrappers', () => {
    for (const page of [
      'app/(admin)/admin/products/page.tsx',
      'app/(admin)/admin/orders/page.tsx',
      'app/(admin)/admin/customers/page.tsx',
      'app/(admin)/admin/reviews/page.tsx',
    ]) {
      expect(readSrc(page)).toContain('overflow-x-auto');
    }
  });
});
