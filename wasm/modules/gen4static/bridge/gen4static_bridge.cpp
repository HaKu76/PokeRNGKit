/*
 * PokeRNGKit Gen IV Static WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Generation and recovery behavior mirrors PokeFinder 4.3.2
 * StaticGenerator4, StaticSearcher4, State4, and LCRNGReverse.
 */

#include "gen4static_bridge.h"
#include "../../../shared/perfect_iv_combinations.hpp"

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

    thread_local std::vector<Gen4StaticPackedState> generatedResults;
    thread_local std::vector<Gen4StaticPackedSearcherState> searchedResults;
    thread_local std::uint32_t lastError = ErrorCode::None;
    thread_local bool searchResultActive = false;

    std::uint8_t getGender(std::uint32_t pid, std::uint32_t genderRatio)
    {
        if (genderRatio == 255)
        {
            return 2;
        }
        if (genderRatio == 254)
        {
            return 1;
        }
        if (genderRatio == 0)
        {
            return 0;
        }
        return (pid & 0xff) < genderRatio ? 1 : 0;
    }

    std::uint8_t getShiny(std::uint32_t pid, std::uint16_t tsv)
    {
        const auto psv = static_cast<std::uint16_t>((pid >> 16) ^ (pid & 0xffff));
        if (psv == tsv)
        {
            return 2;
        }
        return (psv ^ tsv) < 8 ? 1 : 0;
    }

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

    bool matchesShiny(std::uint8_t shiny, std::uint32_t filter)
    {
        return filter == Gen4ShinyAny || (filter == Gen4ShinyNot && shiny == 0)
            || (filter == Gen4ShinyYes && shiny != 0);
    }

    bool matchesGender(std::uint8_t gender, std::uint32_t filter)
    {
        return filter == Gen4GenderAny || (filter == Gen4GenderMale && gender == 0)
            || (filter == Gen4GenderFemale && gender == 1) || (filter == Gen4Genderless && gender == 2);
    }

    bool matchesAbility(std::uint8_t ability, std::uint32_t filter)
    {
        return filter == Gen4AbilityAny || (filter == Gen4AbilityFirst && ability == 0)
            || (filter == Gen4AbilitySecond && ability == 1);
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

    bool matchesState(const IvArray &ivs, std::uint8_t nature, std::uint8_t shiny, std::uint8_t gender,
                      std::uint8_t ability, std::uint32_t natureFilter, std::uint32_t hiddenPowerFilter,
                      const FilterArray &minimum, const FilterArray &maximum, std::uint32_t shinyFilter,
                      std::uint32_t genderFilter, std::uint32_t abilityFilter)
    {
        return (natureFilter & (1u << nature)) != 0
            && (hiddenPowerFilter & (1u << hiddenPowerType(ivs))) != 0 && matchesShiny(shiny, shinyFilter)
            && matchesGender(gender, genderFilter) && matchesAbility(ability, abilityFilter)
            && matchesIv(ivs, minimum, maximum);
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

    bool fixedGender(std::uint32_t genderRatio)
    {
        return genderRatio == 0 || genderRatio == 254 || genderRatio == 255;
    }

    std::uint8_t cuteCharmBuffer(std::uint32_t lead, std::uint32_t genderRatio)
    {
        return lead == Gen4LeadCuteCharmF ? static_cast<std::uint8_t>(25 * ((genderRatio / 25) + 1)) : 0;
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

    bool appendGeneratedState(std::uint32_t advances, std::uint32_t pid, const IvArray &ivs,
                              std::uint32_t genderRatio, std::uint32_t level, std::uint16_t tsv,
                              std::uint16_t callRng, std::uint32_t natureFilter, std::uint32_t hiddenPowerFilter,
                              const FilterArray &minimum, const FilterArray &maximum, std::uint32_t shinyFilter,
                              std::uint32_t genderFilter, std::uint32_t abilityFilter)
    {
        const auto ability = static_cast<std::uint8_t>(pid & 1);
        const auto gender = getGender(pid, genderRatio);
        const auto nature = static_cast<std::uint8_t>(pid % 25);
        const auto shiny = getShiny(pid, tsv);
        if (!matchesState(ivs, nature, shiny, gender, ability, natureFilter, hiddenPowerFilter, minimum,
                          maximum, shinyFilter, genderFilter, abilityFilter))
        {
            return true;
        }
        if (generatedResults.size() >= maxStatesPerCall)
        {
            lastError = ErrorCode::RangeTooLarge;
            return false;
        }
        generatedResults.push_back({ advances, pid, ivs[0], ivs[1], ivs[2], ivs[3], ivs[4], ivs[5], ability,
                                     gender, level, nature, shiny, hiddenPowerType(ivs), hiddenPowerStrength(ivs),
                                     static_cast<std::uint32_t>(callRng % 3),
                                     static_cast<std::uint32_t>(((callRng % 8192) * 100) >> 13) });
        return true;
    }

    bool appendSearcherState(std::uint32_t seed, std::uint32_t advances, std::uint32_t pid,
                             const IvArray &ivs, std::uint32_t genderRatio, std::uint32_t level,
                             std::uint16_t tsv, std::uint32_t natureFilter, std::uint32_t hiddenPowerFilter,
                             const FilterArray &minimum, const FilterArray &maximum, std::uint32_t shinyFilter,
                             std::uint32_t genderFilter, std::uint32_t abilityFilter, std::uint32_t minDelay,
                             std::uint32_t maxDelay)
    {
        const auto delay = static_cast<std::uint16_t>(seed & 0xffff);
        const auto hour = static_cast<std::uint8_t>((seed >> 16) & 0xff);
        if (hour >= 24 || delay < minDelay || delay > maxDelay)
        {
            return true;
        }
        const auto ability = static_cast<std::uint8_t>(pid & 1);
        const auto gender = getGender(pid, genderRatio);
        const auto nature = static_cast<std::uint8_t>(pid % 25);
        const auto shiny = getShiny(pid, tsv);
        if (!matchesState(ivs, nature, shiny, gender, ability, natureFilter, hiddenPowerFilter, minimum,
                          maximum, shinyFilter, genderFilter, abilityFilter))
        {
            return true;
        }
        if (searchedResults.size() >= maxStatesPerCall)
        {
            lastError = ErrorCode::RangeTooLarge;
            return false;
        }
        searchedResults.push_back({ seed, delay, hour, advances, pid, ivs[0], ivs[1], ivs[2], ivs[3], ivs[4],
                                    ivs[5], ability, gender, level, nature, shiny, hiddenPowerType(ivs),
                                    hiddenPowerStrength(ivs), 0, 0 });
        return true;
    }

    bool searchInitialSeeds(std::uint32_t originSeed, std::uint32_t pid, const IvArray &ivs,
                            std::uint32_t minAdvance, std::uint32_t maxAdvance, std::uint32_t minDelay,
                            std::uint32_t maxDelay, std::uint32_t genderRatio, std::uint32_t level,
                            std::uint16_t tsv, std::uint32_t natureFilter, std::uint32_t hiddenPowerFilter,
                            const FilterArray &minimum, const FilterArray &maximum, std::uint32_t shinyFilter,
                            std::uint32_t genderFilter, std::uint32_t abilityFilter)
    {
        PokeRNGR rng(originSeed, minAdvance);
        std::uint32_t seed = rng.getSeed();
        for (std::uint32_t advance = minAdvance;; advance++)
        {
            if (!appendSearcherState(seed, advance, pid, ivs, genderRatio, level, tsv, natureFilter,
                                     hiddenPowerFilter, minimum, maximum, shinyFilter, genderFilter, abilityFilter,
                                     minDelay, maxDelay))
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

    bool searchRecoveredIvs(const RecoverySeeds &recovered, const IvArray &ivs, std::uint32_t minAdvance,
                            std::uint32_t maxAdvance, std::uint32_t minDelay, std::uint32_t maxDelay,
                            std::uint32_t method, std::uint32_t lead, std::uint32_t genderRatio,
                            std::uint32_t level, std::uint32_t shinyLock, std::uint16_t tsv,
                            std::uint32_t natureFilter, std::uint32_t hiddenPowerFilter,
                            const FilterArray &minimum, const FilterArray &maximum, std::uint32_t shinyFilter,
                            std::uint32_t genderFilter, std::uint32_t abilityFilter)
    {
        if ((lead == Gen4LeadCuteCharmF || lead == Gen4LeadCuteCharmM) && fixedGender(genderRatio))
        {
            lead = Gen4LeadNone;
        }
        const auto buffer = cuteCharmBuffer(lead, genderRatio);

        for (std::uint32_t index = 0; index < recovered.count; index++)
        {
            PokeRNGR rng(recovered.seeds[index]);
            std::uint32_t pid;
            if (method == Gen4Method1)
            {
                if (shinyLock == Gen4ShinyAlways)
                {
                    std::uint16_t low = 0;
                    for (int bit = 15; bit > 2; bit--)
                    {
                        low |= rng.nextUShort(2) << bit;
                    }
                    std::uint16_t high = rng.nextUShort(8);
                    low |= rng.nextUShort(8);
                    high |= (low ^ tsv) & 0xfff8;
                    pid = (static_cast<std::uint32_t>(high) << 16) | low;
                }
                else
                {
                    pid = static_cast<std::uint32_t>(rng.nextUShort()) << 16;
                    pid |= rng.nextUShort();
                    if (shinyLock == Gen4ShinyNever)
                    {
                        while (getShiny(pid, tsv) != 0)
                        {
                            pid = ARNG(pid).next();
                        }
                    }
                }
                if (!searchInitialSeeds(rng.next(), pid, ivs, minAdvance, maxAdvance, minDelay, maxDelay,
                                        genderRatio, level, tsv, natureFilter, hiddenPowerFilter, minimum,
                                        maximum, shinyFilter, genderFilter, abilityFilter))
                {
                    return false;
                }
                continue;
            }

            if (lead == Gen4LeadCuteCharmF || lead == Gen4LeadCuteCharmM)
            {
                const auto nature = method == Gen4MethodJ ? rng.nextUShort<false>(25) : rng.nextUShort(25);
                const auto active = method == Gen4MethodJ ? rng.nextUShort<false>(3) : rng.nextUShort(3);
                if (active != 0 && (natureFilter & (1u << nature)) != 0)
                {
                    pid = nature + buffer;
                    if (!searchInitialSeeds(rng.next(), pid, ivs, minAdvance, maxAdvance, minDelay, maxDelay,
                                            genderRatio, level, tsv, natureFilter, hiddenPowerFilter, minimum,
                                            maximum, shinyFilter, genderFilter, abilityFilter))
                    {
                        return false;
                    }
                }
                continue;
            }

            pid = static_cast<std::uint32_t>(rng.nextUShort()) << 16;
            pid |= rng.nextUShort();
            const auto nature = static_cast<std::uint8_t>(pid % 25);
            if ((natureFilter & (1u << nature)) == 0)
            {
                continue;
            }

            std::uint16_t nextRng = rng.nextUShort();
            std::uint16_t nextRng2 = rng.nextUShort();
            std::uint8_t huntNature;
            do
            {
                std::array<std::uint32_t, 2> seeds {};
                std::array<bool, 2> valid {};
                if (lead == Gen4LeadNone)
                {
                    const bool natureHit
                        = method == Gen4MethodJ ? (nextRng / 0xa3e) == nature : (nextRng % 25) == nature;
                    if (natureHit)
                    {
                        seeds[0] = rng.getSeed();
                        valid[0] = true;
                    }
                }
                else if (lead == Gen4LeadSynchronize)
                {
                    const bool synchronizeHit
                        = method == Gen4MethodJ ? (nextRng >> 15) == 0 : (nextRng % 2) == 0;
                    const bool natureHit
                        = method == Gen4MethodJ ? (nextRng / 0xa3e) == nature : (nextRng % 25) == nature;
                    const bool failedSynchronize
                        = method == Gen4MethodJ ? (nextRng2 >> 15) == 1 : (nextRng2 % 2) == 1;
                    if (synchronizeHit)
                    {
                        seeds[0] = rng.getSeed();
                        valid[0] = true;
                    }
                    if (failedSynchronize && natureHit)
                    {
                        seeds[1] = PokeRNGR(rng).next();
                        valid[1] = true;
                    }
                }

                for (std::size_t candidate = 0; candidate < valid.size(); candidate++)
                {
                    if (valid[candidate]
                        && !searchInitialSeeds(seeds[candidate], pid, ivs, minAdvance, maxAdvance, minDelay,
                                               maxDelay, genderRatio, level, tsv, natureFilter,
                                               hiddenPowerFilter, minimum, maximum, shinyFilter, genderFilter,
                                               abilityFilter))
                    {
                        return false;
                    }
                }

                huntNature = static_cast<std::uint8_t>((static_cast<std::uint32_t>(nextRng) << 16 | nextRng2) % 25);
                nextRng = rng.nextUShort();
                nextRng2 = rng.nextUShort();
            } while (huntNature != nature);
        }
        return true;
    }

    bool validCommonInput(std::uint32_t method, std::uint32_t lead, std::uint32_t syncNature,
                          std::uint32_t species, std::uint32_t level, std::uint32_t genderRatio,
                          std::uint32_t shinyLock, std::uint32_t tid, std::uint32_t sid,
                          std::uint32_t shinyFilter, std::uint32_t genderFilter,
                          std::uint32_t abilityFilter, std::uint32_t natureFilter,
                          std::uint32_t hiddenPowerFilter, const FilterArray &minimum,
                          const FilterArray &maximum)
    {
        if (method < Gen4Method1 || method > Gen4MethodK || lead > Gen4LeadCuteCharmM || syncNature > 24
            || species == 0 || species > 493 || level == 0 || level > 100 || genderRatio > 255
            || shinyLock > Gen4ShinyAlways || tid > 0xffff || sid > 0xffff || shinyFilter > Gen4ShinyYes
            || genderFilter > Gen4Genderless || abilityFilter > Gen4AbilitySecond || natureFilter == 0
            || natureFilter > 0x1ffffff || hiddenPowerFilter == 0 || hiddenPowerFilter > 0xffff)
        {
            return false;
        }
        if (method == Gen4Method1 && lead != Gen4LeadNone)
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
}

static_assert(sizeof(Gen4StaticPackedState) == 68);
static_assert(sizeof(Gen4StaticPackedSearcherState) == 80);

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen4static_api_version()
    {
        return apiVersion;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4static_generate(
        std::uint32_t seed, std::uint32_t initialAdvances, std::uint32_t maxAdvances, std::uint32_t offset,
        std::uint32_t method, std::uint32_t lead, std::uint32_t syncNature, std::uint32_t species,
        std::uint32_t level, std::uint32_t genderRatio, std::uint32_t shinyLock, std::uint32_t tid,
        std::uint32_t sid, std::uint32_t shinyFilter, std::uint32_t genderFilter,
        std::uint32_t abilityFilter, std::uint32_t natureFilter, std::uint32_t hiddenPowerFilter,
        std::uint32_t hpMin, std::uint32_t attackMin, std::uint32_t defenseMin,
        std::uint32_t specialAttackMin, std::uint32_t specialDefenseMin, std::uint32_t speedMin,
        std::uint32_t hpMax, std::uint32_t attackMax, std::uint32_t defenseMax,
        std::uint32_t specialAttackMax, std::uint32_t specialDefenseMax, std::uint32_t speedMax,
        std::uint32_t perfectIvValue, std::uint32_t perfectIvCount)
    {
        generatedResults.clear();
        searchedResults.clear();
        searchResultActive = false;
        lastError = ErrorCode::None;

        const FilterArray minimum
            = { hpMin, attackMin, defenseMin, specialAttackMin, specialDefenseMin, speedMin };
        const FilterArray maximum
            = { hpMax, attackMax, defenseMax, specialAttackMax, specialDefenseMax, speedMax };
        if (maxAdvances >= maxStatesPerCall
            || static_cast<std::uint64_t>(initialAdvances) + offset + maxAdvances > 0xffffffffULL
            || !validCommonInput(method, lead, syncNature, species, level, genderRatio, shinyLock, tid, sid,
                                 shinyFilter, genderFilter, abilityFilter, natureFilter, hiddenPowerFilter,
                                 minimum, maximum)
            || perfectIvValue > 31 || perfectIvCount > 6)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }

        const auto tsv = static_cast<std::uint16_t>(tid ^ sid);
        const bool cuteCharm
            = (lead == Gen4LeadCuteCharmF || lead == Gen4LeadCuteCharmM) && !fixedGender(genderRatio);
        const auto buffer = cuteCharmBuffer(lead, genderRatio);
        PokeRNG rng(seed, initialAdvances);
        const auto jump = rng.getJump(offset);
        generatedResults.reserve(maxAdvances + 1);

        for (std::uint32_t count = 0; count <= maxAdvances; count++)
        {
            PokeRNG go(rng, jump);
            std::uint32_t pid;
            if (method == Gen4Method1)
            {
                if (shinyLock == Gen4ShinyAlways)
                {
                    std::uint16_t low = go.nextUShort(8);
                    std::uint16_t high = go.nextUShort(8);
                    for (int bit = 3; bit < 16; bit++)
                    {
                        low |= go.nextUShort(2) << bit;
                    }
                    high |= (low ^ tsv) & 0xfff8;
                    pid = (static_cast<std::uint32_t>(high) << 16) | low;
                }
                else
                {
                    pid = go.nextUShort();
                    pid |= static_cast<std::uint32_t>(go.nextUShort()) << 16;
                    if (shinyLock == Gen4ShinyNever)
                    {
                        while (getShiny(pid, tsv) != 0)
                        {
                            pid = ARNG(pid).next();
                        }
                    }
                }
            }
            else
            {
                bool cuteCharmActive = false;
                if (cuteCharm)
                {
                    cuteCharmActive = method == Gen4MethodJ ? go.nextUShort<false>(3) != 0 : go.nextUShort(3) != 0;
                }

                std::uint8_t nature;
                if (lead == Gen4LeadSynchronize)
                {
                    const bool synchronizeHit
                        = method == Gen4MethodJ ? go.nextUShort<false>(2) == 0 : go.nextUShort(2) == 0;
                    nature = synchronizeHit
                        ? static_cast<std::uint8_t>(syncNature)
                        : static_cast<std::uint8_t>(method == Gen4MethodJ ? go.nextUShort<false>(25) : go.nextUShort(25));
                }
                else
                {
                    nature = static_cast<std::uint8_t>(method == Gen4MethodJ ? go.nextUShort<false>(25) : go.nextUShort(25));
                }

                if (cuteCharmActive)
                {
                    pid = buffer + nature;
                }
                else
                {
                    do
                    {
                        const std::uint16_t low = go.nextUShort();
                        const std::uint16_t high = go.nextUShort();
                        pid = (static_cast<std::uint32_t>(high) << 16) | low;
                    } while (pid % 25 != nature);
                }
            }

            const auto iv1 = go.nextUShort();
            const auto iv2 = go.nextUShort();
            const IvArray ivs = decodeIvs(iv1, iv2);
            if (!matchesPerfectIvs(ivs, perfectIvValue, perfectIvCount)) continue;
            if (!appendGeneratedState(initialAdvances + count, pid, ivs, genderRatio, level, tsv,
                                      rng.nextUShort(), natureFilter, hiddenPowerFilter, minimum, maximum,
                                      shinyFilter, genderFilter, abilityFilter))
            {
                return 0;
            }
        }
        return static_cast<std::uint32_t>(generatedResults.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4static_search(
        std::uint32_t startIndex, std::uint32_t stateCount, std::uint32_t minAdvance,
        std::uint32_t maxAdvance, std::uint32_t minDelay, std::uint32_t maxDelay, std::uint32_t method,
        std::uint32_t lead, std::uint32_t syncNature, std::uint32_t species, std::uint32_t level,
        std::uint32_t genderRatio, std::uint32_t shinyLock, std::uint32_t tid, std::uint32_t sid,
        std::uint32_t shinyFilter, std::uint32_t genderFilter, std::uint32_t abilityFilter,
        std::uint32_t natureFilter, std::uint32_t hiddenPowerFilter, std::uint32_t hpMin,
        std::uint32_t attackMin, std::uint32_t defenseMin, std::uint32_t specialAttackMin,
        std::uint32_t specialDefenseMin, std::uint32_t speedMin, std::uint32_t hpMax,
        std::uint32_t attackMax, std::uint32_t defenseMax, std::uint32_t specialAttackMax,
        std::uint32_t specialDefenseMax, std::uint32_t speedMax, std::uint32_t perfectIvValue,
        std::uint32_t perfectIvCount)
    {
        generatedResults.clear();
        searchedResults.clear();
        searchResultActive = true;
        lastError = ErrorCode::None;

        const FilterArray minimum
            = { hpMin, attackMin, defenseMin, specialAttackMin, specialDefenseMin, speedMin };
        const FilterArray maximum
            = { hpMax, attackMax, defenseMax, specialAttackMax, specialDefenseMax, speedMax };
        if (stateCount == 0 || stateCount > maxStatesPerCall || minAdvance > maxAdvance || minDelay > maxDelay
            || !validCommonInput(method, lead, syncNature, species, level, genderRatio, shinyLock, tid, sid,
                                 shinyFilter, genderFilter, abilityFilter, natureFilter, hiddenPowerFilter,
                                 minimum, maximum)
            || perfectIvValue > 31 || perfectIvCount > 6)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }

        const auto totalStates = pokerngkit::countIvCombinations(
            minimum, maximum, perfectIvValue, perfectIvCount);
        if (static_cast<std::uint64_t>(startIndex) + stateCount > totalStates)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }

        const auto tsv = static_cast<std::uint16_t>(tid ^ sid);
        for (std::uint32_t offset = 0; offset < stateCount; offset++)
        {
            const IvArray ivs = pokerngkit::ivCombinationAtIndex(
                static_cast<std::uint64_t>(startIndex) + offset, minimum, maximum, perfectIvValue, perfectIvCount);
            if (!matchesPerfectIvs(ivs, perfectIvValue, perfectIvCount)) continue;
            const auto recovered = recoverPokeRngIvs(ivs);
            if (!searchRecoveredIvs(recovered, ivs, minAdvance, maxAdvance, minDelay, maxDelay, method, lead,
                                    genderRatio, level, shinyLock, tsv, natureFilter, hiddenPowerFilter, minimum,
                                    maximum, shinyFilter, genderFilter, abilityFilter))
            {
                return 0;
            }
        }
        return static_cast<std::uint32_t>(searchedResults.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen4static_result_ptr()
    {
        return searchResultActive ? reinterpret_cast<std::uintptr_t>(searchedResults.data())
                                  : reinterpret_cast<std::uintptr_t>(generatedResults.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4static_result_count()
    {
        return searchResultActive ? static_cast<std::uint32_t>(searchedResults.size())
                                  : static_cast<std::uint32_t>(generatedResults.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4static_last_error()
    {
        return lastError;
    }
}
