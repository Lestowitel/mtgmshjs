
const gallery = document.getElementById("gallery");
const search = document.getElementById("search");
const colorFilter = document.getElementById("colorFilter");
const sourceFilter = document.getElementById("sourceFilter");

let decks = [];
let selectedId = null;
let scryfallCards = [];

const colors = {
  White: {
    art: "#a89a70",
    glow: "#e6d9a2",
    symbol: "☀"
  },
  Blue: {
    art: "#285c91",
    glow: "#5c9edb",
    symbol: "◈"
  },
  Black: {
    art: "#493c50",
    glow: "#94719d",
    symbol: "☾"
  },
  Red: {
    art: "#9c382d",
    glow: "#e36c40",
    symbol: "🔥"
  },
  Green: {
    art: "#356b46",
    glow: "#80b76d",
    symbol: "❖"
  },
  Multicolor: {
    art: "#76613c",
    glow: "#d8b46a",
    symbol: "✦"
  }
};


// ==========================================
// 1. COLOR AND IMAGE HELPERS
// ==========================================

function getThemeStyle(deck) {
  return colors[deck.color] || colors.Multicolor;
}

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


// ==========================================
// 2. LOAD IMAGES FROM SCRYFALL
// ==========================================

async function loadScryfall() {
  try {
    const response = await fetch(
      "https://api.scryfall.com/cards/search?q=set%3Afmsc&unique=prints"
    );

    if (!response.ok) {
      throw new Error("Scryfall returned " + response.status);
    }

    let data = await response.json();

    scryfallCards = data.data || [];

    while (data.has_more && data.next_page) {
      await new Promise(resolve => setTimeout(resolve, 100));

      const pageResponse = await fetch(data.next_page);

      if (!pageResponse.ok) break;

      data = await pageResponse.json();

      scryfallCards.push(...(data.data || []));
    }

    console.log(
      "Scryfall cards found:",
      scryfallCards.length
    );

  } catch (error) {
    console.warn(
      "Scryfall images unavailable:",
      error
    );

    scryfallCards = [];
  }
}


// ==========================================
// 3. FIND THEME CARD IMAGE
// ==========================================

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

  return (
    card.image_uris?.normal ||
    card.image_uris?.large ||
    card.card_faces?.[0]?.image_uris?.normal ||
    null
  );
}


// ==========================================
// 4. LOCAL STORAGE - SAVE CUSTOM TAGS
// ==========================================

function loadSavedTags() {
  try {
    const savedTags = JSON.parse(
      localStorage.getItem("marvelJumpstartTags") || "{}"
    );

    decks.forEach(deck => {
      if (
        Array.isArray(savedTags[deck.id]) &&
        savedTags[deck.id].every(tag => typeof tag === "string")
      ) {
        deck.tags = savedTags[deck.id];
      }
    });

  } catch (error) {
    console.warn("Unable to load saved tags:", error);
  }
}

function saveTags() {
  try {
    const savedTags = {};

    decks.forEach(deck => {
      savedTags[deck.id] = deck.tags;
    });

    localStorage.setItem(
      "marvelJumpstartTags",
      JSON.stringify(savedTags)
    );

  } catch (error) {
    console.error("Unable to save tags:", error);
    alert("Unable to save tags in this browser.");
  }
}


// ==========================================
// 5. UPDATE TAG SUGGESTIONS
// ==========================================

function updateTagSuggestions() {
  const suggestions = document.getElementById("tagSuggestions");

  if (!suggestions) return;

  const allTags = [
    ...new Set(
      decks.flatMap(deck => deck.tags)
    )
  ].sort((a, b) => a.localeCompare(b));

  suggestions.innerHTML = "";

  allTags.forEach(tag => {
    const option = document.createElement("option");

    option.value = tag;

    suggestions.appendChild(option);
  });
}


// ==========================================
// 6. CLICKABLE TAGS
// ==========================================

function renderDetailTags(deck) {
  const container = document.getElementById("detailTags");

  container.innerHTML = "";

  deck.tags.forEach(tag => {
    const button = document.createElement("button");

    button.className = "tag tag-clickable";
    button.type = "button";
    button.textContent = tag;

    button.title = "Find decks with this tag";

    button.addEventListener("click", () => {
      search.value = tag;

      renderGallery();

      // Scroll to the gallery
      document.querySelector(".gallery-panel")
        .scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
    });

    container.appendChild(button);
  });

  updateTagSuggestions();
}


// ==========================================
// 7. ADD NEW TAG
// ==========================================

function addTag() {
  const input = document.getElementById("newTag");

  const value = input.value.trim();

  const deck = decks.find(item =>
    item.id === selectedId
  );

  if (!deck || !value) return;

  // Avoid duplicate tags
  const alreadyExists = deck.tags.some(tag =>
    tag.toLowerCase() === value.toLowerCase()
  );

  if (alreadyExists) {
    alert("This tag already exists in this deck.");
    input.value = "";
    return;
  }

  // Add the new tag
  deck.tags.push(value);

  // Save in browser
  saveTags();

  // Update everything
  input.value = "";

  renderDetailTags(deck);
  renderGallery();
  renderPairs(deck);
}


// ==========================================
// 8. ADD TAG BUTTON AND ENTER KEY
// ==========================================

const addTagButton = document.getElementById("addTagButton");
const newTagInput = document.getElementById("newTag");

if (addTagButton) {
  addTagButton.addEventListener("click", addTag);
}

if (newTagInput) {
  newTagInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }
  });
}


// ==========================================
// 9. GENERATE GALLERY
// ==========================================

function renderGallery() {
  const query = search.value.toLowerCase().trim();

  const color = colorFilter.value;
  const source = sourceFilter.value;

  const filtered = decks.filter(deck => {

    const matchesName =
      deck.name.toLowerCase().includes(query);

    const matchesTags = deck.tags.some(tag =>
      tag.toLowerCase().includes(query)
    );

    const matchesColor =
      color === "all" || deck.color === color;

    const matchesSource =
      source === "all" || deck.source === source;

    return (
      (matchesName || matchesTags) &&
      matchesColor &&
      matchesSource
    );
  });

  document.getElementById("resultCount").textContent =
    `${filtered.length} themes`;

  gallery.innerHTML = filtered.map(deck => {

    const style = getThemeStyle(deck);

    const image = getCardImage(deck);

    const active =
      deck.id === selectedId ? "active" : "";

    return `
      <button
        class="theme-card ${active}"
        data-id="${deck.id}"
        aria-pressed="${deck.id === selectedId}"
        aria-label="Select ${deck.name}">

        <div
          class="artwork"
          style="--art:${style.art};--glow:${style.glow}">

          ${
            image
              ? `<img src="${image}"
                   alt="${deck.name}"
                   loading="lazy">`
              : `<span class="symbol">${style.symbol}</span>`
          }

        </div>

        <span class="card-name">
          ${deck.name}
        </span>

        <span class="card-color">
          ${deck.color}
        </span>

      </button>
    `;

  }).join("");

  gallery.querySelectorAll(".theme-card")
    .forEach(card => {

      card.addEventListener("click", () => {
        selectDeck(card.dataset.id);
      });

    });
}


// ==========================================
// 10. CALCULATE DECK COMPATIBILITY
// ==========================================

function calculateCompatibility(first, second) {

  const a = first.tags.map(tag =>
    tag.toLowerCase()
  );

  const b = second.tags.map(tag =>
    tag.toLowerCase()
  );

  const shared = a.filter(tag =>
    b.includes(tag)
  );

  const union = new Set([
    ...a,
    ...b
  ]);

  const score = union.size
    ? Math.round(
        shared.length / union.size * 100
      )
    : 0;

  return {
    score,
    shared
  };
}


// ==========================================
// 11. FIND BEST PAIRINGS
// ==========================================

function getBestPairs(deck) {

  return decks

    .filter(other =>
      other.id !== deck.id
    )

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


// ==========================================
// 12. SELECT A DECK
// ==========================================

function selectDeck(id) {

  const deck = decks.find(item =>
    item.id === id
  );

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

  if (image) {

    artwork.innerHTML = `
      <img
        src="${image}"
        alt="${deck.name}"
        class="detail-card-image">

      <span id="detailColorLabel">
        ${deck.color}
      </span>
    `;

  } else {

    artwork.innerHTML = `
      <span id="detailSymbol">
        ${style.symbol}
      </span>

      <span id="detailColorLabel">
        ${deck.color}
      </span>
    `;

  }

  document.getElementById("detailSource").textContent =
    deck.source === "booster"
      ? "JUMPSTART BOOSTER"
      : "BEGINNER BOX";

  document.getElementById("detailName").textContent =
    deck.name;

  document.getElementById("detailColor").textContent =
    deck.color.toUpperCase();

  // Render clickable tags
  renderDetailTags(deck);

  // Render pairings
  renderPairs(deck);
}


// ==========================================
// 13. RENDER BEST PAIRINGS
// ==========================================

function renderPairs(deck) {

  const pairs = getBestPairs(deck);

  const container = document.getElementById("pairings");

  container.innerHTML = pairs.map((pair, index) => {

    const sharedText = pair.shared.length
      ? `Shared tags: ${pair.shared.join(", ")}`
      : "No shared tags";

    return `
      <div class="pair-card">

        <div class="pair-top">

          <span>
            ${index + 1}. ${pair.deck.name}
          </span>

          <span class="score">
            ${pair.score}%
          </span>

        </div>

        <div class="score-bar">

          <div
            class="score-fill"
            style="width:${pair.score}%">
          </div>

        </div>

        <div class="pair-reason">
          ${sharedText}
        </div>

      </div>
    `;

  }).join("");
}


// ==========================================
// 14. SEARCH AND FILTER EVENTS
// ==========================================

search.addEventListener("input", renderGallery);

colorFilter.addEventListener("change", renderGallery);

sourceFilter.addEventListener("change", renderGallery);


// ==========================================
// 15. INITIALIZE WEBSITE
// ==========================================

async function init() {

  try {

    const response = await fetch("./decks.json");

    if (!response.ok) {
      throw new Error("Cannot load decks.json");
    }

    decks = await response.json();

    // Load custom tags saved in this browser
    loadSavedTags();

    // Update theme counter
    document.getElementById("totalCount").textContent =
      decks.length;

    // Show themes immediately
    renderGallery();

    // Update tag suggestions
    updateTagSuggestions();

    // Load official card images
    await loadScryfall();

    // Refresh gallery with images
    renderGallery();

    if (decks.length !== 61) {
      console.warn(
        "Expected 61 themes, found:",
        decks.length
      );
    }

    console.log("Marvel Jumpstart loaded successfully!");

  } catch (error) {

    console.error("Website initialization error:", error);

    gallery.innerHTML = `
      <p>
        Unable to load themes.
        Check that decks.json is in the project root.
      </p>
    `;

  }
}


// Start everything
init();
