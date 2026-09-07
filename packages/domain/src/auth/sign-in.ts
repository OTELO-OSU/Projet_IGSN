type SignInStarter = {
  signinRedirect: (args: { nonce: string; url_state: string }) => Promise<void>;
};

export function signIn(starter: SignInStarter): void {
  void starter.signinRedirect({
    nonce: crypto.randomUUID(),
    url_state: window.location.pathname + window.location.search,
  });
}
