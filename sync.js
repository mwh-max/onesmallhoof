import {
  parseJSON,
  mergeEcoAction,
  mergeEcoHistory,
  mergeLongestStreak,
  mergeActionCount,
  mergeCustomTasks,
  STORAGE_KEYS as K,
} from './lib.js';

// window.db is the Supabase client set by supabase-client.js before this module runs.

let isSyncing = false;

async function getCurrentUser() {
  const { data: { user } } = await window.db.auth.getUser();
  return user;
}

async function syncUp() {
  if (!navigator.onLine) {
    localStorage.setItem(K.syncPending, 'true');
    return;
  }

  const user = await getCurrentUser();
  if (!user) return;

  const today = new Date().toDateString();
  const storedDate = localStorage.getItem(K.countDate);

  const data = {
    ecoAction:     localStorage.getItem(K.ecoAction),
    ecoHistory:    localStorage.getItem(K.ecoHistory),
    customTasks:   localStorage.getItem(K.customTasks),
    longestStreak: localStorage.getItem(K.longestStreak),
    actionCount:   storedDate === today ? localStorage.getItem(K.actionCount) : '0',
    countDate:     storedDate,
  };

  const { error } = await window.db.from('user_data').upsert(
    { user_id: user.id, data, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );

  if (error) {
    localStorage.setItem(K.syncPending, 'true');
    if (window.triggerToast) window.triggerToast('Could not save — will retry when reconnected.', true);
    return;
  }

  localStorage.removeItem(K.syncPending);
}

async function syncDown() {
  if (isSyncing) return;
  isSyncing = true;

  try {
  if (!navigator.onLine) {
    localStorage.setItem(K.syncPending, 'true');
    document.dispatchEvent(new CustomEvent('syncdown-complete'));
    return;
  }

  const user = await getCurrentUser();
  if (!user) return;

  const { data: row, error } = await window.db
    .from('user_data')
    .select('data')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    localStorage.setItem(K.syncPending, 'true');
    if (window.triggerToast) window.triggerToast('Could not load your data — will retry when reconnected.', true);
    document.dispatchEvent(new CustomEvent('syncdown-complete'));
    return;
  }

  if (!row) {
    await syncUp();
    document.dispatchEvent(new CustomEvent('syncdown-complete'));
    return;
  }

  const cloud = row.data;

  // ecoAction: keep whichever has a higher streak
  const winningAction = mergeEcoAction(
    parseJSON(localStorage.getItem(K.ecoAction)),
    parseJSON(cloud.ecoAction)
  );
  if (winningAction) localStorage.setItem(K.ecoAction, JSON.stringify(winningAction));

  // ecoHistory: merge by date, keep latest 30
  const mergedHistory = mergeEcoHistory(
    parseJSON(localStorage.getItem(K.ecoHistory)) || [],
    parseJSON(cloud.ecoHistory) || []
  );
  localStorage.setItem(K.ecoHistory, JSON.stringify(mergedHistory));

  // longestStreak: take max
  const mergedLongest = mergeLongestStreak(
    parseInt(localStorage.getItem(K.longestStreak), 10) || 0,
    parseInt(cloud.longestStreak, 10) || 0
  );
  localStorage.setItem(K.longestStreak, mergedLongest);

  // actionCount: cloud wins only if same day and higher
  const today = new Date().toDateString();
  const { count: mergedCount, date: mergedDate } = mergeActionCount(
    parseInt(localStorage.getItem(K.actionCount), 10) || 0,
    localStorage.getItem(K.countDate),
    parseInt(cloud.actionCount, 10) || 0,
    cloud.countDate,
    today
  );
  localStorage.setItem(K.actionCount, mergedCount);
  localStorage.setItem(K.countDate, mergedDate);

  // customTasks: merge, deduplicate by task+date
  const mergedTasks = mergeCustomTasks(
    parseJSON(localStorage.getItem(K.customTasks)) || [],
    parseJSON(cloud.customTasks) || []
  );
  localStorage.setItem(K.customTasks, JSON.stringify(mergedTasks));

  document.dispatchEvent(new CustomEvent('syncdown-complete'));
  } finally {
    isSyncing = false;
  }
}

// Retry any pending sync when connectivity is restored.
// Debounced to avoid a storm of calls on rapid offline/online cycling.
let onlineRetryTimer = null;
window.addEventListener('online', () => {
  clearTimeout(onlineRetryTimer);
  onlineRetryTimer = setTimeout(() => {
    if (localStorage.getItem(K.syncPending) === 'true') {
      syncUp();
    }
  }, 300);
});

window.sync = { syncUp, syncDown };
