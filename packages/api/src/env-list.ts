export const envList = (name: string): string[] =>
  (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value !== "");
