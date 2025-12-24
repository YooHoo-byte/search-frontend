/* =========================================================
   Search Engine App – Full Controller + Settings System
   ========================================================= */

class SearchEngineApp {
  constructor() {
    this.state = {
      theme: "light",
      safeSearch: "moderate",
      language: "en",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      debug: false
    };

    this.currentCategory = "web";
    this.initialized = false;
  }

  /* ================= INIT ================= */

  init() {
    if (this.initialized) return;
    this.initialized = true;

    this.loadSettings();
    this.cacheDOM();
    this.applySettings();
    this.bindEvents();

    console.log("✅ App initialized");
  }

  /* ================= DOM ================= */

  cacheDOM() {
    this.html = document.documentElement;

    this.searchForm = document.getElementById("searchForm");
    this.searchInput = document.getElementById("searchInput");

    this.themeBtn = document.getElementById("toggleTheme");
    this.settingsBtn = document.getElementById("settingsBtn");

    this.categoryBtns = document.querySelectorAll(".category-btn");

    this.hero = document.getElementById("heroSection");
    this.results = document.getElementById("resultsSection");
    this.resultsContainer = document.getElementById("resultsContainer");

    /* Settings UI */
    this.settingsModal = document.getElementById("settingsModal");
    this.safeSearchSelect = document.getElementById("safeSearch");
    this.languageSelect = document.getElementById("language");
    this.timezoneSelect = document.getElementById("timezone");
    this.themeToggle = document.getElementById("themeToggle");
    this.clearCacheBtn = document.getElementById("clearCacheBtn");
    this.saveSettingsBtn = document.getElementById("saveSettingsBtn");
    this.closeSettingsBtn = document.getElementById("closeSettingsBtn");
  }

  /* ================= EVENTS ================= */

  bindEvents() {
    /* Search */
    this.searchForm?.addEventListener("submit", e => {
      e.preventDefault();
      const q = this.searchInput.value.trim();
      if (q) this.search(q);
    });

    /* Theme quick toggle */
    this.themeBtn?.addEventListener("click", () => {
      this.toggleTheme();
    });

    /* Categories */
    this.categoryBtns.forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        this.switchCategory(btn.dataset.category, btn);
      });
    });

    /* Settings open */
    this.settingsBtn?.addEventListener("click", () => {
      this.openSettings();
    });

    /* Settings close */
    this.closeSettingsBtn?.addEventListener("click", () => {
      this.closeSettings();
    });

    /* Save settings */
    this.saveSettingsBtn?.addEventListener("click", () => {
      this.saveSettingsFromUI();
    });

    /* Clear cache */
    this.clearCacheBtn?.addEventListener("click", () => {
      this.clearCache();
    });

    /* Click outside modal */
    this.settingsModal?.addEventListener("click", e => {
      if (e.target === this.settingsModal) {
        this.closeSettings();
      }
    });
  }

  /* ================= SEARCH ================= */

  async search(query) {
    this.hero?.classList.add("hidden");
    this.results?.classList.remove("hidden");

    if (this.state.debug) {
      console.log("🔍 Search", {
        query,
        category: this.currentCategory,
        settings: this.state
      });
    }

    try {
      if (typeof performSearch === "function") {
        await performSearch(query, {
          safeSearch: this.state.safeSearch,
          language: this.state.language
        });
      } else {
        this.resultsContainer.innerHTML =
          "<p style='color:red'>Search engine not loaded</p>";
      }
    } catch (err) {
      console.error(err);
      this.resultsContainer.innerHTML =
        "<p style='color:red'>Search failed</p>";
    }
  }

  switchCategory(category, btn) {
    this.currentCategory = category;
    this.categoryBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const q = this.searchInput.value.trim();
    if (q) this.search(q);
  }

  /* ================= SETTINGS LOGIC ================= */

  loadSettings() {
    const saved = localStorage.getItem("appSettings");
    if (!saved) return;

    try {
      Object.assign(this.state, JSON.parse(saved));
    } catch (err) {
      console.warn("Failed to load settings");
    }
  }

  persistSettings() {
    localStorage.setItem("appSettings", JSON.stringify(this.state));
  }

  applySettings() {
    this.applyTheme();
  }

  /* ---------------- Theme ---------------- */

  toggleTheme() {
    this.state.theme = this.state.theme === "light" ? "dark" : "light";
    this.persistSettings();
    this.applyTheme();
  }

  applyTheme() {
    this.html.setAttribute("data-theme", this.state.theme);

    const icon = this.themeBtn?.querySelector("i");
    if (icon) {
      icon.className =
        this.state.theme === "dark" ? "fas fa-sun" : "fas fa-moon";
    }
  }

  /* ================= SETTINGS UI ================= */

  openSettings() {
    if (!this.settingsModal) return;

    this.settingsModal.style.display = "flex";

    if (this.safeSearchSelect)
      this.safeSearchSelect.value = this.state.safeSearch;

    if (this.languageSelect)
      this.languageSelect.value = this.state.language;

    if (this.timezoneSelect)
      this.timezoneSelect.value = this.state.timezone;

    if (this.themeToggle)
      this.themeToggle.checked = this.state.theme === "dark";
  }

  closeSettings() {
    if (this.settingsModal) {
      this.settingsModal.style.display = "none";
    }
  }

  saveSettingsFromUI() {
    if (this.safeSearchSelect)
      this.state.safeSearch = this.safeSearchSelect.value;

    if (this.languageSelect)
      this.state.language = this.languageSelect.value;

    if (this.timezoneSelect)
      this.state.timezone = this.timezoneSelect.value;

    if (this.themeToggle)
      this.state.theme = this.themeToggle.checked ? "dark" : "light";

    this.persistSettings();
    this.applySettings();
    this.closeSettings();

    console.log("💾 Settings saved", this.state);
  }

  clearCache() {
    localStorage.clear();
    alert("Cache cleared. Reloading…");
    location.reload();
  }
}

/* ================= BOOT ================= */

document.addEventListener("DOMContentLoaded", () => {
  window.app = new SearchEngineApp();
  app.init();
});
