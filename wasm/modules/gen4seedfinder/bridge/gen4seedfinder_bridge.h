/*
 * PokeRNGKit Gen IV Seed Finder WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokemonRNGGuides Gen 4 Seed Finder. The Gen IV MT
 * and LCRNG behavior follows PokeFinder 4.3.2 under GPL-3.0-or-later.
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or later.
 */
#ifndef POKERNGKIT_GEN4SEEDFINDER_BRIDGE_H
#define POKERNGKIT_GEN4SEEDFINDER_BRIDGE_H

#include <cstdint>

struct Gen4SeedFinderPackedResult
{
    std::uint32_t seed;
    std::uint32_t year;
    std::uint32_t month;
    std::uint32_t day;
    std::uint32_t hour;
    std::uint32_t minute;
    std::uint32_t second;
    std::uint32_t delay;
    std::uint32_t sequenceLow;
    std::uint32_t sequenceHigh;
};

extern "C"
{
    std::uint32_t gen4seedfinder_api_version();
    std::uint32_t gen4seedfinder_search(std::uint32_t game, std::uint32_t year,
                                        std::uint32_t month, std::uint32_t day,
                                        std::uint32_t hour, std::uint32_t minute,
                                        std::uint32_t minSecond, std::uint32_t maxSecond,
                                        std::uint32_t minDelay, std::uint32_t maxDelay,
                                        std::uint32_t filterLow, std::uint32_t filterHigh,
                                        std::uint32_t filterLength, std::uint32_t sequenceCount);
    std::uintptr_t gen4seedfinder_result_ptr();
    std::uint32_t gen4seedfinder_result_count();
    std::uint32_t gen4seedfinder_last_error();
}

#endif
