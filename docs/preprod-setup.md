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
   `igsn.$DOMAIN`, `igsn-admin.$DOMAIN`, `igsn-api.$DOMAIN`, `igsn-auth.$DOMAIN`,
   and `igsn-idp.$DOMAIN`, and set SSL/TLS mode to **Full (strict)**:

   ```
   tofu -chdir=infra/preprod/tf output -raw public_ip
   ```

3. Create a Cloudflare Origin CA certificate (Cloudflare dashboard: SSL/TLS ->
   Origin Server -> Create Certificate), covering `$DOMAIN` and `*.$DOMAIN`.
   Save the two PEM blocks to `infra/preprod/certs/` (gitignored):

   ```
   mkdir -p infra/preprod/certs
   # paste the certificate  -> infra/preprod/certs/origin.pem
   # paste the private key   -> infra/preprod/certs/origin.key
   ```

4. Create the host env file. Copy the example, set strong `DATABASE_PASSWORD`
   and `KEYCLOAK_PASSWORD`:

   ```
   cp infra/preprod/docker-compose.env.example infra/preprod/docker-compose.env
   # edit it
   ```

5. Install your SSH key on the host once (see
   [preprod-deploy.md](preprod-deploy.md#install-your-ssh-key)).

6. Copy the env file and the origin cert to the host:

   ```
   infra/preprod/scripts/ssh-access.sh grant
   scp infra/preprod/docker-compose.env ec2-user@<eip>:~/
   scp -r infra/preprod/certs ec2-user@<eip>:~/
   infra/preprod/scripts/ssh-access.sh revoke
   ```
