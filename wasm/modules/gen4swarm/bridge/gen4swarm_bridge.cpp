/*
 * PokeRNGKit Gen IV Swarm RNG WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokemonRNGGuides Gen 4 Swarm RNG and
 * Real96/Gen4SwarmDailyEncounterRNGTool. The MT and ARNG behavior follows
 * PokeFinder 4.3.2 under GPL-3.0-or-later.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen4swarm_bridge.h"

#include <array>
#include <cstddef>
#include <cstdint>
#include <vector>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define POKERNGKIT_KEEPALIVE EMSCRIPTEN_KEEPALIVE
#else
#define POKERNGKIT_KEEPALIVE
#endif

namespace
{
    constexpr std::uint32_t apiVersion = 1;
    constexpr std::uint32_t maxAdvanceRange = 100'000;
    constexpr std::uint32_t maxDelay = 9'999;
    constexpr std::uint32_t maxHour = 23;
    constexpr std::uint32_t maxMtAdvances = 9'999;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidGame = 1,
        InvalidEncounter = 2,
        InvalidRange = 3,
        InvalidSeedSearch = 4,
    };

    thread_local std::vector<Gen4SwarmPackedAdvance> advanceResults;
    thread_local std::vector<Gen4SwarmPackedSeed> seedResults;
    thread_local std::uint32_t lastError = ErrorCode::None;

    constexpr std::array<std::uint32_t, 28> dpEncounters{
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
        14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27};
    constexpr std::array<std::uint32_t, 22> ptEncounters{
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
        14, 15, 16, 17, 18, 19, 20, 21};
    constexpr std::array<std::uint32_t, 20> hgssEncounters{
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
        14, 15, 16, 17, 18, 19};

    std::uint32_t encounterCount(std::uint32_t game)
    {
        if (game == 0) return static_cast<std::uint32_t>(dpEncounters.size());
        if (game == 1) return static_cast<std::uint32_t>(ptEncounters.size());
        if (game == 2 || game == 3) return static_cast<std::uint32_t>(hgssEncounters.size());
        return 0;
    }

    class MersenneTwister
    {
    public:
        explicit MersenneTwister(std::uint32_t seed)
        {
            state[0] = seed;
            for (std::size_t i = 1; i < state.size(); ++i)
                state[i] = 0x6C078965U * (state[i - 1] ^ (state[i - 1] >> 30)) + static_cast<std::uint32_t>(i);
        }

        void advance(std::uint32_t count)
        {
            for (std::uint32_t i = 0; i < count; ++i) static_cast<void>(next());
        }

        std::uint32_t next()
        {
            if (index >= state.size())
            {
                for (std::size_t i = 0; i < state.size(); ++i)
                {
                    const std::uint32_t y = (state[i] & 0x80000000U) |
                                            (state[(i + 1) % state.size()] & 0x7FFFFFFFU);
                    state[i] = state[(i + 397) % state.size()] ^ (y >> 1) ^ ((y & 1U) ? 0x9908B0DFU : 0U);
                }
                index = 0;
            }
            std::uint32_t y = state[index++];
            y ^= y >> 11;
            y ^= (y << 7) & 0x9D2C5680U;
            y ^= (y << 15) & 0xEFC60000U;
            y ^= y >> 18;
            return y;
        }

    private:
        std::array<std::uint32_t, 624> state{};
        std::size_t index = 624;
    };

    std::uint32_t arng(std::uint32_t seed)
    {
        return 0x6C078965U * seed + 1U;
    }

    bool validGameAndEncounter(std::uint32_t game, std::uint32_t targetIndex)
    {
        const auto count = encounterCount(game);
        return count > 0 && targetIndex < count;
    }

    void clearResults()
    {
        advanceResults.clear();
        seedResults.clear();
        lastError = ErrorCode::None;
    }
}

POKERNGKIT_KEEPALIVE std::uint32_t gen4swarm_api_version()
{
    return apiVersion;
}

POKERNGKIT_KEEPALIVE std::uint32_t gen4swarm_find_advances(std::uint32_t game, std::uint32_t seed,
                                                           std::uint32_t targetIndex, std::uint32_t minAdvance,
                                                           std::uint32_t maxAdvance)
{
    clearResults();
    const auto count = encounterCount(game);
    if (count == 0) { lastError = ErrorCode::InvalidGame; return 0; }
    if (targetIndex >= count) { lastError = ErrorCode::InvalidEncounter; return 0; }
    if (maxAdvance < minAdvance || maxAdvance - minAdvance > maxAdvanceRange)
    {
        lastError = ErrorCode::InvalidRange;
        return 0;
    }

    MersenneTwister rng(seed);
    rng.advance(minAdvance);
    advanceResults.reserve(static_cast<std::size_t>(maxAdvance - minAdvance) + 1);
    for (std::uint32_t advance = minAdvance; advance <= maxAdvance; ++advance)
    {
        const auto randomValue = arng(arng(rng.next()));
        const auto encounterIndex = randomValue % count;
        if (encounterIndex == targetIndex) advanceResults.push_back({advance, encounterIndex});
        if (advance == 0xFFFFFFFFU) break;
    }
    return static_cast<std::uint32_t>(advanceResults.size());
}

POKERNGKIT_KEEPALIVE std::uint32_t gen4swarm_find_seed(std::uint32_t game, std::uint32_t targetIndex,
                                                       std::uint32_t minDelay, std::uint32_t minHour,
                                                       std::uint32_t mtAdvances)
{
    clearResults();
    const auto count = encounterCount(game);
    if (count == 0) { lastError = ErrorCode::InvalidGame; return 0; }
    if (targetIndex >= count) { lastError = ErrorCode::InvalidEncounter; return 0; }
    if (minDelay > maxDelay || minHour > maxHour || mtAdvances > maxMtAdvances)
    {
        lastError = ErrorCode::InvalidSeedSearch;
        return 0;
    }

    for (std::uint32_t highByte = 0; highByte < 256; ++highByte)
        for (std::uint32_t hour = minHour; hour <= maxHour; ++hour)
            for (std::uint32_t delay = minDelay; delay <= maxDelay; ++delay)
            {
                const auto seed = (highByte << 24) | (hour << 16) | delay;
                MersenneTwister rng(seed);
                rng.advance(mtAdvances);
                const auto randomValue = arng(arng(rng.next()));
                if (randomValue % count == targetIndex)
                {
                    seedResults.push_back({seed, hour, delay, mtAdvances});
                    return 1;
                }
            }
    return 0;
}

POKERNGKIT_KEEPALIVE std::uintptr_t gen4swarm_result_ptr()
{
    if (!advanceResults.empty()) return reinterpret_cast<std::uintptr_t>(advanceResults.data());
    return reinterpret_cast<std::uintptr_t>(seedResults.data());
}

POKERNGKIT_KEEPALIVE std::uint32_t gen4swarm_result_count()
{
    return advanceResults.empty() ? static_cast<std::uint32_t>(seedResults.size())
                                  : static_cast<std::uint32_t>(advanceResults.size());
}

POKERNGKIT_KEEPALIVE std::uint32_t gen4swarm_last_error()
{
    return lastError;
}
