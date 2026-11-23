
const gallery = document.getElementById("gallery");
const search = document.getElementById("search");
const colorFilter = document.getElementById("colorFilter");
const sourceFilter = document.getElementById("sourceFilter");

let decks = [];
let selectedId = null;

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

function renderGallery() {
  const query = search.value.toLowerCase().trim();
  const color = colorFilter.value;
  const source = sourceFilter.value;

  const filtered = decks.filter(deck => {
    const matchesName = deck.name.toLowerCase().includes(query);
    const matchesTags = deck.tags.some(tag =>
      tag.toLowerCase().includes(query)
    );
    const matchesColor = color === "all" || deck.color === color;
    const matchesSource = source === "all" || deck.source === source;

    return (matchesName || matchesTags) &&
      matchesColor && matchesSource;
  });

  document.getElementById("resultCount").textContent =
    `${filtered.length} themes`;

  gallery.innerHTML = filtered.map(deck => {
    const style = getThemeStyle(deck);
    const active = deck.id === selectedId ? "active" : "";

    return `
      <button class="theme-card ${active}"
        data-id="${deck.id}"
        aria-label="Select ${deck.name}"
        aria-pressed="${deck.id === selectedId}">
        <div class="artwork"
          style="--art:${style.art};--glow:${style.glow}">
          <span class="art-label">MARVEL</span>
          <span class="symbol">${style.symbol}</span>
          <span class="art-label">JUMPSTART</span>
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

function calculateCompatibility(first, second) {
  const a = first.tags.map(t => t.toLowerCase());
  const b = second.tags.map(t => t.toLowerCase());

  const shared = a.filter(tag => b.includes(tag));
  const union = new Set([...a, ...b]);

  // Jaccard similarity: shared tags / unique tags
  const score = Math.round(
    shared.length / union.size * 100
  );

  return { score, shared };
}

function getBestPairs(deck) {
  return decks
    .filter(other => other.id !== deck.id)
    .map(other => ({
      deck: other,
      ...calculateCompatibility(deck, other)
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.deck.name.localeCompare(b.deck.name);
    })
    .slice(0, 3);
}

function selectDeck(id) {
  const deck = decks.find(item => item.id === id);
  if (!deck) return;

  selectedId = id;
  renderGallery();

  document.getElementById("emptyState").hidden = true;
  document.getElementById("deckDetails").hidden = false;

  const style = getThemeStyle(deck);
  const artwork = document.getElementById("detailArtwork");

  artwork.style.setProperty("--art", style.art);
  artwork.style.setProperty("--glow", style.glow);

  document.getElementById("detailSymbol").textContent = style.symbol;
  document.getElementById("detailColorLabel").textContent = deck.color;
  document.getElementById("detailSource").textContent =
    deck.source === "booster" ? "JUMPSTART BOOSTER" : "BEGINNER BOX";

  document.getElementById("detailName").textContent = deck.name;
  document.getElementById("detailColor").textContent =
    deck.color.toUpperCase();

  document.getElementById("detailTags").innerHTML =
    deck.tags.map(tag =>
      `<span class="tag">${tag}</span>`
    ).join("");

  renderPairs(deck);
}

function renderPairs(deck) {
  const pairs = getBestPairs(deck);
  const container = document.getElementById("pairings");

  container.innerHTML = pairs.map((pair, index) => {
    const style = getThemeStyle(pair.deck);

    const sharedText = pair.shared.length
      ? `Shared tags: ${pair.shared.join(", ")}`
      : "No shared tags";

    return `
      <div class="pair-card">
        <div class="pair-top">
          <span>${index + 1}. ${pair.deck.name}</span>
          <span class="score">${pair.score}%</span>
        </div>
        <div class="score-bar">
          <div class="score-fill"
            style="width:${pair.score}%"></div>
        </div>
        <div class="pair-reason">${sharedText}</div>
        <div class="pair-reason" style="margin-top:5px;color:${style.glow}">
          ${pair.deck.color}
        </div>
      </div>
    `;
  }).join("");
}

search.addEventListener("input", renderGallery);
colorFilter.addEventListener("change", renderGallery);
sourceFilter.addEventListener("change", renderGallery);

async function init() {
  try {
    const response = await fetch("./decks.json");

    if (!response.ok) {
      throw new Error("Could not load decks.json");
    }

    decks = await response.json();

    document.getElementById("totalCount").textContent = decks.length;

    renderGallery();

    if (decks.length !== 61) {
      console.warn("Expected 61 themes, found:", decks.length);
    }
  } catch (error) {
    console.error(error);
    gallery.innerHTML = `
      <p>Unable to load the themes.
      Check that decks.json is in the project root.</p>
    `;
  }
}

init();
