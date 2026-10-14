
const searchInput = document.getElementById("search-input");
const filterBtns = document.querySelectorAll(".filter-btn");
const sortSelect = document.getElementById("sort-select");
const sortSelectMobile = document.getElementById("sort-select-mobile");
const cardsContainer = document.getElementById("cards-container");
const emptyState = document.getElementById("empty-state");
const modalOverlay = document.getElementById("modal-overlay");
const modal = document.getElementById("modal");
const modalTitle = modal.querySelector(".modal-title");
const modalBody = modal.querySelector(".modal-body");
const modalClose = modal.querySelector(".modal-close");

let listings = [];
let currentFilter = "all";
let currentSort = "newest";
let currentSearch = "";

async function loadData() {
  try {
    const res = await fetch("data.json");
    if (!res.ok) throw new Error("Could not load data.json");

    const json = await res.json();
    listings = Array.isArray(json.listings) ? json.listings : [];
    renderListings();
  } catch (e) {
    console.error("Failed to load data.json:", e);
    if (cardsContainer) cardsContainer.innerHTML = "";
    if (emptyState) {
      emptyState.textContent = "Unable to load listings. Please try again later.";
      emptyState.style.display = "block";
    }
  }
}

function renderListings() {
  applyFiltersAndSort();
}

function applyFiltersAndSort() {
  let filtered = listings.filter((l) => {
    if (currentFilter !== "all" && l.category !== currentFilter) {
      return false;
    }

    if (currentSearch) {
      const s = currentSearch.toLowerCase();
      const searchFields = [
        l.name || "",
        l.description || "",
        ...(Array.isArray(l.tags) ? l.tags : [])
      ].join(" ").toLowerCase();

      if (!searchFields.includes(s)) return false;
    }

    return true;
  });

  filtered.sort((a, b) => {
    if (currentSort === "name") {
      return (a.name || "").localeCompare(b.name || "");
    }

    return (b.last_checked || "").localeCompare(a.last_checked || "");
  });

  renderCards(filtered);
}

function createCard(l) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.category = l.category || "";
  card.dataset.last_checked = l.last_checked || "";

  // Correctly render the verification icon as SVG.
  const verified = document.createElement("div");
  verified.className = "card-verified";
  verified.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">' +
    '<path fill="currentColor" d="M8 0a8 8 0 110 16A8 8 0 018 0zm3.28 5.22l-4.5 5a.75.75 0 01-1.06 0l-2-2.25a.75.75 0 111.06-1.06L7.5 9.19l3.97-4.42a.75.75 0 011.06 1.06z"></path>' +
    '</svg>';
  card.appendChild(verified);

  const header = document.createElement("div");
  header.className = "card-header";

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = l.name || "Unknown";
  header.appendChild(title);

  if (l.issuer) {
    const issuer = document.createElement("div");
    issuer.className = "card-issuer";
    issuer.textContent = "Issuer: " + l.issuer;
    header.appendChild(issuer);
  }

  card.appendChild(header);

  const body = document.createElement("div");
  body.className = "card-body";

  const fields = [
    ["Last Checked", l.last_checked],
    ["Welcome Bonus", l.welcome_bonus],
    ["Referral Bonus", l.referral_bonus],
    ["Min Withdrawal", l.min_withdrawal],
    ["Max Withdrawal", l.max_withdrawal],
    ["Turnover", l.turnover]
  ];

  fields.forEach(([label, value]) => {
    const field = document.createElement("div");
    field.className = "card-field";

    const lbl = document.createElement("label");
    lbl.textContent = label;

    const val = document.createElement("span");
    val.textContent = value || "N/A";

    field.appendChild(lbl);
    field.appendChild(val);
    body.appendChild(field);
  });

  card.appendChild(body);

  const footer = document.createElement("div");
  footer.className = "card-footer";

  const viewBtn = document.createElement("a");
  viewBtn.className = "view-details-btn";
  viewBtn.href = "#";
  viewBtn.textContent = "View Details";

  viewBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openModal(l);
  });

  footer.appendChild(viewBtn);

  if (l.referral_url) {
    const cta = document.createElement("div");
    cta.className = "referral-cta";

    const ctaLink = document.createElement("a");
    ctaLink.href = l.referral_url;
    ctaLink.target = "_blank";
    ctaLink.rel = "noopener noreferrer";
    ctaLink.textContent = "Sign Up with Referral";

    cta.appendChild(ctaLink);
    footer.appendChild(cta);
  }

  card.appendChild(footer);
  return card;
}

function renderCards(filtered) {
  if (!cardsContainer) return;

  cardsContainer.innerHTML = "";

  if (!filtered.length) {
    if (emptyState) {
      emptyState.textContent = "No matches found.";
      emptyState.style.display = "block";
    }
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  filtered.forEach((l) => {
    cardsContainer.appendChild(createCard(l));
  });
}

function openModal(l) {
  modalTitle.textContent = l.name || "Listing Details";
  modalBody.innerHTML = "";

  if (l.description) {
    const p = document.createElement("p");
    p.textContent = l.description;
    modalBody.appendChild(p);
  }

  const grid = document.createElement("div");
  grid.className = "detail-grid";

  const details = [
    ["Category", l.category],
    ["Last Checked", l.last_checked],
    ["Welcome Bonus", l.welcome_bonus],
    ["Referral Bonus", l.referral_bonus],
    ["Min Withdrawal", l.min_withdrawal],
    ["Max Withdrawal", l.max_withdrawal],
    ["Turnover", l.turnover]
  ];

  details.forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "detail-item";

    const lbl = document.createElement("label");
    lbl.textContent = label;

    const val = document.createElement("span");
    val.textContent = value || "N/A";

    item.appendChild(lbl);
    item.appendChild(val);
    grid.appendChild(item);
  });

  modalBody.appendChild(grid);

  if (l.referral_url) {
    const cta = document.createElement("div");
    cta.className = "detail-cta";

    const ctaLink = document.createElement("a");
    ctaLink.href = l.referral_url;
    ctaLink.target = "_blank";
    ctaLink.rel = "noopener noreferrer";
    ctaLink.textContent = "Sign Up with Referral";

    cta.appendChild(ctaLink);
    modalBody.appendChild(cta);
  }

  modalOverlay.classList.add("active");
}

function closeModal() {
  modalOverlay.classList.remove("active");
}

modalClose.addEventListener("click", closeModal);

modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    currentSearch = e.target.value.trim();
    applyFiltersAndSort();
  });
}

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter || "all";
    applyFiltersAndSort();
  });
});

if (sortSelect) {
  sortSelect.addEventListener("change", (e) => {
    currentSort = e.target.value;
    if (sortSelectMobile) sortSelectMobile.value = currentSort;
    applyFiltersAndSort();
  });
}

if (sortSelectMobile) {
  sortSelectMobile.addEventListener("change", (e) => {
    currentSort = e.target.value;
    if (sortSelect) sortSelect.value = currentSort;
    applyFiltersAndSort();
  });
}

loadData();
