import React from "react";
import ReactDOM from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import App from "./App";
import HakuStyleDemo from "./HakuStyleDemo";
import { Gen5ProfilesProvider } from "./features/gen5profiles/useGen5Profiles";
import i18n from "./i18n";
import "./styles.css";
import { initializeTheme } from "./theme";
import { registerServiceWorker } from "./registerServiceWorker";

initializeTheme();
registerServiceWorker();

const isHakuStyleDemo =
  new URLSearchParams(window.location.search).get("demo") === "hakustyle";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      {isHakuStyleDemo ? (
        <HakuStyleDemo />
      ) : (
        <Gen5ProfilesProvider>
          <App />
        </Gen5ProfilesProvider>
      )}
    </I18nextProvider>
  </React.StrictMode>,
);
