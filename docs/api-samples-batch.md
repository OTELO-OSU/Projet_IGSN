# Batch API

Create or update up to 500 samples in one call, then follow their publication by polling or through a webhook.

The batch API is part of the `/service` machine API, reached at `https://<host>/api/service`. Its OpenAPI description is served at `/api/service/openapi.json`, browsable at `/api/service/docs`.

## Before you start

- Every call needs a service account API key, sent as `Authorization: Bearer <key>`.
- A researcher requests a service account from the Services section of the admin Settings, and its owner generates the key there; it is shown once.
- A missing or unknown key answers `403`.
- Samples are sent as IGSN Core records, the same shape `POST /service/samples` takes; see [igsn-core-mapping.md](igsn-core-mapping.md).
- The batch route allows 5 calls per minute per IP address, on top of the `/service` limit; over it, the answer is `429`.

## Send a batch

`POST /service/samples/batch` with a JSON body:

```json
{
  "items": [
    { "partnerId": "core-42", "sample": { "...": "an IGSN Core record" } },
    { "partnerId": "core-43", "sample": { "...": "an IGSN Core record" } }
  ],
  "webhook": {
    "url": "https://partner.example.org/hooks/igsn",
    "secret": "a-long-random-shared-secret"
  }
}
```

- `items` holds 1 to 500 items.
- `partnerId` is your own key for the item, 1 to 255 characters, echoed back in every answer and webhook call; it need not be unique.
- `webhook` is optional; see [Get a webhook call](#get-a-webhook-call).
- Any other key is refused.

### Create or update

An item creates or updates depending on its `identification.sampleIdentifier`:

- **Without one**, the item creates a new sample, owned by the service account's owner and recorded under the account's own institution.
- **With one**, the item updates the published sample carrying that IGSN, which must be within the service account's reach, exactly as `PUT /service/samples/{igsn}` would.
- An update can only change what a published sample may still change; touching a frozen field is refused with `field_frozen`.
- An update that changes nothing is accepted but not republished: the sample stays `published` and keeps its IGSN.
- The same IGSN may appear on one item only.

### All or nothing

The registry checks every item before writing anything. One refused item refuses the whole batch, and nothing is stored: fix the items the answer names and send the whole batch again.

## The answers

### `202`: the batch is queued

The answer is the batch itself, the same body `GET /service/batches/{id}` returns:

```json
{
  "id": "0199b3f1-2a4c-7d10-8b6e-5f3a9c1d2e40",
  "items": [
    {
      "partnerId": "core-42",
      "id": "0199b3f1-2a4d-7f22-9c01-6e4b8d2f3a51",
      "status": "draft",
      "synchronizationStatus": "pending",
      "igsn": null,
      "synchronizationError": null
    },
    {
      "partnerId": "core-43",
      "id": "0199a0c7-1b2e-7c33-8d45-7f5c9e3a4b62",
      "status": "published",
      "synchronizationStatus": "synced",
      "igsn": "01K6SZ4V3M8Q2R7T5W9X0Y1Z2A",
      "synchronizationError": null
    }
  ]
}
```

- Keep the batch `id` to poll the batch later.
- Items come back in the order you sent them.
- A created item reads `synchronizationStatus: "pending"` on a `draft`: it is queued and published in the background.
- A changed item reads `pending` on a `published` sample: it stays published and visible while its changes are sent to DataCite, an update item adding only a parent included.
- An unchanged item reads `synced` with its IGSN: nothing more will happen to it.

### `422`: an item or the webhook is invalid

```json
{
  "error": "Invalid sample",
  "issues": [
    {
      "path": "items.1.sample.identification.sampleIdentifier",
      "code": "sample_not_found"
    }
  ]
}
```

- Each issue's `path` starts with `items.<index>`, the item's position in `items`, followed by the IGSN Core path of the field.
- An issue on the webhook has the path `webhook.url` or `webhook.secret`.
- `code` is either a validation code (`invalid_type`, `too_small`, `invalid_format`...) or one of the registry's own:

| Code                             | Meaning                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `sample_not_found`               | No published sample carries this IGSN.                                                                                                |
| `sample_not_editable`            | The sample exists but is outside the service account's reach.                                                                         |
| `field_frozen`                   | The update changes a field a published sample can no longer change.                                                                   |
| `duplicate_sample_key`           | The same IGSN is on two items of the batch.                                                                                           |
| `sample_locked`                  | Someone is editing the sample in the registry right now; retry later.                                                                 |
| `parent_not_found`               | A parent the item names is not a published sample, or is a series of samples.                                                         |
| `child_not_found`                | A child IGSN the item names is not a published, withdrawn or embargoed sample.                                                        |
| `child_not_eligible`             | A child has a parent, is a series, is in a series or is out of the account's reach.                                                   |
| `series_not_found`               | The `IsPartOf` IGSN an update item names is not a published, withdrawn or embargoed sample.                                           |
| `series_not_eligible`            | The series is not a virtual sample in the account's reach, the sample cannot join one, an item names two, or a create item names any. |
| `manual_group_not_attachable`    | The owner cannot attach the sample to that manual group.                                                                              |
| `location_inherited_from_parent` | A sub-sample takes its parent's location and cannot set its own.                                                                      |

A sample missing something it needs to be published answers its own code too, at the path of the missing field.

### `409`: suspected duplicates

The registry refuses an item that looks like a sample it already has: the same name, the same material and the same collector.

```json
{
  "error": "Suspected duplicate",
  "reason": "duplicates",
  "items": [
    {
      "index": 1,
      "duplicates": [
        {
          "id": "0199...",
          "igsn": "01K6SZ4V3M8Q2R7T5W9X0Y1Z2A",
          "name": "Basalt A"
        }
      ],
      "batchDuplicates": []
    }
  ]
}
```

- `index` is the item's position in `items`.
- `duplicates` lists the registered samples it looks like, including ones still being published (`igsn: null`).
- `batchDuplicates` lists the other items of the same batch it looks like.
- If they really are different samples, send the same batch again with `?confirmDuplicates=true`.

A `409` with only `{ "error": "Sample changed, retry" }` means a sample you update changed in the registry while your batch was being checked; nothing was stored, so send the batch again.

### Other answers

| Status | Meaning                                                                    |
| ------ | -------------------------------------------------------------------------- |
| `403`  | The API key is missing or unknown.                                         |
| `413`  | The body is larger than 20 MiB.                                            |
| `415`  | The body is not `application/json`.                                        |
| `429`  | Too many calls; wait a minute.                                             |
| `503`  | DataCite, which registers every IGSN, does not answer; nothing was stored. |

## Follow the publication

A queued sample has `synchronizationStatus: "pending"` and moves to one of:

- `synced`, with its `igsn` once published;
- `failed`, with the reason in `synchronizationError`.

A failure affects that sample alone, the others keep going. Send the failed items again in a new batch.

### Poll the batch

`GET /service/batches/{id}` answers the same body as the `202`, with each item's current status.

- It needs the API key of the service account that sent the batch.
- A batch sent by another service account, or an unknown id, answers `404`.
- A malformed id answers `400`.

### Get a webhook call

Instead of polling, give a `webhook` in the batch body and the registry calls you each time a sample's publication or update succeeds or fails.

- `url` must be https, on a public host, with no `user:password@` part, and at most 2048 characters.
- `secret` is required with a `url`, 16 to 255 characters; the registry signs every call with it, so you can check each call really comes from the registry.
- A url the registry refuses answers `422` on `webhook.url`, and nothing is queued.
- The registry stores the url and secret with the batch and never shows them back to you.
- An unchanged item is never queued, so it never gets a call.

Each call is one `POST` per sample:

```http
POST /hooks/igsn HTTP/1.1
Content-Type: application/json
X-Webhook-Id: 0199b3f2-6c1e-7a51-9d0f-3c8e4b7a2d10
X-Webhook-Timestamp: 1759670400
X-Signature: sha256=5d41402abc4b2a76b9719d911017c592...

{"batchId":"0199b3f1-...","partnerId":"core-42","id":"0199b3f1-...","status":"published","synchronizationStatus":"synced","igsn":"01K6SZ4V3M8Q2R7T5W9X0Y1Z2A","synchronizationError":null}
```

The body is one batch item plus the batch id:

| Field                   | Meaning                                                                   |
| ----------------------- | ------------------------------------------------------------------------- |
| `batchId`               | The batch the sample was sent in.                                         |
| `partnerId`             | Your own key for the item, as you sent it.                                |
| `id`                    | The registry's identifier of the sample.                                  |
| `status`                | The sample's status: `published` once published, `draft` before.          |
| `synchronizationStatus` | `synced` on success, `failed` on failure.                                 |
| `igsn`                  | The sample's IGSN once published, without a DOI prefix, `null` otherwise. |
| `synchronizationError`  | Why the synchronization failed, `null` on success.                        |

- Calls are not ordered: two samples of a batch may reach you in any order.
- Only a sample's latest batch is called: once you send a sample again, its older batch's webhook goes quiet.
- A later synchronization of the same sample, from a later batch or from an edit in the registry's own interface, calls again.

#### Check the signature

`X-Signature` is the HMAC-SHA256 of the timestamp, a dot and the raw body, keyed with your secret, in hex:

```
X-Signature = "sha256=" + hex(HMAC_SHA256(secret, X-Webhook-Timestamp + "." + raw body))
```

To accept a call:

1. Recompute the signature over the raw body bytes, before any JSON parsing.
2. Compare it to `X-Signature` in constant time.
3. Refuse a timestamp more than 5 minutes away from your clock, so a captured call cannot be replayed later.
4. Ignore an `X-Webhook-Id` you have already processed, since a retry carries the same id.

Node.js:

```js
import { createHmac, timingSafeEqual } from "node:crypto";

export function isGenuine(headers, rawBody, secret) {
  const timestamp = headers["x-webhook-timestamp"];
  const expected = `sha256=${createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")}`;
  const received = headers["x-signature"] ?? "";
  const fresh = Math.abs(Date.now() / 1000 - Number(timestamp)) <= 300;
  return (
    fresh &&
    received.length === expected.length &&
    timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  );
}
```

#### Answer and retries

- Answer any `2xx` to acknowledge the call; the body of your answer is ignored.
- Answer within 10 seconds, so do slow work after acknowledging.
- Redirects are not followed, so a `3xx` counts as a failure.
- A failed call is retried after 1 minute, 5 minutes, 30 minutes, 2 hours, 6 hours and 12 hours, about 21 hours in all.
- After the last retry the call is dropped for good, so poll `GET /service/batches/{id}` to catch up after a long outage.

## Try it locally

For developers of this repository, `make dev` runs the whole stack at http://localhost:3000.

- Get a key: sign in to http://localhost:3000/admin as `jean.martin` / `password`, request a service account in Settings, accept it as the super admin `nadia.leroy` / `password` from the mail in maildev (http://localhost:1080), then generate the key as Jean.
- The `webhook-sink` service logs every webhook call it receives: `docker compose -f docker-compose.dev.yml logs -f webhook-sink`.
- Use `"url": "http://webhook-sink:8080/"`: plain http is accepted for this host only, through the dev-only `WEBHOOK_DEV_HOSTS` api setting.
- Each call shows up as one JSON line with its method, headers and raw body, ready to check a signature against.
