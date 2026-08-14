/*
 * PokeRNGKit Gen V SHA1 Cache Finder WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 SHA1CacheSearcher, SHA1,
 * Nazos and Keypresses by Admiral_Fish, bumba, and EzPzStreamz
 * (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN5SHA1CACHE_BRIDGE_H
#define POKERNGKIT_GEN5SHA1CACHE_BRIDGE_H

#include <cstdint>

struct Gen5Sha1CachePackedRequest
{
    std::uint32_t version;
    std::uint32_t language;
    std::uint32_t dsType;
    std::uint32_t macLow;
    std::uint32_t macHigh;
    std::uint32_t vcount;
    std::uint32_t timer0;
    std::uint32_t gxstat;
    std::uint32_t vframe;
    std::uint32_t year;
    std::uint32_t month;
    std::uint32_t day;
    std::uint32_t buttonMask;
    std::uint32_t resultLimit;
};

struct Gen5Sha1CachePackedResult
{
    std::uint32_t seedLow;
    std::uint32_t seedHigh;
    std::uint32_t seconds;
    std::uint32_t category;
};

extern "C"
{
    std::uint32_t gen5sha1cache_api_version();
    std::uint32_t gen5sha1cache_search(
        const Gen5Sha1CachePackedRequest *request,
        const std::uint32_t *entralinkSeeds,
        std::uint32_t entralinkCount,
        const std::uint32_t *normalSeeds,
        std::uint32_t normalCount,
        const std::uint32_t *roamerSeeds,
        std::uint32_t roamerCount);
    std::uintptr_t gen5sha1cache_result_ptr();
    std::uint32_t gen5sha1cache_result_count();
    std::uint32_t gen5sha1cache_processed_count();
    std::uint32_t gen5sha1cache_limit_reached();
    std::uint32_t gen5sha1cache_last_error();

#ifndef __EMSCRIPTEN__
    std::uint64_t gen5sha1cache_test_seed(const Gen5Sha1CachePackedRequest *request, std::uint32_t seconds);
#endif
}

#endif
