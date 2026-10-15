
const searchInput = document.getElementById("search-input");
const filterBtns = document.querySelectorAll(".filter-btn");
const sortSelect = document.getElementById("sort-select");
const sortSelectMobile = document.getElementById("sort-select-mobile");
const cardsContainer = document.getElementById("cards-container");
const emptyState = document.getElementById("empty-state");
const modalOverlay = document.getElementById("modal-overlay");
const modal = document.getElementById("modal");

const modalTitle = modal?.querySelector(".modal-title");
const modalBody = modal?.querySelector(".modal-body");
const modalClose = modal?.querySelector(".modal-close");

let listings = [];
let currentFilter = "all";
let currentSort = "newest";
let currentSearch = "";

// Accept either a public JSON array or { listings: [...] }.
async function loadData() {
  try {
    const response = await fetch("data.json?v=" + Date.now(), {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Could not load data.json");
    }

    const json = await response.json();

    if (Array.isArray(json)) {
      listings = json;
    } else if (json && Array.isArray(json.listings)) {
      listings = json.listings;
    } else {
      throw new Error("Invalid data.json format");
    }

    applyFiltersAndSort();
  } catch (error) {
    console.error("Failed to load listings:", error);

    if (cardsContainer) cardsContainer.innerHTML = "";

    if (emptyState) {
      emptyState.textContent =
        "Unable to load listings. Please try again later.";
      emptyState.style.display = "block";
    }
  }
}

function safeText(value, fallback = "N/A") {
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }
  return String(value);
}

function safeWebUrl(value) {
  try {
    const url = new URL(String(value));
    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch (_) {}
  return "";
}

// Supports an uploaded image stored as a data URL, or an HTTPS image URL.
function safeBannerSource(listing) {
  const value =
    listing.banner_image ||
    listing.banner_image_url ||
    listing.banner ||
    "";

  if (typeof value !== "string" || !value.trim()) return "";

  const source = value.trim();

  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(source)) {
    return source;
  }

  try {
    const url = new URL(source);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch (_) {}

  return "";
}

function addText(parent, tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = value;
  parent.appendChild(element);
  return element;
}

function addCardField(parent, label, value) {
  const field = document.createElement("div");
  field.className = "card-field";

  addText(field, "label", "", label);
  addText(field, "span", "", safeText(value));

  parent.appendChild(field);
}

function addDetailField(parent, label, value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return;
  }

  const item = document.createElement("div");
  item.className = "detail-item";

  addText(item, "label", "", label);
  addText(item, "span", "", String(value));

  parent.appendChild(item);
}

function applyFiltersAndSort() {
  const filtered = listings.filter((listing) => {
    if (
      currentFilter !== "all" &&
      (listing.category || "") !== currentFilter
    ) {
      return false;
    }

    if (currentSearch) {
      const searchable = [
        listing.name,
        listing.partner_group,
        listing.issuer,
        listing.description,
        listing.referral_url,
        listing.welcome_bonus,
        listing.daily_bonus,
        listing.referral_bonus,
        listing.min_withdrawal,
        listing.max_withdrawal,
        ...(Array.isArray(listing.tags) ? listing.tags : [])
      ].join(" ").toLowerCase();

      if (!searchable.includes(currentSearch.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  filtered.sort((a, b) => {
    if (a.featured === true && b.featured !== true) return -1;
    if (b.featured === true && a.featured !== true) return 1;

    if (currentSort === "name") {
      return (a.name || "").localeCompare(b.name || "");
    }

    return (b.last_checked || "").localeCompare(a.last_checked || "");
  });

  renderCards(filtered);
}

function createCard(listing) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.category = listing.category || "";
  card.dataset.last_checked = listing.last_checked || "";

  // Featured badge.
  if (listing.featured === true) {
    const badge = addText(
      card,
      "div",
      "featured-badge",
      "★ FEATURED"
    );
    badge.setAttribute("aria-label", "Featured listing");
  }

  // PER-LISTING BANNER.
  // The banner appears below Featured and above the website logo.
  const bannerSource = safeBannerSource(listing);

  if (bannerSource) {
    const bannerWrap = document.createElement("div");
    bannerWrap.className = "listing-banner";

    // Inline styles keep the banner sized correctly on mobile.
    bannerWrap.style.cssText = [
      "display:block",
      "width:100%",
      "height:clamp(75px, 20vw, 135px)",
      "margin:12px 0 16px",
      "overflow:hidden",
      "border-radius:12px",
      "background:#f1f3f6",
      "box-sizing:border-box"
    ].join(";");

    const bannerImage = document.createElement("img");
    bannerImage.src = bannerSource;
    bannerImage.alt = (listing.name || "Website") + " banner";
    bannerImage.loading = "lazy";
    bannerImage.style.cssText = [
      "display:block",
      "width:100%",
      "height:100%",
      "object-fit:contain",
      "object-position:center",
      "border-radius:12px"
    ].join(";");

    bannerImage.addEventListener("error", () => {
      bannerWrap.remove();
    });

    bannerWrap.appendChild(bannerImage);
    card.appendChild(bannerWrap);
  }

  // Website logo initials.
  const brandBadge = addText(
    card,
    "div",
    "card-brand-badge",
    (listing.name || "BD")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(word => word.charAt(0).toUpperCase())
      .join("") || "BD"
  );

  brandBadge.setAttribute(
    "aria-label",
    (listing.name || "Website") + " logo"
  );

  // Name and partner group.
  const header = document.createElement("div");
  header.className = "card-header";

  addText(
    header,
    "div",
    "card-title",
    listing.name || "Unknown Website"
  );

  const partnerGroup = listing.partner_group || listing.issuer || "";

  if (partnerGroup) {
    addText(
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

  [
    ["Last Checked", listing.last_checked],
    ["Welcome Bonus", listing.welcome_bonus],
    ["Daily Bonus", listing.daily_bonus],
    ["Referral Bonus", listing.referral_bonus],
    ["Min Withdrawal", listing.min_withdrawal],
    ["Max Withdrawal", listing.max_withdrawal]
  ].forEach(([label, value]) => addCardField(body, label, value));

  card.appendChild(body);

  // Buttons.
  const footer = document.createElement("div");
  footer.className = "card-footer";

  const viewButton = addText(
    footer,
    "a",
    "view-details-btn",
    "View Details"
  );
  viewButton.href = "#";

  viewButton.addEventListener("click", (event) => {
    event.preventDefault();
    openModal(listing);
  });

  const referralUrl = safeWebUrl(listing.referral_url);

  if (referralUrl) {
    const referralContainer = document.createElement("div");
    referralContainer.className = "referral-cta";

    const link = addText(
      referralContainer,
      "a",
      "",
      "Visit Website"
    );

    link.href = referralUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    footer.appendChild(referralContainer);
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

  filtered.forEach((listing) => {
    cardsContainer.appendChild(createCard(listing));
  });
}

function openModal(listing) {
  if (!modalTitle || !modalBody || !modalOverlay) return;

  modalTitle.textContent = listing.name || "Listing Details";
  modalBody.innerHTML = "";

  if (listing.description) {
    addText(modalBody, "p", "", listing.description);
  }

  // Show the banner in the details popup as well.
  const bannerSource = safeBannerSource(listing);

  if (bannerSource) {
    const banner = document.createElement("img");
    banner.src = bannerSource;
    banner.alt = (listing.name || "Website") + " banner";
    banner.style.cssText =
      "display:block;width:100%;max-height:220px;object-fit:contain;" +
      "border-radius:12px;margin:12px 0;";

    banner.addEventListener("error", () => banner.remove());
    modalBody.appendChild(banner);
  }

  const details = document.createElement("div");
  details.className = "detail-grid";

  const partnerGroup = listing.partner_group || listing.issuer || "";

  [
    ["Category", listing.category],
    ["Partner Group", partnerGroup],
    ["Last Checked", listing.last_checked],
    ["Welcome Bonus", listing.welcome_bonus],
    ["Daily Bonus", listing.daily_bonus],
    ["Referral Bonus", listing.referral_bonus],
    ["Min Withdrawal", listing.min_withdrawal],
    ["Max Withdrawal", listing.max_withdrawal]
  ].forEach(([label, value]) => addDetailField(details, label, value));

  modalBody.appendChild(details);

  // Withdrawal records and proof links, if present in data.json.
  const withdrawals = Array.isArray(listing.withdrawals)
    ? listing.withdrawals
    : [];

  if (withdrawals.length) {
    const section = document.createElement("section");
    section.className = "withdrawal-details";

    addText(section, "h4", "", "Withdrawal History");

    let total = 0;

    withdrawals.forEach((withdrawal) => {
      const record = document.createElement("div");
      record.className = "withdrawal-record";

      const amount = Number(withdrawal.amount || 0);
      if (Number.isFinite(amount) && amount > 0) total += amount;

      addText(
        record,
        "strong",
        "",
        Number.isFinite(amount) && amount > 0
          ? "$" + amount.toFixed(2)
          : safeText(withdrawal.amount)
      );

      if (withdrawal.date) {
        addText(record, "span", "", "Date: " + withdrawal.date);
      }

      if (withdrawal.note) {
        addText(record, "p", "", withdrawal.note);
      }

      const proof = safeWebUrl(
        withdrawal.proof_url || withdrawal.image_url || ""
      );

      if (proof) {
        const proofLink = addText(
          record,
          "a",
          "",
          "View withdrawal proof"
        );
        proofLink.href = proof;
        proofLink.target = "_blank";
        proofLink.rel = "noopener noreferrer";
      }

      section.appendChild(record);
    });

    const totalElement = addText(
      section,
      "p",
      "withdrawal-total",
      "Total Withdrawals: $" + total.toFixed(2)
    );

    totalElement.style.cssText = "color:#16803c;font-weight:700;";
    modalBody.appendChild(section);
  }

  const referralUrl = safeWebUrl(listing.referral_url);

  if (referralUrl) {
    const cta = document.createElement("div");
    cta.className = "detail-cta";

    const link = addText(cta, "a", "", "Visit Website");
    link.href = referralUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    modalBody.appendChild(cta);
  }

  modalOverlay.classList.add("active");
}

function closeModal() {
  if (modalOverlay) modalOverlay.classList.remove("active");
}

if (modalClose) {
  modalClose.addEventListener("click", closeModal);
}

if (modalOverlay) {
  modalOverlay.addEventListener("click", (event) => {
    if (event.target === modalOverlay) closeModal();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});

if (searchInput) {
  searchInput.addEventListener("input", (event) => {
    currentSearch = event.target.value.trim();
    applyFiltersAndSort();
  });
}

filterBtns.forEach((button) => {
  button.addEventListener("click", () => {
    filterBtns.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    currentFilter = button.dataset.filter || "all";
    applyFiltersAndSort();
  });
});

if (sortSelect) {
  sortSelect.addEventListener("change", (event) => {
    currentSort = event.target.value;
    if (sortSelectMobile) sortSelectMobile.value = currentSort;
    applyFiltersAndSort();
  });
}

if (sortSelectMobile) {
  sortSelectMobile.addEventListener("change", (event) => {
    currentSort = event.target.value;
    if (sortSelect) sortSelect.value = currentSort;
    applyFiltersAndSort();
  });
}

loadData();
