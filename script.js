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
        localStorage.setItem("ecoAction", JSON.stringify({action, date: todayKey, streak}));
        message.textContent = `Thanks for choosing: "${action}" today! You're on a ${streak}-day streak!`;
        actionList.innerHTML = "";
        }); 
    actionList.appendChild(listItem);
    });
}

if (saved && saved.date !== todayKey && saved.streak > 1) {
    message.textContent = `Welcome back! Yesterday's streak ended, but you're starting fresh today. One Small Hoof at a time.`;
}

let storedDate = localStorage.getItem('date');
let count = (storedDate === today) ? Number(localStorage.getItem('count')) || 0 : 0;

const countDisplay = document.getElementById("count");
const incrementBtn = document.getElementById("increment-btn");

countDisplay.textContent = count;

incrementBtn.addEventListener("click", () => {
  count += 1;
  countDisplay.textContent = count;
  localStorage.setItem('count', count);
  let storedDate = localStorage.getItem('countDate');
});