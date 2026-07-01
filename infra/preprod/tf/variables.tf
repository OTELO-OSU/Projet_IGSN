# Env-specific values (no defaults) are set in env/<environment>.tfvars.

variable "project" {
  type        = string
  description = "Project slug, used as a name prefix."
}

variable "environment" {
  type        = string
  description = "Environment name (e.g. preprod), used in the name prefix."
}

variable "aws_region" {
  type        = string
  description = "AWS region to deploy into."
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type for the application host (e.g. t3.small)."
}
