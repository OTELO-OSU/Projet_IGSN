# Dependencies

## Ask before adding a library

- Never add a dependency without the developer's explicit go-ahead.
- Climb the ladder first: stdlib, native platform feature, or an already-installed dependency usually covers the need in a few lines.
- If a library still seems warranted, present the no-library option against one or two candidates (maintenance, bundle size, API fit, security surface, code saved) and wait for a decision.

## But don't reinvent the wheel

- Asking first is not licence to hand-roll.
- When the alternative is hundreds of lines re-implementing something hard to get right (date math, crypto, parsing, validation), a well-maintained library is the lazy choice.
