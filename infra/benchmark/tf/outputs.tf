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
  description = "SG the scripts open :22 on for their own IP, then revoke."
  value       = aws_security_group.ec2.id
}

output "public_ip" {
  description = "Ephemeral public IP, changes if the instance is stopped and started."
  value       = aws_instance.this.public_ip
}
