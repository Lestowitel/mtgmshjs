
const gallery = document.getElementById("gallery");
const search = document.getElementById("search");
const colorFilter = document.getElementById("colorFilter");
const sourceFilter = document.getElementById("sourceFilter");

let decks = [];
let selectedId = null;
let scryfallCards = [];

const colors = {
  White: { art: "#a89a70", glow: "#e6d9a2", symbol: "☀" },
  Blue: { art: "#285c91", glow: "#5c9edb", symbol: "◈" },
  Black: { art: "#493c50", glow: "#94719d", symbol: "☾" },
  Red: { art: "#9c382d", glow: "#e36c40", symbol: "🔥" },
  Green: { art: "#356b46", glow: "#80b76d", symbol: "❖" },
  Multicolor: { art: "#76613c", glow: "#d8b46a", symbol: "✦" }
};

function getThemeStyle(deck) {
  return colors[deck.color] || colors.Multicolor;
}

// Normalize names to compare theme titles
function normalizeName(name) {
  return name.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function cleanThemeName(name) {
  return normalizeName(name)
    .replace(/themecard/g, "")
    .replace(/theme/g, "")
    .replace(/card/g, "");
}

// Load the 61 official theme cards from Scryfall
async function loadScryfall() {
  try {
    const response = await fetch(
      "https://api.scryfall.com/cards/search?q=set%3Afmsc&unique=prints"
    );

    if (!response.ok) {
      throw new Error("Scryfall returned " + response.status);
    }

    const data = await response.json();
    scryfallCards = data.data || [];

    let nextPage = data.next_page;

    while (data.has_more && nextPage) {
      await new Promise(resolve => setTimeout(resolve, 100));

      const pageResponse = await fetch(nextPage);
      if (!pageResponse.ok) break;

      const pageData = await pageResponse.json();
      scryfallCards.push(...pageData.data);
      nextPage = pageData.next_page;
      
      if (!pageData.has_more) break;
    }

    console.log("Scryfall cards found:", scryfallCards.length);

  } catch (error) {
    console.warn("Scryfall images unavailable:", error);
    scryfallCards = [];
  }
}

// Find the image belonging to a theme
function getCardImage(deck) {
  const target = cleanThemeName(deck.name);

  let card = scryfallCards.find(item =>
    cleanThemeName(item.name) === target
  );

  if (!card) {
    card = scryfallCards.find(item =>
      cleanThemeName(item.name).startsWith(target)
    );
  }

  if (!card) return null;

  return card.image_uris?.normal ||
    card.image_uris?.large ||
    card.card_faces?.[0]?.image_uris?.normal ||
    null;
}

// Generate the gallery
function renderGallery() {
  const query = search.value.toLowerCase().trim();
  const color = colorFilter.value;
  const source = sourceFilter.value;

  const filtered = decks.filter(deck => {
    const matchesName = deck.name.toLowerCase().includes(query);
    const matchesTags = deck.tags.some(tag =>
      tag.toLowerCase().includes(query)
    );

    return (matchesName || matchesTags) &&
      (color === "all" || deck.color === color) &&
      (source === "all" || deck.source === source);
  });

  document.getElementById("resultCount").textContent =
    `${filtered.length} themes`;

  gallery.innerHTML = filtered.map(deck => {
    const style = getThemeStyle(deck);
    const image = getCardImage(deck);
    const active = deck.id === selectedId ? "active" : "";

    return `
      <button class="theme-card ${active}"
        data-id="${deck.id}"
        aria-pressed="${deck.id === selectedId}">

        <div class="artwork"
          style="--art:${style.art};--glow:${style.glow}">

          ${
            image
              ? `<img src="${image}" alt="${deck.name}" loading="lazy">`
              : `<span class="symbol">${style.symbol}</span>`
          }

        </div>

        <span class="card-name">${deck.name}</span>
        <span class="card-color">${deck.color}</span>

      </button>
    `;
  }).join("");

  gallery.querySelectorAll(".theme-card").forEach(card => {
    card.addEventListener("click", () => {
      selectDeck(card.dataset.id);
    });
  });
}

// Calculate shared tag compatibility
function calculateCompatibility(first, second) {
  const a = first.tags.map(t => t.toLowerCase());
  const b = second.tags.map(t => t.toLowerCase());

  const shared = a.filter(tag => b.includes(tag));
  const union = new Set([...a, ...b]);

  return {
    score: Math.round(shared.length / union.size * 100),
    shared
  };
}

function getBestPairs(deck) {
  return decks
    .filter(other => other.id !== deck.id)
    .map(other => ({
      deck: other,
      ...calculateCompatibility(deck, other)
    }))
    .sort((a, b) =>
      b.score - a.score ||
      a.deck.name.localeCompare(b.deck.name)
    )
    .slice(0, 3);
}

// Show selected deck
function selectDeck(id) {
  const deck = decks.find(item => item.id === id);
  if (!deck) return;

  selectedId = id;
  renderGallery();

  document.getElementById("emptyState").hidden = true;
  document.getElementById("deckDetails").hidden = false;

  const style = getThemeStyle(deck);
  const artwork = document.getElementById("detailArtwork");
  const image = getCardImage(deck);

  artwork.style.setProperty("--art", style.art);
  artwork.style.setProperty("--glow", style.glow);

  artwork.innerHTML = image
    ? `<img src="${image}" alt="${deck.name}"
         class="detail-card-image">
       <span id="detailColorLabel">${deck.color}</span>`
    : `<span id="detailSymbol">${style.symbol}</span>
       <span id="detailColorLabel">${deck.color}</span>`;

  document.getElementById("detailSource").textContent =
    deck.source === "booster"
      ? "JUMPSTART BOOSTER"
      : "BEGINNER BOX";

  document.getElementById("detailName").textContent = deck.name;
  document.getElementById("detailColor").textContent =
    deck.color.toUpperCase();

  document.getElementById("detailTags").innerHTML =
    deck.tags.map(tag => `<span class="tag">${tag}</span>`).join("");

  renderPairs(deck);
}

function renderPairs(deck) {
  const pairs = getBestPairs(deck);

  document.getElementById("pairings").innerHTML =
    pairs.map((pair, index) => `
      <div class="pair-card">
        <div class="pair-top">
          <span>${index + 1}. ${pair.deck.name}</span>
          <span class="score">${pair.score}%</span>
        </div>

        <div class="score-bar">
          <div class="score-fill"
            style="width:${pair.score}%"></div>
        </div>

        <div class="pair-reason">
          Shared tags: ${pair.shared.join(", ") || "None"}
        </div>
      </div>
    `).join("");
}

search.addEventListener("input", renderGallery);
colorFilter.addEventListener("change", renderGallery);
sourceFilter.addEventListener("change", renderGallery);

// Start the website
async function init() {
  try {
    const response = await fetch("./decks.json");

    if (!response.ok) {
      throw new Error("Cannot load decks.json");
    }

    decks = await response.json();

    document.getElementById("totalCount").textContent = decks.length;

    // First show all themes, even without images
    renderGallery();

    // Then load the real images
    await loadScryfall();

    // Refresh gallery with images
    renderGallery();

    if (decks.length !== 61) {
      console.warn("Expected 61 themes:", decks.length);
    }

  } catch (error) {
    console.error("Website error:", error);
    gallery.innerHTML = "<p>Error loading decks.json. Check your files.</p>";
  }
}

init();
