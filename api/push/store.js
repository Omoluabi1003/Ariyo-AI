const fs = require('fs/promises');
const path = require('path');

const DEFAULT_PATH = path.join(process.cwd(), 'data', 'push-subscriptions.json');
const STORE_PATH = process.env.PUSH_SUBSCRIPTIONS_PATH || DEFAULT_PATH;

async function readSubscriptions() {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeSubscriptions(subscriptions) {
  const folder = path.dirname(STORE_PATH);
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(subscriptions, null, 2));
}

async function saveSubscription(subscription) {
  const list = await readSubscriptions();
  const existingIndex = list.findIndex((entry) => entry.endpoint === subscription.endpoint);
  if (existingIndex >= 0) {
    list[existingIndex] = subscription;
  } else {
    list.push(subscription);
  }
  await writeSubscriptions(list);
  return list;
}

async function removeSubscriptionsByEndpoint(endpoints = []) {
  if (!endpoints.length) {
    return [];
  }
  const list = await readSubscriptions();
  const filtered = list.filter((entry) => !endpoints.includes(entry.endpoint));
  if (filtered.length !== list.length) {
    await writeSubscriptions(filtered);
  }
  return filtered;
}

module.exports = {
  readSubscriptions,
  saveSubscription,
  removeSubscriptionsByEndpoint,
  STORE_PATH,
};
