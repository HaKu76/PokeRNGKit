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
#include "gen5ivcache_bridge.h"

#include <Core/RNG/MT.hpp>
#include <Core/RNG/RNGList.hpp>
#include <cstdint>
#include <vector>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define POKERNGKIT_KEEPALIVE EMSCRIPTEN_KEEPALIVE
#else
#define POKERNGKIT_KEEPALIVE
#endif

#ifndef POKERNGKIT_GEN5IVCACHE_MAX_BATCH_RESULTS
#define POKERNGKIT_GEN5IVCACHE_MAX_BATCH_RESULTS 0x10000u
#endif

namespace
{
    constexpr std::uint32_t apiVersion = 1;
    constexpr std::uint32_t maximumChunkSeeds = 0x10000;
    constexpr std::uint32_t maximumInitialAdvances = 0;
    constexpr std::uint32_t maximumBrowserAdvances = 20;
    constexpr std::uint32_t maximumBatchResults = POKERNGKIT_GEN5IVCACHE_MAX_BATCH_RESULTS;
    static_assert(maximumBatchResults > 0);

    enum CacheType : std::uint32_t
    {
        Entralink = 0,
        Normal = 1,
        Roamer = 2,
    };

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        ResultLimit = 2,
    };

    thread_local std::vector<Gen5IvCachePackedHit> results;
    thread_local std::uint32_t processedCount = 0;
    thread_local std::uint32_t lastError = ErrorCode::None;

    std::uint8_t generate(MT &rng)
    {
        return static_cast<std::uint8_t>(rng.next() >> 27);
    }

    bool commonMatch(
        std::uint8_t hp, std::uint8_t attack, std::uint8_t defense, std::uint8_t specialAttack,
        std::uint8_t specialDefense)
    {
        return hp >= 30 && defense >= 30 && specialDefense >= 30 && (attack >= 30 || specialAttack >= 30);
    }

    bool appendResult(CacheType type, std::uint32_t advanceIndex, std::uint32_t seed)
    {
        if (results.size() >= maximumBatchResults)
        {
            lastError = ErrorCode::ResultLimit;
            return false;
        }
        results.push_back({ type, advanceIndex, seed });
        return true;
    }

    bool searchSeed(std::uint32_t seed, std::uint32_t initialAdvances, std::uint32_t maxAdvances)
    {
        RNGList<std::uint8_t, MT, 32, generate> rngList(seed, initialAdvances);
        const std::uint64_t entralinkEnd = static_cast<std::uint64_t>(maxAdvances) + 4;
        for (std::uint64_t index = 0; index <= entralinkEnd; index++, rngList.advanceState())
        {
            rngList.advance(22);
            std::uint8_t hp = rngList.next();
            std::uint8_t attack = rngList.next();
            std::uint8_t defense = rngList.next();
            std::uint8_t specialAttack = rngList.next();
            std::uint8_t specialDefense = rngList.next();
            std::uint8_t speed = rngList.next();
            if (commonMatch(hp, attack, defense, specialAttack, specialDefense) && (speed <= 1 || speed >= 30))
            {
                if (!appendResult(CacheType::Entralink, static_cast<std::uint32_t>(index), seed))
                {
                    return false;
                }
            }

            if (index <= static_cast<std::uint64_t>(maxAdvances) + 2)
            {
                rngList.resetState();
                hp = rngList.next();
                attack = rngList.next();
                defense = rngList.next();
                specialAttack = rngList.next();
                specialDefense = rngList.next();
                speed = rngList.next();
                if (commonMatch(hp, attack, defense, specialAttack, specialDefense) && (speed <= 1 || speed >= 30))
                {
                    if (!appendResult(CacheType::Normal, static_cast<std::uint32_t>(index), seed))
                    {
                        return false;
                    }
                }
            }

            if (index <= maxAdvances)
            {
                rngList.resetState();
                rngList.advance(1);
                hp = rngList.next();
                attack = rngList.next();
                defense = rngList.next();
                specialDefense = rngList.next();
                speed = rngList.next();
                specialAttack = rngList.next();
                if (commonMatch(hp, attack, defense, specialAttack, specialDefense) && speed >= 30)
                {
                    if (!appendResult(CacheType::Roamer, static_cast<std::uint32_t>(index), seed))
                    {
                        return false;
                    }
                }
            }
        }
        return true;
    }
}

static_assert(sizeof(Gen5IvCachePackedHit) == 3 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen5ivcache_api_version()
    {
        return apiVersion;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5ivcache_search(
        std::uint32_t initialAdvances, std::uint32_t maxAdvances, std::uint32_t startSeed, std::uint32_t seedCount)
    {
        results.clear();
        processedCount = 0;
        lastError = ErrorCode::None;
        const std::uint64_t endExclusive = static_cast<std::uint64_t>(startSeed) + seedCount;
        if (seedCount == 0 || seedCount > maximumChunkSeeds || endExclusive > (std::uint64_t { 1 } << 32)
            || initialAdvances > maximumInitialAdvances || maxAdvances > maximumBrowserAdvances)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }

        for (std::uint64_t seed = startSeed; seed < endExclusive; seed++)
        {
            if (!searchSeed(static_cast<std::uint32_t>(seed), initialAdvances, maxAdvances))
            {
                results.clear();
                return 0;
            }
            processedCount++;
        }
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen5ivcache_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5ivcache_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5ivcache_processed_count()
    {
        return processedCount;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5ivcache_last_error()
    {
        return lastError;
    }
}
