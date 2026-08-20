/*
 * PokeRNGKit Gen VI Main Seed Finder native fixture.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#include "gen6mainseed_bridge.h"

#include <cassert>
#include <cstdint>

int main() {
    assert(gen6mainseed_api_version() == 1);

    const std::uint32_t twoWilds[] = {
        0, 0, 0, 0, 0, 1, 6, 10, 15, 0, 14, 6, 18, 4, 0, 10, 7, 19, 12, 30, 28, 21,
    };
    assert(gen6mainseed_search(twoWilds) == 1);
    assert(gen6mainseed_processed_count() == 1);
    assert(gen6mainseed_last_error() == 0);
    const auto *twoWildResults = reinterpret_cast<const std::uint32_t *>(gen6mainseed_result_ptr());
    assert(twoWildResults[0] == 0);
    assert(twoWildResults[1] == 1);
    assert(twoWildResults[2] == 3);
    assert(twoWildResults[3] == 10);
    assert(twoWildResults[4] == 8);

    const std::uint32_t oneWild[] = {
        1, 0, 0, 0, 0, 1, 6, 0, 0, 3, 14, 6, 18, 4, 0, 10, 14, 6, 18, 4, 0, 10,
    };
    assert(gen6mainseed_search(oneWild) == 1);
    assert(gen6mainseed_processed_count() == 1);
    assert(gen6mainseed_last_error() == 0);
    const auto *oneWildResults = reinterpret_cast<const std::uint32_t *>(gen6mainseed_result_ptr());
    assert(oneWildResults[0] == 0);
    assert(oneWildResults[1] == 1);
    assert(oneWildResults[2] == 3);
    assert(oneWildResults[5] == 154);

    const std::uint32_t invalid[] = {
        1, 0, 0, 0, 0, 0, 4001, 0, 0, 25, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2,
    };
    assert(gen6mainseed_search(invalid) == 0);
    assert(gen6mainseed_last_error() == 1);
}
