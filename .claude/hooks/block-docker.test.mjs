import { describe, expect, it } from "vitest";

import { startsContainer } from "./block-docker.mjs";

describe("startsContainer", () => {
  it.each([
    "docker run -it ubuntu",
    "docker container start db",
    "docker compose up",
    "docker compose -f docker-compose.dev.yml up",
    "docker --context remote run nginx",
    "docker container exec api sh",
    "docker-compose -p proj up",
    "sudo docker exec api sh",
  ])("should block %s", (command) => {
    expect(startsContainer(command)).toBe(true);
  });

  it.each([
    "docker ps",
    "docker images",
    "docker build -t app .",
    "docker compose config",
    "docker compose down",
    "docker logs run-container",
    "docker ps; echo run",
  ])("should allow %s", (command) => {
    expect(startsContainer(command)).toBe(false);
  });
});
