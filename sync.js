import {
  parseJSON,
  mergeEcoAction,
  mergeEcoHistory,
  mergeLongestStreak,
  mergeActionCount,
  mergeCustomTasks,
} from './lib.js';

// window.db is the Supabase client set by supabase-client.js before this module runs.
async function getCurrentUser() {
  const { data: { user } } = await window.db.auth.getUser();
  return user;
}

async function syncUp() {
  if (!navigator.onLine) {
    localStorage.setItem('syncPending', 'true');
    return;
  }

  const user = await getCurrentUser();
  if (!user) return;

  const today = new Date().toDateString();
  const storedDate = localStorage.getItem('countDate');

  const data = {
    ecoAction:     localStorage.getItem('ecoAction'),
    ecoHistory:    localStorage.getItem('ecoHistory'),
    customTasks:   localStorage.getItem('customTasks'),
    longestStreak: localStorage.getItem('longestStreak'),
    actionCount:   storedDate === today ? localStorage.getItem('actionCount') : '0',
    countDate:     storedDate,
  };

  const { error } = await window.db.from('user_data').upsert(
    { user_id: user.id, data, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );

  if (error) {
    localStorage.setItem('syncPending', 'true');
    if (window.triggerToast) window.triggerToast('Could not save — will retry when reconnected.', true);
    return;
  }

  localStorage.removeItem('syncPending');
}

async function syncDown() {
  if (!navigator.onLine) {
    localStorage.setItem('syncPending', 'true');
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
    localStorage.setItem('syncPending', 'true');
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
    parseJSON(localStorage.getItem('ecoAction')),
    parseJSON(cloud.ecoAction)
  );
  if (winningAction) localStorage.setItem('ecoAction', JSON.stringify(winningAction));

  // ecoHistory: merge by date, keep latest 30
  const mergedHistory = mergeEcoHistory(
    parseJSON(localStorage.getItem('ecoHistory')) || [],
    parseJSON(cloud.ecoHistory) || []
  );
  localStorage.setItem('ecoHistory', JSON.stringify(mergedHistory));

  // longestStreak: take max
  const mergedLongest = mergeLongestStreak(
    parseInt(localStorage.getItem('longestStreak'), 10) || 0,
    parseInt(cloud.longestStreak, 10) || 0
  );
  localStorage.setItem('longestStreak', mergedLongest);

  // actionCount: cloud wins only if same day and higher
  const today = new Date().toDateString();
  const { count: mergedCount, date: mergedDate } = mergeActionCount(
    parseInt(localStorage.getItem('actionCount'), 10) || 0,
    localStorage.getItem('countDate'),
    parseInt(cloud.actionCount, 10) || 0,
    cloud.countDate,
    today
  );
  localStorage.setItem('actionCount', mergedCount);
  localStorage.setItem('countDate', mergedDate);

  // customTasks: merge, deduplicate by task+date
  const mergedTasks = mergeCustomTasks(
    parseJSON(localStorage.getItem('customTasks')) || [],
    parseJSON(cloud.customTasks) || []
  );
  localStorage.setItem('customTasks', JSON.stringify(mergedTasks));

  document.dispatchEvent(new CustomEvent('syncdown-complete'));
}

// Retry any pending sync when connectivity is restored.
window.addEventListener('online', () => {
  if (localStorage.getItem('syncPending') === 'true') {
    syncUp();
  }
});

window.sync = { syncUp, syncDown };
