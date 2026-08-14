/*
 * PokeRNGKit Gen V IV Cache Finder WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 IVCacheSearcher, MT and RNGList
 * by Admiral_Fish, bumba, and EzPzStreamz (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN5IVCACHE_BRIDGE_H
#define POKERNGKIT_GEN5IVCACHE_BRIDGE_H

#include <cstdint>

struct Gen5IvCachePackedHit
{
    std::uint32_t type;
    std::uint32_t advanceIndex;
    std::uint32_t seed;
};

extern "C"
{
    std::uint32_t gen5ivcache_api_version();
    std::uint32_t gen5ivcache_search(
        std::uint32_t initialAdvances, std::uint32_t maxAdvances, std::uint32_t startSeed, std::uint32_t seedCount);
    std::uintptr_t gen5ivcache_result_ptr();
    std::uint32_t gen5ivcache_result_count();
    std::uint32_t gen5ivcache_processed_count();
    std::uint32_t gen5ivcache_last_error();
}

#endif
