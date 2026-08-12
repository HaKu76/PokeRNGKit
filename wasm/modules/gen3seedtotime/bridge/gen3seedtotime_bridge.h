/*
 * PokeRNGKit Gen III Seed to Time WebAssembly bridge.
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#ifndef POKERNGKIT_GEN3_SEED_TO_TIME_BRIDGE_H
#define POKERNGKIT_GEN3_SEED_TO_TIME_BRIDGE_H

#include <cstdint>

struct Gen3SeedToTimePackedState
{
    std::uint32_t year;
    std::uint32_t month;
    std::uint32_t day;
    std::uint32_t hour;
    std::uint32_t minute;
};

extern "C"
{
    std::uint32_t gen3seedtotime_api_version();
    std::uint32_t gen3seedtotime_calculate(std::uint32_t seed, std::uint32_t year);
    std::uint32_t gen3seedtotime_origin_seed();
    std::uint32_t gen3seedtotime_advances();
    std::uintptr_t gen3seedtotime_result_ptr();
    std::uint32_t gen3seedtotime_result_count();
    std::uint32_t gen3seedtotime_last_error();
}

#endif
