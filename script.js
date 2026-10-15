
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

async function loadData() {
  try {
    const res = await fetch("data.json?v=" + Date.now(), {
      cache: "no-store"
    });

    if (!res.ok) throw new Error("Could not load data.json");

    const json = await res.json();

    listings = Array.isArray(json)
      ? json
      : (Array.isArray(json?.listings) ? json.listings : []);

    renderListings();
  } catch (error) {
    console.error("Failed to load data.json:", error);

    if (cardsContainer) cardsContainer.innerHTML = "";

    if (emptyState) {
      emptyState.textContent =
        "Unable to load listings. Please try again later.";
      emptyState.style.display = "block";
    }
  }
}

function renderListings() {
  applyFiltersAndSort();
}

function applyFiltersAndSort() {
  const filtered = listings.filter((listing) => {
    const categories = Array.isArray(listing.categories)
      ? listing.categories
      : [listing.category || ""];

    if (
      currentFilter !== "all" &&
      !categories.includes(currentFilter)
    ) {
      return false;
    }

    if (currentSearch) {
      const searchable = [
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

function getBannerSource(listing) {
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

function getWithdrawalAmount(withdrawal) {
  const amount = Number(
    String(withdrawal.amount ?? 0).replace(/[^0-9.]/g, "")
  );

  return Number.isFinite(amount) ? amount : 0;
}

function createCard(listing) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.category = listing.category || "";
  card.dataset.last_checked = listing.last_checked || "";

  if (listing.featured === true) {
    const badge = document.createElement("div");
    badge.className = "featured-badge";
    badge.textContent = "★ FEATURED";
    card.appendChild(badge);
  }

  // Banner above the logo on the public listing card.
  const bannerSource = getBannerSource(listing);

  if (bannerSource) {
    const wrap = document.createElement("div");
    wrap.style.cssText =
      "width:100%;height:clamp(75px,20vw,135px);" +
      "margin:12px 0 16px;overflow:hidden;border-radius:12px;" +
      "background:#f1f3f6;box-sizing:border-box;";

    const img = document.createElement("img");
    img.src = bannerSource;
    img.alt = (listing.name || "Website") + " banner";
    img.loading = "lazy";
    img.style.cssText =
      "display:block;width:100%;height:100%;" +
      "object-fit:contain;border-radius:12px;";

    img.addEventListener("error", () => wrap.remove());

    wrap.appendChild(img);
    card.appendChild(wrap);
  }

  const initials = (listing.name || "BD")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join("");

  const brand = document.createElement("div");
  brand.className = "card-brand-badge";
  brand.textContent = initials || "BD";
  card.appendChild(brand);

  const header = document.createElement("div");
  header.className = "card-header";

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = listing.name || "Unknown Website";
  header.appendChild(title);

  const partnerGroup = listing.partner_group || listing.issuer || "";

  if (partnerGroup) {
    const group = document.createElement("div");
    group.className = "card-issuer";
    group.textContent = "Partner Group: " + partnerGroup;
    header.appendChild(group);
  }

  card.appendChild(header);

  const body = document.createElement("div");
  body.className = "card-body";

  [
    ["Last Checked", listing.last_checked],
    ["Welcome Bonus", listing.welcome_bonus],
    ["Daily Bonus", listing.daily_bonus],
    ["Referral Bonus", listing.referral_bonus],
    ["Min Withdrawal", listing.min_withdrawal],
    ["Max Withdrawal", listing.max_withdrawal]
  ].forEach(([label, value]) => {
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

  const withdrawals = Array.isArray(listing.withdrawals)
    ? listing.withdrawals
    : [];

  if (withdrawals.length) {
    const total = withdrawals.reduce(
      (sum, item) => sum + getWithdrawalAmount(item),
      0
    );

    const summary = document.createElement("div");
    summary.className = "withdrawal-summary";
    summary.style.cssText =
      "margin:12px 0;padding:12px 14px;border-radius:10px;" +
      "background:#eaf8f0;color:#13795b;font-weight:800;";
    summary.textContent = "Total withdrawals recorded: $" + total.toFixed(2);
    card.appendChild(summary);
  }

  const footer = document.createElement("div");
  footer.className = "card-footer";

  const viewBtn = document.createElement("a");
  viewBtn.className = "view-details-btn";
  viewBtn.href = "#";
  viewBtn.textContent = "Details";

  viewBtn.addEventListener("click", (event) => {
    event.preventDefault();
    openModal(listing);
  });

  footer.appendChild(viewBtn);

  const referralUrl = safeWebUrl(listing.referral_url);

  if (referralUrl) {
    const cta = document.createElement("div");
    cta.className = "referral-cta";

    const link = document.createElement("a");
    link.href = referralUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Sign Up";

    cta.appendChild(link);
    footer.appendChild(cta);
  }

  card.appendChild(footer);
  return card;
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

// Full-size screenshot viewer.
function openImagePreview(src, alt = "Withdrawal screenshot") {
  let overlay = document.getElementById("proof-image-lightbox");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "proof-image-lightbox";
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:99999;" +
      "background:rgba(8,13,24,.92);display:none;" +
      "align-items:center;justify-content:center;padding:18px;";

    const image = document.createElement("img");
    image.id = "proof-image-lightbox-img";
    image.style.cssText =
      "max-width:100%;max-height:88vh;object-fit:contain;" +
      "border-radius:8px;box-shadow:0 8px 40px #0008;";

    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Close image preview");
    close.style.cssText =
      "position:absolute;right:18px;top:12px;width:46px;height:46px;" +
      "border:0;border-radius:50%;font-size:32px;" +
      "background:white;color:#101827;cursor:pointer;";

    overlay.appendChild(image);
    overlay.appendChild(close);
    document.body.appendChild(overlay);

    close.addEventListener("click", () => {
      overlay.style.display = "none";
    });

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) overlay.style.display = "none";
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") overlay.style.display = "none";
    });
  }

  const image = document.getElementById("proof-image-lightbox-img");
  image.src = src;
  image.alt = alt;
  overlay.style.display = "flex";
}

function openModal(listing) {
  if (!modalTitle || !modalBody || !modalOverlay) return;

  modalTitle.textContent = listing.name || "Listing Details";
  modalBody.innerHTML = "";

  // Banner ABOVE the description.
  const bannerSource = getBannerSource(listing);

  if (bannerSource) {
    const banner = document.createElement("img");
    banner.src = bannerSource;
    banner.alt = (listing.name || "Website") + " banner";
    banner.style.cssText =
      "display:block;width:100%;max-height:190px;object-fit:contain;" +
      "background:#f4f6fa;border-radius:12px;margin:0 0 16px;";

    banner.addEventListener("error", () => banner.remove());
    modalBody.appendChild(banner);
  }

  if (listing.description) {
    const description = document.createElement("p");
    description.textContent = listing.description;
    modalBody.appendChild(description);
  }

  const grid = document.createElement("div");
  grid.className = "detail-grid";

  const categories = Array.isArray(listing.categories)
    ? listing.categories
    : [listing.category || ""];

  const details = [
    ["Category", categories.filter(Boolean).join(", ")],
    ["Partner Group", listing.partner_group || listing.issuer],
    ["Last Checked", listing.last_checked],
    ["Welcome Bonus", listing.welcome_bonus],
    ["Daily Bonus", listing.daily_bonus],
    ["Referral Bonus", listing.referral_bonus],
    ["Min Withdrawal", listing.min_withdrawal],
    ["Max Withdrawal", listing.max_withdrawal]
  ];

  details.forEach(([label, value]) => {
    if (value === undefined || value === null || value === "") return;

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

  const withdrawals = Array.isArray(listing.withdrawals)
    ? listing.withdrawals
    : [];

  if (withdrawals.length) {
    const section = document.createElement("section");
    section.style.cssText = "margin-top:18px;";

    // Small clickable proof thumbnails above Withdrawal History.
    const proofImages = withdrawals.filter(
      item => typeof item.proof === "string" && item.proof.trim()
    );

    if (proofImages.length) {
      const gallery = document.createElement("div");
      gallery.style.cssText =
        "display:flex;flex-wrap:wrap;gap:10px;margin:0 0 18px;" +
        "padding:12px;background:#f3f8f5;border-radius:12px;";

      proofImages.forEach((withdrawal, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.title = "View withdrawal screenshot";
        button.setAttribute(
          "aria-label",
          "Open withdrawal screenshot " + (index + 1)
        );
        button.style.cssText =
          "width:76px;height:76px;padding:0;border:2px solid #d5e5dc;" +
          "border-radius:9px;overflow:hidden;background:white;cursor:pointer;";

        const thumbnail = document.createElement("img");
        thumbnail.src = withdrawal.proof;
        thumbnail.alt = "Withdrawal proof thumbnail " + (index + 1);
        thumbnail.loading = "lazy";
        thumbnail.style.cssText =
          "display:block;width:100%;height:100%;object-fit:cover;";

        button.appendChild(thumbnail);

        button.addEventListener("click", () => {
          openImagePreview(
            withdrawal.proof,
            "Withdrawal proof" +
              (withdrawal.date ? " — " + withdrawal.date : "")
          );
        });

        gallery.appendChild(button);
      });

      section.appendChild(gallery);
    }

    const total = withdrawals.reduce(
      (sum, item) => sum + getWithdrawalAmount(item),
      0
    );

    const heading = document.createElement("h3");
    heading.textContent = "Withdrawal History";
    heading.style.cssText = "margin:8px 0 6px;";
    section.appendChild(heading);

    const totalText = document.createElement("p");
    totalText.textContent = "Total Withdrawals: $" + total.toFixed(2);
    totalText.style.cssText =
      "color:#13795b;font-weight:800;margin:0 0 12px;";
    section.appendChild(totalText);

    // Daily withdrawal chart for the last 30 days.
    const days = [];
    const now = new Date();
    now.setHours(12, 0, 0, 0);

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      days.push({
        date: date.toISOString().slice(0, 10),
        amount: 0,
        label: (date.getMonth() + 1) + "/" + date.getDate()
      });
    }

    const byDate = new Map(days.map(day => [day.date, day]));

    withdrawals.forEach((item) => {
      if (byDate.has(item.date)) {
        byDate.get(item.date).amount += getWithdrawalAmount(item);
      }
    });

    const max = Math.max(1, ...days.map(day => day.amount));
    const W = 680, H = 190, L = 32, T = 12, B = 28;
    const plotW = W - L - 8;
    const plotH = H - T - B;

    const bars = days.map((day, index) => {
      const x = L + index * plotW / 30;
      const barWidth = plotW / 30 - 2;
      const height = day.amount / max * plotH;
      const y = T + plotH - height;

      return `<rect x="${x}" y="${y}" width="${Math.max(2, barWidth)}" height="${height}" rx="2" fill="#16845f"><title>${day.date}: $${day.amount.toFixed(2)}</title></rect>`;
    }).join("");

    const chart = document.createElement("div");
    chart.innerHTML =
      `<svg viewBox="0 0 ${W} ${H}" role="img" ` +
      `aria-label="Daily withdrawals over the last 30 days" ` +
      `style="width:100%;height:auto;display:block">` +
      `${bars}` +
      `<text x="${L}" y="${H - 7}" font-size="11" fill="#718096">${days[0].label}</text>` +
      `<text x="${W - 42}" y="${H - 7}" font-size="11" fill="#718096">${days[29].label}</text>` +
      `</svg>`;

    section.appendChild(chart);

    // Fixes amount/date running together on mobile.
    withdrawals.slice().sort((a, b) =>
      String(b.date || "").localeCompare(String(a.date || ""))
    ).forEach((withdrawal) => {
      const row = document.createElement("div");
      row.style.cssText =
        "display:flex;align-items:center;flex-wrap:wrap;gap:8px 14px;" +
        "padding:12px 0;border-top:1px solid #e2e7ef;";

      const amount = document.createElement("strong");
      amount.textContent =
        "$" + getWithdrawalAmount(withdrawal).toFixed(2);
      amount.style.cssText = "white-space:nowrap;";

      const date = document.createElement("span");
      date.textContent = "Date: " + (withdrawal.date || "Date unknown");
      date.style.cssText = "overflow-wrap:anywhere;";

      row.appendChild(amount);
      row.appendChild(date);

      if (withdrawal.proof) {
        const view = document.createElement("button");
        view.type = "button";
        view.textContent = "View screenshot";
        view.style.cssText =
          "border:1px solid #dce2eb;border-radius:7px;background:white;" +
          "padding:6px 9px;color:#182235;cursor:pointer;";

        view.addEventListener("click", () => {
          openImagePreview(
            withdrawal.proof,
            "Withdrawal proof" +
              (withdrawal.date ? " — " + withdrawal.date : "")
          );
        });

        row.appendChild(view);
      }

      section.appendChild(row);
    });

    modalBody.appendChild(section);
  }

  const referralUrl = safeWebUrl(listing.referral_url);

  if (referralUrl) {
    const cta = document.createElement("div");
    cta.className = "detail-cta";

    const link = document.createElement("a");
    link.href = referralUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Sign Up with Referral";

    cta.appendChild(link);
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
    filterBtns.forEach(item => item.classList.remove("active"));
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
