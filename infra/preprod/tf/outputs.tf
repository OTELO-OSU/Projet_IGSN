# All consumed by infra/preprod/scripts/common.sh via `tofu output -raw <name>`.

output "aws_region" {
  value = var.aws_region
}

output "instance_id" {
  description = "Target for ec2-instance-connect send-ssh-public-key."
  value       = aws_instance.this.id
}

output "availability_zone" {
  description = "Required by ec2-instance-connect send-ssh-public-key."
  value       = aws_instance.this.availability_zone
}

output "ec2_security_group_id" {
  description = "SG the deploy script opens :22 on for its own IP, then revokes."
  value       = aws_security_group.ec2.id
}

output "public_ip" {
  description = "Stable EIP; point the DNS A records here."
  value       = aws_eip.this.public_ip
}
