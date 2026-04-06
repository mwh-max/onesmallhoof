// sync.js is a module; script.js (which defines parseJSON) is non-module (defer).
// Modules execute before defer scripts, so window.parseJSON is not available here.
// parseJSON is intentionally duplicated rather than adding a shared utility file.
function parseJSON(value, fallback = null) {
  try { return JSON.parse(value); } catch { return fallback; }
}

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
  const localAction = parseJSON(localStorage.getItem('ecoAction'));
  const cloudAction = parseJSON(cloud.ecoAction);
  if (cloudAction) {
    const localStreak = localAction?.streak ?? 0;
    const cloudStreak = cloudAction?.streak ?? 0;
    if (cloudStreak > localStreak) {
      localStorage.setItem('ecoAction', cloud.ecoAction);
    }
  }

  // ecoHistory: merge by date, keep latest 30
  const localHistory = parseJSON(localStorage.getItem('ecoHistory')) || [];
  const cloudHistory = parseJSON(cloud.ecoHistory) || [];
  const historyMap = new Map();
  [...localHistory, ...cloudHistory].forEach(e => { if (e?.date) historyMap.set(e.date, e); });
  const mergedHistory = Array.from(historyMap.values())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-30);
  localStorage.setItem('ecoHistory', JSON.stringify(mergedHistory));

  // longestStreak: take max
  const localLongest = parseInt(localStorage.getItem('longestStreak'), 10) || 0;
  const cloudLongest = parseInt(cloud.longestStreak, 10) || 0;
  localStorage.setItem('longestStreak', Math.max(localLongest, cloudLongest));

  // actionCount: cloud wins only if same day and higher
  const today = new Date().toDateString();
  if (cloud.countDate === today) {
    const localCount = parseInt(localStorage.getItem('actionCount'), 10) || 0;
    const cloudCount = parseInt(cloud.actionCount, 10) || 0;
    if (cloudCount > localCount) {
      localStorage.setItem('actionCount', cloudCount);
      localStorage.setItem('countDate', today);
    }
  }

  // customTasks: merge, deduplicate by task+date
  const localTasks = parseJSON(localStorage.getItem('customTasks')) || [];
  const cloudTasks = parseJSON(cloud.customTasks) || [];
  const taskMap = new Map();
  [...localTasks, ...cloudTasks].forEach(t => {
    if (t?.task && t?.date) taskMap.set(`${t.task}|${t.date}`, t);
  });
  localStorage.setItem('customTasks', JSON.stringify([...taskMap.values()]));

  document.dispatchEvent(new CustomEvent('syncdown-complete'));
}

// Retry any pending sync when connectivity is restored.
window.addEventListener('online', () => {
  if (localStorage.getItem('syncPending') === 'true') {
    syncUp();
  }
});

window.sync = { syncUp, syncDown };
