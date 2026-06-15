Place an optional TWG executable here as `twg-bin` when you want the repository
copy to carry its own binary.

The copied wrapper scripts resolve the binary in this order:

1. `TWG_BIN`
2. `bin/twg-bin` inside the current skill directory
3. `skills/twg/bin/twg-bin`
4. `bin/twg-bin` at the repository root
5. `/Users/kurrytran/.local/bin/twg-bin`
6. `twg-bin` on `PATH`

The local binary observed during the copy was a macOS arm64 executable around
81 MB, so it is not checked into this repository by default.
