/*
 * PokeRNGKit Gen III Jirachi Advancer WebAssembly bridge.
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#ifndef POKERNGKIT_GEN3_JIRACHI_BRIDGE_H
#define POKERNGKIT_GEN3_JIRACHI_BRIDGE_H

#include <cstdint>

extern "C"
{
    std::uint32_t gen3jirachi_api_version();
    std::uint32_t gen3jirachi_calculate(
        std::uint32_t startingSeed,
        std::uint32_t targetSeed,
        std::uint32_t maxAdvances,
        std::uint32_t bruteForceRange);
    std::uint32_t gen3jirachi_compute_seed(std::uint32_t seed);
    std::uint32_t gen3jirachi_target_advances();
    std::uintptr_t gen3jirachi_result_ptr();
    std::uint32_t gen3jirachi_result_count();
    std::uint32_t gen3jirachi_last_error();
}

#endif
