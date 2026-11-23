[![make.fun · tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/globalcuan/makefun-tiny-stack-vm-01/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/globalcuan/makefun-tiny-stack-vm-01/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)

# tiny stack VM

A [make.fun tiny-stack-vm-01](https://make.fun/bounty/tiny-stack-vm-01-run-20261122) entry. `main.ts` (Node 22, standard library only) implements the kit's tiny stack ISA exactly as the reference VM defines it: 32-bit wrapping integers, a 256-value stack, calls, 256 words of memory, input/output, and all ten traps with their own exit codes, under the reference step and output limits. For every instance directory in `MAKEFUN_INPUT_DIR` it writes `stdout.bin` and `exit.txt` to `MAKEFUN_OUTPUT_DIR`.

Verified against the reference VM on the full practice set (40/40 byte-exact) and on 600 randomly generated programs (600/600).
