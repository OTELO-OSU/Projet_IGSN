# One EC2 host runs the whole stack (apps + Postgres) via docker-compose. It
# lives in the account's default VPC: there is no RDS to isolate, so a custom
# VPC with public/private subnets would be dead weight.

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Latest Amazon Linux 2023 (x86_64). Images are built for linux/amd64 on the
# operator's laptop and shipped via `docker load`, so the host must be x86_64.
data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

# Cloudflare's published origin IPv4 ranges. The host sits behind Cloudflare's
# proxy, so only Cloudflare should reach 80/443; opening them to 0.0.0.0/0 lets
# anyone who learns the EIP bypass the WAF/DDoS edge. Fetched live so the list
# stays current instead of rotting into an outage when Cloudflare adds a range.
data "http" "cloudflare_ipv4" {
  url = "https://www.cloudflare.com/ips-v4"
}

# Caddy's 80/443 are open to Cloudflare only. Port 22 is NOT opened here: the
# deploy script authorizes the operator's current IP for one deploy and revokes
# it on exit. Postgres is never exposed (host docker network only).
resource "aws_security_group" "ec2" {
  name        = "${local.prefix}-ec2"
  description = "IGSN application host (Caddy edge)"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP from Cloudflare (redirect to HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = split("\n", trimspace(data.http.cloudflare_ipv4.response_body))
  }

  ingress {
    description = "HTTPS from Cloudflare"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = split("\n", trimspace(data.http.cloudflare_ipv4.response_body))
  }

  egress {
    description = "all outbound (ACME, docker)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.prefix}-ec2" }
}

# Installs Docker + the compose v2 plugin on first boot. ec2-instance-connect
# ships in AL2023, so no key pair is stored: the deploy script pushes an
# ephemeral key per run.
resource "aws_instance" "this" {
  ami                    = data.aws_ssm_parameter.al2023.value
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.ec2.id]

  user_data = <<-EOF
    #!/bin/bash
    set -euxo pipefail
    dnf install -y docker
    systemctl enable --now docker
    usermod -aG docker ec2-user
    mkdir -p /usr/libexec/docker/cli-plugins
    curl -fsSL https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-x86_64 \
      -o /usr/libexec/docker/cli-plugins/docker-compose
    chmod +x /usr/libexec/docker/cli-plugins/docker-compose
  EOF

  # IMDSv2 only: blocks the SSRF-to-credentials path.
  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = 20
    encrypted   = true
  }

  tags = { Name = local.prefix }
}

resource "aws_eip" "this" {
  instance = aws_instance.this.id
  domain   = "vpc"
  tags     = { Name = local.prefix }
}
