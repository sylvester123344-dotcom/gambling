const $ = (selector) => document.querySelector(selector);
const feed = $("#prediction-feed");
const history = $("#history-chips");
const multiplier = $("#flight-multiplier");
const plane = $("#plane");
const actionButton = $("#action-button");
const toast = $("#toast");

let roundNumber = 28418;
let phase = "running";
let joined = false;
let participatedThisRound = false;
let crashedAt = 0;
let multiplierValue = 1;
let balance = 1000;
let stake = 25;
let toastTimer;
let flightTimer;
let countdownTimer;
let countdownSeconds = 5;

const outcomes = [1.42, 2.18, 1.09, 3.64, 1.76, 1.23, 5.12, 1.31, 2.74, 1.58];
let outcomeIndex = 0;
const initialHistory = [1.58, 2.74, 1.31, 5.12, 1.23, 1.76];

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function tell(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2300);
}

function renderBalance() {
  $("#balance").textContent = formatMoney(balance);
}

function addOutcome(value, time = "NOW", flightRound = roundNumber) {
  const row = document.createElement("div");
  row.className = "feed-row";
  const round = document.createElement("span");
  round.className = "feed-round";
  round.textContent = `#${String(flightRound).slice(-5)}`;
  const timestamp = document.createElement("span");
  timestamp.className = "feed-time";
  timestamp.textContent = time;
  const result = document.createElement("strong");
  result.className = `feed-result ${value < 1.5 ? "low" : value < 2 ? "mid" : ""}`;
  result.textContent = `${value.toFixed(2)}×`;
  row.append(round, timestamp, result);
  feed.append(row);
  while (feed.querySelectorAll(".feed-row").length > 7) feed.querySelector(".feed-row").remove();

  const chip = document.createElement("span");
  chip.className = `history-chip ${value < 1.5 ? "low" : value < 2 ? "mid" : ""}`;
  chip.textContent = `${value.toFixed(2)}×`;
  history.prepend(chip);
  while (history.children.length > 9) history.lastElementChild.remove();
}

function updateFlight() {
  multiplier.textContent = `${multiplierValue.toFixed(2)}`;
  const suffix = document.createElement("span");
  suffix.textContent = "×";
  multiplier.append(suffix);
  const progress = Math.min(1, Math.log(multiplierValue) / Math.log(Math.max(1.2, crashedAt)));
  plane.style.left = `${Math.min(82, 8 + progress * 67)}%`;
  plane.style.top = `${Math.max(20, 72 - progress * 43)}%`;
  $("#stage-time").textContent = `FLIGHT TIME ${Math.floor((multiplierValue - 1) * 8)}s`;
  $("#path-curve").style.strokeDashoffset = String(progress * 370);
}

function setAction() {
  const title = $("#action-title");
  const subtitle = $("#action-subtitle");
  $("#bet-amount").disabled = phase === "running" && participatedThisRound;
  document.querySelectorAll(".quick button, .amount button").forEach((button) => {
    button.disabled = phase !== "running" || participatedThisRound;
  });
  if (phase === "running" && joined) {
    title.textContent = "Cash out credits";
    subtitle.textContent = `Estimated return ${formatMoney(stake * multiplierValue)}`;
    actionButton.disabled = false;
  } else if (phase === "running" && participatedThisRound) {
    title.textContent = "Already cashed out";
    subtitle.textContent = "Wait for the next flight";
    actionButton.disabled = true;
  } else if (phase === "running") {
    title.textContent = "Join next round";
    subtitle.textContent = "Play credits only · no cash value";
    actionButton.disabled = false;
  } else if (phase === "countdown") {
    title.textContent = `Flight starts in ${countdownSeconds}s`;
    subtitle.textContent = "Forecast for the upcoming flight";
    actionButton.disabled = true;
  } else {
    title.textContent = "Get ready for next round";
    subtitle.textContent = "Round restarting shortly";
    actionButton.disabled = true;
  }
}

function finishRound() {
  phase = "ended";
  window.clearInterval(flightTimer);
  $("#game-status").textContent = "ROUND COMPLETE";
  $("#crash-result").textContent = `Final flight: ${crashedAt.toFixed(2)}×`;
  $("#crash-overlay").hidden = false;
  if (joined) tell("Flight ended before you cashed out.");
  joined = false;
  setAction();
  addOutcome(crashedAt, "NOW");
  window.setTimeout(startRound, 3800);
}

function startRound() {
  roundNumber += 1;
  phase = "countdown";
  joined = false;
  participatedThisRound = false;
  multiplierValue = 1;
  crashedAt = outcomes[outcomeIndex % outcomes.length];
  outcomeIndex += 1;
  countdownSeconds = 5;
  $("#round-number").textContent = `#${roundNumber}`;
  $("#flight-number").textContent = String(roundNumber).padStart(6, "0");
  $("#model-read").textContent = "PRE-FLIGHT";
  $("#read-badge").textContent = "SCHEDULED";
  $("#forecast-value").textContent = `~${crashedAt.toFixed(2)}×`;
  $("#prediction-copy").textContent = "This flight has a preset result. Real Aviator outcomes cannot be predicted this way.";
  $("#game-status").textContent = `NEXT FLIGHT IN ${countdownSeconds}s`;
  $("#crash-overlay").hidden = true;
  updateFlight();
  setAction();
  window.clearInterval(countdownTimer);
  countdownTimer = window.setInterval(() => {
    countdownSeconds -= 1;
    if (countdownSeconds <= 0) {
      window.clearInterval(countdownTimer);
      launchRound();
      return;
    }
    $("#game-status").textContent = `NEXT FLIGHT IN ${countdownSeconds}s`;
    setAction();
  }, 1000);
}

function launchRound() {
  phase = "running";
  $("#model-read").textContent = "IN FLIGHT";
  $("#game-status").textContent = "ROUND IN PROGRESS";
  setAction();
  flightTimer = window.setInterval(() => {
    multiplierValue = Math.min(crashedAt, multiplierValue + Math.max(.012, multiplierValue * .016));
    updateFlight();
    setAction();
    if ($("#auto-cashout").checked && joined && multiplierValue >= Number($("#auto-value").value)) cashOut();
    if (multiplierValue >= crashedAt) finishRound();
  }, 130);
}

function cashOut() {
  if (phase !== "running" || !joined) return;
  const returned = stake * multiplierValue;
  balance += returned;
  renderBalance();
  tell(`Cashed out at ${multiplierValue.toFixed(2)}× · ${formatMoney(returned)} play credits returned.`);
  joined = false;
  participatedThisRound = true;
  setAction();
}

actionButton.addEventListener("click", () => {
  if (phase !== "running") {
    tell("Next flight is getting ready.");
    return;
  }
  if (joined) {
    cashOut();
    return;
  }
  if (participatedThisRound) {
    tell("You already played this round.");
    return;
  }
  stake = Number($("#bet-amount").value);
  if (!Number.isFinite(stake) || stake < 1 || stake > 1000) {
    tell("Choose a stake between $1 and $1,000.");
    return;
  }
  if (stake > balance) {
    tell("Not enough play credits. Choose a smaller stake.");
    return;
  }
  balance -= stake;
  renderBalance();
  joined = true;
  participatedThisRound = true;
  setAction();
  tell(`Joined round #${roundNumber} with ${formatMoney(stake)} in play credits.`);
});

$("#bet-amount").addEventListener("input", (event) => {
  stake = Number(event.currentTarget.value);
  document.querySelectorAll(".quick button").forEach((button) => {
    button.classList.toggle("selected", Number(button.dataset.amount) === stake);
  });
  if (joined) setAction();
});

$("#decrease-bet").addEventListener("click", () => {
  $("#bet-amount").value = Math.max(1, (Number($("#bet-amount").value) || 1) - 5);
  $("#bet-amount").dispatchEvent(new Event("input"));
});
$("#increase-bet").addEventListener("click", () => {
  $("#bet-amount").value = Math.min(1000, (Number($("#bet-amount").value) || 0) + 5);
  $("#bet-amount").dispatchEvent(new Event("input"));
});
document.querySelectorAll(".quick button").forEach((button) => {
  button.addEventListener("click", () => {
    $("#bet-amount").value = button.dataset.amount;
    $("#bet-amount").dispatchEvent(new Event("input"));
  });
});

$("#sound-toggle").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const enabled = button.getAttribute("aria-pressed") !== "true";
  button.setAttribute("aria-pressed", String(enabled));
  button.querySelector("span").textContent = enabled ? "Sound on" : "Sound off";
  tell(enabled ? "Sound controls are not connected yet." : "Sound off.");
});

initialHistory.forEach((value, index) => {
  addOutcome(value, `${(index + 1) * 2}m`, roundNumber - initialHistory.length + index + 1);
});
renderBalance();
startRound();
