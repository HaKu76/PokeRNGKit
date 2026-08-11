/*
 * PokeRNGKit Gen III Static WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#include "gen3static_bridge.h"

#include <Core/RNG/LCRNG.hpp>
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
    constexpr std::uint32_t apiVersion = 1;
    constexpr std::uint32_t maxStatesPerCall = 100000;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        RangeTooLarge = 2,
    };

    thread_local std::vector<Gen3StaticPackedState> results;
    thread_local std::uint32_t lastError = ErrorCode::None;

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
        const std::uint16_t psv = static_cast<std::uint16_t>((pid >> 16) ^ (pid & 0xffff));
        if (tsv == psv)
        {
            return 2;
        }
        return (tsv ^ psv) < 8 ? 1 : 0;
    }

    bool matchesShiny(std::uint8_t shiny, std::uint32_t filter)
    {
        switch (filter)
        {
        case ShinyAny:
            return true;
        case ShinyNone:
            return shiny == 0;
        case ShinyAnyShiny:
            return shiny != 0;
        case ShinyStar:
            return shiny == 1;
        case ShinySquare:
            return shiny == 2;
        default:
            return false;
        }
    }

    bool matchesGender(std::uint8_t gender, std::uint32_t filter)
    {
        return filter == GenderAny || (filter == GenderMale && gender == 0) || (filter == GenderFemale && gender == 1)
            || (filter == Genderless && gender == 2);
    }

    bool matchesAbility(std::uint8_t ability, std::uint32_t filter)
    {
        return filter == AbilityAny || (filter == AbilityFirst && ability == 0)
            || (filter == AbilitySecond && ability == 1);
    }

    bool matchesIv(const std::array<std::uint8_t, 6> &ivs, const std::array<std::uint32_t, 6> &min,
                   const std::array<std::uint32_t, 6> &max)
    {
        for (std::size_t index = 0; index < ivs.size(); index++)
        {
            if (ivs[index] < min[index] || ivs[index] > max[index])
            {
                return false;
            }
        }
        return true;
    }
}

static_assert(sizeof(Gen3StaticPackedState) == 48);

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen3static_api_version()
    {
        return apiVersion;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3static_generate(
        std::uint32_t seed, std::uint32_t initialAdvances, std::uint32_t maxAdvances, std::uint32_t offset,
        std::uint32_t method, std::uint32_t species, std::uint32_t level, std::uint32_t genderRatio,
        std::uint32_t buggedRoamer, std::uint32_t tid, std::uint32_t sid, std::uint32_t shinyFilter,
        std::uint32_t genderFilter, std::uint32_t abilityFilter, std::uint32_t natureFilter,
        std::uint32_t hpMin, std::uint32_t attackMin, std::uint32_t defenseMin, std::uint32_t specialAttackMin,
        std::uint32_t specialDefenseMin, std::uint32_t speedMin, std::uint32_t hpMax, std::uint32_t attackMax,
        std::uint32_t defenseMax, std::uint32_t specialAttackMax, std::uint32_t specialDefenseMax,
        std::uint32_t speedMax)
    {
        results.clear();
        lastError = ErrorCode::None;

        if (maxAdvances >= maxStatesPerCall || species == 0 || species > 1025 || level == 0 || level > 100
            || genderRatio > 255 || tid > 0xffff || sid > 0xffff
            || (method != static_cast<std::uint32_t>(Gen3StaticMethod::Method1)
                && method != static_cast<std::uint32_t>(Gen3StaticMethod::Method4))
            || shinyFilter > ShinySquare || genderFilter > Genderless || abilityFilter > AbilitySecond
            || natureFilter > 25)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        if (natureFilter == 25)
        {
            natureFilter = 0xffffffff;
        }

        const std::array<std::uint32_t, 6> ivMin = { hpMin, attackMin, defenseMin, specialAttackMin, specialDefenseMin, speedMin };
        const std::array<std::uint32_t, 6> ivMax = { hpMax, attackMax, defenseMax, specialAttackMax, specialDefenseMax, speedMax };
        for (std::size_t index = 0; index < ivMin.size(); index++)
        {
            if (ivMin[index] > 31 || ivMax[index] > 31 || ivMin[index] > ivMax[index])
            {
                lastError = ErrorCode::InvalidInput;
                return 0;
            }
        }
        if (static_cast<std::uint64_t>(initialAdvances) + offset + maxAdvances > 0xffffffffULL)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }

        const std::uint16_t tsv = static_cast<std::uint16_t>(tid ^ sid);
        PokeRNG rng(seed, initialAdvances + offset);
        results.reserve(maxAdvances + 1);
        for (std::uint32_t count = 0; count <= maxAdvances; count++, rng.next())
        {
            PokeRNG generated(rng);
            std::uint32_t pid = generated.nextUShort();
            pid |= static_cast<std::uint32_t>(generated.nextUShort()) << 16;

            const std::uint16_t first = buggedRoamer ? generated.nextUShort() & 0xff : generated.nextUShort();
            if (method == static_cast<std::uint32_t>(Gen3StaticMethod::Method4))
            {
                generated.next();
            }
            const std::uint16_t second = buggedRoamer ? 0 : generated.nextUShort();
            const std::array<std::uint8_t, 6> ivs = {
                static_cast<std::uint8_t>(first & 31), static_cast<std::uint8_t>((first >> 5) & 31),
                static_cast<std::uint8_t>((first >> 10) & 31), static_cast<std::uint8_t>((second >> 5) & 31),
                static_cast<std::uint8_t>((second >> 10) & 31), static_cast<std::uint8_t>(second & 31),
            };
            const std::uint8_t ability = static_cast<std::uint8_t>(pid & 1);
            const std::uint8_t gender = getGender(pid, genderRatio);
            const std::uint8_t nature = static_cast<std::uint8_t>(pid % 25);
            const std::uint8_t shiny = getShiny(pid, tsv);
            if (!matchesShiny(shiny, shinyFilter) || !matchesGender(gender, genderFilter)
                || !matchesAbility(ability, abilityFilter) || (natureFilter != 0xffffffff && nature != natureFilter)
                || !matchesIv(ivs, ivMin, ivMax))
            {
                continue;
            }

            results.push_back({ initialAdvances + count, pid, ivs[0], ivs[1], ivs[2], ivs[3], ivs[4], ivs[5], ability,
                               gender, level, static_cast<std::uint32_t>(nature) | (static_cast<std::uint32_t>(shiny) << 8) });
        }

        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen3static_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3static_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3static_last_error()
    {
        return lastError;
    }
}
