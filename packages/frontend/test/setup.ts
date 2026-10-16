import "altcha";

$altcha.defaults.set({ test: true });

afterEach(() => {
  vi.restoreAllMocks();
});
