import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const categories = [
  { name: "Скара", sort_order: 1 },
  { name: "Сандвичи", sort_order: 2 },
  { name: "Предястия", sort_order: 3 },
  { name: "Салати", sort_order: 4 },
  { name: "Гарнитури", sort_order: 5 },
  { name: "Безалкохолни напитки", sort_order: 6 },
  { name: "Алкохолни напитки", sort_order: 7 },
  { name: "Бира", sort_order: 8 },
  { name: "Вино", sort_order: 9 },
  { name: "Топли напитки", sort_order: 10 },
];

const itemsByCategory = {
  Скара: [
    { name: "Свинско кюфте 80 гр.", price: 1.8 },
    { name: "Свинско кебапче 80 гр.", price: 1.8 },
    { name: "Домашното кюфте 120 гр.", price: 2.8 },
    { name: "Телешко кюфте 120 гр.", price: 2.8 },
    { name: "Родопска кълцана наденичка 100 гр.", price: 2.5 },
    { name: "Свинско шишче 100 гр.", price: 3.4 },
    { name: "Пилешко шишче от бут с марината 100 гр.", price: 3.4 },
    { name: "Свинска вратна пържола без кост 200 гр.", price: 5.9 },
    { name: "Свински ребърца 300 гр.", price: 5.8 },
    { name: "Шницел 120 гр.", price: 3.6 },
    { name: "Пилешка пържола от бут 260 гр.", price: 5.8 },
    { name: "Пилешка пържола филе 250 гр.", price: 5.8 },
    { name: "Адана кебап (близалка) 40 гр.", price: 2.5 },
  ],
  Сандвичи: [
    { name: "Хот дог", price: 2.5 },
    { name: "Хот дог с пържени картофи", price: 3.2 },
    { name: "Бургер с домашно кюфте", price: 6.2 },
    { name: "Бургер с телешко кюфте", price: 6.2 },
  ],
  Предястия: [
    { name: "Панирани кашкавалчета 8 бр.", price: 4.9 },
    { name: "Пилешки крилца 200 гр.", price: 6.9 },
    { name: "Сирене на плоча (със зехтин и червен пипер) 100 гр.", price: 4.2 },
    { name: "Яйца на плоча 3 бр.", price: 4.2 },
    { name: "Пържени картофи 250 гр.", price: 3.9 },
    { name: "Пържени картофи със сирене 300 гр.", price: 4.9 },
  ],
  Салати: [
    { name: "Салата зеле и моркови 300 гр.", price: 3.9 },
    { name: "Шопска салата 300 гр.", price: 5.8 },
    { name: "Таратор 400 мл.", price: 3.2 },
  ],
  Гарнитури: [
    { name: "Лютеница / Чеснов сос 30 гр.", price: 1.6 },
    { name: "Люти чушлета 30 гр.", price: 1.6 },
    { name: "Гарнитура зеле и моркови 50 гр.", price: 1.9 },
    { name: "Гарнитура домати и краставици", price: 2.8 },
    { name: "Гарнитура пържени картофи 50 гр.", price: 2.8 },
    { name: "Питка", price: 0.6 },
    { name: "Мини франзела", price: 0.9 },
  ],
  "Безалкохолни напитки": [
    { name: "Кока Кола, Фанта, Спрайт, Тоник, Швепс, Сода стъкло 250 мл.", price: 2 },
    { name: "Кока Кола, Фанта, Спрайт, Тоник, Швепс, Сода кен 330 мл.", price: 2 },
    { name: "Кока Кола, Фанта, Спрайт 500 мл.", price: 2.5 },
    { name: "Мин. вода Банкя стъкло 250 мл.", price: 1.2 },
    { name: "Мин. вода Банкя / Роса 500 мл.", price: 1.2 },
    { name: "Мин. вода Банкя / Роса 1.5 л.", price: 1.8 },
    { name: "Натурален сок Cappy сламка", price: 2 },
    { name: "Натурален сок Cappy стъкло 250 мл.", price: 2 },
    { name: "Сок Сонда 330 мл.", price: 2 },
    { name: "Студен чай San Benedetto 500 мл.", price: 2 },
    { name: "Студен чай Fuzetea стъкло 250 мл.", price: 2 },
    { name: "Домашна лимонада Бъзко - чаша 400 мл.", price: 4.1 },
    { name: "Домашна лимонада Бъзко - кана 1 л.", price: 7.2 },
  ],
  "Алкохолни напитки": [
    { name: "Водка Руски стандарт / Собиески / Финландия 50 мл.", price: 3.2 },
    { name: "Ракия Сунгурларска 50 мл.", price: 2.5 },
    { name: "Ракия Бургас 63 50 мл.", price: 3.2 },
    { name: "Уиски Jameson / J&B и др. 50 мл.", price: 3.5 },
    { name: "Узо Plomari 50 мл.", price: 3.2 },
    { name: "Ром Barcelo 50 мл.", price: 3.5 },
    { name: "Jagermeister 50 мл.", price: 2.8 },
    { name: "Мента 50 мл.", price: 2 },
    { name: "Мастика 50 мл.", price: 2 },
    { name: "Джин 50 мл.", price: 2.9 },
    { name: "Коктейл Аперол Шприц 200 мл.", price: 6.8 },
  ],
  Бира: [
    { name: "Бира кен българска 500 мл.", price: 1.8 },
    { name: "Бира кен вносна 500 мл.", price: 2.5 },
    { name: "Bernard светла 500 мл.", price: 2.8 },
    { name: "Bernard светла 330 мл.", price: 2.8 },
    { name: "Bernard swing светла, червена, тъмна 500 мл.", price: 4.5 },
    { name: "Radeberger 500 мл.", price: 2.8 },
    { name: "Radeberger 330 мл.", price: 2.5 },
    { name: "Radeberger кен 500 мл.", price: 2.8 },
    { name: "Schofferhofer (weizen, светла, тъмна) 500 мл.", price: 2.9 },
    { name: "Schofferhofer (weizen) кен 500 мл.", price: 2.9 },
    { name: "Schofferhofer сайдер грейпфрут 330 мл.", price: 2.6 },
    { name: "Estrella damm 330 мл.", price: 2.6 },
    { name: "Estrella damm кен 500 мл.", price: 2.8 },
    { name: "Бохем (светла, червена) 500 мл.", price: 2.8 },
    { name: "Брънч светла 500 мл.", price: 2.5 },
    { name: "Брънч червена 500 мл.", price: 2.8 },
    { name: "Брънч крафт 500 мл.", price: 2.9 },
    { name: "Clausthaler безалкохолна 330 мл.", price: 2.5 },
    { name: "Clausthaler сайдер лимон 330 мл.", price: 2.5 },
    { name: "Somersby различни видове 330 мл.", price: 2.5 },
  ],
  Вино: [
    { name: "Бяло, розе, червено (внос) бутилка 1 л.", price: 20 },
    { name: "Наливно вино (бяло, червено) чаша 250 мл.", price: 3.9 },
    { name: "Наливно вино (бяло, червено) кана 1 л.", price: 9.9 },
  ],
  "Топли напитки": [
    { name: "Кафе (мляно)", price: 1.2 },
    { name: "Кафе Lavazza, Kimbo, Illy (доза)", price: 1.9 },
    { name: "Кафе с мляко", price: 1.9 },
    { name: "Чай", price: 1.5 },
    { name: "Мляко с какао", price: 2.5 },
    { name: "Капучино", price: 2.5 },
  ],
};

async function seedMenu() {
  const { error: deleteItemsError } = await supabase
    .from("menu_items")
    .delete()
    .not("id", "is", null);
  if (deleteItemsError) {
    throw deleteItemsError;
  }

  const { error: deleteCategoriesError } = await supabase
    .from("menu_categories")
    .delete()
    .not("id", "is", null);
  if (deleteCategoriesError) {
    throw deleteCategoriesError;
  }

  const { data: insertedCategories, error: categoriesError } = await supabase
    .from("menu_categories")
    .insert(categories)
    .select("id, name");
  if (categoriesError) {
    throw categoriesError;
  }

  const categoryIdByName = new Map(insertedCategories.map((category) => [category.name, category.id]));
  const menuItems = [];

  Object.entries(itemsByCategory).forEach(([categoryName, items]) => {
    const categoryId = categoryIdByName.get(categoryName);
    if (!categoryId) {
      throw new Error(`Missing category id for "${categoryName}"`);
    }

    items.forEach((item) => {
      menuItems.push({
        category_id: categoryId,
        name: item.name,
        price: item.price,
      });
    });
  });

  const { error: itemsError } = await supabase.from("menu_items").insert(menuItems);
  if (itemsError) {
    throw itemsError;
  }

  console.log(
    `Seeded ${insertedCategories.length} categories and ${menuItems.length} menu items in Bulgarian.`,
  );
}

try {
  await seedMenu();
} catch (error) {
  console.error("Failed to seed menu:", error.message);
  process.exit(1);
}
