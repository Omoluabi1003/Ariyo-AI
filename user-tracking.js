(async () => {
  try {
    let userId = localStorage.getItem('ariyoUserId');
    let isNewUser = false;
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem('ariyoUserId', userId);
      isNewUser = true;
    }

    const resp = await fetch('https://api.countapi.xyz/hit/ariyo-ai/visits');
    const data = await resp.json();
    const visits = data.value;
    console.log(`Total visits: ${visits}`);

    if (isNewUser) {
      await fetch('https://formsubmit.co/ajax/pakiyogun10@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          subject: 'New Ariyo AI visitor',
          message: `User ${userId} visited. Total visits: ${visits}`
        })
      });
    }
  } catch (err) {
    console.error('User tracking failed', err);
  }
})();
