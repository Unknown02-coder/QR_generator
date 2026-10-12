import assert from 'node:assert/strict';
import test from 'node:test';
import { visiblePageNumbers } from '../src/components/pagination.ts';

test('pagination shows at most five numbers around current page', () => {
  assert.deepEqual(visiblePageNumbers(1, 12), [1, 2, 3, 4, 5]);
  assert.deepEqual(visiblePageNumbers(7, 12), [5, 6, 7, 8, 9]);
  assert.deepEqual(visiblePageNumbers(12, 12), [8, 9, 10, 11, 12]);
});
