const offers = [
  {
    date: "Не ограничена сроком",
    title: "Промокод на первый заказ",
    description: "Скидка 10% на первый заказ по промокоду «OUDMOOD10». Акция действует только на первый заказ."
  },
  {
    date: "Не ограничена сроком",
    title: "Бережем планету и ваш бюджет",
    description: "При повторной покупке можем наполнить ваш прежний флакончик со скидкой по объёму:\n3 мл — 70 ₽\n6 мл — 85 ₽\n12 мл — 100 ₽"
  },
  {
    date: "Не ограничена сроком",
    title: "Скидка 5% на заказ",
    description: "Сделайте сторис в любой соцсети со ссылкой на наш Telegram-канал (https://t.me/bahur_kazan), пришлите нам скриншот — и получите скидку 5% на следующий заказ. Можно использовать сколько угодно раз!"
  },
  {
    date: "Для первых 10 покупателей",
    title: "Delina, Black Opium, Terenzi, Amouage, Debora",
    description: "При покупке 5 мускусов Delina, Black Opium, Terenzi, Amouage и Debora (по 3 мл — 7 500 ₽) получите подарок на выбор:\n• любой элитный мускус 3 мл (стоимостью 1 500 ₽),\n• любой стандартный мускус 6 мл (также 1 500 ₽)."
  },
  {
    date: "Пока есть мускусы в наличии",
    title: "На заказ мускусов от 10 000 ₽",
    description: "При покупке мускусов от 10 000 ₽ можно получить в подарок один аромат из элитной коллекции в объёме 3 мл:\n1. Сливочный банан\n2. Цветение апельсинового дерева\n3. Джо Малон\n4. Red Tobacco\n5. Розовый элит\n6. Бабочка\n7. Terenzi\n8. Арабская зелень\n9. Арбузно-карамельный леденец\n10. Narciso"
  },
  {
    date: "Пока есть косметички в наличии",
    title: "Косметичка в подарок",
    description: "При покупке на сумму от 25 000 ₽ коричневая косметичка в подарок — на выбор с золотой или серебряной фурнитурой."
  },
  {
    date: "Пока есть шопперы в наличии",
    title: "Шоппер в подарок",
    description: "При покупке на сумму от 20 000 ₽ шоппер в подарок."
  },
  {
    date: "Пока есть косметички-органайзеры в наличии",
    title: "Скидка на косметичку-органайзер",
    description: "При покупке набора для бахура косметичка-органайзер со скидкой: вместо 2 990 ₽ стоимость косметички — 1 990 ₽."
  }
];

const offersList = document.querySelector("#offers-list");

offers.forEach((offer) => {
  const card = document.createElement("article");
  card.className = "offer-card";

  const date = document.createElement("time");
  date.className = "offer-date";
  date.textContent = `Срок акции: ${offer.date}`;

  const title = document.createElement("h2");
  title.textContent = offer.title;

  const description = document.createElement("p");
  description.className = "offer-description";
  description.textContent = offer.description;

  const descriptionArea = document.createElement("div");
  descriptionArea.className = "offer-description-area";
  descriptionArea.append(description);

  const toggle = document.createElement("button");
  toggle.className = "offer-toggle is-hidden";
  toggle.type = "button";
  toggle.textContent = "Подробнее";
  toggle.setAttribute("aria-expanded", "false");
  toggle.addEventListener("click", () => {
    const expanded = card.classList.toggle("is-expanded");
    toggle.textContent = expanded ? "Скрыть" : "Подробнее";
    toggle.setAttribute("aria-expanded", String(expanded));
  });

  card.append(date, title, descriptionArea, toggle);
  offersList.append(card);

  requestAnimationFrame(() => {
    toggle.classList.toggle("is-hidden", description.scrollHeight <= description.clientHeight + 1);
  });
});
