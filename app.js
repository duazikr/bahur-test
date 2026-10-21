
let products = [];
const STORAGE = { consent: "bahur-consent", step: "bahur-step", gender: "bahur-gender", scents: "bahur-scents", beginner: "bahur-beginner", cart: "bahur-cart" };
const getStored = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.error(`Не удалось прочитать сохранённые данные (${key}).`, error);
    return fallback;
  }
};
const saveStored = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Не удалось сохранить данные (${key}).`, error);
    showToast("Не удалось сохранить выбор в браузере");
  }
};

let gender = getStored(STORAGE.gender, "");
let selectedScents = getStored(STORAGE.scents, []);
if (!Array.isArray(selectedScents)) selectedScents = [];
let beginnerOnly = getStored(STORAGE.beginner, false) === true;
let cart = getStored(STORAGE.cart, []);
if (!Array.isArray(cart)) cart = [];
let toastTimer;
const isNestedPage = window.location.pathname.includes("/catalog/") || window.location.pathname.includes("/offers/") || window.location.pathname.includes("/faq/");
const assetPath = (path) => `${isNestedPage ? "../" : ""}${path}`;

const resultsGrid = document.querySelector("#recommendations");
const catalogGrid = document.querySelector("#all-products");
const template = document.querySelector("#product-template");
const resultButton = document.querySelector("#show-results");
const beginnerToggle = document.querySelector("#beginner-toggle");

function formatPrice(price) {
  return `${new Intl.NumberFormat("ru-RU").format(price)} ₽`;
}

function parseProducts(source) {
  const sections = source.split(/(?=^\s*\d+\.\s*Изображение\s*:)/m).map((section) => section.trim()).filter(Boolean);
  const canonicalTags = new Map([
    ["ароматы чистоты", "Ароматы чистоты"],
    ["сладкие", "Сладкие"],
    ["цветочные", "Цветочные"],
    ["фруктовые", "Фруктовые"],
    ["цитрусовые", "Цитрусовые"],
    ["свежие зеленые", "Свежие зелёные"],
    ["древесные", "Древесные"],
    ["восточные", "Восточные"]
  ]);
  const badgeNames = new Map([
    ["new", "NEW"],
    ["хит", "ХИТ"],
    ["только у нас", "ТОЛЬКО У НАС"],
    ["мало", "МАЛО"]
  ]);
  const readField = (section, field) => section.match(new RegExp(`^\\s*${field}\\s*:\\s*(.*)$`, "mi"))?.[1]?.trim() || "";

  return sections.map((section, index) => {
    const image = section.match(/^\s*\d+\.\s*Изображение\s*:\s*(.+)$/mi)?.[1]?.trim();
    const name = readField(section, "Название");
    const description = section.match(/^\s*Описание\s*:\s*([\s\S]*?)(?=^\s*Теги\s*:)/mi)?.[1]?.trim();
    const rawTags = readField(section, "Теги").split(",").map((tag) => tag.trim()).filter(Boolean);
    const badges = readField(section, "Плашка").split(",")
      .map((value) => badgeNames.get(value.trim().toLocaleLowerCase("ru-RU").replaceAll("ё", "е")))
      .filter(Boolean);
    const subcategory = readField(section, "Подкатегория");
    const gender = readField(section, "Пол").split(",").map((value) => value.trim()).filter(Boolean);
    const prices = [...section.matchAll(/^\s*(\d+(?:[.,]\d+)?)\s*мл\s*[-–—]\s*([\d\s]+)\s*₽?\s*$/gmi)]
      .map(([, size, price]) => ({ size: `${size.replace(",", ".")} мл`, price: Number(price.replace(/\s/g, "")) }))
      .filter(({ price }) => Number.isFinite(price) && price > 0);
    const id = Number(section.match(/^\s*(\d+)\./)?.[1]) || index + 1;
    const tags = rawTags
      .filter((tag) => tag.toLocaleLowerCase("ru-RU") !== "для новичков")
      .map((tag) => canonicalTags.get(tag.toLocaleLowerCase("ru-RU").replaceAll("ё", "е")) || tag);

    if (!image || !name || !description || !gender.length || !prices.length) {
      throw new Error(`Не удалось прочитать карточку «${name || `№${id}`}» в mcatalog/musk.txt`);
    }
    return { id, image, name, description, tags, beginner: rawTags.some((tag) => tag.toLocaleLowerCase("ru-RU") === "для новичков"), gender, prices, badges, subcategory };
  });
}

const localProductsSource = window.BAHUR_PRODUCTS_SOURCE || null;
if (localProductsSource) products = parseProducts(localProductsSource);

let productsSource = null;
async function refreshProducts() {
  if (window.location.protocol === "file:" && localProductsSource) return;
  try {
    const response = await fetch(assetPath("mcatalog/musk.txt"), { cache: "no-store" });
    if (!response.ok) throw new Error(`Не удалось загрузить mcatalog/musk.txt (${response.status})`);
    const source = await response.text();
    if (source === productsSource) return;

    const loadedProducts = parseProducts(source);
    products = loadedProducts;
    productsSource = source;
    const validIds = new Set(products.map((product) => product.id));
    const nextCart = cart.filter((item) => validIds.has(item.id));
    if (nextCart.length !== cart.length) {
      cart = nextCart;
      saveStored(STORAGE.cart, cart);
    }
    updateCatalogFilterOptions();
    renderCatalog();
    updateScreen();
    renderCart();
  } catch (error) {
    console.error(error);
  }
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2200);
}

function updateScreen() {
  const selectionCount = document.querySelector("#selection-count");
  if (selectionCount) selectionCount.textContent = `Выбрано ${selectedScents.length} из 3`;
  if (beginnerToggle) beginnerToggle.checked = beginnerOnly;
  document.querySelectorAll(".scent-choice").forEach((button) => {
    button.setAttribute("aria-pressed", String(selectedScents.includes(button.dataset.scent)));
  });
  if (resultButton) resultButton.disabled = selectedScents.length !== 3;
  document.querySelector("#cart-count").textContent = String(cart.reduce((sum, item) => sum + item.quantity, 0));
  const resultsView = document.querySelector("#results");
  if (resultsView && !resultsView.classList.contains("is-hidden")) renderRecommendations();
}

function showStep(step) {
  if (getStored(STORAGE.consent, false) !== true && step !== "declined") step = "consent";
  document.querySelectorAll(".flow-screen").forEach((screen) => screen.classList.add("is-hidden"));
  const screen = document.querySelector(`#${step}-screen`) || document.querySelector(`#${step}`);
  if (screen) screen.classList.remove("is-hidden");
  if (step === "results") renderRecommendations();
  if (["consent", "declined", "welcome", "quiz", "results"].includes(step)) saveStored(STORAGE.step, step);
  document.body.dataset.step = step;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function createProductCard(product) {
  const card = template.content.firstElementChild.cloneNode(true);
  const image = card.querySelector(".product-image");
  image.src = assetPath(`mcatalog/${product.image}`);
  image.alt = `Мускус ${product.name}`;
  const sticker = card.querySelector(".product-stickers");
  if (product.badges?.length && sticker) {
    sticker.classList.remove("is-hidden");
    if (product.badges.length > 1) sticker.classList.add("product-stickers-multiple");
    product.badges.forEach((badge) => {
      const label = document.createElement("span");
      const badgeClass = badge === "NEW" ? "new" : badge === "ХИТ" ? "hit" : badge === "МАЛО" ? "few" : "exclusive";
      label.className = `product-sticker product-sticker-${badgeClass}`;
      label.textContent = badge;
      sticker.append(label);
    });
  }
  card.querySelector(".product-gender").textContent = product.gender.join(" • ");
  card.querySelector(".product-name").textContent = product.name;
  card.querySelector(".product-description").textContent = product.description;
  const select = card.querySelector(".size-select");
  product.prices.forEach(({ size, price }, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${size} — ${formatPrice(price)}`;
    select.append(option);
  });
  card.querySelector(".product-price").textContent = `от ${formatPrice(product.prices[0].price)}`;
  select.addEventListener("change", () => {
    card.querySelector(".product-price").textContent = formatPrice(product.prices[Number(select.value)].price);
  });
  card.querySelector(".add-to-cart").addEventListener("click", () => {
    const priceOption = product.prices[Number(select.value)];
    addToCart(product, priceOption);
  });
  return card;
}

function renderCatalog() {
  if (!catalogGrid) return;
  const query = (document.querySelector("#catalog-search")?.value || "").trim().toLocaleLowerCase("ru-RU");
  const category = document.querySelector("#catalog-category")?.value || "";
  const gender = document.querySelector("#catalog-gender")?.value || "";
  const visibleProducts = products.filter((product) => {
    const matchesQuery = !query || `${product.name} ${product.description}`.toLocaleLowerCase("ru-RU").includes(query);
    const matchesCategory = !category || product.subcategory === category;
    const matchesGender = !gender || product.gender.includes(gender);
    return matchesQuery && matchesCategory && matchesGender;
  });
  catalogGrid.replaceChildren(...visibleProducts.map((product) => createProductCard(product)));
  document.querySelector("#catalog-empty")?.classList.toggle("is-hidden", visibleProducts.length > 0);
  const catalogCount = document.querySelector("#catalog-count");
  if (catalogCount) {
    const count = catalogGrid.children.length;
    const lastTwo = count % 100;
    const unit = count % 10;
    const noun = unit === 1 && lastTwo !== 11 ? "мускус" : unit >= 2 && unit <= 4 && (lastTwo < 12 || lastTwo > 14) ? "мускуса" : "мускусов";
    catalogCount.textContent = `${count} ${noun}`;
  }
}

function updateCatalogFilterOptions() {
  const categorySelect = document.querySelector("#catalog-category");
  if (!categorySelect) return;
  const selected = categorySelect.value;
  const categories = [...new Set(products.map((product) => product.subcategory).filter(Boolean))];
  categorySelect.replaceChildren(new Option("Все подкатегории", ""));
  categories.forEach((category) => categorySelect.add(new Option(category, category)));
  categorySelect.value = categories.includes(selected) ? selected : "";
}

document.querySelector("#catalog-search")?.addEventListener("input", renderCatalog);
document.querySelector("#catalog-category")?.addEventListener("change", renderCatalog);
document.querySelector("#catalog-gender")?.addEventListener("change", renderCatalog);
document.querySelector("#catalog-filter-reset")?.addEventListener("click", () => {
  document.querySelector("#catalog-search").value = "";
  document.querySelector("#catalog-category").value = "";
  document.querySelector("#catalog-gender").value = "";
  renderCatalog();
});

function renderRecommendations() {
  if (!resultsGrid) return;
  const ranked = products
    .filter((product) => product.gender.includes(gender))
    .filter((product) => !beginnerOnly || product.beginner)
    .map((product) => ({
      product,
      matches: product.tags.filter((tag) => selectedScents.includes(tag)).length
    }))
    .filter(({ matches }) => matches > 0)
    .sort((a, b) => b.matches - a.matches || (beginnerOnly ? Number(b.product.beginner) - Number(a.product.beginner) : 0) || a.product.id - b.product.id)
    .slice(0, 10);

  resultsGrid.replaceChildren(...ranked.map(({ product }) => createProductCard(product)));
  const empty = document.querySelector("#empty-state");
  empty.classList.toggle("is-hidden", ranked.length > 0);
  resultsGrid.classList.toggle("is-hidden", ranked.length === 0);
  document.querySelector("#results-description").textContent =
    `Для тебя: ${gender.toLowerCase()}, ${selectedScents.join(", ").toLowerCase()}${beginnerOnly ? ", для новичков" : ""}.`;
}

function openResults() {
  if (selectedScents.length !== 3) return;
  showStep("results");
}

function addToCart(product, priceOption) {
  const existing = cart.find((item) => item.id === product.id && item.size === priceOption.size);
  if (existing) existing.quantity += 1;
  else cart.push({ id: product.id, size: priceOption.size, price: priceOption.price, quantity: 1 });
  saveStored(STORAGE.cart, cart);
  updateScreen();
  renderCart();
  showToast(`${product.name} добавлен в корзину`);
}

function renderCart() {
  const items = document.querySelector("#cart-items");
  items.replaceChildren();
  if (!cart.length) {
    const empty = document.createElement("p");
    empty.className = "cart-empty";
    empty.textContent = "Корзина пока пуста";
    items.append(empty);
  } else {
    cart.forEach((item, index) => {
      const product = products.find((entry) => entry.id === item.id);
      if (!product) return;
      const line = document.createElement("div");
      line.className = "cart-line";
      const image = document.createElement("img");
      image.src = assetPath(`mcatalog/${product.image}`);
      image.alt = "";
      const details = document.createElement("div");
      const name = document.createElement("h3");
      name.textContent = product.name;
      const description = document.createElement("p");
      description.textContent = `${item.size} · ${item.quantity} шт.`;
      details.append(name, description);
      const price = document.createElement("strong");
      price.textContent = formatPrice(item.price * item.quantity);
      const quantity = document.createElement("div");
      quantity.className = "cart-quantity";
      const decrease = document.createElement("button");
      decrease.type = "button";
      decrease.textContent = "−";
      decrease.setAttribute("aria-label", `Уменьшить количество ${product.name}`);
      decrease.addEventListener("click", () => {
        if (item.quantity <= 1) cart.splice(index, 1);
        else item.quantity -= 1;
        saveStored(STORAGE.cart, cart);
        updateScreen();
        renderCart();
      });
      const quantityValue = document.createElement("span");
      quantityValue.textContent = String(item.quantity);
      const increase = document.createElement("button");
      increase.type = "button";
      increase.textContent = "+";
      increase.setAttribute("aria-label", `Увеличить количество ${product.name}`);
      increase.addEventListener("click", () => {
        item.quantity += 1;
        saveStored(STORAGE.cart, cart);
        updateScreen();
        renderCart();
      });
      quantity.append(decrease, quantityValue, increase);
      line.append(image, details, price, quantity);
      items.append(line);
    });
  }
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelector("#drawer-count").textContent = String(count);
  document.querySelector("#cart-total").textContent = formatPrice(cart.reduce((sum, item) => sum + item.price * item.quantity, 0));
  document.querySelector("#cart-summary").classList.toggle("is-hidden", cart.length === 0);
}

function setCartOpen(open) {
  document.body.classList.toggle("cart-open", open);
  document.querySelector("#cart-drawer").setAttribute("aria-hidden", String(!open));
  if (open) renderCart();
}

function setupAnnouncementMarquee() {
  document.querySelectorAll(".announcement-bar").forEach((bar) => {
    const track = bar.querySelector(".announcement-track");
    const source = track?.querySelector("span");
    if (!track || !source) return;
    const message = source.textContent;

    const fillTrack = () => {
      track.replaceChildren();
      const sample = document.createElement("span");
      sample.textContent = message;
      track.append(sample);
      const itemWidth = sample.getBoundingClientRect().width;
      if (!itemWidth) return;

      // Keep two identical halves, each at least as wide as the viewport.
      const repeatsPerHalf = Math.max(2, Math.ceil(bar.clientWidth / itemWidth));
      for (let index = 1; index < repeatsPerHalf * 2; index += 1) {
        const copy = sample.cloneNode(true);
        track.append(copy);
      }
      track.style.animationDuration = `${Math.max(24, (track.scrollWidth / 42))}s`;
    };

    fillTrack();
    if (document.fonts?.ready) document.fonts.ready.then(fillTrack);
    let resizeFrame;
    window.addEventListener("resize", () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(fillTrack);
    }, { passive: true });
  });
}

document.querySelectorAll(".gender-card").forEach((button) => {
  button.addEventListener("click", () => {
    gender = button.dataset.gender;
    saveStored(STORAGE.gender, gender);
    updateScreen();
    showStep("quiz");
  });
});

document.querySelector("#change-gender")?.addEventListener("click", () => {
  showStep("welcome");
});

document.querySelectorAll(".scent-choice").forEach((button) => {
  button.addEventListener("click", () => {
    const scent = button.dataset.scent;
    if (selectedScents.includes(scent)) selectedScents = selectedScents.filter((item) => item !== scent);
    else if (selectedScents.length < 3) selectedScents = [...selectedScents, scent];
    else selectedScents = [...selectedScents.slice(0, -1), scent];
    saveStored(STORAGE.scents, selectedScents);
    updateScreen();
  });
});

beginnerToggle?.addEventListener("change", () => {
  beginnerOnly = beginnerToggle.checked;
  saveStored(STORAGE.beginner, beginnerOnly);
  updateScreen();
});

resultButton?.addEventListener("click", openResults);
document.querySelector("#edit-preferences")?.addEventListener("click", () => {
  showStep("quiz");
});
document.querySelector("#accept-consent")?.addEventListener("click", () => {
  saveStored(STORAGE.consent, true);
  showStep("welcome");
});
document.querySelector("#decline-consent")?.addEventListener("click", () => {
  saveStored(STORAGE.consent, false);
  showStep("declined");
});
document.querySelector("#retry-consent")?.addEventListener("click", () => showStep("consent"));
if (document.querySelector("#consent-screen")) {
  document.querySelectorAll(".bottom-nav a").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (getStored(STORAGE.consent, false) === true) return;
      event.preventDefault();
      showStep("consent");
    });
  });
}
document.querySelector("#home-nav")?.addEventListener("click", () => showStep("welcome"));
document.querySelector("#cart-open").addEventListener("click", () => setCartOpen(true));
document.querySelector("#cart-close").addEventListener("click", () => setCartOpen(false));
document.querySelector("#drawer-backdrop").addEventListener("click", () => setCartOpen(false));
document.querySelectorAll("[data-modal-open]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(`#${button.dataset.modalOpen}`).showModal();
  });
});
document.querySelectorAll(".site-modal .modal-close").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});
document.querySelectorAll(".site-modal").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.close();
  });
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setCartOpen(false);
});

updateCatalogFilterOptions();
renderCatalog();
setupAnnouncementMarquee();
updateScreen();
renderCart();
const savedStep = getStored(STORAGE.consent, false) !== true && new URLSearchParams(window.location.search).get("consent") === "retry"
  ? "consent"
  : getStored(STORAGE.step, gender ? (selectedScents.length === 3 ? "results" : "quiz") : "welcome");
showStep(savedStep);
refreshProducts();
window.setInterval(refreshProducts, 30000);
window.addEventListener("focus", refreshProducts);
