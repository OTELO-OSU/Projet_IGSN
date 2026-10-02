# Facet counts benchmark

What the search sidebar's facet counts (`GET /samples/facets`) cost in plain Postgres and two ParadeDB versions, measured on 2026-10-01 and 2026-10-02.

## Summary

- **Plain Postgres:** the counts cost about 4x the results list per request, so the stack serves 5x fewer search pages per second with counts than without.
- **ParadeDB v1:** counts 4x to 20x faster without search text, up to 3x slower on a small map box with filters, and 14x slower with a search, so it serves 12x fewer search pages per second than Postgres.
- **ParadeDB v2:** with the search moved into the index, a search's counts drop from 3.8 s to 75 ms, and the stack serves 11% more search pages per second than Postgres.
- **Keep bar, set before v2:** at 200,000 samples and 10 readers, the counts must serve at least 2x Postgres's requests per second (23.4) and neither the list alone nor the search page may be slower.
- **v2 against it:** counts 1.5x (missed), list alone 8% slower (missed), search page 11% faster (met).
- **v2 also returns wrong results:** a search combined with a facet filter misses 5% to 25% of its matches, a ParadeDB defect.
- **Next step:** option 3, as agreed when the bar was set.

## Setup

- **Host:** an AWS `t3.xlarge` running the [benchmark stack](../infra/benchmark/README.md), the api at 2 database connections, 200,000 random published samples.
- **Postgres:** capped at 2 CPUs and 8 GB, on each image's default settings: 2 GB of shared buffers and 20 MB of work memory for ParadeDB, 128 MB and 4 MB for plain Postgres.
- **Load run:** 10 simulated readers load search pages back to back for 30 s (60 s for v2).
- **Simulated searches:** half type one of 5 words, half draw a regional map box, each with 0 to 5 random filters and 1 in 3 an age range.
- **Grid run:** each query alone, 30 timed runs per case: a search for "granite", a western Europe box, the whole world, the top contributor and the top manual group, each with 0, 1, 3 and 5 filters.
- **p50 and p95:** half the requests answered within the p50, 95% within the p95.

## Implementations

- **Plain Postgres** (`2a4c7545`): one SQL query selects the matching samples once, then counts each of the 11 facets over them.
- **ParadeDB v1** (`dfb4d855`, then `f0a8d31f`): a ParadeDB index stores the facet columns, and one aggregation counts all 11 facets.
- **ParadeDB v2** (`853f621c`): the index also holds the name, specific name and local id words, so the search box and a searched list's facet filters run inside it, under the amended rules of [ADR 0018](adr/0018-sample-search-semantics.md).
- In all three, a facet's count ignores its own filter, so a reader still sees the other values they could switch to.

## Results under load

| What a page loads         | Request | Plain Postgres                      | ParadeDB v1                            | ParadeDB v2                              |
| ------------------------- | ------- | ----------------------------------- | -------------------------------------- | ---------------------------------------- |
| Results list only         | list    | 50.5 req/s, p50 0.18 s, p95 0.37 s  | **63.1 req/s, p50 0.14 s, p95 0.28 s** | 46.2 req/s, p50 0.21 s, p95 0.34 s       |
| Facet counts only         | counts  | 11.7 req/s, p50 0.83 s, p95 1.11 s  | 0.9 req/s, p50 9.8 s, p95 17.2 s       | **17.3 req/s, p50 0.57 s, p95 0.72 s**   |
| Both (a real search page) | list    | 9.9 pages/s, p50 0.83 s, p95 1.11 s | 0.8 pages/s, p50 8.2 s, p95 14.2 s     | **11.0 pages/s, p50 0.76 s, p95 0.93 s** |
| Both (a real search page) | counts  | 9.9 pages/s, p50 0.98 s, p95 1.31 s | 0.8 pages/s, p50 10.0 s, p95 18.4 s    | **11.0 pages/s, p50 0.90 s, p95 1.07 s** |

- Bold marks each row's highest throughput, and any within 5% of it.
- Plain Postgres finishes a page every 100 ms at full load, 20 ms of it on the list and 80 ms on the counts.
- v1's list does not query ParadeDB, so its 25% gain likely comes from the location and sub-sample flag copied onto each sample row.

## Results per query

| Case               | Filters | Matching samples | List, Postgres       | List, v1             | List, v2             | Counts, Postgres     | Counts, v1           | Counts, v2           |
| ------------------ | ------- | ---------------- | -------------------- | -------------------- | -------------------- | -------------------- | -------------------- | -------------------- |
| Western Europe box | 0       | 2,223            | **p50 25, p95 31**   | p50 38, p95 52       | p50 33, p95 35       | **p50 42, p95 50**   | **p50 41, p95 49**   | **p50 44, p95 47**   |
| Western Europe box | 5       | 0                | **p50 6, p95 8**     | p50 8, p95 9         | p50 7, p95 7         | **p50 26, p95 29**   | p50 76, p95 84       | p50 121, p95 125     |
| Whole world        | 0       | 200,000          | p50 720, p95 805     | **p50 320, p95 397** | **p50 293, p95 336** | p50 1,773, p95 1,892 | **p50 409, p95 433** | **p50 418, p95 421** |
| Whole world        | 5       | 9                | **p50 9, p95 10**    | p50 15, p95 22       | p50 11, p95 12       | p50 1,212, p95 1,304 | **p50 408, p95 468** | **p50 437, p95 444** |
| Search "granite"   | 0       | 19,860           | **p50 148, p95 153** | p50 152, p95 177     | **p50 137, p95 141** | p50 268, p95 275     | p50 3,830, p95 4,351 | **p50 75, p95 76**   |
| Search "granite"   | 5       | 1                | **p50 10, p95 12**   | p50 12, p95 14       | p50 53, p95 64       | **p50 157, p95 165** | p50 3,834, p95 4,352 | **p50 146, p95 148** |
| Top contributor    | 0       | 20,127           | p50 83, p95 91       | **p50 74, p95 96**   | **p50 69, p95 73**   | p50 1,313, p95 1,482 | **p50 65, p95 70**   | p50 103, p95 105     |
| Top contributor    | 5       | 3                | **p50 7, p95 9**     | p50 10, p95 11       | p50 9, p95 10        | p50 1,030, p95 1,146 | **p50 66, p95 75**   | p50 114, p95 120     |
| Top manual group   | 0       | 4,054            | **p50 36, p95 56**   | p50 37, p95 49       | **p50 33, p95 49**   | p50 995, p95 1,066   | **p50 56, p95 60**   | p50 94, p95 96       |
| Top manual group   | 5       | 0                | **p50 7, p95 7**     | p50 9, p95 12        | **p50 7, p95 11**    | p50 1,013, p95 1,165 | **p50 65, p95 72**   | p50 113, p95 117     |

- Times are in milliseconds over 30 runs, and the matching samples are the Postgres run's.
- Bold marks each row's fastest list and fastest counts by p50, and any within 10% of it.
- Each run reseeds the database, so the matching samples differ by a few percent between runs, except where v2 misses matches.

## Why each is slow

- **Plain Postgres:** each facet's count ignores its own filter, so the counts read every sample the search text and box match, whatever the other filters.
- So the whole world with 5 filters matches 9 samples yet reads all 200,000, and the contributor and manual group cases, both counted facets, read every published sample.
- Selecting those samples takes 30 to 40% of the time, and reading them again once per facet, 11 times, most of the rest.
- **ParadeDB v1:** when the index answers every filter, map box included, it counts 11 facets over 200,000 samples in about 60 ms.
- The search text's regex and trigram conditions cannot run in the index, so ParadeDB checks its 7 conditions on every row, skipping Postgres's trigram indexes: 3.8 s per search, holding one of the api's 2 connections while every other request waits.
- **ParadeDB v2:** a search's counts take 75 ms, 3.6x faster than Postgres.
- A searched list now always scans the index, whose regex reads every distinct word: about 50 ms even when the filters leave 1 sample, against 10 ms in Postgres, which costs the list throughput since half the load searches.
- Every count with a filter, the contributor and manual group included, takes 30 to 50 ms more than in v1: the top contributor count runs the same index query in 98 ms instead of 60, likely because the index grew three text fields (not checked).
- A small map box with 5 filters counts 5x slower than in Postgres, 121 ms against 26.

## v2 misses matches

- A search combined with a selective facet filter loses matches, in the list and in the aggregate scan the counts use.
- "granite" with 3 filters finds 888 samples in v2 against about 1,184 in the other runs, and 1,064 against 1,118 on a local copy of 200,000 samples.
- The smallest failing query counts 1,430 samples where plain Postgres counts 1,507:

```sql
select count(*) from sample
where (name_unaccented @@@ pdb.regex('.*granite.*')
    or specific_name_unaccented @@@ pdb.regex('.*granite.*'))
  and nature = 'hand_sample';
```

- One regex condition alone, or exact word conditions in place of the regexes, count correctly.
- ParadeDB plans the correct index query, so the defect is in ParadeDB 0.25.11; newer releases are not checked.

## Counts versus show or hide only

- Hiding a value still means proving no matching sample has it, which reads every matching sample.
- Counting is 0 to 27% of the Postgres query (15% for a search, 27% for the whole world), the most dropping counts could save, and most of it stays since the query must still group samples by value to know which values exist.

## Options

1. **Run the search in the ParadeDB index:** tested as v2, it misses the keep bar and loses matches.
2. **Use ParadeDB only for searches without text**, at the cost of two counting implementations to keep in step.
3. **Stay on plain Postgres**, keep the columns copied onto each sample row, and count every facet whose own filter is inactive in one pass instead of 11; the whole-world and contributor cases would stay far above ParadeDB's 60 ms.

- ParadeDB also changes the database image in every environment and moves prod onto its own database container, whose backups are not handled yet.

## Reproducing

- Run `make benchmark-deploy` to create the host, then `make grid` and `make concurrency` on it, with `ENDPOINTS=list`, `ENDPOINTS=facets` or both; the [benchmark README](../infra/benchmark/README.md) has the details.
- The runs live in the gitignored `benchmark-results/`: `naive-implementation/` for plain Postgres, `paradedb-v1/` and `paradedb-v2/` for ParadeDB, each `conditions.csv` naming its commit.
