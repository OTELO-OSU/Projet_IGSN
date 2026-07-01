import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "react-oidc-context";

import "./styles.css";
import "./index.css";
import { AuthGate } from "./auth-gate.tsx";
import { oidcConfig } from "./auth.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider {...oidcConfig}>
      <AuthGate />
    </AuthProvider>
  </StrictMode>,
);
