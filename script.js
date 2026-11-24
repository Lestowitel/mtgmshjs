
// ==========================================
// MARVEL JUMPSTART
// SCRIPT.JS - PART 1/3
// ==========================================

const gallery = document.getElementById("gallery");
const search = document.getElementById("search");
const colorFilter = document.getElementById("colorFilter");
const sourceFilter = document.getElementById("sourceFilter");

let decks = [];
let selectedId = null;
let scryfallCards = [];

let combination = {
  deck1: null,
  deck2: null
};

const HISTORY_KEY = "marvelJumpstartHistory";
const TAGS_KEY = "marvelJumpstartTags";

const OFFICIAL_URL =
  "https://magic.wizards.com/en/news/announcements/marvel-super-heroes-jumpstart-booster-themes";


// ==========================================
// 1. COLORS
// ==========================================

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
// 2. STRATEGIC SYNERGIES
// ==========================================

// These connections allow the website to recognize
// strategic interactions even when two decks
// don't share many identical tags.

const synergyGroups = [

  {
    name: "Lifegain",
    tags: ["lifegain", "life gain"],
    weight: 5,
    reason: "Both strategies benefit from gaining life."
  },

  {
    name: "ETB",
    tags: ["etb", "blink", "value"],
    weight: 3,
    reason: "Strong enter-the-battlefield and value synergies."
  },

  {
    name: "Artifacts",
    tags: ["artifacts", "equipment"],
    weight: 3,
    reason: "Both strategies can benefit from artifact synergies."
  },

  {
    name: "Tokens",
    tags: ["tokens", "go wide"],
    weight: 3,
    reason: "Both strategies can generate or exploit multiple creatures."
  },

  {
    name: "Counters",
    tags: ["counters", "+1/+1 counters"],
    weight: 3,
    reason: "Both strategies can take advantage of counters."
  },

  {
    name: "Aggression",
    tags: ["aggro", "combat", "haste"],
    weight: 2,
    reason: "Both strategies can apply early combat pressure."
  },

  {
    name: "Control",
    tags: ["control", "removal", "protection"],
    weight: 2,
    reason: "Both strategies can interact with and control the board."
  },

  {
    name: "Graveyard",
    tags: ["graveyard", "recursion", "sacrifice"],
    weight: 3,
    reason: "Both strategies can exploit the graveyard."
  },

  {
    name: "Ramp",
    tags: ["ramp", "big creatures"],
    weight: 2,
    reason: "Both strategies can benefit from accelerated resources."
  },

  {
    name: "Card Advantage",
    tags: ["card draw", "value"],
    weight: 2,
    reason: "Both strategies can generate additional value."
  },

  {
    name: "Flying",
    tags: ["flying", "evasion"],
    weight: 2,
    reason: "Both strategies can exploit evasive creatures."
  }

];


// ==========================================
// 3. GENERAL HELPERS
// ==========================================

function getThemeStyle(deck) {
  return colors[deck.color] || colors.Multicolor;
}


function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
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


function normalizeTag(tag) {
  return String(tag || "")
    .trim()
    .toLowerCase();
}


function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}


function getDeck(id) {
  return decks.find(deck => deck.id === id) || null;
}


// ==========================================
// 4. LOAD IMAGES FROM SCRYFALL
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
// 5. FIND THEME CARD IMAGE
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
// 6. LOCAL STORAGE - CUSTOM TAGS
// ==========================================

function loadSavedTags() {

  try {

    const savedTags = JSON.parse(
      localStorage.getItem(TAGS_KEY) || "{}"
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

    console.warn(
      "Unable to load saved tags:",
      error
    );

  }

}


function saveTags() {

  try {

    const savedTags = {};

    decks.forEach(deck => {
      savedTags[deck.id] = deck.tags;
    });

    localStorage.setItem(
      TAGS_KEY,
      JSON.stringify(savedTags)
    );

  } catch (error) {

    console.error(
      "Unable to save tags:",
      error
    );

    alert("Unable to save tags in this browser.");

  }

}


// ==========================================
// 7. TAG SUGGESTIONS
// ==========================================

function updateTagSuggestions() {

  const suggestions =
    document.getElementById("tagSuggestions");

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
// 8. STRATEGIC COMPATIBILITY
// ==========================================

// Shared tags and strategic synergies are evaluated
// separately, so decks can work well together
// without having identical tags.

function calculateCompatibility(first, second) {

  if (!first || !second) {

    return {
      score: 0,
      shared: [],
      synergies: [],
      reasons: []
    };

  }

  const a = first.tags.map(normalizeTag);
  const b = second.tags.map(normalizeTag);

  // Identical tags

  const shared = [...new Set(
    a.filter(tag => b.includes(tag))
  )];

  // Shared strategic groups

  const synergies = [];

  synergyGroups.forEach(group => {

    const firstHas = group.tags.some(tag =>
      a.includes(tag)
    );

    const secondHas = group.tags.some(tag =>
      b.includes(tag)
    );

    if (firstHas && secondHas) {

      synergies.push(group);

    }

  });

  // Weighted score

  const sharedWeight = shared.reduce((total, tag) => {

    const isColor = [
      "white",
      "blue",
      "black",
      "red",
      "green",
      "multicolor"
    ].includes(tag);

    // Color identity should not dominate similarity.

    return total + (isColor ? 0.5 : 2);

  }, 0);

  const synergyWeight = synergies.reduce(
    (total, group) => total + group.weight,
    0
  );

  const totalScore = sharedWeight + synergyWeight;

  const maxPossible = 22;

  const score = Math.min(
    99,
    Math.round(
      totalScore / maxPossible * 100
    )
  );

  const reasons = [
    ...synergies.map(group => group.reason)
  ];

  if (shared.length) {

    reasons.unshift(
      "Shared tags: " + shared.join(", ")
    );

  }

  if (!reasons.length) {

    reasons.push(
      "Different strategies with potential complementary roles."
    );

  }

  return {
    score,
    shared,
    synergies,
    reasons
  };

}


// ==========================================
// 9. FIND MOST SIMILAR THEMES
// ==========================================

function getBestPairs(deck) {

  return decks

    .filter(other => other.id !== deck.id)

    .map(other => ({

      deck: other,

      ...calculateCompatibility(deck, other)

    }))

    .sort((a, b) =>

      b.score - a.score ||

      b.synergies.length - a.synergies.length ||

      a.deck.name.localeCompare(b.deck.name)

    )

    .slice(0, 3);

}


// ==========================================
// END OF PART 1
// CONTINUE WITH PART 2
// ==========================================

// ==========================================
// MARVEL JUMPSTART
// SCRIPT.JS - PART 2/3
// ==========================================


// ==========================================
// 10. RENDER GALLERY
// ==========================================

function renderGallery() {

  if (!gallery) return;

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
        data-id="${escapeHTML(deck.id)}"
        aria-pressed="${deck.id === selectedId}"
        aria-label="Select ${escapeHTML(deck.name)}">

        <div
          class="artwork"
          style="--art:${style.art};--glow:${style.glow}">

          ${
            image
              ? `<img
                   src="${escapeHTML(image)}"
                   alt="${escapeHTML(deck.name)}"
                   loading="lazy">`
              : `<span class="symbol">${style.symbol}</span>`
          }

        </div>

        <span class="card-name">
          ${escapeHTML(deck.name)}
        </span>

        <span class="card-color">
          ${escapeHTML(deck.color)}
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
// 11. RENDER CLICKABLE TAGS
// ==========================================

function renderDetailTags(deck) {

  const container =
    document.getElementById("detailTags");

  if (!container) return;

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
// 12. ADD CUSTOM TAG
// ==========================================

function addTag() {

  const input = document.getElementById("newTag");

  const value = input.value.trim();

  const deck = getDeck(selectedId);

  if (!deck || !value) return;

  const alreadyExists = deck.tags.some(tag =>
    tag.toLowerCase() === value.toLowerCase()
  );

  if (alreadyExists) {

    alert("This tag already exists in this theme.");

    input.value = "";

    return;

  }

  deck.tags.push(value);

  saveTags();

  input.value = "";

  renderDetailTags(deck);

  renderGallery();

  renderPairs(deck);

}


// ==========================================
// 13. TAG BUTTON EVENTS
// ==========================================

const addTagButton =
  document.getElementById("addTagButton");

const newTagInput =
  document.getElementById("newTag");

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
// 14. SELECT THEME
// ==========================================

function selectDeck(id) {

  const deck = getDeck(id);

  if (!deck) return;

  selectedId = id;

  renderGallery();

  document.getElementById("emptyState").hidden = true;

  document.getElementById("deckDetails").hidden = false;

  const style = getThemeStyle(deck);

  const artwork =
    document.getElementById("detailArtwork");

  const image = getCardImage(deck);

  artwork.style.setProperty("--art", style.art);

  artwork.style.setProperty("--glow", style.glow);

  if (image) {

    artwork.innerHTML = `

      <img
        src="${escapeHTML(image)}"
        alt="${escapeHTML(deck.name)}"
        class="detail-card-image">

      <span id="detailColorLabel">
        ${escapeHTML(deck.color)}
      </span>

    `;

  } else {

    artwork.innerHTML = `

      <span id="detailSymbol">
        ${style.symbol}
      </span>

      <span id="detailColorLabel">
        ${escapeHTML(deck.color)}
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

  // Render tags

  renderDetailTags(deck);

// Render strategic similarities

renderPairs(deck);
// Automatically show selected deck details
document.getElementById("detailPanel")
  ?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
// Render buttons to add theme to either deck slot

renderBuilderButtons(deck);

// Update deck builder selection state

updateBuilderSelection();

}


// ==========================================
// 15. RENDER MOST SIMILAR
// ==========================================

function renderPairs(deck) {

  const pairs = getBestPairs(deck);

  const container =
    document.getElementById("pairings");

  if (!container) return;

  container.innerHTML = pairs.map((pair, index) => {

    const sharedText = pair.shared.length
      ? `Shared tags: ${pair.shared.map(escapeHTML).join(", ")}`
      : "No identical tags";

    const synergyText = pair.synergies.length
      ? pair.synergies.map(group =>
          escapeHTML(group.name)
        ).join(" · ")
      : "Complementary strategies";

    return `

      <div class="pair-card">

        <div class="pair-top">

          <span>
            ${index + 1}. ${escapeHTML(pair.deck.name)}
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
          <strong>${synergyText}</strong>
          <br>
          ${sharedText}
        </div>

        <button
          type="button"
          class="pair-select-button"
          data-pair-id="${escapeHTML(pair.deck.id)}">

          Add to combination +

        </button>

      </div>

    `;

  }).join("");

  // Allow adding a suggested theme to the builder

  container.querySelectorAll(".pair-select-button")
    .forEach(button => {

      button.addEventListener("click", () => {

        const suggestedDeck = getDeck(button.dataset.pairId);

        if (suggestedDeck) {

          addDeckToBuilder(suggestedDeck.id);

          document.getElementById("deckSlot1")
            .scrollIntoView({
              behavior: "smooth",
              block: "center"
            });

        }

      });

    });

}


// ==========================================
// 16. SEARCH AND FILTER EVENTS
// ==========================================

search.addEventListener("input", renderGallery);

colorFilter.addEventListener("change", renderGallery);

sourceFilter.addEventListener("change", renderGallery);


// ==========================================
// END OF PART 2
// CONTINUE WITH PART 3
// ==========================================

// ==========================================
// MARVEL JUMPSTART
// SCRIPT.JS - PART 3A/3B
// DECK BUILDER AND COMBINATIONS
// ==========================================


// ==========================================
// 17. DECK BUILDER
// ==========================================

function addDeckToBuilder(id, preferredSlot = null) {

  const deck = getDeck(id);

  if (!deck) return;

  if (
    combination.deck1 === id ||
    combination.deck2 === id
  ) {
    alert("This theme is already in your combination.");
    return;
  }

  let slot = preferredSlot;

  if (!slot) {
    if (!combination.deck1) {
      slot = 1;
    } else {
      slot = 2;
    }
  }

  if (slot === 1) {

    if (combination.deck2 === id) {
      combination.deck2 = null;
    }

    combination.deck1 = id;

  } else {

    if (combination.deck1 === id) {
      combination.deck1 = null;
    }

    combination.deck2 = id;

  }

  updateBuilderSelection();
}


// ==========================================
// 18. RENDER DECK SLOTS
// ==========================================

function renderDeckSlot(slotNumber) {

  const container = document.getElementById(
    slotNumber === 1 ? "deckSlot1" : "deckSlot2"
  );

  if (!container) return;

  const id = slotNumber === 1
    ? combination.deck1
    : combination.deck2;

  const deck = getDeck(id);

  if (!deck) {

    container.innerHTML = `
      <div class="deck-slot-empty">
        <span>0${slotNumber}</span>
        <h3>Deck ${slotNumber}</h3>
        <p>Select a theme from the collection</p>
      </div>
    `;

    return;
  }

  const style = getThemeStyle(deck);
  const image = getCardImage(deck);

  container.innerHTML = `
    <div class="selected-deck">

      <div
        class="selected-deck-art"
        style="--art:${style.art};--glow:${style.glow}">

        ${
          image
            ? `<img src="${escapeHTML(image)}"
                    alt="${escapeHTML(deck.name)}">`
            : `<span>${style.symbol}</span>`
        }

      </div>

      <div class="selected-deck-info">

        <span class="eyebrow">DECK 0${slotNumber}</span>

        <h3>${escapeHTML(deck.name)}</h3>

        <p>${escapeHTML(deck.color)}</p>

        <button
          type="button"
          class="remove-deck-button"
          data-slot="${slotNumber}">
          Remove theme ×
        </button>

      </div>

    </div>
  `;

  container.querySelector(".remove-deck-button")
    .addEventListener("click", () => {

      if (slotNumber === 1) {
        combination.deck1 = null;
      } else {
        combination.deck2 = null;
      }

      updateBuilderSelection();

    });

}


// ==========================================
// 19. UPDATE BUILDER
// ==========================================

function updateBuilderSelection() {

  renderDeckSlot(1);
  renderDeckSlot(2);

  const deck1 = getDeck(combination.deck1);
  const deck2 = getDeck(combination.deck2);

  const summary =
    document.getElementById("combinationSummary");

  const copyButton =
    document.getElementById("copyCombination");

  const saveButton =
    document.getElementById("saveCombination");

  const ready = Boolean(deck1 && deck2);

  if (copyButton) copyButton.disabled = !ready;
  if (saveButton) saveButton.disabled = !ready;

  if (!summary) return;

  if (!deck1 && !deck2) {

    summary.textContent =
      "Choose two themes to create a combination.";

  } else if (deck1 && !deck2) {

    summary.textContent =
      `${deck1.name} selected. Choose your second theme.`;

  } else if (!deck1 && deck2) {

    summary.textContent =
      `${deck2.name} selected. Choose your first theme.`;

  } else {

    const compatibility =
      calculateCompatibility(deck1, deck2);

    summary.textContent =
      `${deck1.name} + ${deck2.name} · ${compatibility.score}% similarity`;

  }

}


// ==========================================
// 20. DETAIL PAGE BUILDER BUTTONS
// ==========================================

function renderBuilderButtons(deck) {

  const detailContent =
    document.querySelector(".detail-content");

  if (!detailContent) return;

  let controls =
    document.getElementById("detailBuilderControls");

  if (!controls) {

    controls = document.createElement("div");

    controls.id = "detailBuilderControls";
    controls.className = "detail-builder-controls";

    detailContent.appendChild(controls);

  }

  controls.innerHTML = `

    <h3>ADD TO YOUR COMBINATION</h3>

    <div class="detail-builder-buttons">

      <button
        type="button"
        class="action-button secondary"
        id="addToSlot1">
        Add to Deck 1
      </button>

      <button
        type="button"
        class="action-button secondary"
        id="addToSlot2">
        Add to Deck 2
      </button>

    </div>

  `;

  document.getElementById("addToSlot1")
    .addEventListener("click", () => {

      addDeckToBuilder(deck.id, 1);

      document.getElementById("deckSlot1")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

    });

  document.getElementById("addToSlot2")
    .addEventListener("click", () => {

      addDeckToBuilder(deck.id, 2);

      document.getElementById("deckSlot2")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

    });

}


// ==========================================
// 21. COMBINATION TEXT
// ==========================================

function getCombinationText(deck1, deck2) {

  const compatibility =
    calculateCompatibility(deck1, deck2);

  return `MARVEL JUMPSTART COMBINATION

DECK 1: ${deck1.name}
Color: ${deck1.color}
Source: ${deck1.source === "booster" ? "Jumpstart Booster" : "Beginner Box"}

DECK 2: ${deck2.name}
Color: ${deck2.color}
Source: ${deck2.source === "booster" ? "Jumpstart Booster" : "Beginner Box"}

Similarity: ${compatibility.score}%

Official theme lists:
${OFFICIAL_URL}

Fan-made project. Not affiliated with Wizards of the Coast or Marvel.`;

}


// ==========================================
// 22. COPY COMBINATION
// ==========================================

async function copyCombination() {

  const deck1 = getDeck(combination.deck1);
  const deck2 = getDeck(combination.deck2);

  if (!deck1 || !deck2) return;

  const text = getCombinationText(deck1, deck2);

  try {

    await navigator.clipboard.writeText(text);

    alert("Combination copied successfully!");

  } catch (error) {

    const textarea = document.createElement("textarea");

    textarea.value = text;

    document.body.appendChild(textarea);

    textarea.select();

    try {

      document.execCommand("copy");

      alert("Combination copied successfully!");

    } catch (copyError) {

      alert("Unable to copy. Please copy manually.");

    }

    textarea.remove();

  }

}


// ==========================================
// 23. BUILDER BUTTON EVENTS
// ==========================================

const copyCombinationButton =
  document.getElementById("copyCombination");

if (copyCombinationButton) {

  copyCombinationButton.addEventListener(
    "click",
    copyCombination
  );

}

// ==========================================
// RANDOMIZE TWO DECKS
// ==========================================

const randomizeButton =
  document.getElementById("randomizeCombination");

function randomizeCombination() {

  // Ensure at least two themes are available
  if (decks.length < 2) return;

  // Pick two different random themes
  const shuffledDecks = [...decks];

  for (let i = shuffledDecks.length - 1; i > 0; i--) {

    const j = Math.floor(Math.random() * (i + 1));

    [shuffledDecks[i], shuffledDecks[j]] =
      [shuffledDecks[j], shuffledDecks[i]];

  }

  // Assign the two random decks
  combination.deck1 = shuffledDecks[0].id;
  combination.deck2 = shuffledDecks[1].id;

  // Refresh the entire builder
  updateBuilderSelection();

  // Scroll to the combination
  document.querySelector(".builder-section")
    ?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

}

if (randomizeButton) {

  randomizeButton.addEventListener(
    "click",
    randomizeCombination
  );

}

// ==========================================
// END OF PART 3A
// CONTINUE WITH PART 3B
// ==========================================

// ==========================================
// MARVEL JUMPSTART
// SCRIPT.JS - PART 3B/3
// HISTORY, DAILY CHALLENGE AND INITIALIZATION
// ==========================================


// ==========================================
// 24. COMBINATION HISTORY
// ==========================================

function loadHistory() {

  try {

    const saved = JSON.parse(
      localStorage.getItem(HISTORY_KEY) || "[]"
    );

    if (!Array.isArray(saved)) return [];

    return saved.filter(item =>
      item &&
      typeof item.deck1 === "string" &&
      typeof item.deck2 === "string"
    );

  } catch (error) {

    console.warn("Unable to load history:", error);

    return [];

  }

}


function saveHistory(history) {

  try {

    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(history)
    );

  } catch (error) {

    console.error("Unable to save history:", error);

    alert("Unable to save combination history.");

  }

}


// ==========================================
// 25. SAVE COMBINATION
// ==========================================

function saveCombination() {

  const deck1 = getDeck(combination.deck1);
  const deck2 = getDeck(combination.deck2);

  if (!deck1 || !deck2) return;

  const history = loadHistory();

  const alreadySaved = history.some(item =>

    (
      item.deck1 === deck1.id &&
      item.deck2 === deck2.id
    ) ||
    (
      item.deck1 === deck2.id &&
      item.deck2 === deck1.id
    )

  );

  if (alreadySaved) {

    alert("This combination is already in your history.");

    return;

  }

  const entry = {

    id: Date.now().toString(),

    deck1: deck1.id,

    deck2: deck2.id,

    createdAt: new Date().toISOString()

  };

  history.unshift(entry);

  saveHistory(history.slice(0, 50));

  renderHistory();

  alert("Combination saved to your history!");

}


const saveCombinationButton =
  document.getElementById("saveCombination");

if (saveCombinationButton) {

  saveCombinationButton.addEventListener(
    "click",
    saveCombination
  );

}


// ==========================================
// 26. RENDER COMBINATION HISTORY
// ==========================================

function renderHistory() {

  const container =
    document.getElementById("combinationHistory");

  if (!container) return;

  const history = loadHistory();

  if (!history.length) {

    container.innerHTML = `
      <p class="muted">
        No combinations created yet.
      </p>
    `;

    return;

  }

  container.innerHTML = history.map(item => {

    const deck1 = getDeck(item.deck1);
    const deck2 = getDeck(item.deck2);

    if (!deck1 || !deck2) return "";

    const compatibility =
      calculateCompatibility(deck1, deck2);

    const date = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString()
      : "";

    return `

      <div class="history-card">

        <div class="history-card-info">

          <span class="eyebrow">
            ${escapeHTML(date)}
          </span>

          <h3>
            ${escapeHTML(deck1.name)}
            <span>+</span>
            ${escapeHTML(deck2.name)}
          </h3>

          <p>
            ${escapeHTML(deck1.color)}
            +
            ${escapeHTML(deck2.color)}
            · ${compatibility.score}% similarity
          </p>

        </div>

        <div class="history-actions">

          <button
            type="button"
            class="action-button secondary history-load"
            data-history-id="${escapeHTML(item.id)}">
            Load
          </button>

          <button
            type="button"
            class="action-button secondary history-copy"
            data-history-id="${escapeHTML(item.id)}">
            Copy
          </button>

          <button
            type="button"
            class="history-delete"
            data-history-id="${escapeHTML(item.id)}"
            aria-label="Delete combination">
            ×
          </button>

        </div>

      </div>

    `;

  }).join("");


  // LOAD SAVED COMBINATION

  container.querySelectorAll(".history-load")
    .forEach(button => {

      button.addEventListener("click", () => {

        const entry = loadHistory().find(item =>
          item.id === button.dataset.historyId
        );

        if (!entry) return;

        combination.deck1 = entry.deck1;
        combination.deck2 = entry.deck2;

        updateBuilderSelection();

        document.querySelector(".builder-section")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

      });

    });


  // COPY SAVED COMBINATION

  container.querySelectorAll(".history-copy")
    .forEach(button => {

      button.addEventListener("click", async () => {

        const entry = loadHistory().find(item =>
          item.id === button.dataset.historyId
        );

        if (!entry) return;

        const first = getDeck(entry.deck1);
        const second = getDeck(entry.deck2);

        if (!first || !second) return;

        const text = getCombinationText(first, second);

        try {

          await navigator.clipboard.writeText(text);

          alert("Combination copied!");

        } catch (error) {

          const textarea = document.createElement("textarea");

          textarea.value = text;

          document.body.appendChild(textarea);

          textarea.select();

          document.execCommand("copy");

          textarea.remove();

          alert("Combination copied!");

        }

      });

    });


  // DELETE SAVED COMBINATION

  container.querySelectorAll(".history-delete")
    .forEach(button => {

      button.addEventListener("click", () => {

        const confirmed = confirm(
          "Delete this combination from your history?"
        );

        if (!confirmed) return;

        const updated = loadHistory().filter(item =>
          item.id !== button.dataset.historyId
        );

        saveHistory(updated);

        renderHistory();

      });

    });

}


// ==========================================
// 27. DAILY CHALLENGE
// ==========================================

function getDailyChallenge() {

  const colorNames = [
    "White",
    "Blue",
    "Black",
    "Red",
    "Green"
  ];

  const today = new Date();

  const dateKey =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();

  let seed = dateKey;

  function random() {

    seed = (seed * 9301 + 49297) % 233280;

    return seed / 233280;

  }

  const firstIndex = Math.floor(
    random() * colorNames.length
  );

  let secondIndex = Math.floor(
    random() * colorNames.length
  );

  while (secondIndex === firstIndex) {

    secondIndex = Math.floor(
      random() * colorNames.length
    );

  }

  return {

    first: colorNames[firstIndex],

    second: colorNames[secondIndex],

    date: today.toLocaleDateString()

  };

}


// ==========================================
// 28. RENDER DAILY CHALLENGE
// ==========================================

function renderDailyChallenge() {

  const container =
    document.getElementById("dailyChallenge");

  if (!container) return;

  const challenge = getDailyChallenge();

  container.innerHTML = `

    <div class="daily-card">

      <div class="daily-player">

        <span class="eyebrow">YOUR DECK</span>

        <h3>${challenge.first}</h3>

      </div>

      <div class="daily-versus">
        VS
      </div>

      <div class="daily-player">

        <span class="eyebrow">OPPONENT</span>

        <h3>${challenge.second}</h3>

      </div>

    </div>

    <p class="daily-date">
      Challenge for ${escapeHTML(challenge.date)}
    </p>

    <p class="daily-description">

      Build a combination using themes from your assigned
      color and see how well you can handle today's matchup!

    </p>

    <button
      type="button"
      id="dailySelectDecks"
      class="action-button primary">

      Find themes for today's challenge

    </button>

  `;


  document.getElementById("dailySelectDecks")
    .addEventListener("click", () => {

      colorFilter.value = challenge.first;

      sourceFilter.value = "all";

      search.value = "";

      renderGallery();

      document.querySelector(".gallery-panel")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

    });

}


// ==========================================
// 29. DAILY CHALLENGE - OPPONENT FILTER
// ==========================================

function showOpponentThemes() {

  const challenge = getDailyChallenge();

  colorFilter.value = challenge.second;

  sourceFilter.value = "all";

  search.value = "";

  renderGallery();

  document.querySelector(".gallery-panel")
    ?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

}


// ==========================================
// 30. INITIALIZE WEBSITE
// ==========================================

async function init() {

  try {

    const response = await fetch("./decks.json");

    if (!response.ok) {

      throw new Error("Cannot load decks.json");

    }

    decks = await response.json();

    if (!Array.isArray(decks)) {

      throw new Error("Invalid decks.json format");

    }


    // ENSURE VALID TAG ARRAYS

    decks.forEach(deck => {

      if (!Array.isArray(deck.tags)) {
        deck.tags = [];
      }

    });


    // RESTORE CUSTOM TAGS

    loadSavedTags();


    // UPDATE THEME COUNTER

    document.getElementById("totalCount").textContent =
      decks.length;


    // INITIAL GALLERY

    renderGallery();

    updateTagSuggestions();


    // RESTORE BUILDER

    updateBuilderSelection();


    // RESTORE COMBINATION HISTORY

    renderHistory();


    // DAILY CHALLENGE

    renderDailyChallenge();


    // LOAD SCRYFALL IMAGES

    await loadScryfall();


    // REFRESH GALLERY WITH IMAGES

    renderGallery();

    updateBuilderSelection();


    // CHECK EXPECTED NUMBER OF THEMES

    if (decks.length !== 61) {

      console.warn(
        "Expected 61 themes, found:",
        decks.length
      );

    }

    console.log(
      "Marvel Jumpstart loaded successfully!"
    );


  } catch (error) {

    console.error(
      "Website initialization error:",
      error
    );

    gallery.innerHTML = `

      <p>
        Unable to load themes.
        Check that decks.json is in the project root.
      </p>

    `;

  }

}


// ==========================================
// 31. START WEBSITE
// ==========================================

init();


// ==========================================
// END OF SCRIPT.JS
// ==========================================
