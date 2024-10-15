#!/usr/bin/env bash

# we need bats submodule to be pulled

here="$(cd "${0%/*}" && pwd)"

"$here"/test/bats/bin/bats --jobs 24 test/*.bats
