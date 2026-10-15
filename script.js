// =====================================================
// BONUS DIRECTORY — PUBLIC SCRIPT
// Supports data.json as either an array or { listings: [] }
// =====================================================

const searchInput = document.getElementById("search-input");
const filterBtns = document.querySelectorAll(".filter-btn");
const sortSelect = document.getElementById("sort-select");
const sortSelectMobile = document.getElementById("sort-select-mobile");
const cardsContainer = document.getElementById("cards-container");
const emptyState = document.getElementById("empty-state");
const modalOverlay = document.getElementById("modal-overlay");
const modal = document.getElementById("modal");

const modalTitle = modal
  ? modal.querySelector(".modal-title")
  : null;

const modalBody = modal
  ? modal.querySelector(".modal-body")
  : null;

const modalClose = modal
  ? modal.querySelector(".modal-close")
  : null;

let listings = [];
let currentFilter = "all";
let currentSort = "newest";
let currentSearch = "";

// -----------------------------------------------------
// LOAD LISTINGS
// -----------------------------------------------------

async function loadData() {
  try {
    const response = await fetch("data.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Could not load data.json");
    }

    const json = await response.json();

    // Supports both JSON formats:
    // [ { "name": "Example" } ]
    // { "listings": [ { "name": "Example" } ] }

    if (Array.isArray(json)) {
      listings = json;
    } else if (json && Array.isArray(json.listings)) {
      listings = json.listings;
    } else {
      throw new Error(
        "data.json must be an array or contain a listings array."
      );
    }

    renderListings();

  } catch (error) {
    console.error("Failed to load directory:", error);

    if (cardsContainer) {
      cardsContainer.innerHTML = "";
    }

    if (emptyState) {
      emptyState.textContent =
        "Unable to load listings. Please try again later.";

      emptyState.style.display = "block";
    }
  }
}

// -----------------------------------------------------
// SAFE DISPLAY HELPERS
// -----------------------------------------------------

function textValue(value, fallback = "N/A") {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return fallback;
  }

  return String(value);
}

function safeUrl(value) {
  try {
    const url = new URL(String(value));

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch (error) {
    // Invalid URL.
  }

  return "";
}

function addTextElement(parent, tag, className, value) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  element.textContent = value;
  parent.appendChild(element);

  return element;
}

function addField(parent, label, value) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return;
  }

  const field = document.createElement("div");
  field.className = "card-field";

  addTextElement(field, "label", "", label);
  addTextElement(field, "span", "", String(value));

  parent.appendChild(field);
}

function addDetailField(parent, label, value) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return;
  }

  const item = document.createElement("div");
  item.className = "detail-item";

  addTextElement(item, "label", "", label);
  addTextElement(item, "span", "", String(value));

  parent.appendChild(item);
}

// -----------------------------------------------------
// SEARCH, FILTER AND SORT
// -----------------------------------------------------

function renderListings() {
  applyFiltersAndSort();
}

function applyFiltersAndSort() {
  let filtered = listings.filter((listing) => {
    const category = listing.category || "new";

    if (
      currentFilter !== "all" &&
      category !== currentFilter
    ) {
      return false;
    }

    if (currentSearch) {
      const searchText = [
        listing.name || "",
        listing.partner_group || "",
        listing.issuer || "",
        listing.description || "",
        listing.referral_url || "",
        listing.welcome_bonus || "",
        listing.daily_bonus || "",
        listing.referral_bonus || "",
        listing.min_withdrawal || "",
        listing.max_withdrawal || "",
        ...(Array.isArray(listing.tags) ? listing.tags : [])
      ]
        .join(" ")
        .toLowerCase();

      if (!searchText.includes(currentSearch.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  filtered.sort((a, b) => {
    // Featured listings appear first.
    if (a.featured === true && b.featured !== true) {
      return -1;
    }

    if (b.featured === true && a.featured !== true) {
      return 1;
    }

    if (currentSort === "name") {
      return (a.name || "").localeCompare(b.name || "");
    }

    return (b.last_checked || "").localeCompare(
      a.last_checked || ""
    );
  });

  renderCards(filtered);
}

// -----------------------------------------------------
// CREATE LISTING CARD
// -----------------------------------------------------

function createCard(listing) {
  const card = document.createElement("div");

  card.className = "card";
  card.dataset.category = listing.category || "";
  card.dataset.last_checked = listing.last_checked || "";

  // Featured badge.
  if (listing.featured === true) {
    const badge = document.createElement("div");

    badge.className = "featured-badge";
    badge.textContent = "★ FEATURED";
    badge.setAttribute("aria-label", "Featured listing");

    card.appendChild(badge);
  }

  // Brand initials.
  const brandBadge = document.createElement("div");

  brandBadge.className = "card-brand-badge";

  const initials = (listing.name || "BD")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join("");

  brandBadge.textContent = initials || "BD";
  card.appendChild(brandBadge);

  // Listing heading.
  const header = document.createElement("div");
  header.className = "card-header";

  addTextElement(
    header,
    "div",
    "card-title",
    listing.name || "Unknown Website"
  );

  // Partner Group replaces Issuer.
  const partnerGroup =
    listing.partner_group || listing.issuer || "";

  if (partnerGroup) {
    addTextElement(
      header,
      "div",
      "card-issuer",
      "Partner Group: " + partnerGroup
    );
  }

  card.appendChild(header);

  // Bonus and withdrawal information.
  const body = document.createElement("div");
  body.className = "card-body";

  const fields = [
    ["Welcome Bonus", listing.welcome_bonus],
    ["Daily Bonus", listing.daily_bonus],
    ["Referral Bonus", listing.referral_bonus],
    ["Minimum Withdrawal", listing.min_withdrawal],
    ["Maximum Withdrawal", listing.max_withdrawal],
    ["Last Checked", listing.last_checked]
  ];

  fields.forEach(([label, value]) => {
    const field = document.createElement("div");

    field.className = "card-field";

    addTextElement(field, "label", "", label);
    addTextElement(field, "span", "", textValue(value));

    body.appendChild(field);
  });

  card.appendChild(body);

  // Card buttons.
  const footer = document.createElement("div");
  footer.className = "card-footer";

  const viewButton = document.createElement("a");

  viewButton.className = "view-details-btn";
  viewButton.href = "#";
  viewButton.textContent = "View Details";

  viewButton.addEventListener("click", (event) => {
    event.preventDefault();
    openModal(listing);
  });

  footer.appendChild(viewButton);

  const referralUrl = safeUrl(listing.referral_url);

  if (referralUrl) {
    const referralContainer = document.createElement("div");
    referralContainer.className = "referral-cta";

    const referralLink = document.createElement("a");

    referralLink.href = referralUrl;
    referralLink.target = "_blank";
    referralLink.rel = "noopener noreferrer";
    referralLink.textContent = "Visit Website";

    referralContainer.appendChild(referralLink);
    footer.appendChild(referralContainer);
  }

  card.appendChild(footer);

  return card;
}

// -----------------------------------------------------
// DISPLAY CARDS
// -----------------------------------------------------

function renderCards(filtered) {
  if (!cardsContainer) {
    return;
  }

  cardsContainer.innerHTML = "";

  if (!filtered.length) {
    if (emptyState) {
      emptyState.textContent = "No matches found.";
      emptyState.style.display = "block";
    }

    return;
  }

  if (emptyState) {
    emptyState.style.display = "none";
  }

  filtered.forEach((listing) => {
    cardsContainer.appendChild(createCard(listing));
  });
}

// -----------------------------------------------------
// LISTING DETAILS MODAL
// -----------------------------------------------------

function openModal(listing) {
  if (!modalTitle || !modalBody || !modalOverlay) {
    return;
  }

  modalTitle.textContent =
    listing.name || "Listing Details";

  modalBody.innerHTML = "";

  if (listing.description) {
    addTextElement(
      modalBody,
      "p",
      "",
      listing.description
    );
  }

  const details = document.createElement("div");
  details.className = "detail-grid";

  const partnerGroup =
    listing.partner_group || listing.issuer || "";

  const detailFields = [
    ["Category", listing.category],
    ["Partner Group", partnerGroup],
    ["Last Checked", listing.last_checked],
    ["Welcome Bonus", listing.welcome_bonus],
    ["Daily Bonus", listing.daily_bonus],
    ["Referral Bonus", listing.referral_bonus],
    ["Minimum Withdrawal", listing.min_withdrawal],
    ["Maximum Withdrawal", listing.max_withdrawal]
  ];

  detailFields.forEach(([label, value]) => {
    addDetailField(details, label, value);
  });

  modalBody.appendChild(details);

  // Show uploaded withdrawal records, if present.
  const withdrawals = Array.isArray(listing.withdrawals)
    ? listing.withdrawals
    : [];

  const withdrawalTotal = withdrawals.reduce(
    (total, withdrawal) => {
      const amount = Number(
        withdrawal.amount ??
        withdrawal.total ??
        0
      );

      return total + (
        Number.isFinite(amount) && amount > 0
          ? amount
          : 0
      );
    },
    0
  );

  if (withdrawals.length > 0) {
    const withdrawalSection = document.createElement("section");
    withdrawalSection.className = "withdrawal-details";

    addTextElement(
      withdrawalSection,
      "h4",
      "",
      "Withdrawal History"
    );

    const total = addTextElement(
      withdrawalSection,
      "p",
      "withdrawal-total",
      "Total Withdrawals: $" +
        withdrawalTotal.toLocaleString("en-AU", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
    );

    total.style.color = "#16803c";
    total.style.fontWeight = "700";

    withdrawals.forEach((withdrawal) => {
      const record = document.createElement("div");
      record.className = "withdrawal-record";

      const amount = Number(withdrawal.amount || 0);

      addTextElement(
        record,
        "strong",
        "",
        Number.isFinite(amount) && amount > 0
          ? "$" + amount.toFixed(2)
          : textValue(withdrawal.amount)
      );

      if (withdrawal.date) {
        addTextElement(
          record,
          "span",
          "",
          "Date: " + withdrawal.date
        );
      }

      if (withdrawal.note) {
        addTextElement(
          record,
          "p",
          "",
          withdrawal.note
        );
      }

      const proof = safeUrl(
        withdrawal.proof_url ||
        withdrawal.image_url ||
        withdrawal.image ||
        ""
      );

      // Display an uploaded image only when a valid URL exists.
      if (proof) {
        const imageLink = document.createElement("a");

        imageLink.href = proof;
        imageLink.target = "_blank";
        imageLink.rel = "noopener noreferrer";
        imageLink.textContent = "View withdrawal proof";

        record.appendChild(imageLink);
      }

      withdrawalSection.appendChild(record);
    });

    modalBody.appendChild(withdrawalSection);
  }

  // Referral link.
  const referralUrl = safeUrl(listing.referral_url);

  if (referralUrl) {
    const cta = document.createElement("div");
    cta.className = "detail-cta";

    const link = document.createElement("a");

    link.href = referralUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Visit Website";

    cta.appendChild(link);
    modalBody.appendChild(cta);
  }

  modalOverlay.classList.add("active");
}

// -----------------------------------------------------
// CLOSE MODAL
// -----------------------------------------------------

function closeModal() {
  if (modalOverlay) {
    modalOverlay.classList.remove("active");
  }
}

if (modalClose) {
  modalClose.addEventListener("click", closeModal);
}

if (modalOverlay) {
  modalOverlay.addEventListener("click", (event) => {
    if (event.target === modalOverlay) {
      closeModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
  }
});

// -----------------------------------------------------
// SEARCH INPUT
// -----------------------------------------------------

if (searchInput) {
  searchInput.addEventListener("input", (event) => {
    currentSearch = event.target.value.trim();
    applyFiltersAndSort();
  });
}

// -----------------------------------------------------
// CATEGORY FILTER BUTTONS
// -----------------------------------------------------

filterBtns.forEach((button) => {
  button.addEventListener("click", () => {
    filterBtns.forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    currentFilter = button.dataset.filter || "all";

    applyFiltersAndSort();
  });
});

// -----------------------------------------------------
// SORTING
// -----------------------------------------------------

if (sortSelect) {
  sortSelect.addEventListener("change", (event) => {
    currentSort = event.target.value;

    if (sortSelectMobile) {
      sortSelectMobile.value = currentSort;
    }

    applyFiltersAndSort();
  });
}

if (sortSelectMobile) {
  sortSelectMobile.addEventListener("change", (event) => {
    currentSort = event.target.value;

    if (sortSelect) {
      sortSelect.value = currentSort;
    }

    applyFiltersAndSort();
  });
}

// -----------------------------------------------------
// START
// -----------------------------------------------------

loadData();
