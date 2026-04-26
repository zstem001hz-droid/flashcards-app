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
  const newCardBtnEl = document.getElementById("new-card-btn");
  const deckFormEl = document.getElementById("deck-form");
  const cardFormEl = document.getElementById("card-form");
  const deckModalCancelEl = document.getElementById("deck-modal-cancel");
  const cardModalCancelEl = document.getElementById("card-modal-cancel");
  const editCardBtnEl = document.getElementById("edit-card-btn");
  const deleteCardBtnEl = document.getElementById("delete-card-btn");
  const cardListEl = document.getElementById("card-list");

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
  const currentIndex = AppState.ui.activeCardIndex;
  const currentCard = cards[currentIndex];

  if (!currentCard) return;

  const cardTextEl = document.getElementById("card-text");
  const cardIndexEl = document.getElementById("card-index");
  const cardTotalEl = document.getElementById("card-total");
  const studyCardEl = document.getElementById("study-card");

  if (cardTextEl) {
    cardTextEl.textContent = currentCard.front;
  }

  const cardBackTextEl = document.getElementById("card-back-text");
  if (cardBackTextEl) {
    cardBackTextEl.textContent = currentCard.back;
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

  if (cardIndexEl) cardIndexEl.textContent = currentIndex + 1;
  if (cardTotalEl) cardTotalEl.textContent = cards.length;

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
  cardListEl.innerHTML = "";

  cards.forEach((card, index) => {
    const li = document.createElement("li");
    li.className = "card-list-item";

    if (index === AppState.ui.activeCardIndex) {
      li.classList.add("active");
    }

    const cardPreview = document.createElement("button");
    cardPreview.className = "card-select-btn";
    cardPreview.dataset.cardIndex = index;
    cardPreview.textContent = `${index + 1}. ${card.front.substring(0, 50)}${card.front.length > 50 ? "..." : ""}`;

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

    // Boundary check: don't go beyond last card
    if (AppState.ui.activeCardIndex < cards.length - 1) {
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
