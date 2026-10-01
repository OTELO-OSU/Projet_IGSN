variable "project" {
  type        = string
  description = "Project slug, used as a name prefix."
}

variable "environment" {
  type        = string
  description = "Environment name (e.g. benchmark), used in the name prefix."
}

variable "aws_region" {
  type        = string
  description = "AWS region to deploy into."
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type for the benchmark host (e.g. t3.xlarge)."
}
