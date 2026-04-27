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
   Search State - Track active search filter
   ======================================== */

const SearchState = {
  query: "",
  filteredIndices: [], // Indices of cards matching current search

  /**
   * Reset search state
   */
  reset() {
    this.query = "";
    this.filteredIndices = [];
  },

  /**
   * Update search query and filter results
   * @param {string} searchQuery - The search term (case-insensitive)
   */
  setQuery(searchQuery) {
    this.query = searchQuery.toLowerCase().trim();

    // Get active deck and cards
    const activeDeck = getActiveDeck();
    if (!activeDeck) {
      this.filteredIndices = [];
      return;
    }

    const cards = getCardsInDeck(activeDeck.id);

    // Filter card indices based on search query
    if (this.query === "") {
      // No search - show all cards
      this.filteredIndices = cards.map((_, index) => index);
    } else {
      // Search - find matching cards
      this.filteredIndices = cards
        .map((card, index) => {
          const front = card.front.toLowerCase();
          const back = card.back.toLowerCase();
          return {
            index,
            matches: front.includes(this.query) || back.includes(this.query),
          };
        })
        .filter((item) => item.matches)
        .map((item) => item.index);
    }
  },

  /**
   * Check if search is active
   */
  isActive() {
    return this.query !== "";
  },

  /**
   * Get count of matching results
   */
  getMatchCount() {
    return this.filteredIndices.length;
  },
};

/* ========================================
   Shuffle State - Track shuffled card order
   ======================================== */

const ShuffleState = {
  isActive: false,
  shuffledIndices: [], // Shuffled order of card indices

  /**
   * Reset shuffle state
   */
  reset() {
    this.isActive = false;
    this.shuffledIndices = [];
  },

  /**
   * Fisher-Yates shuffle algorithm
   * @param {array} array - Array to shuffle
   * @returns {array} - Shuffled copy of array
   */
  fisherYatesShuffle(array) {
    const shuffled = [...array]; // Create a copy
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  /**
   * Shuffle the cards in the active deck
   */
  shuffle() {
    const activeDeck = getActiveDeck();
    if (!activeDeck) return;

    const cards = getCardsInDeck(activeDeck.id);
    if (cards.length === 0) return;

    // Get indices to shuffle (considering search filter if active)
    const indicesToShuffle = SearchState.isActive()
      ? SearchState.filteredIndices
      : cards.map((_, index) => index);

    // Shuffle the indices
    this.shuffledIndices = this.fisherYatesShuffle(indicesToShuffle);
    this.isActive = true;
  },

  /**
   * Get the card index at a given position in the shuffled order
   * @param {number} position - Position in shuffled list
   * @returns {number} - Original card index
   */
  getCardIndexAt(position) {
    if (!this.isActive || position >= this.shuffledIndices.length) {
      return position;
    }
    return this.shuffledIndices[position];
  },

  /**
   * Get all indices in shuffle order
   */
  getIndices() {
    return this.isActive ? this.shuffledIndices : null;
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
   Card CRUD Operations
   ======================================== */

/**
 * Create a new card in a deck
 * @param {string} deckId - Deck ID to add card to
 * @param {string} front - Card front text
 * @param {string} back - Card back text
 * @returns {object} - Created card object
 */
function createCard(deckId, front, back) {
  if (!deckId || !AppState.cardsByDeckId[deckId]) {
    console.warn(`Deck ${deckId} not found`);
    return null;
  }

  if (
    !front ||
    front.trim().length === 0 ||
    !back ||
    back.trim().length === 0
  ) {
    console.warn("Card front and back cannot be empty");
    return null;
  }

  const cardId = `card-${Date.now()}`;
  const newCard = {
    id: cardId,
    front: front.trim(),
    back: back.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  AppState.cardsByDeckId[deckId].push(newCard);
  AppState.save();

  return newCard;
}

/**
 * Edit an existing card
 * @param {string} deckId - Deck ID
 * @param {string} cardId - Card ID to edit
 * @param {string} front - New front text
 * @param {string} back - New back text
 * @returns {boolean} - Success status
 */
function editCard(deckId, cardId, front, back) {
  if (!deckId || !AppState.cardsByDeckId[deckId]) {
    console.warn(`Deck ${deckId} not found`);
    return false;
  }

  if (
    !front ||
    front.trim().length === 0 ||
    !back ||
    back.trim().length === 0
  ) {
    console.warn("Card front and back cannot be empty");
    return false;
  }

  const card = AppState.cardsByDeckId[deckId].find((c) => c.id === cardId);
  if (!card) {
    console.warn(`Card ${cardId} not found`);
    return false;
  }

  card.front = front.trim();
  card.back = back.trim();
  card.updatedAt = new Date().toISOString();
  AppState.save();

  return true;
}

/**
 * Delete a card from a deck
 * @param {string} deckId - Deck ID
 * @param {string} cardId - Card ID to delete
 * @returns {boolean} - Success status
 */
function deleteCard(deckId, cardId) {
  if (!deckId || !AppState.cardsByDeckId[deckId]) {
    console.warn(`Deck ${deckId} not found`);
    return false;
  }

  const cardIndex = AppState.cardsByDeckId[deckId].findIndex(
    (c) => c.id === cardId,
  );
  if (cardIndex === -1) {
    console.warn(`Card ${cardId} not found`);
    return false;
  }

  AppState.cardsByDeckId[deckId].splice(cardIndex, 1);

  // Adjust active card index if needed
  if (AppState.ui.activeCardIndex >= AppState.cardsByDeckId[deckId].length) {
    AppState.ui.activeCardIndex = Math.max(
      0,
      AppState.cardsByDeckId[deckId].length - 1,
    );
  }

  AppState.save();

  return true;
}

/**
 * Get a single card by ID
 * @param {string} deckId - Deck ID
 * @param {string} cardId - Card ID
 * @returns {object|null} - Card object or null
 */
function getCard(deckId, cardId) {
  const cards = AppState.cardsByDeckId[deckId];
  if (!cards) return null;
  return cards.find((c) => c.id === cardId) || null;
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
    SearchState.reset();
    ShuffleState.reset();
    clearSearchInput();
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
  SearchState.reset();
  ShuffleState.reset();
  clearSearchInput();

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
  const newCardBtnEl = document.getElementById("new-card-btn");
  const deckFormEl = document.getElementById("deck-form");
  const cardFormEl = document.getElementById("card-form");
  const deckModalCancelEl = document.getElementById("deck-modal-cancel");
  const cardModalCancelEl = document.getElementById("card-modal-cancel");
  const editCardBtnEl = document.getElementById("edit-card-btn");
  const deleteCardBtnEl = document.getElementById("delete-card-btn");
  const cardListEl = document.getElementById("card-list");
  const searchInputEl = document.getElementById("search-input");

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

  // New card button
  if (newCardBtnEl) {
    newCardBtnEl.addEventListener("click", () => {
      openNewCardModal();
    });
  }

  // Deck form submission
  if (deckFormEl) {
    deckFormEl.addEventListener("submit", handleDeckFormSubmit);
  }

  // Card form submission
  if (cardFormEl) {
    cardFormEl.addEventListener("submit", handleCardFormSubmit);
  }

  // Deck modal cancel button
  if (deckModalCancelEl) {
    deckModalCancelEl.addEventListener("click", () => {
      ModalManager.closeModal();
    });
  }

  // Card modal cancel button
  if (cardModalCancelEl) {
    cardModalCancelEl.addEventListener("click", () => {
      ModalManager.closeModal();
    });
  }

  // Edit current card button
  if (editCardBtnEl) {
    editCardBtnEl.addEventListener("click", () => {
      const activeDeck = getActiveDeck();
      if (!activeDeck) return;

      const cards = getCardsInDeck(activeDeck.id);
      const currentCard = cards[AppState.ui.activeCardIndex];
      if (currentCard) {
        openEditCardModal(currentCard.id);
      }
    });
  }

  // Delete current card button
  if (deleteCardBtnEl) {
    deleteCardBtnEl.addEventListener("click", () => {
      const activeDeck = getActiveDeck();
      if (!activeDeck) return;

      const cards = getCardsInDeck(activeDeck.id);
      const currentCard = cards[AppState.ui.activeCardIndex];
      if (currentCard) {
        deleteCardWithConfirmation(currentCard.id);
      }
    });
  }

  // Event delegation on card list
  if (cardListEl) {
    cardListEl.addEventListener("click", (event) => {
      const editBtn = event.target.closest(".card-edit-btn");
      const deleteBtn = event.target.closest(".card-delete-btn");
      const selectBtn = event.target.closest(".card-select-btn");

      if (editBtn) {
        const cardId = editBtn.dataset.cardId;
        openEditCardModal(cardId);
      } else if (deleteBtn) {
        const cardId = deleteBtn.dataset.cardId;
        deleteCardWithConfirmation(cardId);
      } else if (selectBtn) {
        const cardIndex = parseInt(selectBtn.dataset.cardIndex, 10);
        AppState.ui.activeCardIndex = cardIndex;
        AppState.ui.isFlipped = false;
        AppState.save();
        renderCard();
        renderCardList();
      }
    });
  }

  // Flip button
  const flipBtnEl = document.getElementById("flip-btn");
  if (flipBtnEl) {
    flipBtnEl.addEventListener("click", () => {
      StudyMode.flipCard();
    });
  }

  // Previous button
  const prevBtnEl = document.getElementById("prev-btn");
  if (prevBtnEl) {
    prevBtnEl.addEventListener("click", () => {
      StudyMode.previousCard();
    });
  }

  // Next button
  const nextBtnEl = document.getElementById("next-btn");
  if (nextBtnEl) {
    nextBtnEl.addEventListener("click", () => {
      StudyMode.nextCard();
    });
  }

  // Search input
  if (searchInputEl) {
    searchInputEl.addEventListener("input", (event) => {
      handleSearch(event.target.value);
    });
  }

  // Shuffle button
  const shuffleBtnEl = document.getElementById("shuffle-btn");
  if (shuffleBtnEl) {
    shuffleBtnEl.addEventListener("click", () => {
      handleShuffle();
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

  // Exit study mode when leaving cards
  if (StudyMode.isActive) {
    StudyMode.exit();
  }

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

  // Show cards and enter study mode
  noCardsMessageEl?.classList.add("hidden");
  cardContainerEl?.classList.remove("hidden");

  StudyMode.enter();
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

  // Get the display indices (considering search and shuffle)
  const displayIndices = ShuffleState.isActive
    ? ShuffleState.shuffledIndices
    : SearchState.isActive()
      ? SearchState.filteredIndices
      : cards.map((_, index) => index);

  const positionIndex = AppState.ui.activeCardIndex;
  const actualCardIndex = displayIndices[positionIndex];
  const currentCard = cards[actualCardIndex];

  if (!currentCard) return;

  const cardTextEl = document.getElementById("card-text");
  const cardIndexEl = document.getElementById("card-index");
  const cardTotalEl = document.getElementById("card-total");
  const studyCardEl = document.getElementById("study-card");

  if (cardTextEl) {
    cardTextEl.textContent = currentCard.back;
  }

  const cardBackTextEl = document.getElementById("card-back-text");
  if (cardBackTextEl) {
    cardBackTextEl.textContent = currentCard.front;
  }

  // Also populate the back face
  const cardBackEl = studyCardEl?.querySelector(".card-back");
  if (cardBackEl) {
    cardBackEl.dataset.content = currentCard.back;
    cardBackEl.setAttribute("data-text", currentCard.back);
  }

  // Sync flip state visually
  if (studyCardEl) {
    if (AppState.ui.isFlipped) {
      studyCardEl.classList.add("is-flipped");
    } else {
      studyCardEl.classList.remove("is-flipped");
    }
  }

  if (cardIndexEl) cardIndexEl.textContent = positionIndex + 1;
  if (cardTotalEl) cardTotalEl.textContent = displayIndices.length;

  renderCardList();
}

/**
 * Handle search input and filter card list
 * @param {string} query - Search query string
 */
function handleSearch(query) {
  // Update search state
  SearchState.setQuery(query);

  // Reset active card index if it's outside filtered results
  if (SearchState.isActive() && SearchState.filteredIndices.length > 0) {
    if (!SearchState.filteredIndices.includes(AppState.ui.activeCardIndex)) {
      AppState.ui.activeCardIndex = SearchState.filteredIndices[0];
      AppState.ui.isFlipped = false;
      AppState.save();
    }
  }

  // Update search results count display
  updateSearchResultsCount();

  // Re-render card list with search filter
  renderCardList();

  // Re-render current card
  renderCard();
}

/**
 * Update the search results count display
 */
function updateSearchResultsCount() {
  const countEl = document.getElementById("search-results-count");
  if (!countEl) return;

  if (!SearchState.isActive()) {
    countEl.textContent = "";
  } else {
    const matchCount = SearchState.getMatchCount();
    const activeDeck = getActiveDeck();
    const totalCards = activeDeck ? getCardsInDeck(activeDeck.id).length : 0;
    countEl.textContent = ` (${matchCount} of ${totalCards})`;
  }
}

/**
 * Clear the search input field
 */
function clearSearchInput() {
  const searchInputEl = document.getElementById("search-input");
  if (searchInputEl) {
    searchInputEl.value = "";
  }
}

/**
 * Handle shuffle button click
 */
function handleShuffle() {
  const activeDeck = getActiveDeck();
  if (!activeDeck) return;

  const cards = getCardsInDeck(activeDeck.id);
  if (cards.length === 0) return;

  // Perform the shuffle
  ShuffleState.shuffle();

  // Reset active card index to 0 and flip state
  AppState.ui.activeCardIndex = 0;
  AppState.ui.isFlipped = false;
  AppState.save();

  // Re-render everything
  renderCard();
  renderCardList();
}

/**
 * Render card list
 */
function renderCardList() {
  const activeDeck = getActiveDeck();
  if (!activeDeck) return;

  const cardListEl = document.getElementById("card-list");
  if (!cardListEl) return;

  const cards = getCardsInDeck(activeDeck.id);

  // Determine which indices to render (shuffle first, then search)
  let displayIndices;
  if (ShuffleState.isActive) {
    displayIndices = ShuffleState.shuffledIndices;
    // If search is also active, filter the shuffled list
    if (SearchState.isActive()) {
      displayIndices = displayIndices.filter((idx) =>
        SearchState.filteredIndices.includes(idx),
      );
    }
  } else if (SearchState.isActive()) {
    displayIndices = SearchState.filteredIndices;
  } else {
    displayIndices = cards.map((_, index) => index);
  }

  cardListEl.innerHTML = "";

  // Render each card at its position in the display order
  displayIndices.forEach((cardIndex, position) => {
    const card = cards[cardIndex];
    const li = document.createElement("li");
    li.className = "card-list-item";

    // Mark as active if this position matches the current position
    if (position === AppState.ui.activeCardIndex) {
      li.classList.add("active");
    }

    const cardPreview = document.createElement("button");
    cardPreview.className = "card-select-btn";
    cardPreview.dataset.cardIndex = position; // Store position, not original index
    cardPreview.dataset.actualIndex = cardIndex; // Store actual card index for reference
    cardPreview.textContent = `${position + 1}. ${card.front.substring(0, 50)}${card.front.length > 50 ? "..." : ""}`;

    const controls = document.createElement("div");
    controls.className = "card-list-controls";

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-sm card-edit-btn";
    editBtn.dataset.cardId = card.id;
    editBtn.textContent = "Edit";
    editBtn.type = "button";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-sm btn-danger card-delete-btn";
    deleteBtn.dataset.cardId = card.id;
    deleteBtn.textContent = "Delete";
    deleteBtn.type = "button";

    controls.appendChild(editBtn);
    controls.appendChild(deleteBtn);

    li.appendChild(cardPreview);
    li.appendChild(controls);
    cardListEl.appendChild(li);
  });
}

/* ========================================
   Study Mode - Card Navigation & Interaction
   ======================================== */

const StudyMode = {
  isActive: false,
  keyboardListener: null,

  /**
   * Enter study mode and set up event listeners
   */
  enter() {
    this.isActive = true;

    // Render initial card
    renderCard();

    // Create and store keyboard listener
    this.keyboardListener = (e) => this.handleKeyboard(e);
    document.addEventListener("keydown", this.keyboardListener);
  },

  /**
   * Exit study mode and clean up listeners
   */
  exit() {
    this.isActive = false;

    // Remove keyboard listener
    if (this.keyboardListener) {
      document.removeEventListener("keydown", this.keyboardListener);
      this.keyboardListener = null;
    }
  },

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboard(e) {
    // Don't fire shortcuts if a modal is open or focus is in a text field
    if (ModalManager.activeModal) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    const activeDeck = getActiveDeck();
    if (!activeDeck || !this.isActive) return;

    switch (e.key) {
      case " ":
        e.preventDefault();
        this.flipCard();
        break;
      case "ArrowLeft":
        e.preventDefault();
        this.previousCard();
        break;
      case "ArrowRight":
        e.preventDefault();
        this.nextCard();
        break;
    }
  },
  /**
   * Toggle card flip state
   */
  flipCard() {
    AppState.ui.isFlipped = !AppState.ui.isFlipped;
    AppState.save();

    const card = document.getElementById("study-card");
    if (card) {
      if (AppState.ui.isFlipped) {
        card.classList.add("is-flipped");
      } else {
        card.classList.remove("is-flipped");
      }
    }

    renderCard();
  },

  /**
   * Navigate to previous card with boundary check
   */
  previousCard() {
    const activeDeck = getActiveDeck();
    if (!activeDeck) return;

    const cards = getCardsInDeck(activeDeck.id);
    if (cards.length === 0) return;

    // Get the display indices (considering search and shuffle)
    const displayIndices = ShuffleState.isActive
      ? ShuffleState.shuffledIndices
      : SearchState.isActive()
        ? SearchState.filteredIndices
        : cards.map((_, index) => index);

    // Boundary check: don't go below 0
    if (AppState.ui.activeCardIndex > 0) {
      AppState.ui.activeCardIndex--;
    }

    // Reset flip state on navigation
    AppState.ui.isFlipped = false;
    AppState.save();
    renderCard();
  },

  /**
   * Navigate to next card with boundary check
   */
  nextCard() {
    const activeDeck = getActiveDeck();
    if (!activeDeck) return;

    const cards = getCardsInDeck(activeDeck.id);
    if (cards.length === 0) return;

    // Get the display indices (considering search and shuffle)
    const displayIndices = ShuffleState.isActive
      ? ShuffleState.shuffledIndices
      : SearchState.isActive()
        ? SearchState.filteredIndices
        : cards.map((_, index) => index);

    // Boundary check: don't go beyond last card in display order
    if (AppState.ui.activeCardIndex < displayIndices.length - 1) {
      AppState.ui.activeCardIndex++;
    }

    // Reset flip state on navigation
    AppState.ui.isFlipped = false;
    AppState.save();
    renderCard();
  },
};

/* ========================================
   Modal Management with Accessibility
   ======================================== */

const ModalManager = {
  activeModal: null,
  focusBeforeOpen: null,
  currentContext: null, // Store modal context (deckId, etc.)

  /**
   * Get all focusable elements within a modal
   */
  getFocusableElements(modal) {
    const selector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return modal.querySelectorAll(selector);
  },

  /**
   * Create focus trap - keep focus within modal
   */
  trapFocus(e, modal) {
    const focusables = this.getFocusableElements(modal);
    const firstFocusable = focusables[0];
    const lastFocusable = focusables[focusables.length - 1];

    if (e.key !== "Tab") return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  },

  /**
   * Handle ESC key to close modal
   */
  handleEscKey(e) {
    if (e.key === "Escape" && this.activeModal) {
      this.closeModal();
    }
  },

  boundHandleEscKey: null,

  /**
   * Open a modal with focus management
   */
  openModal(modal) {
    if (this.activeModal) {
      this.closeModal();
    }

    this.activeModal = modal;
    this.focusBeforeOpen = document.activeElement;

    // Open the dialog
    modal.showModal();

    // Set focus to first focusable element
    const focusables = this.getFocusableElements(modal);
    if (focusables.length > 0) {
      focusables[0].focus();
    }

    // Add event listeners
    modal.addEventListener("keydown", (e) => this.trapFocus(e, modal));
    this.boundHandleEscKey = this.handleEscKey.bind(this);
    document.addEventListener("keydown", this.boundHandleEscKey);
  },

  /**
   * Close modal and return focus
   */
  closeModal() {
    if (!this.activeModal) return;

    const modal = this.activeModal;
    modal.close();
    this.activeModal = null;
    this.currentContext = null;

    // Return focus to the element that opened the modal
    if (this.focusBeforeOpen && this.focusBeforeOpen.focus) {
      this.focusBeforeOpen.focus();
    }

    // Remove event listeners
    document.removeEventListener("keydown", this.boundHandleEscKey);
  },
};

/* ========================================
   Deck Modal Functions with Form Handling
   ======================================== */

/**
 * Validate deck name input
 * @param {string} name - Deck name to validate
 * @returns {object} - { valid: boolean, message: string }
 */
function validateDeckName(name) {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, message: "Deck name is required" };
  }

  if (trimmed.length < 2) {
    return { valid: false, message: "Deck name must be at least 2 characters" };
  }

  if (trimmed.length > 100) {
    return {
      valid: false,
      message: "Deck name must not exceed 100 characters",
    };
  }

  // Check for duplicate names
  const isDuplicate = AppState.decks.some(
    (deck) =>
      deck.name.toLowerCase() === trimmed.toLowerCase() &&
      deck.id !== ModalManager.currentContext?.deckId,
  );

  if (isDuplicate) {
    return { valid: false, message: "A deck with this name already exists" };
  }

  return { valid: true, message: "" };
}

/**
 * Show validation error in modal
 */
function showDeckFormError(message) {
  const errorEl = document.getElementById("deck-name-error");
  const inputEl = document.getElementById("deck-name-input");

  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  }

  if (inputEl) {
    inputEl.setAttribute("aria-invalid", "true");
  }
}

/**
 * Clear validation error in modal
 */
function clearDeckFormError() {
  const errorEl = document.getElementById("deck-name-error");
  const inputEl = document.getElementById("deck-name-input");

  if (errorEl) {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
  }

  if (inputEl) {
    inputEl.setAttribute("aria-invalid", "false");
  }
}

/**
 * Reset deck form
 */
function resetDeckForm() {
  const form = document.getElementById("deck-form");
  const titleEl = document.getElementById("deck-modal-title");

  if (form) {
    form.reset();
  }

  clearDeckFormError();

  if (titleEl) {
    titleEl.textContent = "Create Deck";
  }

  ModalManager.currentContext = null;
}

/**
 * Open new deck modal
 */
function openNewDeckModal() {
  resetDeckForm();
  const modal = document.getElementById("deck-modal");
  if (modal) {
    ModalManager.openModal(modal);
  }
}

/**
 * Open edit deck modal
 * @param {string} deckId - Deck ID to edit
 */
function openEditDeckModal(deckId) {
  const deck = getDeck(deckId);
  if (!deck) return;

  resetDeckForm();

  const titleEl = document.getElementById("deck-modal-title");
  const inputEl = document.getElementById("deck-name-input");

  if (titleEl) {
    titleEl.textContent = "Edit Deck";
  }

  if (inputEl) {
    inputEl.value = deck.name;
  }

  ModalManager.currentContext = { deckId };

  const modal = document.getElementById("deck-modal");
  if (modal) {
    ModalManager.openModal(modal);
  }
}

/**
 * Handle deck form submission
 */
function handleDeckFormSubmit(e) {
  e.preventDefault();

  const inputEl = document.getElementById("deck-name-input");
  const deckName = inputEl.value;

  // Validate
  const validation = validateDeckName(deckName);
  if (!validation.valid) {
    showDeckFormError(validation.message);
    return;
  }

  clearDeckFormError();

  // Create or update deck
  if (ModalManager.currentContext?.deckId) {
    // Edit mode
    const deckId = ModalManager.currentContext.deckId;
    editDeck(deckId, deckName);
  } else {
    // Create mode
    createDeck(deckName);
  }

  renderDeckList();
  setActiveDeck(
    ModalManager.currentContext?.deckId ||
      AppState.decks[AppState.decks.length - 1].id,
  );
  updateUIForActiveDeck();

  ModalManager.closeModal();
}

/**
 * Open delete confirmation modal
 * @param {string} deckId - Deck ID to delete
 */
function openDeleteDeckModal(deckId) {
  const deck = getDeck(deckId);
  if (!deck) return;

  if (
    confirm(
      `Delete deck "${deck.name}"? This action cannot be undone, and all ${getCardsInDeck(deckId).length} cards will be deleted.`,
    )
  ) {
    deleteDeck(deckId);
    renderDeckList();
    updateUIForActiveDeck();
  }
}

/* ========================================
   Card Modal Functions with Form Handling
   ======================================== */

/**
 * Validate card front and back input
 * @param {string} front - Card front text
 * @param {string} back - Card back text
 * @returns {object} - { valid: boolean, frontError: string, backError: string }
 */
function validateCardInputs(front, back) {
  const frontTrimmed = front.trim();
  const backTrimmed = back.trim();
  let frontError = "";
  let backError = "";

  if (!frontTrimmed) {
    frontError = "Front text is required";
  } else if (frontTrimmed.length < 2) {
    frontError = "Front text must be at least 2 characters";
  } else if (frontTrimmed.length > 500) {
    frontError = "Front text must not exceed 500 characters";
  }

  if (!backTrimmed) {
    backError = "Back text is required";
  } else if (backTrimmed.length < 2) {
    backError = "Back text must be at least 2 characters";
  } else if (backTrimmed.length > 500) {
    backError = "Back text must not exceed 500 characters";
  }

  return {
    valid: frontError === "" && backError === "",
    frontError,
    backError,
  };
}

/**
 * Show validation errors in card modal
 */
function showCardFormError(frontError, backError) {
  const frontErrorEl = document.getElementById("card-front-error");
  const backErrorEl = document.getElementById("card-back-error");
  const frontInputEl = document.getElementById("card-front-input");
  const backInputEl = document.getElementById("card-back-input");

  if (frontErrorEl && frontError) {
    frontErrorEl.textContent = frontError;
    frontErrorEl.classList.remove("hidden");
  }

  if (backErrorEl && backError) {
    backErrorEl.textContent = backError;
    backErrorEl.classList.remove("hidden");
  }

  if (frontInputEl && frontError) {
    frontInputEl.setAttribute("aria-invalid", "true");
  }

  if (backInputEl && backError) {
    backInputEl.setAttribute("aria-invalid", "true");
  }
}

/**
 * Clear validation errors in card modal
 */
function clearCardFormError() {
  const frontErrorEl = document.getElementById("card-front-error");
  const backErrorEl = document.getElementById("card-back-error");
  const frontInputEl = document.getElementById("card-front-input");
  const backInputEl = document.getElementById("card-back-input");

  if (frontErrorEl) {
    frontErrorEl.textContent = "";
    frontErrorEl.classList.add("hidden");
  }

  if (backErrorEl) {
    backErrorEl.textContent = "";
    backErrorEl.classList.add("hidden");
  }

  if (frontInputEl) {
    frontInputEl.setAttribute("aria-invalid", "false");
  }

  if (backInputEl) {
    backInputEl.setAttribute("aria-invalid", "false");
  }
}

/**
 * Reset card form
 */
function resetCardForm() {
  const form = document.getElementById("card-form");
  const titleEl = document.getElementById("card-modal-title");
  const submitBtn = document.querySelector("#card-form button[type='submit']");

  if (form) {
    form.reset();
  }

  clearCardFormError();

  if (titleEl) {
    titleEl.textContent = "Add Card";
  }

  if (submitBtn) {
    submitBtn.textContent = "Add Card";
  }

  ModalManager.currentContext = null;
}

/**
 * Open new card modal
 */
function openNewCardModal() {
  if (!getActiveDeck()) {
    alert("Please select a deck first");
    return;
  }

  resetCardForm();
  const modal = document.getElementById("card-modal");
  if (modal) {
    ModalManager.openModal(modal);
  }
}

/**
 * Open edit card modal
 * @param {string} cardId - Card ID to edit
 */
function openEditCardModal(cardId) {
  const activeDeck = getActiveDeck();
  if (!activeDeck) return;

  const card = getCard(activeDeck.id, cardId);
  if (!card) return;

  resetCardForm();

  const titleEl = document.getElementById("card-modal-title");
  const frontInputEl = document.getElementById("card-front-input");
  const backInputEl = document.getElementById("card-back-input");
  const submitBtn = document.querySelector("#card-form button[type='submit']");

  if (titleEl) {
    titleEl.textContent = "Edit Card";
  }

  if (frontInputEl) {
    frontInputEl.value = card.front;
  }

  if (backInputEl) {
    backInputEl.value = card.back;
  }

  if (submitBtn) {
    submitBtn.textContent = "Save Card";
  }

  ModalManager.currentContext = { cardId };

  const modal = document.getElementById("card-modal");
  if (modal) {
    ModalManager.openModal(modal);
  }
}

/**
 * Handle card form submission
 */
function handleCardFormSubmit(e) {
  e.preventDefault();

  const activeDeck = getActiveDeck();
  if (!activeDeck) {
    alert("No active deck");
    return;
  }

  const frontInputEl = document.getElementById("card-front-input");
  const backInputEl = document.getElementById("card-back-input");
  const front = frontInputEl.value;
  const back = backInputEl.value;

  // Validate
  const validation = validateCardInputs(front, back);
  if (!validation.valid) {
    showCardFormError(validation.frontError, validation.backError);
    return;
  }

  clearCardFormError();

  // Create or update card
  if (ModalManager.currentContext?.cardId) {
    // Edit mode
    const cardId = ModalManager.currentContext.cardId;
    editCard(activeDeck.id, cardId, front, back);
  } else {
    // Create mode
    createCard(activeDeck.id, front, back);
  }

  renderCard();
  ModalManager.closeModal();
}

/**
 * Delete a card with confirmation
 * @param {string} cardId - Card ID to delete
 */
function deleteCardWithConfirmation(cardId) {
  const activeDeck = getActiveDeck();
  if (!activeDeck) return;

  const card = getCard(activeDeck.id, cardId);
  if (!card) return;

  if (confirm("Delete this card? This action cannot be undone.")) {
    deleteCard(activeDeck.id, cardId);
    updateUIForActiveDeck();
  }
}

/* ========================================
   Application Initialization
   ======================================== */

/**
 * Seed default decks with poker content on first load
 * Only runs when LocalStorage is empty
 */
function seedDefaultDecks() {
  // Only seed if no decks exist
  if (AppState.decks.length > 0) return;

  // Helper function to create a unique ID
  let idCounter = 0;
  const generateUniqueId = () => {
    return `deck-${Date.now()}-${idCounter++}`;
  };

  // Manually create decks with unique IDs to avoid ID collisions
  const createDeckManually = (name) => {
    const deckId = generateUniqueId();
    const newDeck = {
      id: deckId,
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };
    AppState.decks.push(newDeck);
    AppState.cardsByDeckId[deckId] = [];
    return newDeck;
  };

  // Deck 1: Hand Rankings & Hierarchy
  const deck1 = createDeckManually("Hand Rankings & Hierarchy");
  const deck1Cards = [
    {
      front: "What is the highest hand ranking in Texas Hold'em?",
      back: "Royal Flush - A, K, Q, J, 10 all of the same suit. The absolute best hand possible.",
    },
    {
      front: "How does a Straight Flush rank compared to Four of a Kind?",
      back: "Straight Flush beats Four of a Kind. Straight Flush is 2nd highest, Four of a Kind is 7th.",
    },
    {
      front: "What is the difference between a Flush and a Straight?",
      back: "Flush: any 5 cards of the same suit (not in sequence). Straight: any 5 cards in sequence (different suits). Flush ranks higher (6th vs 5th).",
    },
    {
      front: "Can you have Two Pair and also have a Full House?",
      back: "No, these are mutually exclusive hands. Two Pair = 2 different pairs + 1 kicker. Full House = 3-of-a-kind + pair (ranks higher).",
    },
    {
      front: "How many different ways can you make a Pair?",
      back: "You need exactly 2 cards of the same rank + 3 unrelated cards. Total 1.3M combinations. Pair ranks 9th (near the bottom).",
    },
    {
      front: "What beats a Flush?",
      back: "Full House, Four of a Kind, Straight Flush, and Royal Flush. Flush ranks 6th overall.",
    },
    {
      front: "When do two players have a 'kicker' situation?",
      back: "When both have the same main hand (pair, two pair, etc.), the remaining cards (kickers) determine the winner. Higher kickers win.",
    },
    {
      front: "What is High Card and when does it win?",
      back: "High Card means no pairs, straights, or flushes - just the highest card. Ranks 10th (lowest). Wins if no one else has any hand.",
    },
    {
      front:
        "Rank these hands from strongest to weakest: Straight, Flush, Three of a Kind",
      back: "Strongest to weakest: Flush (6th), Straight (5th), Three of a Kind (8th). Flush is strongest of these three.",
    },
    {
      front: "What is the minimum hand strength to win a showdown?",
      back: "Any hand. In a showdown, the best 5-card hand wins. Even High Card can win if everyone else folds.",
    },
    {
      front: "Does suit matter in hand rankings?",
      back: "No. In Texas Hold'em, all suits are equal value. A Royal Flush in hearts ties with a Royal Flush in diamonds.",
    },
    {
      front: "What is the second-best possible hand in Texas Hold'em?",
      back: "Straight Flush (specifically King-high Straight Flush). A Royal Flush is A-high Straight Flush.",
    },
    {
      front: "How many cards make up your final hand in Texas Hold'em?",
      back: "Exactly 5 cards. You use your best 5-card combination from the 7 available (2 hole cards + 5 community cards).",
    },
  ];

  deck1Cards.forEach(({ front, back }) => {
    createCard(deck1.id, front, back);
  });

  // Deck 2: Starting Hands, Statistics & Win Probabilities
  const deck2 = createDeckManually(
    "Starting Hands, Statistics & Win Probabilities",
  );
  const deck2Cards = [
    {
      front:
        "What are the best starting hands (premium hands) in Texas Hold'em?",
      back: "AA, KK, QQ, JJ (premium pairs) and AK, AQ (broadway). These win money long-term from any position.",
    },
    {
      front: "How often does AA win vs two random hands preflop?",
      back: "AA wins approximately 85% of the time preflop. It's the strongest starting hand and heavily favored over any two cards.",
    },
    {
      front: "What is position and why does it matter in poker?",
      back: "Position is your seat relative to the dealer. Late position (closer to button) is better - you act last and have more information. Early position is worst.",
    },
    {
      front: "Can you play looser (more hands) in late position? Why?",
      back: "Yes. In late position, you have information from other players' actions. You can profitably play weaker hands because you act last and see reactions.",
    },
    {
      front:
        "What percentage of hands should you play from early position vs late position?",
      back: "Early position: ~15-20% best hands only. Late position: ~40-50% wider range. Position dramatically affects hand selection.",
    },
    {
      front: "What is pocket pair strategy preflop?",
      back: "Small pairs (22-66): play for set value, need good odds. Medium pairs (77-99): can raise. High pairs (TT-AA): always raise. Depends on position and action.",
    },
    {
      front: "Why is AK considered strong preflop but struggles postflop?",
      back: "AK is premium preflop (unpaired - 'Big Slick') but is still just Ace-high without a pair. It wins 65%+ preflop but needs to connect with the board.",
    },
    {
      front:
        "What is the probability of hitting a pair or better with AK on the flop?",
      back: "Approximately 32-33%. AK will flop a pair or stronger only about 1 in 3 times, so it's vulnerable on unpaired boards.",
    },
    {
      front: "Which hands should you avoid playing from early position?",
      back: "Weak broadway (KJ, QT, JT), weak aces (A9, A8), small pairs, and all unsuited trash hands. Position is too poor to justify the risk.",
    },
    {
      front: "What does 'under the gun' mean and how should you play there?",
      back: "UTG is first to act preflop (after the big blind). Play only the strongest 12-15% of hands: premium pairs and premium broadway (AA-TT, AK, AQ).",
    },
    {
      front:
        "How does the Button position advantage translate to long-term profit?",
      back: "Button wins money long-term because: 1) You act last preflop and postflop 2) Information advantage 3) Can steal blinds more profitably. Play wider from button.",
    },
    {
      front:
        "What's the difference between 'in the money' and 'short-stacked' thinking?",
      back: "'In the money' = cash game, stack size relative to blinds. 'Short-stacked' = have few chips left to play with. Each requires different strategy.",
    },
    {
      front: "At what preflop odds should you fold a pair against a raise?",
      back: "Depends on pair strength and position. Small pair (22-66) often folds to 3-bet. Medium/high pairs usually call or reraise to maintain aggression.",
    },
  ];

  deck2Cards.forEach(({ front, back }) => {
    createCard(deck2.id, front, back);
  });

  // Deck 3: Pot Odds, Outs & Math
  const deck3 = createDeckManually("Pot Odds, Outs & Math");
  const deck3Cards = [
    {
      front: "What are pot odds and why should you calculate them?",
      back: "Pot odds = the ratio of pot size to your bet size. You compare them to your hand's winning probability to decide: if odds > probability, it's profitable to call.",
    },
    {
      front: "You need to call $10 into a $40 pot. What are your pot odds?",
      back: "4 to 1 (or 4:1). The pot is $40, you bet $10, so you're getting $40 to $10, which simplifies to 4:1. You need ~20% equity to break even.",
    },
    {
      front: "What is an 'out' in poker?",
      back: "An out is a card that will likely make you a winning hand. Example: You have 4 to a flush (9 outs), 4 to a straight (8 outs). Count outs to estimate equity.",
    },
    {
      front: "How many outs does a flush draw have?",
      back: "9 outs. You have 4 cards of a suit and need 1 more. There are 13 cards of each suit, so 13 - 4 = 9 remaining to make the flush.",
    },
    {
      front: "How many outs does an open-ended straight draw have?",
      back: "8 outs. You need one of two cards on either end (4 cards each = 8 total). Example: holding 5-6-7-8 needs a 4 or 9.",
    },
    {
      front: "What is the 'rule of 4' and 'rule of 2' in poker?",
      back: "'Rule of 4' (preflop to river): outs × 4 ≈ equity %. 'Rule of 2' (turn to river): outs × 2 ≈ equity %. Quick approximation tools.",
    },
    {
      front:
        "You have a flush draw with 9 outs. Using the Rule of 4, what's your equity?",
      back: "9 outs × 4 = 36% equity. Actually closer to 35%, but Rule of 4 gives quick approximation from preflop or flop to river.",
    },
    {
      front: "What is 'implied odds'?",
      back: "Implied odds are the pot odds adjusted for money you expect to win on future streets. Call a slightly negative pot odds bet if you expect to win extra chips later.",
    },
    {
      front:
        "You have a gutshot straight draw (4 outs) and a flush draw (9 outs). How many total outs?",
      back: "Not 13. Usually 11-12 because the cards might overlap (some cards make both). Count carefully: gutshot needs specific ranks, flush needs specific suits.",
    },
    {
      front:
        "What percentage equity do you need to call a bet with 6 outs on the turn?",
      back: "Using Rule of 2: 6 outs × 2 = 12% equity. You need the pot odds to offer 8:1 to break even (100% / 12% = 8.33).",
    },
    {
      front: "How do you calculate equity in an all-in situation?",
      back: "Count your outs, use Rule of 4 (to river) or Rule of 2 (turn to river). Or use equity calculators. Equity = outs × applicable rule.",
    },
    {
      front: "What is expected value (EV)?",
      back: "EV = (% equity × pot amount) - (% opponent wins × your bet). Positive EV is profitable long-term. All profitable calls have positive EV.",
    },
    {
      front:
        "A $100 pot. Opponent bets $50. You have 30% equity and need to call $50. Should you call?",
      back: "EV = (0.30 × $150) - (0.70 × $50) = $45 - $35 = +$10 EV. Yes, call it. Positive EV is profitable.",
    },
  ];

  deck3Cards.forEach(({ front, back }) => {
    createCard(deck3.id, front, back);
  });

  // Deck 4: Position & Table Dynamics
  const deck4 = createDeckManually("Position & Table Dynamics");
  const deck4Cards = [
    {
      front:
        "What are the six main table positions in order from best to worst?",
      back: "Button (best), Small Blind (SB), Big Blind (BB), Under the Gun (UTG/Early), Middle Position, Hijack. Button acts last, UTG acts first preflop (except blinds).",
    },
    {
      front: "What is 'small blind' position and how should you play there?",
      back: "Small Blind: between big blind and button. You're second-to-last preflop but first postflop. Play strong hands primarily. Can steal against weak big blinds.",
    },
    {
      front: "What is 'big blind' position and what's your strategy?",
      back: "Big Blind: last to act preflop (already posted). Check or raise if attacked. Defend your blind (fold less) because you've already invested. Aggressive postflop.",
    },
    {
      front: "Why do players 'steal the blinds' from the button?",
      back: "Button has best position. Raise with wider range preflop. Blinds likely fold weak hands because they're out of position. Steal free chips when it folds to you.",
    },
    {
      front: "What is the 'squeeze play'?",
      back: "3-bet when someone raises and others call. You're 'squeezing' multiple opponents with position. They fold frequently, winning the pot immediately.",
    },
    {
      front: "Why is 'acting last' an advantage in every street?",
      back: "You see all opponents' actions first. Information advantage: You know their hand strength signals, can adjust your betting, and make better decisions.",
    },
    {
      front: "How does table image affect your decisions?",
      back: "Tight image: bluffs get respect. Loose image: value bets get called more. Adjust: play more bluffs when tight, more strong hands when loose for maximum value.",
    },
    {
      front:
        "What should you do when an aggressive player is stealing from the button?",
      back: "Tighten your big blind defense range but play strong hands harder. 3-bet premium hands. Don't fold everything, but don't call with garbage either. Adapt.",
    },
    {
      front: "What is a 'good table' vs 'tough table'?",
      back: "'Good table': many loose/passive players, bad poker skills, deep stacks. Profitable. 'Tough table': skilled/tight players, shallow stacks, competitive. Leave if possible.",
    },
    {
      front: "How do you identify a weak player at the table?",
      back: "Plays too many hands, calls too much, raises predictably, doesn't adjust positions, acts out of turn, gives away information. Target these players for value.",
    },
    {
      front: "Why should you avoid 'tilt' when you're out of position?",
      back: "Out of position already disadvantageous (act first postflop). Tilt + poor position = terrible decisions. Stay calm. Make disciplined folds. Good positions give tilt recovery.",
    },
    {
      front: "What is 'seat selection' and why do professionals prioritize it?",
      back: "Choose seats with weaker players on your right (so they act before you) and stronger players on your left. Maximizes your positional advantage against weak play.",
    },
    {
      front: "How do you counter an overly aggressive player?",
      back: "Play tighter from early position, 3-bet more often to build pots, value-bet thinner, allow them to bluff-catch themselves. Don't get baited into overplaying.",
    },
  ];

  deck4Cards.forEach(({ front, back }) => {
    createCard(deck4.id, front, back);
  });

  // Save all decks to localStorage
  AppState.save();
}

/**
 * Initialize the application
 */
function initApp() {
  AppState.init();
  seedDefaultDecks();
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
