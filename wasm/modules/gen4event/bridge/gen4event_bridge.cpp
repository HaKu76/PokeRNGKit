/*
 * PokeRNGKit Gen IV Event WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Generation and recovery behavior mirrors PokeFinder 4.3.2
 * EventGenerator4, EventSearcher4, State4, and LCRNGReverse.
 */

#include "gen4event_bridge.h"

#include <Core/RNG/LCRNG.hpp>
#include <algorithm>
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
    constexpr std::uint32_t apiVersion = 2;
    constexpr std::uint32_t maxStatesPerCall = 100000;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        RangeTooLarge = 2,
    };

    using IvArray = std::array<std::uint8_t, 6>;
    using FilterArray = std::array<std::uint32_t, 6>;

    struct RecoverySeeds
    {
        std::uint32_t count = 0;
        std::array<std::uint32_t, 6> seeds {};
    };

    thread_local std::vector<Gen4EventPackedState> generatedResults;
    thread_local std::vector<Gen4EventPackedSearcherState> searchedResults;
    thread_local std::uint32_t lastError = ErrorCode::None;
    thread_local bool searchResultActive = false;

    std::uint8_t hiddenPowerType(const IvArray &ivs)
    {
        const std::uint8_t bits = (ivs[0] & 1) | ((ivs[1] & 1) << 1) | ((ivs[2] & 1) << 2)
            | ((ivs[5] & 1) << 3) | ((ivs[3] & 1) << 4) | ((ivs[4] & 1) << 5);
        return static_cast<std::uint8_t>(bits * 15 / 63);
    }

    std::uint8_t hiddenPowerStrength(const IvArray &ivs)
    {
        const std::uint8_t bits = ((ivs[0] >> 1) & 1) | (((ivs[1] >> 1) & 1) << 1)
            | (((ivs[2] >> 1) & 1) << 2) | (((ivs[5] >> 1) & 1) << 3)
            | (((ivs[3] >> 1) & 1) << 4) | (((ivs[4] >> 1) & 1) << 5);
        return static_cast<std::uint8_t>(30 + bits * 40 / 63);
    }

    IvArray decodeIvs(std::uint16_t first, std::uint16_t second)
    {
        return {
            static_cast<std::uint8_t>(first & 31),
            static_cast<std::uint8_t>((first >> 5) & 31),
            static_cast<std::uint8_t>((first >> 10) & 31),
            static_cast<std::uint8_t>((second >> 5) & 31),
            static_cast<std::uint8_t>((second >> 10) & 31),
            static_cast<std::uint8_t>(second & 31),
        };
    }

    bool matchesIv(const IvArray &ivs, const FilterArray &minimum, const FilterArray &maximum)
    {
        for (std::size_t index = 0; index < ivs.size(); index++)
        {
            if (ivs[index] < minimum[index] || ivs[index] > maximum[index])
            {
                return false;
            }
        }
        return true;
    }

    bool matchesPerfectIvs(const IvArray &ivs, std::uint32_t value, std::uint32_t count)
    {
        return static_cast<std::uint32_t>(std::count_if(ivs.begin(), ivs.end(), [value](std::uint8_t iv) {
            return iv >= value;
        })) >= count;
    }

    bool validCommonInput(std::uint32_t species, std::uint32_t nature, std::uint32_t level,
                          std::uint32_t hiddenPowerFilter, const FilterArray &minimum,
                          const FilterArray &maximum)
    {
        if (species == 0 || species > 493 || nature > 24 || level == 0 || level > 100
            || hiddenPowerFilter == 0 || hiddenPowerFilter > 0xffff)
        {
            return false;
        }
        for (std::size_t index = 0; index < minimum.size(); index++)
        {
            if (minimum[index] > 31 || maximum[index] > 31 || minimum[index] > maximum[index])
            {
                return false;
            }
        }
        return true;
    }

    RecoverySeeds recoverPokeRngIvs(const IvArray &ivs)
    {
        constexpr std::uint32_t lag0 = 0x6134;
        constexpr std::uint32_t lag1 = 0xC907;
        constexpr std::uint32_t lower = 0x64833CB0;
        constexpr std::uint32_t upper = 0x6483CBBC;

        const std::uint32_t first
            = static_cast<std::uint32_t>((ivs[0] | (ivs[1] << 5) | (ivs[2] << 10)) << 16);
        const std::uint32_t second
            = static_cast<std::uint32_t>((ivs[5] | (ivs[3] << 5) | (ivs[4] << 10)) << 16);
        const std::uint32_t difference = PokeRNG::getMult() * first - second;
        const std::uint64_t temporary = static_cast<std::uint64_t>(difference >> 16) * lag1;
        const std::uint32_t low = static_cast<std::uint32_t>(((temporary + lower) >> 15) * lag0);
        const std::uint32_t middle = low + lag0;
        const std::uint32_t high = static_cast<std::uint32_t>(((temporary + upper) >> 15) * lag0);

        RecoverySeeds recovered;
        const auto recover = [&](std::uint32_t start) {
            for (std::uint32_t lowerBits = start % lag1; lowerBits < 0x10000; lowerBits += lag1)
            {
                const std::uint32_t seed = first | lowerBits;
                PokeRNG rng(seed);
                if ((rng.next() & 0x7fff0000) == second)
                {
                    recovered.seeds[recovered.count++] = seed;
                    recovered.seeds[recovered.count++] = seed ^ 0x80000000;
                }
            }
        };
        recover(low);
        recover(middle);
        if (middle != high)
        {
            recover(high);
        }
        return recovered;
    }

    bool appendSearcherState(std::uint32_t seed, std::uint32_t advances, const IvArray &ivs,
                             std::uint32_t minDelay, std::uint32_t maxDelay)
    {
        const auto hour = static_cast<std::uint8_t>((seed >> 16) & 0xff);
        const auto delay = static_cast<std::uint16_t>(seed & 0xffff);
        if (hour >= 24 || delay < minDelay || delay > maxDelay)
        {
            return true;
        }
        if (searchedResults.size() >= maxStatesPerCall)
        {
            return false;
        }
        searchedResults.push_back({ seed, delay, hour, advances, ivs[0], ivs[1], ivs[2], ivs[3],
                                    ivs[4], ivs[5], hiddenPowerType(ivs), hiddenPowerStrength(ivs) });
        return true;
    }

    bool searchInitialSeeds(std::uint32_t originSeed, const IvArray &ivs, std::uint32_t minAdvance,
                            std::uint32_t maxAdvance, std::uint32_t minDelay, std::uint32_t maxDelay)
    {
        PokeRNGR rng(originSeed, minAdvance);
        std::uint32_t seed = rng.getSeed();
        for (std::uint32_t advance = minAdvance;; advance++)
        {
            if (!appendSearcherState(seed, advance, ivs, minDelay, maxDelay))
            {
                return false;
            }
            if (advance == maxAdvance)
            {
                break;
            }
            seed = rng.next();
        }
        return true;
    }
}

static_assert(sizeof(Gen4EventPackedState) == 44);
static_assert(sizeof(Gen4EventPackedSearcherState) == 48);

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen4event_api_version()
    {
        return apiVersion;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4event_generate(
        std::uint32_t seed, std::uint32_t initialAdvances, std::uint32_t maxAdvances,
        std::uint32_t offset, std::uint32_t species, std::uint32_t nature,
        std::uint32_t level, std::uint32_t hiddenPowerFilter, std::uint32_t hpMin,
        std::uint32_t attackMin, std::uint32_t defenseMin, std::uint32_t specialAttackMin,
        std::uint32_t specialDefenseMin, std::uint32_t speedMin, std::uint32_t hpMax,
        std::uint32_t attackMax, std::uint32_t defenseMax, std::uint32_t specialAttackMax,
        std::uint32_t specialDefenseMax, std::uint32_t speedMax, std::uint32_t perfectIvValue,
        std::uint32_t perfectIvCount)
    {
        generatedResults.clear();
        searchedResults.clear();
        searchResultActive = false;
        lastError = ErrorCode::None;
        const FilterArray minimum = { hpMin, attackMin, defenseMin, specialAttackMin, specialDefenseMin, speedMin };
        const FilterArray maximum = { hpMax, attackMax, defenseMax, specialAttackMax, specialDefenseMax, speedMax };
        if (!validCommonInput(species, nature, level, hiddenPowerFilter, minimum, maximum)
            || perfectIvValue > 31 || perfectIvCount > 6
            || initialAdvances > 0xffffffffu - offset
            || initialAdvances + offset > 0xffffffffu - maxAdvances)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }

        PokeRNG rng(seed, initialAdvances);
        const auto jump = rng.getJump(offset);
        for (std::uint32_t count = 0;; count++)
        {
            PokeRNG go(rng, jump);
            const auto first = go.nextUShort();
            const auto second = go.nextUShort();
            const auto ivs = decodeIvs(first, second);
            const auto callRng = rng.nextUShort();
            if (matchesIv(ivs, minimum, maximum) && matchesPerfectIvs(ivs, perfectIvValue, perfectIvCount))
            {
                if (generatedResults.size() >= maxStatesPerCall)
                {
                    lastError = ErrorCode::RangeTooLarge;
                    return 0;
                }
                const auto call = static_cast<std::uint32_t>(callRng % 3);
                const auto chatot = static_cast<std::uint32_t>(((callRng % 8192) * 100) >> 13);
                generatedResults.push_back({ initialAdvances + count, ivs[0], ivs[1], ivs[2], ivs[3],
                                             ivs[4], ivs[5], hiddenPowerType(ivs), hiddenPowerStrength(ivs),
                                             call, chatot });
            }
            if (count == maxAdvances)
            {
                break;
            }
        }
        return static_cast<std::uint32_t>(generatedResults.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4event_search(
        std::uint32_t startIndex, std::uint32_t stateCount, std::uint32_t minAdvance,
        std::uint32_t maxAdvance, std::uint32_t minDelay, std::uint32_t maxDelay,
        std::uint32_t species, std::uint32_t nature, std::uint32_t level,
        std::uint32_t hiddenPowerFilter, std::uint32_t hpMin, std::uint32_t attackMin,
        std::uint32_t defenseMin, std::uint32_t specialAttackMin,
        std::uint32_t specialDefenseMin, std::uint32_t speedMin, std::uint32_t hpMax,
        std::uint32_t attackMax, std::uint32_t defenseMax, std::uint32_t specialAttackMax,
        std::uint32_t specialDefenseMax, std::uint32_t speedMax, std::uint32_t perfectIvValue,
        std::uint32_t perfectIvCount)
    {
        generatedResults.clear();
        searchedResults.clear();
        searchResultActive = true;
        lastError = ErrorCode::None;
        const FilterArray minimum = { hpMin, attackMin, defenseMin, specialAttackMin, specialDefenseMin, speedMin };
        const FilterArray maximum = { hpMax, attackMax, defenseMax, specialAttackMax, specialDefenseMax, speedMax };
        if (!validCommonInput(species, nature, level, hiddenPowerFilter, minimum, maximum)
            || perfectIvValue > 31 || perfectIvCount > 6
            || minAdvance > maxAdvance || minDelay > maxDelay || stateCount == 0)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }

        std::array<std::uint64_t, 6> widths {};
        std::uint64_t totalStates = 1;
        for (std::size_t index = 0; index < widths.size(); index++)
        {
            widths[index] = maximum[index] - minimum[index] + 1;
            totalStates *= widths[index];
        }
        if (static_cast<std::uint64_t>(startIndex) + stateCount > totalStates)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }

        for (std::uint32_t offsetIndex = 0; offsetIndex < stateCount; offsetIndex++)
        {
            std::uint64_t stateIndex = static_cast<std::uint64_t>(startIndex) + offsetIndex;
            IvArray ivs {};
            for (int stat = 5; stat >= 0; stat--)
            {
                ivs[stat] = static_cast<std::uint8_t>(minimum[stat] + stateIndex % widths[stat]);
                stateIndex /= widths[stat];
            }
            if ((hiddenPowerFilter & (1u << hiddenPowerType(ivs))) == 0
                || !matchesPerfectIvs(ivs, perfectIvValue, perfectIvCount))
            {
                continue;
            }
            const auto recovered = recoverPokeRngIvs(ivs);
            for (std::uint32_t index = 0; index < recovered.count; index++)
            {
                PokeRNGR reverse(recovered.seeds[index]);
                const auto origin = reverse.next();
                if (!searchInitialSeeds(origin, ivs, minAdvance, maxAdvance, minDelay, maxDelay)
                    || !searchInitialSeeds(origin ^ 0x80000000, ivs, minAdvance, maxAdvance, minDelay, maxDelay))
                {
                    return static_cast<std::uint32_t>(searchedResults.size());
                }
            }
        }
        return static_cast<std::uint32_t>(searchedResults.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen4event_result_ptr()
    {
        return searchResultActive ? reinterpret_cast<std::uintptr_t>(searchedResults.data())
                                  : reinterpret_cast<std::uintptr_t>(generatedResults.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4event_result_count()
    {
        return searchResultActive ? static_cast<std::uint32_t>(searchedResults.size())
                                  : static_cast<std::uint32_t>(generatedResults.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4event_last_error()
    {
        return lastError;
    }
}
