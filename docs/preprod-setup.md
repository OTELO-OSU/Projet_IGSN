# Preprod setup

First-time infra setup and infra changes. See also:

- [preprod-architecture.md](preprod-architecture.md): the architecture overview.
- [preprod-deploy.md](preprod-deploy.md): everyday deploys to existing infra.

Run this the first time infra is stood up, or when changing it.

1. Init and apply tofu (partial S3 backend, S3-native locking; see
   [infra/preprod/tf/backend.hcl](../infra/preprod/tf/backend.hcl)). The state
   bucket must exist first. Run `aws login` (or otherwise configure AWS
   credentials) before init:

   ```
   aws login
   make preprod-tofu-init
   make preprod-tofu-apply
   ```

2. Point Cloudflare at the EIP. Create proxied (orange cloud) A records for
   `igsn.$DOMAIN`, `igsn-admin.$DOMAIN`, and `igsn-api.$DOMAIN`, and set SSL/TLS
   mode to **Full (strict)**. On a zone set up before preprod dropped its own
   auth stack, delete the leftover `igsn-auth.$DOMAIN` and `igsn-idp.$DOMAIN`
   records:

   ```
   tofu -chdir=infra/preprod/tf output -raw public_ip
   ```

3. Set up outbound mail with a transactional-mail provider (Brevo, Resend,
   Postmark...; the stack only needs a plain SMTP endpoint). In the provider's
   dashboard, register the sending domain for `postmaster@igsn.$DOMAIN`
   (`igsn.$DOMAIN` or the zone, whichever the provider expects) and add the
   DKIM/SPF DNS records it gives you in Cloudflare, **DNS only (grey cloud)**:
   a proxied record answers with Cloudflare's own value, so the provider never
   sees it and verification never completes. Once verified, note the SMTP
   host, user, and password from the dashboard for step 5.

4. Create a Cloudflare Origin CA certificate (Cloudflare dashboard: SSL/TLS ->
   Origin Server -> Create Certificate), covering `$DOMAIN` and `*.$DOMAIN`.
   Save the two PEM blocks to `infra/preprod/certs/` (gitignored):

   ```
   mkdir -p infra/preprod/certs
   # paste the certificate  -> infra/preprod/certs/origin.pem
   # paste the private key   -> infra/preprod/certs/origin.key
   ```

5. Create the host env file. Copy the example, set a strong `DATABASE_PASSWORD`,
   and fill `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASSWORD` from the provider
   dashboard (step 3):

   ```
   cp infra/preprod/docker-compose.env.example infra/preprod/docker-compose.env
   # edit it
   ```

6. Install your SSH key on the host once (see
   [preprod-deploy.md](preprod-deploy.md#install-your-ssh-key)).

7. Copy the env file and the origin cert to the host:

   ```
   infra/preprod/scripts/ssh-access.sh grant
   scp infra/preprod/docker-compose.env ec2-user@<eip>:~/
   scp -r infra/preprod/certs ec2-user@<eip>:~/
   infra/preprod/scripts/ssh-access.sh revoke
   ```

8. After deploying (see [preprod-deploy.md](preprod-deploy.md)), send one test
   mail through the provider's SMTP endpoint and confirm it arrives. Container
   boot cannot catch a wrong `SMTP_PASSWORD` or an unverified sending domain:
   both only surface at send time, as an SMTP auth or policy error:

   ```
   swaks --to <your-address> --from postmaster@igsn.$DOMAIN \
     --server $SMTP_HOST --port 587 -tls \
     --auth-user $SMTP_USER --auth-password $SMTP_PASSWORD
   ```
