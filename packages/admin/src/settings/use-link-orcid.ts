import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { orcidAuthorizationSchema } from "@projet-igsn/domain/user/orcid";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { API_URL } from "#/api-url.ts";
import { HttpError, apiJson, apiOk } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export const ORCID_STATE_KEY = "orcid-link-state";

export type OrcidReturn = { code?: string; state?: string; error?: string };

export function useStartOrcidLink() {
  const apiFetch = useApiClient();
  return useMutation({
    mutationFn: async () => {
      const state = crypto.randomUUID();
      sessionStorage.setItem(ORCID_STATE_KEY, state);
      const url = new URL("admin/currentUser/orcid/authorization", API_URL);
      url.searchParams.set("state", state);
      const authorization = await apiJson(
        apiFetch,
        url,
        orcidAuthorizationSchema,
        "Failed to start ORCID linking",
      );
      window.location.assign(authorization.url);
    },
    onError: () => toast.error(m.settings_orcid_error()),
  });
}

export function useLinkOrcidOnReturn({ code, state, error }: OrcidReturn) {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: "/settings/profile" });
  const isHandled = useRef(false);
  const { mutate: link } = useMutation({
    mutationFn: (authorizationCode: string) =>
      apiOk(
        apiFetch,
        new URL("admin/currentUser/orcid", API_URL),
        "Failed to link ORCID",
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code: authorizationCode }),
        },
      ),
    onSuccess: () => {
      toast.success(m.settings_orcid_linked());
      return queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
    onError: (failure) =>
      toast.error(
        failure instanceof HttpError && failure.status === 409
          ? m.settings_orcid_conflict()
          : m.settings_orcid_error(),
      ),
  });

  useEffect(() => {
    if (isHandled.current || (code === undefined && error === undefined))
      return;
    isHandled.current = true;
    const storedState = sessionStorage.getItem(ORCID_STATE_KEY);
    sessionStorage.removeItem(ORCID_STATE_KEY);
    void navigate({ search: {}, replace: true });
    if (error === "access_denied") toast(m.settings_orcid_cancelled());
    else if (error !== undefined || code === undefined || storedState !== state)
      toast.error(m.settings_orcid_error());
    else link(code);
  }, [code, state, error, navigate, link]);
}
