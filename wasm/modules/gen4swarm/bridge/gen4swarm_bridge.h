/*
 * PokeRNGKit Gen IV Swarm RNG WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN4SWARM_BRIDGE_H
#define POKERNGKIT_GEN4SWARM_BRIDGE_H

#include <cstdint>

struct Gen4SwarmPackedAdvance
{
    std::uint32_t advance;
    std::uint32_t encounterIndex;
};

struct Gen4SwarmPackedSeed
{
    std::uint32_t seed;
    std::uint32_t hour;
    std::uint32_t delay;
    std::uint32_t mtAdvances;
};

extern "C"
{
    std::uint32_t gen4swarm_api_version();
    std::uint32_t gen4swarm_find_advances(std::uint32_t game, std::uint32_t seed,
                                          std::uint32_t targetIndex, std::uint32_t minAdvance,
                                          std::uint32_t maxAdvance);
    std::uint32_t gen4swarm_find_seed(std::uint32_t game, std::uint32_t targetIndex,
                                      std::uint32_t minDelay, std::uint32_t minHour,
                                      std::uint32_t mtAdvances);
    std::uintptr_t gen4swarm_result_ptr();
    std::uint32_t gen4swarm_result_count();
    std::uint32_t gen4swarm_last_error();
}

#endif
