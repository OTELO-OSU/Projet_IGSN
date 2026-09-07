import type { AuthContextProps } from "react-oidc-context";

import { AuthContext } from "react-oidc-context";

export function stubAuth(
  ui: React.ReactNode,
  auth: Partial<AuthContextProps>,
): React.ReactElement {
  return (
    <AuthContext.Provider
      value={
        {
          isLoading: false,
          isAuthenticated: false,
          ...auth,
        } as AuthContextProps
      }
    >
      {ui}
    </AuthContext.Provider>
  );
}
