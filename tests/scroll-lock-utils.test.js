const {
  lockScroll,
  unlockScroll,
  resetScrollLock,
  getLockCount
} = require('../scripts/scroll-lock');

describe('scroll lock manager', () => {
  beforeEach(() => {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = '';
    resetScrollLock();
  });

  test('uses reference counting for multiple locks', () => {
    expect(getLockCount()).toBe(0);
    lockScroll('modal:track');
    lockScroll('panel:chatbot');
    expect(getLockCount()).toBe(2);
    unlockScroll('modal:track');
    expect(getLockCount()).toBe(1);
    unlockScroll('panel:chatbot');
    expect(getLockCount()).toBe(0);
  });

  test('restores scroll styles after unlock', () => {
    lockScroll('modal:track');
    expect(document.body.style.overflow).toBe('hidden');
    unlockScroll('modal:track');
    expect(document.body.style.overflow).toBe('auto');
  });
});
