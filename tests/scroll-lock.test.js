const scrollLock = require('../scripts/scroll-lock');

describe('scroll lock ref counting', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    scrollLock.resetScrollLock();
  });

  test('locks and unlocks with reference counts', () => {
    expect(scrollLock.getLockCount()).toBe(0);

    scrollLock.lockScroll('modal:track');
    scrollLock.lockScroll('modal:radio');
    expect(scrollLock.getLockCount()).toBe(2);
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overflow).toBe('hidden');

    scrollLock.unlockScroll('modal:track');
    expect(scrollLock.getLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');

    scrollLock.unlockScroll('modal:radio');
    expect(scrollLock.getLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
  });
});
