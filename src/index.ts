const statusEl = document.getElementById("status");
const buttonEl = document.getElementById("counter-btn") as HTMLButtonElement | null;

let count: number = 0;

if (statusEl) {
  statusEl.textContent = "✅ ¡TypeScript se ha compilado correctamente!";
  statusEl.style.color = "green";
}

if (buttonEl) {
  buttonEl.addEventListener("click", () => {
    count++;
    buttonEl.textContent = `Clicks: ${count}`;
  });
}