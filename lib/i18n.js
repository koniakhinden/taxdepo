// Централизованные переводы и справочники (uk / en).
// Импортируется и на сервере, и на клиенте — без 'use client'.

export const LANGS = ['uk', 'en'];
export const DEFAULT_LANG = 'uk';

export const CURRENCIES = ['CAD', 'USD', 'EUR'];
export const DEFAULT_CURRENCY = 'CAD';

// Категории расходов по языкам (индексы соответствуют друг другу).
export const CATEGORIES_BY_LANG = {
  uk: [
    "Харчування / ресторани",
    "Транспорт / таксі",
    "Паливо",
    "Проживання / готелі",
    "Офісне приладдя",
    "Обладнання / техніка",
    "Програмне забезпечення / підписки",
    "Зв'язок / інтернет",
    "Маркетинг / реклама",
    "Профпослуги / консультації",
    "Навчання",
    "Оренда",
    "Комунальні послуги",
    "Здоров'я / медицина",
    "Інше",
  ],
  en: [
    "Food / restaurants",
    "Transport / taxi",
    "Fuel",
    "Accommodation / hotels",
    "Office supplies",
    "Equipment / hardware",
    "Software / subscriptions",
    "Communications / internet",
    "Marketing / advertising",
    "Professional services",
    "Education / training",
    "Rent",
    "Utilities",
    "Health / medical",
    "Other",
  ],
};

export const OTHER = { uk: "Інше", en: "Other" };

export function categoriesFor(lang) {
  return CATEGORIES_BY_LANG[lang] || CATEGORIES_BY_LANG.uk;
}

// Строки интерфейса
export const STRINGS = {
  uk: {
    appTitle: "Облік чеків",
    tagline: "Фото чека → сума, дата, категорія → для бухгалтера",
    signIn: "Вхід",
    signUp: "Реєстрація",
    emailLabel: "Email",
    passwordLabel: "Пароль",
    signInBtn: "Увійти",
    signUpBtn: "Створити акаунт",
    signupInfo: "Акаунт створено. Якщо увімкнено підтвердження email — перевір пошту, інакше входь.",
    logout: "Вийти",
    addReceipt: "+ Додати чек",
    exportBtn: "⬇ Вивантажити для бухгалтера",
    totalReceipts: "Усього чеків:",
    totalSum: "Сума:",
    emptyLine1: "Поки що немає чеків.",
    emptyLine2: "Натисни «Додати чек» і сфотографуй перший.",
    newReceipt: "Новий чек",
    back: "← Назад",
    takePhoto: "Сфотографувати / вибрати чек",
    autoRecognized: "Дані розпізнаються автоматично",
    replacePhoto: "Замінити фото",
    recognizing: "Розпізнаю чек…",
    dateLabel: "Дата покупки",
    amountLabel: "Сума",
    currencyLabel: "Валюта",
    categoryLabel: "Категорія",
    merchantLabel: "Магазин / продавець",
    optional: "Необов'язково",
    noteLabel: "Нотатка",
    saveBtn: "Зберегти чек",
    fillDateAmount: "Вкажи дату та суму.",
    sessionExpired: "Сесія завершилася, увійди знову.",
    deleteConfirm: "Видалити цей чек?",
    deleteFail: "Не вдалося видалити: ",
    manualHint: " — заповни поля вручну.",
    notRecognized: "Не вдалося прочитати чек. Заповни поля вручну або переспробуй з чіткішим фото.",
    errInvalidLogin: "Невірний email або пароль.",
    errAlreadyReg: "Такий email уже зареєстровано.",
    errShortPass: "Пароль має бути не коротшим за 6 символів.",
    processingPhoto: "Готую фото…",
  },
  en: {
    appTitle: "Receipt Tracker",
    tagline: "Receipt photo → amount, date, category → for your accountant",
    signIn: "Sign in",
    signUp: "Sign up",
    emailLabel: "Email",
    passwordLabel: "Password",
    signInBtn: "Sign in",
    signUpBtn: "Create account",
    signupInfo: "Account created. If email confirmation is enabled, check your inbox; otherwise sign in.",
    logout: "Log out",
    addReceipt: "+ Add receipt",
    exportBtn: "⬇ Export for accountant",
    totalReceipts: "Total receipts:",
    totalSum: "Amount:",
    emptyLine1: "No receipts yet.",
    emptyLine2: "Tap “Add receipt” and photograph your first one.",
    newReceipt: "New receipt",
    back: "← Back",
    takePhoto: "Take a photo / choose receipt",
    autoRecognized: "Details are recognized automatically",
    replacePhoto: "Replace photo",
    recognizing: "Recognizing receipt…",
    dateLabel: "Purchase date",
    amountLabel: "Amount",
    currencyLabel: "Currency",
    categoryLabel: "Category",
    merchantLabel: "Merchant / seller",
    optional: "Optional",
    noteLabel: "Note",
    saveBtn: "Save receipt",
    fillDateAmount: "Enter date and amount.",
    sessionExpired: "Session expired, please sign in again.",
    deleteConfirm: "Delete this receipt?",
    deleteFail: "Couldn't delete: ",
    manualHint: " — fill in the fields manually.",
    notRecognized: "Couldn't read the receipt. Fill in the fields manually or retry with a clearer photo.",
    errInvalidLogin: "Invalid email or password.",
    errAlreadyReg: "This email is already registered.",
    errShortPass: "Password must be at least 6 characters.",
    processingPhoto: "Preparing photo…",
  },
};

export function dictFor(lang) {
  return STRINGS[lang] || STRINGS.uk;
}

// Строки для Excel-выгрузки
export const EXPORT_STRINGS = {
  uk: { sheet: "Чеки", n: "№", date: "Дата", category: "Категорія", merchant: "Магазин", amount: "Сума", currency: "Валюта", note: "Нотатка", photo: "Файл фото", total: "РАЗОМ" },
  en: { sheet: "Receipts", n: "#", date: "Date", category: "Category", merchant: "Merchant", amount: "Amount", currency: "Currency", note: "Note", photo: "Photo file", total: "TOTAL" },
};

export function exportStringsFor(lang) {
  return EXPORT_STRINGS[lang] || EXPORT_STRINGS.uk;
}
