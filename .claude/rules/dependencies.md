# Dependencies

## Ask before adding a library

Never add a dependency without the developer's explicit go-ahead. Every library
is a long-term cost: bundle size, security surface, maintenance, lock-in.

First climb the ladder: stdlib, native platform feature, or an already-installed
dependency usually covers the need in a few lines.

If a library still seems warranted, present the choice and wait for a decision.
Lay out the no-library option (write it yourself, reuse what's installed)
against one or two candidates. For each, weigh:

- maintenance and popularity
- bundle and footprint
- API fit
- security surface
- how much code it actually saves

## But don't reinvent the wheel

Asking first is not licence to hand-roll. When the alternative is hundreds of
lines re-implementing something hard to get right (date math, crypto, parsing,
validation), a well-maintained library is the lazy choice. Rewriting it is more
code, more bugs, and more security surface: the opposite of ponytail.
