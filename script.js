// Force redeploy

const dateElement = document.getElementById("date");
const today = new Date().toDateString();
dateElement.textContent = `Today is ${today}`;
const todayKey = today;
const saved = JSON.parse(localStorage.getItem("ecoAction"));
const actionList = document.getElementById("action-list");
const message = document.getElementById("message");

function calculateStreak(savedEntry, todayDate) {
  if (!savedEntry || !savedEntry.date) return 1;

  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);

  const savedDate = new Date(savedEntry.date);
  const isYesterday = savedDate.toDateString() === yesterday.toDateString();
  return isYesterday ? (savedEntry.streak || 1) + 1 : 1;
}

const actions = [
    "Bring your own bag",
    "Turn off unused lights",
    "Use a reusable water bottle",
    "Compost food scraps",
    "Walk instead of drive"
  ];

if (saved && saved.date === todayKey) {
  message.textContent = `You've already chosen: "${saved.action}" today. Thanks!`;
} else {
  
  actions.forEach(action => {
    const listItem = document.createElement("li");
    listItem.textContent = action;
    listItem.style.cursor = "pointer";

    listItem.addEventListener("click", () => {
      const streak = calculateStreak(saved, new Date());

      if (streak === 5 || streak === 10 || streak % 25 === 0) {
        alert(`You're on a ${streak}-day streak! That's worth celebrating!`);
      }

      localStorage.setItem("ecoAction", JSON.stringify({
        action,
        date: todayKey,
        streak
      }));

      message.textContent = `Thanks for choosing: "${action}" today! You're on a ${streak}-day streak!`;
      actionList.innerHTML = "";
    });

    actionList.appendChild(listItem);
  });
}

if (saved && saved.date !== todayKey && saved.streak > 1) {
  message.textContent = `Welcome back! Yesterday's streak ended, but you're starting fresh today. One Small Hoof at a time.`;
}

let storedDate = localStorage.getItem("date");
let count = (storedDate === today) ? Number(localStorage.getItem("count")) || 0 : 0;

const countDisplay = document.getElementById("count");
const incrementBtn = document.getElementById("increment-btn");

countDisplay.textContent = count;

incrementBtn.addEventListener("click", () => {
  count += 1;
  countDisplay.textContent = count;
  localStorage.setItem("count", count);
});

function addCustomTask() {
  const input = document.getElementById("customTask");
  const task = input.value.trim();
  if (task) {
    CustomTaskManager.add(task);
    input.value = "";
  }
}

function loadCustomTasks() {
  const list = document.getElementById("userTaskList");
  const saved = JSON.parse(localStorage.getItem("customTasks")) || [];

  saved.forEach(entry => {
    const li = document.createElement("li");
    li.textContent = `${entry.text} — ${entry.date}`;
    list.appendChild(li);
  });
}

const CustomTaskManager = {
  storageKey: "customTasks",

  add(task) {
    const date = new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
    const entry = { text: task, date };

    const saved = JSON.parse(localStorage.getItem(this.storageKey)) || [];
    saved.push(entry);
    localStorage.setItem(this.storageKey, JSON.stringify(saved));

    this.render(entry);
  },

  render(entry) {
    const list = document.getElementById("userTaskList");
    const li = document.createElement("li");
    li.textContent = `${entry.text} — ${entry.date}`;
    list.appendChild(li);
  },

  load() {
    const saved = JSON.parse(localStorage.getItem(this.storageKey)) || [];
    saved.forEach(entry => this.render(entry));
  },

  clear() {
    if (confirm("Are you sure you want to clear all custom tasks?")) {
      localStorage.removeItem(this.storageKey);
      document.getElementById("userTaskList").innerHTML = "";
    }
  }
};


window.onload = () => {
  CustomTaskManager.load();
  // Other startup logic here
};

function clearCustomTasks() {
  CustomTaskManager.clear();
}