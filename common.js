function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2200);
}

function getCss(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

// ---------- theme (light/dark) ----------

function getStoredTheme() {
  try {
    return localStorage.getItem("castelos:theme");
  } catch {
    return null;
  }
}

function setStoredTheme(theme) {
  try {
    if (theme) localStorage.setItem("castelos:theme", theme);
    else localStorage.removeItem("castelos:theme");
  } catch {
    /* ignore */
  }
}

function effectiveTheme() {
  const stored = getStoredTheme();
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  if (theme) document.documentElement.setAttribute("data-theme", theme);
  else document.documentElement.removeAttribute("data-theme");
}

function updateThemeButton() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const dark = effectiveTheme() === "dark";
  btn.textContent = dark ? "☀️" : "🌙";
  btn.title = dark ? "Mudar para modo claro" : "Mudar para modo escuro";
}

function initThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  updateThemeButton();
  btn.addEventListener("click", () => {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    setStoredTheme(next);
    applyTheme(next);
    updateThemeButton();
    window.dispatchEvent(new CustomEvent("theme-changed"));
  });
}

// ---------- font choice ----------

function getStoredFont() {
  try {
    return localStorage.getItem("castelos:font") || "";
  } catch {
    return "";
  }
}

function setStoredFont(font) {
  try {
    if (font) localStorage.setItem("castelos:font", font);
    else localStorage.removeItem("castelos:font");
  } catch {
    /* ignore */
  }
}

function applyFont(font) {
  if (font) document.documentElement.setAttribute("data-font", font);
  else document.documentElement.removeAttribute("data-font");
}

function initFontSelect() {
  const select = document.getElementById("font-select");
  if (!select) return;
  select.value = getStoredFont();
  select.addEventListener("change", () => {
    setStoredFont(select.value);
    applyFont(select.value);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initFontSelect();
});
