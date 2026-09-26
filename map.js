let ALL_CASTLES = [];
let markerById = new Map();
let markerLayer = null;
let map = null;

const state = {
  search: "",
  district: "",
  onlyVisited: false,
};

function markerColor(castle) {
  return Storage.isVisited(castle.id) ? getCss("--visited") : getCss("--accent");
}

function tooltipHtml(castle) {
  const yearStr = castle.year ? `Construído em ${castle.year}` : "Ano de construção desconhecido";
  const loc = [castle.district].filter(Boolean).join(" · ");
  return `
    <div class="tt-name">${castle.name}</div>
    <div class="tt-meta">${loc}</div>
    <div class="tt-meta">${yearStr}</div>
    <div class="tt-hint">Clica para ver detalhes →</div>
  `;
}

function buildMarker(castle) {
  const marker = L.circleMarker([castle.lat, castle.lng], {
    radius: 7,
    weight: 2.5,
    color: markerColor(castle),
    fillColor: markerColor(castle),
    fillOpacity: 0.85,
    className: "castle-marker",
  });
  marker.bindTooltip(tooltipHtml(castle), {
    direction: "top",
    offset: [0, -6],
    className: "castle-tooltip",
    opacity: 1,
  });
  marker.on("click", () => {
    window.location.href = `castle.html?id=${encodeURIComponent(castle.id)}`;
  });
  marker.castleId = castle.id;
  return marker;
}

function refreshMarkerStyles() {
  for (const castle of ALL_CASTLES) {
    const marker = markerById.get(castle.id);
    if (!marker) continue;
    const color = markerColor(castle);
    marker.setStyle({ color, fillColor: color });
  }
}

function initMap() {
  map = L.map("map", { zoomControl: true, minZoom: 6 }).setView([39.6, -8.2], 7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);
}

function populateDistrictFilter() {
  const districts = [...new Set(ALL_CASTLES.map((c) => c.district).filter(Boolean))].sort();
  const select = document.getElementById("district-filter");
  for (const d of districts) {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    select.appendChild(opt);
  }
}

function matchesFilters(castle) {
  if (state.onlyVisited && !Storage.isVisited(castle.id)) return false;
  if (state.district && castle.district !== state.district) return false;
  if (state.search) {
    const q = state.search.toLowerCase();
    const haystack = `${castle.name} ${castle.location || ""} ${castle.district || ""}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

function applyFilters() {
  markerLayer.clearLayers();
  const visible = [];
  for (const castle of ALL_CASTLES) {
    if (matchesFilters(castle)) {
      markerLayer.addLayer(markerById.get(castle.id));
      visible.push(castle);
    }
  }
  renderList(visible);
}

function renderList(castles) {
  const container = document.getElementById("castle-list");
  if (castles.length === 0) {
    container.innerHTML = `<div class="empty-note">Nenhum castelo encontrado com estes filtros.</div>`;
    return;
  }
  const sorted = [...castles].sort((a, b) => a.name.localeCompare(b.name, "pt"));
  container.innerHTML = sorted
    .map((c) => {
      const visited = Storage.isVisited(c.id);
      const thumb = c.image ? `style="background-image:url('${c.image}')"` : "";
      const yearStr = c.year ? c.year : "?";
      return `
        <div class="list-item" data-id="${c.id}" data-lat="${c.lat}" data-lng="${c.lng}">
          <div class="thumb" ${thumb}></div>
          <div class="info">
            <div class="name">${c.name}</div>
            <div class="meta">${c.district || ""} · ${yearStr}</div>
          </div>
          ${visited ? '<span class="visited-dot" title="Visitado"></span>' : ""}
        </div>
      `;
    })
    .join("");

  container.querySelectorAll(".list-item").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.id;
      const lat = parseFloat(el.dataset.lat);
      const lng = parseFloat(el.dataset.lng);
      map.flyTo([lat, lng], 13, { duration: 0.6 });
      const marker = markerById.get(id);
      if (marker) {
        marker.openTooltip();
      }
    });
  });
}

function updateStats() {
  document.getElementById("stat-total").textContent = ALL_CASTLES.length;
  document.getElementById("stat-visited").textContent = Storage.visitedCount();
}

async function init() {
  initMap();
  const res = await fetch("data/castles.json");
  ALL_CASTLES = await res.json();

  for (const castle of ALL_CASTLES) {
    markerById.set(castle.id, buildMarker(castle));
  }

  populateDistrictFilter();
  applyFilters();
  updateStats();

  document.getElementById("search-input").addEventListener("input", (e) => {
    state.search = e.target.value.trim();
    applyFilters();
  });

  document.getElementById("district-filter").addEventListener("change", (e) => {
    state.district = e.target.value;
    applyFilters();
  });

  const visitedChip = document.getElementById("visited-filter");
  visitedChip.addEventListener("click", () => {
    state.onlyVisited = !state.onlyVisited;
    visitedChip.classList.toggle("active", state.onlyVisited);
    applyFilters();
  });

  window.addEventListener("visited-changed", () => {
    refreshMarkerStyles();
    updateStats();
    applyFilters();
  });

  window.addEventListener("theme-changed", refreshMarkerStyles);

  window.addEventListener("storage", (e) => {
    if (e.key === "castelos:visited") {
      refreshMarkerStyles();
      updateStats();
      applyFilters();
    }
  });
}

init();
