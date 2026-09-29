# Search benchmark host

- A temporary AWS host timing the public results list (`GET /samples`) and its facet counts (`GET /samples/facets`) on Postgres capped at 2 CPUs and 8 GB with the api pool capped at 2 connections, writing CSVs to compare runs.
- Standalone: its own local OpenTofu state in `tf/`, security group and compose stack, outside the compose parity rule.
- It bills by the hour, CPU credits unlimited: run `make benchmark-destroy` when done.

## Prerequisites

- OpenTofu >= 1.9 and the AWS CLI v2, with credentials for EC2, `ssm:GetParameter` and `ec2-instance-connect:SendSSHPublicKey`.
- An SSH key at `~/.ssh/id_ed25519`, or `SSH_PUBLIC_KEY=/path/to/key.pub`.

## Usage

From the repository root, each SSH call opening :22 to your IP alone and closing it on exit:

- `make benchmark-deploy`: create the host (`AUTO_APPROVE=1` skips the prompt), then push.
- `make benchmark-push`: ship the tracked working tree, uncommitted edits included, build the api images on the host and recreate the stack.
- `make benchmark-connect`: a shell in `~/benchmark` on the host.
- `make benchmark-pull`: download every run into `benchmark-results/`.
- `make benchmark-destroy`: delete the host, after pulling.

On the host, under `tmux new -s bench` so a dropped session does not stop the run, each size reseeded first:

- `make grid` (`SIZES`, `RUNS`, `ENDPOINTS`): 1 warm-up and `RUNS` timed calls of `listPublishedSamples` (`list`) and `countPublishedFacets` (`facets`) per case, with an `EXPLAIN ANALYZE` of each statement.
- `make concurrency` (`SIZES`, `USERS`, `DURATION`, `ENDPOINTS`): `USERS` virtual users loading search pages back to back for `DURATION` seconds, each page sending `GET /samples` (`list`) and `GET /samples/facets` (`facets`) at once, as the search page does.
- `ENDPOINTS` defaults to `list facets`; `ENDPOINTS=list` or `ENDPOINTS=facets` times one alone.

## Cases

- Grid: `search=granite`, a western Europe bbox, the whole world, the top contributor and the top manual group, each with 0, 1, 3 and 5 of `material`, `nature`, `type`, `institutionalOrganization` and `collectionMethod`.
- Concurrency: a seeded mix, half a search among 5 words and half a regional bbox, each with 0 to 5 random facets and 1 in 3 an age range.

## Results

- One `benchmark-results/<UTC timestamp>/` per run: `conditions.csv`, then `grid.csv`, `explain.csv` and `plans/` or `concurrency.csv` and `concurrency-summary.csv`.
- Each timing CSV has an `endpoint` column.
- Percentiles are nearest-rank.

## Cleaning up by hand

- Without `tf/terraform.tfstate`, delete in `eu-west-3` the instance `igsn-benchmark`, then the security group `igsn-benchmark-ec2`.
- Every resource is tagged `Temporary = true`.
