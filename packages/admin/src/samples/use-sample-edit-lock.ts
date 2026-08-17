import { sampleLockedSchema } from "@projet-igsn/domain/sample/edit-lock";
import { fullName } from "@projet-igsn/domain/user/full-name";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { API_URL } from "#/api-url.ts";
import { LOCK_POLL_INTERVAL_MS } from "#/samples/lock-poll-interval.ts";
import { useApiClient } from "#/use-api-client.ts";

const lockUrl = (id: string) => new URL(`admin/samples/${id}/lock`, API_URL);

const HEARTBEAT_INTERVAL_MS = 5 * 60_000;

export type SampleEditLockState = {
  isMine: boolean;
  heldByOther?: { name: string };
};

async function parseLockResponse(res: Response): Promise<SampleEditLockState> {
  if (res.ok) {
    return { isMine: true };
  }
  if (res.status === 409) {
    const locked = sampleLockedSchema.safeParse(
      await res.json().catch(() => null),
    );
    return {
      isMine: false,
      heldByOther: { name: locked.success ? fullName(locked.data.lock) : "" },
    };
  }
  return { isMine: false };
}

export function useSampleEditLock(
  id: string,
  enabled: boolean,
): SampleEditLockState {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  const claiming = useRef<Promise<unknown>>(Promise.resolve());
  const query = useQuery({
    queryKey: ["sample-lock", id],
    queryFn: async () => {
      const claim = apiFetch(lockUrl(id), { method: "PUT" }).then(
        parseLockResponse,
      );
      claiming.current = claim;
      return claim;
    },
    enabled,
    refetchInterval: (q) =>
      q.state.data?.isMine ? HEARTBEAT_INTERVAL_MS : LOCK_POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    gcTime: 0,
    staleTime: 30_000,
    retry: false,
  });

  const isMine = query.data?.isMine;
  const wasMine = useRef(isMine);
  useEffect(() => {
    if (wasMine.current === false && isMine === true) {
      void queryClient.invalidateQueries({ queryKey: ["samples", id] });
    }
    wasMine.current = isMine;
  }, [isMine, id, queryClient]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const release = (init: RequestInit) =>
      apiFetch(lockUrl(id), { method: "DELETE", ...init }).catch(
        () => undefined,
      );
    const releaseOnClose = () => void release({ keepalive: true });
    window.addEventListener("pagehide", releaseOnClose);
    return () => {
      window.removeEventListener("pagehide", releaseOnClose);
      void claiming.current.catch(() => undefined).then(() => release({}));
    };
  }, [enabled, id]);

  return query.data ?? { isMine: false };
}
