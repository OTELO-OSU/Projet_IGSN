---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Testing

## Tests are mandatory

Every function and component MUST have tests. Untested code does not ship.

Test what a function does, not how it does it. Assert on behavior and outputs,
never on internal implementation.

## FIRST

Good tests are:

- Fast: run quickly so the suite stays cheap to run often.
- Independent: one test never affects another (see Isolation below).
- Repeatable: same result on every run, regardless of outside factors (date,
  network, order).
- Self-validating: a failure makes the reason obvious, no manual inspection.
- Timely: write the test alongside or before the code (TDD).

## Use TDD

Write tests first. Follow red-green-refactor: failing test, minimum code to
pass, then refactor.

## Structure: AAA

Use Arrange-Act-Assert:

    test('calculates similarity correctly', () => {
      // Arrange
      const input = buildInput()
      // Act
      const result = compute(input)
      // Assert
      expect(result).toBe(expected)
    })

## What to test

Test domain and business rules only. Do not test styling or attributes unless
they are bound to a domain rule.

Cover both success and failure cases for each behavior: the happy path and the
errors, rejections, and edge cases it must guard against. A test for success
alone lets failures regress unnoticed.

Use the BOUNDARY heuristic to hunt edge cases:

- Boundary values (first/last, min/max)
- Out-of-range values
- Unexpected inputs
- Null or missing values
- Duplicate or repeated data
- Alternative states
- Race conditions or repeated actions
- Yield or failure conditions

## Assert on whole values

Assert the full result with `toEqual` (or `toMatchObject` for a subset), not a
handful of individual fields. Checking only `success` or one property lets the
rest regress and hides bugs the assertion never looked at. A single whole-object
assertion also merges what would otherwise be several partial tests into one.

    // Prefer
    expect(result).toEqual({ name: "Grès", nature: "rock_powder" })
    // Over
    expect(result.success).toBe(true)
    expect(result.name).toBe("Grès")

## Naming: `it("should ...")`

Describe the behavior under test:

- it("should return an empty array when no items match the query")
- it("should throw when a required field is missing")

Avoid vague names: it("should work"), test1, testFoo.

## Prefer `it.each`

Use `it.each` wherever cases vary only by input/output, within a single
validation context. Do not merge success and failure cases into one `it.each`:
keep one block for the cases that pass and another for the cases that fail.

    it.each(['IGSN123', 'IGSN000'])('should accept %s', (input) => {
      expect(isValidIgsn(input)).toBe(true)
    })

    it.each(['', 'nope'])('should reject %s', (input) => {
      expect(isValidIgsn(input)).toBe(false)
    })

## Failing tests

Only update a test if the domain rule changed. Otherwise the test caught a
regression: fix the code, not the test.

## Isolation

Each test is independent: no shared mutable state, no dependence on execution
order. Reset mocks and fixtures in beforeEach, not globally.
