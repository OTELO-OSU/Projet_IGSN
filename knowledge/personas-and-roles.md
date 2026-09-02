---
type: domain-model
title: Personas and roles
description: >-
  Reader, Contributor, Editor as per-sample roles, plus space manager and super
  admin as account-level reach.
resource: CLAUDE.md#personas
tags:
  - domain
  - auth
relations:
  - type: depends_on
    target: per-sample-roles
  - type: depends_on
    target: user-moderation-super-admin
status: stable
---

- **Reader** (unauthenticated): browses, filters and searches published samples on `frontend`.
- **Contributor**: enters sample info during declaration, and invites others.
- **Editor**: validates declarations and edits info after validation.
- Contributor and Editor are per-sample roles of an authenticated user, stored on `user_sample.role` alongside `owner`; see [[per-sample-roles]].
- **Super admin**: a local `user.super_admin` boolean; moderates every user and reaches every sample. See [[user-moderation-super-admin]].
- **Space manager**: a delegated moderator, derived from a non-empty managed scope rather than a flag. See [[space-manager-scope]].
- Account-level moderation status (`pending | accepted | rejected`) gates publishing, independently of any per-sample role.
