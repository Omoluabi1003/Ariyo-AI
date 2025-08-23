(() => {
  const USER_ID_KEY = 'ariyoUserId';
  const VISIT_COUNT_KEY = 'ariyoVisitCount';

  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = (self.crypto && self.crypto.randomUUID)
      ? self.crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    localStorage.setItem(USER_ID_KEY, userId);
  }

  let visitCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
  visitCount += 1;
  localStorage.setItem(VISIT_COUNT_KEY, visitCount.toString());

  console.log(`User ID: ${userId} | Visit #: ${visitCount}`);
})();
