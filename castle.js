function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

async function updateHeaderStats() {
  const res = await fetch("data/castles.json");
  const all = await res.json();
  document.getElementById("stat-total").textContent = all.length;
  document.getElementById("stat-visited").textContent = Storage.visitedCount();
}

function renderVisitButton(castle) {
  const visited = Storage.isVisited(castle.id);
  return `
    <button class="visit-btn ${visited ? "active" : ""}" id="visit-btn">
      <span id="visit-icon">${visited ? "✓" : "☆"}</span>
      <span id="visit-label">${visited ? "Visitado" : "Marcar como visitado"}</span>
    </button>
  `;
}

// Tries the castle's own local photo first (images/<slug>/cover.jpg), falls
// back to the Wikipedia image, and finally to a placeholder icon.
window.__heroImgError = function (img) {
  const fallback = img.dataset.fallback;
  if (fallback && img.src !== fallback) {
    img.onerror = () => {
      img.parentElement.outerHTML = '<div class="hero"><div class="hero-placeholder">🏰</div></div>';
    };
    img.src = fallback;
  } else {
    img.parentElement.outerHTML = '<div class="hero"><div class="hero-placeholder">🏰</div></div>';
  }
};

function renderHero(castle) {
  const localSrc = `images/${castle.imageDir}/cover.jpg`;
  const fallback = castle.image || "";
  return `
    <div class="hero">
      <img src="${localSrc}" data-fallback="${escapeHtml(fallback)}" alt="${escapeHtml(castle.name)}" loading="lazy" onerror="window.__heroImgError(this)" />
    </div>
  `;
}

function renderFactList(rows) {
  return `
    <div class="fact-list">
      ${rows
        .map(
          ([lbl, val]) => `
        <div class="fact-row">
          <span class="lbl">${lbl}</span>
          <span class="val">${escapeHtml(String(val))}</span>
        </div>`
        )
        .join("")}
    </div>
  `;
}

function renderInfoSection(castle) {
  const rows = [
    ["Distrito", castle.district || "Desconhecido"],
    ["Localização", castle.location || "Desconhecida"],
    ["Ano de construção", castle.year ? castle.year : "Desconhecido"],
  ];
  return `
    ${renderFactList(rows)}
    ${
      castle.wikipedia
        ? `<div class="link-row"><a class="wiki-link" href="${castle.wikipedia}" target="_blank" rel="noopener">Ler mais na Wikipédia →</a></div>`
        : ""
    }
  `;
}

function renderHoursSection(castle) {
  if (!castle.hours && !castle.price) {
    return `<div class="fact-empty">Informação não disponível.</div>`;
  }
  const rows = [
    ["Horário", castle.hours || "Desconhecido"],
    ["Bilhete", castle.price || "Desconhecido"],
  ];
  return renderFactList(rows);
}

function renderLocationSection(castle) {
  const embedSrc = `https://www.google.com/maps?q=${castle.lat},${castle.lng}&output=embed`;
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${castle.lat},${castle.lng}`;
  return `
    ${renderFactList([["Coordenadas", `${castle.lat.toFixed(4)}, ${castle.lng.toFixed(4)}`]])}
    <iframe class="map-embed" src="${embedSrc}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Mapa de ${escapeHtml(castle.name)}"></iframe>
    <div class="link-row">
      <a class="wiki-link" href="${directionsHref}" target="_blank" rel="noopener">Levar-me até aqui →</a>
    </div>
  `;
}

async function renderPhotoSection(castle) {
  const photos = await Storage.getPhotos(castle.id);
  const container = document.getElementById("photo-grid");
  if (!container) return;

  container.innerHTML =
    `<label class="add-photo-tile" for="photo-input">
      <span class="plus">+</span>
      <span>Adicionar foto</span>
    </label>` +
    photos
      .map(
        (p) => `
      <div class="photo-tile" data-photo-id="${p.id}">
        <img src="${p.dataUrl}" alt="Foto de ${escapeHtml(castle.name)}" data-full="${p.dataUrl}" />
        <button class="del-btn" data-photo-id="${p.id}" title="Remover foto">&times;</button>
      </div>`
      )
      .join("");

  container.querySelectorAll("img[data-full]").forEach((img) => {
    img.addEventListener("click", () => openLightbox(img.dataset.full));
  });

  container.querySelectorAll(".del-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.photoId);
      await Storage.deletePhoto(id);
      toast("Foto removida.");
      renderPhotoSection(castle);
    });
  });

  const caption = document.getElementById("photo-caption");
  if (caption) {
    caption.textContent = photos.length
      ? `${photos.length} foto${photos.length > 1 ? "s" : ""} guardada${photos.length > 1 ? "s" : ""} neste dispositivo.`
      : "Ainda sem fotos. As fotos ficam guardadas neste dispositivo/navegador.";
  }
}

function openLightbox(src) {
  document.getElementById("lightbox-img").src = src;
  document.getElementById("lightbox").classList.add("open");
}

function closeLightbox() {
  document.getElementById("lightbox").classList.remove("open");
  document.getElementById("lightbox-img").src = "";
}

async function render(castle) {
  document.title = `${castle.name} — Castelos de Portugal`;

  const yearBadge = castle.year
    ? `<span class="badge year">🗓 ${castle.year}</span>`
    : `<span class="badge">🗓 Ano desconhecido</span>`;

  document.getElementById("content").innerHTML = `
    ${renderHero(castle)}
    <div class="detail-title-row">
      <h1>${escapeHtml(castle.name)}</h1>
      ${renderVisitButton(castle)}
    </div>
    <div class="badges">
      ${castle.district ? `<span class="badge">📍 ${escapeHtml(castle.district)}</span>` : ""}
      ${yearBadge}
    </div>
    <div class="detail-body">${escapeHtml(castle.extract || castle.summary || "Sem descrição disponível.")}</div>

    <div class="detail-section">
      <h2>Informação</h2>
      ${renderInfoSection(castle)}
    </div>

    <div class="detail-section">
      <h2>Horário &amp; Bilhete</h2>
      ${renderHoursSection(castle)}
    </div>

    <div class="detail-section">
      <h2>Localização</h2>
      ${renderLocationSection(castle)}
    </div>

    <div class="detail-section">
      <h2>As Minhas Memórias</h2>
      <input type="file" id="photo-input" accept="image/*" multiple style="display:none" />
      <div class="photo-grid" id="photo-grid"></div>
      <div class="photo-caption-row" id="photo-caption"></div>
    </div>
  `;

  document.getElementById("photo-input").addEventListener("change", async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    for (const file of files) {
      await Storage.addPhoto(castle.id, file);
    }
    toast(`${files.length} foto${files.length > 1 ? "s" : ""} adicionada${files.length > 1 ? "s" : ""}.`);
    e.target.value = "";
    renderPhotoSection(castle);
  });

  await renderPhotoSection(castle);
}

function wireVisitButtonDelegate(castle) {
  document.getElementById("content").addEventListener("click", (e) => {
    const btn = e.target.closest("#visit-btn");
    if (!btn) return;
    const visited = Storage.toggleVisited(castle.id);
    btn.classList.toggle("active", visited);
    btn.querySelector("#visit-icon").textContent = visited ? "✓" : "☆";
    btn.querySelector("#visit-label").textContent = visited ? "Visitado" : "Marcar como visitado";
    toast(visited ? `${castle.name} marcado como visitado!` : "Marca de visitado removida.");
    updateHeaderStats();
  });
}

async function init() {
  const id = qs("id");
  const res = await fetch("data/castles.json");
  const all = await res.json();
  const castle = all.find((c) => c.id === id);

  if (!castle) {
    document.getElementById("content").innerHTML = `<p>Castelo não encontrado. <a href="index.html">Voltar ao mapa</a>.</p>`;
    return;
  }

  await render(castle);
  wireVisitButtonDelegate(castle);
  await updateHeaderStats();

  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
  document.getElementById("lightbox").addEventListener("click", (e) => {
    if (e.target.id === "lightbox") closeLightbox();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });
}

init();
