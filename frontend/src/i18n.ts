import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import pl from "./locales/pl.json";
import en from "./locales/en.json";

const STORAGE_KEY = "aero-lang";

i18n.use(initReactI18next).init({
  resources: {
    pl: { translation: pl },
    en: { translation: en },
  },
  lng: localStorage.getItem(STORAGE_KEY) || "pl",
  fallbackLng: "pl",
  interpolation: {
    escapeValue: false, // React handles XSS
  },
});

// Persist language choice on change
i18n.on("languageChanged", (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
});

export default i18n;
