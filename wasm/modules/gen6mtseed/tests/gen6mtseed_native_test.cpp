/*
 * PokeRNGKit Gen VI TinyFinder MT Seed native fixture.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#include "gen6mtseed_bridge.h"

#include <cassert>
#include <cstdint>

int main() {
    assert(gen6mtseed_api_version() == 1);
    const std::uint32_t request[] = {
        0, 0, 0, 1, 3, 0, 0, 0, 0, 0, 0, 0, 0x1ff'ffff,
        0, 0, 0, 0, 0, 0, 31, 31, 31, 31, 31, 31,
        0, 0, 0, 4, 1, 1, 0, 100,
    };
    assert(gen6mtseed_begin(request) == 1);
    assert(gen6mtseed_step(8) > 0);
    assert(gen6mtseed_step_processed() == 1);
    assert(gen6mtseed_total_processed() == 1);
    assert(gen6mtseed_last_error() == 0);
    const auto *result = reinterpret_cast<const std::uint32_t *>(gen6mtseed_result_ptr());
    assert(result[0] == 0);
    assert(result[1] == 1);
    assert(result[5] <= 31);
    const std::uint32_t invalid[] = {
        0, 0, 0, 0, 10'000'001, 0, 0, 0, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 0, 0, 31, 31, 31, 31, 31, 31,
        0, 0, 0, 4, 1, 1, 0, 100,
    };
    assert(gen6mtseed_begin(invalid) == 0);
    assert(gen6mtseed_last_error() == 1);
}
