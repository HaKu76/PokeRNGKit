/*
 * PokeRNGKit Gen III PokeSpot WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#include "gen3pokespot_bridge.h"

#include <Core/RNG/LCRNG.hpp>
#include <algorithm>
#include <array>
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
    constexpr std::uint32_t maxFoodStatesPerCall = 100000;
    constexpr std::uint32_t maxResultsPerCall = 250000;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        ResultLimit = 2,
    };

    struct Slot
    {
        std::uint16_t species;
        std::uint8_t minLevel;
        std::uint8_t maxLevel;
        std::uint8_t genderRatio;
        bool hasTwoAbilities;
    };

    struct FoodState
    {
        std::uint32_t advances;
        std::uint32_t pid;
        std::uint8_t slot;
        std::uint8_t gender;
        std::uint8_t shiny;
    };

    // EncounterTableGenerator 7769c1df, Gen3/xd/pokespot.bin.
    constexpr std::array<std::array<Slot, 3>, 3> locations = {{
        {{{ 27, 10, 23, 127, false }, { 207, 10, 20, 127, true }, { 328, 10, 20, 127, true }}},
        {{{ 187, 10, 20, 127, false }, { 231, 10, 20, 127, false }, { 283, 10, 20, 127, false }}},
        {{{ 41, 10, 21, 127, false }, { 304, 10, 21, 127, true }, { 194, 10, 21, 127, true }}},
    }};

    thread_local std::vector<Gen3PokeSpotPackedState> results;
    thread_local std::uint32_t lastError = ErrorCode::None;

    std::uint8_t gender(std::uint32_t pid, std::uint8_t ratio)
    {
        if (ratio == 255) return 2;
        if (ratio == 254) return 1;
        if (ratio == 0) return 0;
        return (pid & 0xff) < ratio ? 1 : 0;
    }

    std::uint8_t shiny(std::uint32_t pid, std::uint16_t tsv)
    {
        const auto psv = static_cast<std::uint16_t>((pid >> 16) ^ (pid & 0xffff));
        if (psv == tsv) return 2;
        return (psv ^ tsv) < 8 ? 1 : 0;
    }

    std::uint8_t hiddenPower(const std::array<std::uint8_t, 6> &ivs)
    {
        return static_cast<std::uint8_t>(
            ((ivs[0] & 1) + 2 * (ivs[1] & 1) + 4 * (ivs[2] & 1) + 8 * (ivs[5] & 1)
             + 16 * (ivs[3] & 1) + 32 * (ivs[4] & 1))
            * 15 / 63);
    }

    bool matchesValue(std::uint8_t value, std::uint32_t filter, std::uint8_t first, std::uint8_t second)
    {
        return filter == 0 || (filter == first && value == 0) || (filter == second && value == 1);
    }

    bool validIvRanges(const std::array<std::uint32_t, 6> &minimum, const std::array<std::uint32_t, 6> &maximum)
    {
        for (std::size_t index = 0; index < minimum.size(); index++)
        {
            if (minimum[index] > 31 || maximum[index] > 31 || minimum[index] > maximum[index]) return false;
        }
        return true;
    }
}

static_assert(sizeof(Gen3PokeSpotPackedState) == 64);

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen3pokespot_api_version()
    {
        return apiVersion;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3pokespot_generate(
        std::uint32_t foodSeed, std::uint32_t encounterSeed, std::uint32_t foodInitialAdvances,
        std::uint32_t foodMaxAdvances, std::uint32_t encounterInitialAdvances,
        std::uint32_t encounterMaxAdvances, std::uint32_t foodOffset, std::uint32_t encounterOffset,
        std::uint32_t location, std::uint32_t tid, std::uint32_t sid, std::uint32_t shinyFilter,
        std::uint32_t genderFilter, std::uint32_t abilityFilter, std::uint32_t natureFilter,
        std::uint32_t hiddenPowerFilter, std::uint32_t encounterSlotFilter,
        std::uint32_t hpMin, std::uint32_t attackMin, std::uint32_t defenseMin,
        std::uint32_t specialAttackMin, std::uint32_t specialDefenseMin, std::uint32_t speedMin,
        std::uint32_t hpMax, std::uint32_t attackMax, std::uint32_t defenseMax,
        std::uint32_t specialAttackMax, std::uint32_t specialDefenseMax, std::uint32_t speedMax,
        std::uint32_t perfectIvValue, std::uint32_t perfectIvCount)
    {
        results.clear();
        lastError = ErrorCode::None;
        const std::array<std::uint32_t, 6> minimum = {
            hpMin, attackMin, defenseMin, specialAttackMin, specialDefenseMin, speedMin
        };
        const std::array<std::uint32_t, 6> maximum = {
            hpMax, attackMax, defenseMax, specialAttackMax, specialDefenseMax, speedMax
        };
        if (foodMaxAdvances >= maxFoodStatesPerCall || location >= locations.size() || tid > 0xffff
            || sid > 0xffff || shinyFilter > 3 || genderFilter > 2 || abilityFilter > 2
            || natureFilter == 0 || natureFilter > 0x1ffffff || hiddenPowerFilter == 0
            || hiddenPowerFilter > 0xffff || encounterSlotFilter == 0 || encounterSlotFilter > 7
            || !validIvRanges(minimum, maximum) || perfectIvValue > 31 || perfectIvCount > 6
            || static_cast<std::uint64_t>(foodInitialAdvances) + foodOffset + foodMaxAdvances > 0xffffffffULL
            || static_cast<std::uint64_t>(encounterInitialAdvances) + encounterOffset + encounterMaxAdvances > 0xffffffffULL)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }

        const std::uint16_t tsv = static_cast<std::uint16_t>(tid ^ sid);
        std::vector<FoodState> food;
        XDRNG foodRng(foodSeed, foodInitialAdvances + foodOffset);
        for (std::uint32_t count = 0; count <= foodMaxAdvances; count++, foodRng.next())
        {
            XDRNG generated(foodRng);
            if (generated.nextUShort(3) != 0 || generated.nextUShort(100) < 10) continue;
            const std::uint16_t slotRoll = generated.nextUShort(100);
            const std::uint8_t slot = slotRoll < 50 ? 0 : slotRoll < 85 ? 1 : 2;
            if ((encounterSlotFilter & (1u << slot)) == 0) continue;
            std::uint32_t pid = static_cast<std::uint32_t>(generated.nextUShort()) << 16;
            pid |= generated.nextUShort();
            const Slot &entry = locations[location][slot];
            const std::uint8_t stateGender = gender(pid, entry.genderRatio);
            const std::uint8_t stateShiny = shiny(pid, tsv);
            const std::uint8_t nature = static_cast<std::uint8_t>(pid % 25);
            const bool shinyMatches = shinyFilter == 0 || (shinyFilter & stateShiny) != 0;
            if (!shinyMatches || !matchesValue(stateGender, genderFilter, 1, 2)
                || (natureFilter & (1u << nature)) == 0) continue;
            food.push_back({ foodInitialAdvances + count, pid, slot, stateGender, stateShiny });
        }

        XDRNG encounterRng(encounterSeed, encounterInitialAdvances + encounterOffset);
        for (std::uint32_t count = 0; count <= encounterMaxAdvances; count++, encounterRng.next())
        {
            XDRNG generated(encounterRng);
            const std::uint16_t levelRoll = generated.nextUShort();
            generated.advance(2);
            const std::uint16_t iv1 = generated.nextUShort();
            const std::uint16_t iv2 = generated.nextUShort();
            const std::array<std::uint8_t, 6> ivs = {
                static_cast<std::uint8_t>(iv1 & 31), static_cast<std::uint8_t>((iv1 >> 5) & 31),
                static_cast<std::uint8_t>((iv1 >> 10) & 31), static_cast<std::uint8_t>((iv2 >> 5) & 31),
                static_cast<std::uint8_t>((iv2 >> 10) & 31), static_cast<std::uint8_t>(iv2 & 31),
            };
            bool ivMatches = true;
            std::uint32_t perfect = 0;
            for (std::size_t index = 0; index < ivs.size(); index++)
            {
                if (ivs[index] < minimum[index] || ivs[index] > maximum[index]) ivMatches = false;
                if (ivs[index] >= perfectIvValue) perfect++;
            }
            if (!ivMatches || perfect < perfectIvCount || (hiddenPowerFilter & (1u << hiddenPower(ivs))) == 0) continue;
            const std::uint8_t abilityRoll = generated.nextUShort(2);
            for (const FoodState &state : food)
            {
                const Slot &entry = locations[location][state.slot];
                const std::uint8_t ability = abilityRoll == 1 && entry.hasTwoAbilities ? 1 : 0;
                if (!matchesValue(ability, abilityFilter, 1, 2)) continue;
                const std::uint8_t level = static_cast<std::uint8_t>(
                    entry.minLevel + levelRoll % (entry.maxLevel - entry.minLevel + 1));
                results.push_back({
                    state.advances, encounterInitialAdvances + count, state.pid, entry.species, state.slot,
                    ivs[0], ivs[1], ivs[2], ivs[3], ivs[4], ivs[5], ability, state.gender, level,
                    state.pid % 25, state.shiny,
                });
                if (results.size() >= maxResultsPerCall)
                {
                    std::ranges::sort(results, [](const auto &left, const auto &right) {
                        return left.foodAdvances < right.foodAdvances
                            || (left.foodAdvances == right.foodAdvances
                                && left.encounterAdvances < right.encounterAdvances);
                    });
                    lastError = ErrorCode::ResultLimit;
                    return static_cast<std::uint32_t>(results.size());
                }
            }
        }

        std::ranges::sort(results, [](const auto &left, const auto &right) {
            return left.foodAdvances < right.foodAdvances
                || (left.foodAdvances == right.foodAdvances && left.encounterAdvances < right.encounterAdvances);
        });
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen3pokespot_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3pokespot_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3pokespot_last_error()
    {
        return lastError;
    }
}
