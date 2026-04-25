/* ========================================
   AppState - Centralized application state
   ======================================== */

const AppState = {
  decks: [],
  cardsByDeckId: {},
  activeDeckId: null,
  ui: {
    isModalOpen: false,
    activeCardIndex: 0,
    isFlipped: false,
  },

  /**
   * Initialize AppState from LocalStorage or create defaults
   */
  init() {
    const stored = localStorage.getItem("flashcardsAppState");
    if (stored) {
      const parsed = JSON.parse(stored);
      this.decks = parsed.decks || [];
      this.cardsByDeckId = parsed.cardsByDeckId || {};
      this.activeDeckId = parsed.activeDeckId || null;
      this.ui = { ...this.ui, ...parsed.ui };
    }
  },

  /**
   * Save current state to LocalStorage
   */
  save() {
    const state = {
      decks: this.decks,
      cardsByDeckId: this.cardsByDeckId,
      activeDeckId: this.activeDeckId,
      ui: this.ui,
    };
    localStorage.setItem("flashcardsAppState", JSON.stringify(state));
  },
};

/* ========================================
   Deck CRUD Operations
   ======================================== */

/**
 * Create a new deck and save to state
 * @param {string} name - Deck name
 * @returns {object} - Created deck object
 */
function createDeck(name) {
  if (!name || name.trim().length === 0) {
    console.warn("Deck name cannot be empty");
    return null;
  }

  const deckId = `deck-${Date.now()}`;
  const newDeck = {
    id: deckId,
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };

  AppState.decks.push(newDeck);
  AppState.cardsByDeckId[deckId] = [];
  AppState.save();

  return newDeck;
}

/**
 * Edit an existing deck name
 * @param {string} deckId - Deck ID to edit
 * @param {string} newName - New deck name
 * @returns {boolean} - Success status
 */
function editDeck(deckId, newName) {
  if (!newName || newName.trim().length === 0) {
    console.warn("Deck name cannot be empty");
    return false;
  }

  const deck = AppState.decks.find((d) => d.id === deckId);
  if (!deck) {
    console.warn(`Deck ${deckId} not found`);
    return false;
  }

  deck.name = newName.trim();
  AppState.save();

  return true;
}

/**
 * Delete a deck and all its cards
 * @param {string} deckId - Deck ID to delete
 * @returns {boolean} - Success status
 */
function deleteDeck(deckId) {
  const deckIndex = AppState.decks.findIndex((d) => d.id === deckId);
  if (deckIndex === -1) {
    console.warn(`Deck ${deckId} not found`);
    return false;
  }

  AppState.decks.splice(deckIndex, 1);
  delete AppState.cardsByDeckId[deckId];

  // Clear active deck if the deleted deck was active
  if (AppState.activeDeckId === deckId) {
    AppState.activeDeckId =
      AppState.decks.length > 0 ? AppState.decks[0].id : null;
    AppState.ui.activeCardIndex = 0;
  }

  AppState.save();

  return true;
}

/**
 * Get a single deck by ID
 * @param {string} deckId - Deck ID
 * @returns {object|null} - Deck object or null
 */
function getDeck(deckId) {
  return AppState.decks.find((d) => d.id === deckId) || null;
}

/**
 * Get all cards in a deck
 * @param {string} deckId - Deck ID
 * @returns {array} - Array of cards
 */
function getCardsInDeck(deckId) {
  return AppState.cardsByDeckId[deckId] || [];
}

/* ========================================
   Deck UI Rendering
   ======================================== */

/**
 * Render deck list to sidebar
 */
function renderDeckList() {
  const deckListEl = document.getElementById("deck-list");
  const emptyMessageEl = document.getElementById("empty-decks-message");

  if (!deckListEl) return;

  deckListEl.innerHTML = "";

  if (AppState.decks.length === 0) {
    emptyMessageEl?.classList.remove("hidden");
    return;
  }

  emptyMessageEl?.classList.add("hidden");

  AppState.decks.forEach((deck) => {
    const li = document.createElement("li");
    const button = document.createElement("button");

    button.className = "deck-button";
    button.textContent = deck.name;
    button.dataset.deckId = deck.id;

    // Add active state
    if (AppState.activeDeckId === deck.id) {
      button.classList.add("active");
    }

    li.appendChild(button);
    deckListEl.appendChild(li);
  });
}

/**
 * Switch active deck
 * @param {string} deckId - Deck ID to activate
 * @returns {boolean} - Success status
 */
function setActiveDeck(deckId) {
  if (!deckId) {
    AppState.activeDeckId = null;
    AppState.ui.activeCardIndex = 0;
    AppState.ui.isFlipped = false;
    AppState.save();
    return true;
  }

  const deck = getDeck(deckId);
  if (!deck) {
    console.warn(`Deck ${deckId} not found`);
    return false;
  }

  AppState.activeDeckId = deckId;
  AppState.ui.activeCardIndex = 0;
  AppState.ui.isFlipped = false;
  AppState.save();

  return true;
}

/**
 * Get currently active deck
 * @returns {object|null} - Active deck or null
 */
function getActiveDeck() {
  return AppState.activeDeckId ? getDeck(AppState.activeDeckId) : null;
}

/* ========================================
   Event Delegation & Initialization
   ======================================== */

/**
 * Initialize event listeners with delegation
 */
function initEventListeners() {
  const deckListEl = document.getElementById("deck-list");
  const newDeckBtnEl = document.getElementById("new-deck-btn");

  // Event delegation on deck list
  if (deckListEl) {
    deckListEl.addEventListener("click", (event) => {
      const button = event.target.closest(".deck-button");
      if (!button) return;

      const deckId = button.dataset.deckId;
      setActiveDeck(deckId);
      renderDeckList();
      updateUIForActiveDeck();
    });
  }

  // New deck button
  if (newDeckBtnEl) {
    newDeckBtnEl.addEventListener("click", () => {
      openNewDeckModal();
    });
  }
}

/**
 * Update UI to reflect active deck
 */
function updateUIForActiveDeck() {
  const noDeckMessageEl = document.getElementById("no-deck-message");
  const noCardsMessageEl = document.getElementById("no-cards-message");
  const cardContainerEl = document.getElementById("card-container");

  const activeDeck = getActiveDeck();
  const cards = activeDeck ? getCardsInDeck(activeDeck.id) : [];

  if (!activeDeck) {
    // No deck selected
    noDeckMessageEl?.classList.remove("hidden");
    noCardsMessageEl?.classList.add("hidden");
    cardContainerEl?.classList.add("hidden");
    return;
  }

  noDeckMessageEl?.classList.add("hidden");

  if (cards.length === 0) {
    // Deck selected but no cards
    noCardsMessageEl?.classList.remove("hidden");
    cardContainerEl?.classList.add("hidden");
    return;
  }

  // Show cards
  noCardsMessageEl?.classList.add("hidden");
  cardContainerEl?.classList.remove("hidden");

  renderCard();
}

/* ========================================
   Card Display (Placeholder)
   ======================================== */

/**
 * Render current card
 * TODO: Implement full card rendering with flip logic
 */
function renderCard() {
  const activeDeck = getActiveDeck();
  if (!activeDeck) return;

  const cards = getCardsInDeck(activeDeck.id);
  const currentIndex = AppState.ui.activeCardIndex;
  const currentCard = cards[currentIndex];

  if (!currentCard) return;

  const cardTextEl = document.getElementById("card-text");
  const cardIndexEl = document.getElementById("card-index");
  const cardTotalEl = document.getElementById("card-total");

  if (cardTextEl) {
    cardTextEl.textContent = AppState.ui.isFlipped
      ? currentCard.back
      : currentCard.front;
  }

  if (cardIndexEl) {
    cardIndexEl.textContent = currentIndex + 1;
  }

  if (cardTotalEl) {
    cardTotalEl.textContent = cards.length;
  }
}

/* ========================================
   Modal Functions (Placeholder)
   ======================================== */

/**
 * Open new deck modal
 * TODO: Implement modal with form submission
 */
function openNewDeckModal() {
  const deckName = prompt("Enter deck name:");
  if (deckName) {
    const newDeck = createDeck(deckName);
    if (newDeck) {
      setActiveDeck(newDeck.id);
      renderDeckList();
      updateUIForActiveDeck();
    }
  }
}

/**
 * Open edit deck modal
 * TODO: Implement modal with form submission
 */
function openEditDeckModal(deckId) {
  const deck = getDeck(deckId);
  if (!deck) return;

  const newName = prompt("Enter new deck name:", deck.name);
  if (newName && newName !== deck.name) {
    editDeck(deckId, newName);
    renderDeckList();
  }
}

/**
 * Open delete confirmation modal
 * TODO: Implement modal with confirmation
 */
function openDeleteDeckModal(deckId) {
  const deck = getDeck(deckId);
  if (!deck) return;

  if (confirm(`Delete deck "${deck.name}"? This cannot be undone.`)) {
    deleteDeck(deckId);
    renderDeckList();
    updateUIForActiveDeck();
  }
}

/* ========================================
   Application Initialization
   ======================================== */

/**
 * Initialize the application
 */
function initApp() {
  AppState.init();
  renderDeckList();
  initEventListeners();
  updateUIForActiveDeck();
}

// Start app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
