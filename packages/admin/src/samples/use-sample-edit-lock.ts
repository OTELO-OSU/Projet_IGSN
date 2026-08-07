import { sampleLockedSchema } from "@projet-igsn/domain/sample/edit-lock";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { API_URL } from "#/api-url.ts";
import { fullName } from "#/samples/full-name.ts";
import { LOCK_POLL_INTERVAL_MS } from "#/samples/lock-poll-interval.ts";
import { useApiClient } from "#/use-api-client.ts";

const lockUrl = (id: string) => new URL(`admin/samples/${id}/lock`, API_URL);

const HEARTBEAT_INTERVAL_MS = 5 * 60_000;

export type SampleEditLockState = {
  isMine: boolean;
  // Set only while ANOTHER collaborator holds it, so its presence is what puts
  // the page in read-only.
  heldByOther?: { name: string };
};

// Never throws, whatever the status: a refusal is state the page renders, where
// a throw would replace the read-only view with the generic error page.
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
  // False when the caller may not update this sample: requireSampleAccess 403s
  // any non-GET on a published sample they cannot publish.
  enabled: boolean,
): SampleEditLockState {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  // The release chains off the claim in flight: a fast navigate-away would
  // otherwise land the DELETE before the PUT and strand the lock for a whole
  // TTL.
  const claiming = useRef<Promise<unknown>>(Promise.resolve());
  const query = useQuery({
    // Deliberately outside ["samples"]: useUpdateSample invalidates that prefix
    // and awaits it, so a lock call would fire between the save and the publish
    // of the Save & Publish chain.
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
    // Product decision: an open tab holds the lock, backgrounded or not, so no
    // idle detection anywhere.
    refetchIntervalInBackground: true,
    // StrictMode doubles the mount cycle: without a forced refetch (and gcTime
    // 0) the remount serves a claim the first cleanup just released.
    refetchOnMount: "always",
    gcTime: 0,
    // refetchOnWindowFocus is on by default, so without this every alt-tab
    // would be another write.
    staleTime: 30_000,
    // A retried write is a duplicate write.
    retry: false,
  });

  const isMine = query.data?.isMine;
  const wasMine = useRef(isMine);
  useEffect(() => {
    // Taking over a sample someone else was editing: their save may have
    // changed it, and a read-only form has nothing to lose, so start again from
    // the stored version rather than have the next save rejected as stale.
    if (wasMine.current === false && isMine === true) {
      void queryClient.invalidateQueries({ queryKey: ["samples", id] });
    }
    wasMine.current = isMine;
  }, [isMine, id, queryClient]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    // A failed release is nothing the user can act on, and the claim expires on
    // its own, so it never surfaces as an error.
    const release = (init: RequestInit) =>
      apiFetch(lockUrl(id), { method: "DELETE", ...init }).catch(
        () => undefined,
      );
    // A closing tab runs no React cleanup; keepalive lets the bodyless DELETE
    // outlive the page (far under the 64 KB the fetch spec allows).
    const releaseOnClose = () => void release({ keepalive: true });
    window.addEventListener("pagehide", releaseOnClose);
    return () => {
      window.removeEventListener("pagehide", releaseOnClose);
      void claiming.current.catch(() => undefined).then(() => release({}));
    };
    // apiFetch is out of the deps on purpose: it is a fresh function every
    // render, and re-running this effect would release the lock mid-edit.
  }, [enabled, id]);

  return query.data ?? { isMine: false };
}
