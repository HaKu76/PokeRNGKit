/*
 * PokeRNGKit Gen IV Egg WebAssembly bridge.
 * Copyright (C) 2017-2024 by Admiral_Fish, bumba, and EzPzStreamz
 * Copyright (C) 2026 Hakuhiro
 *
 * Generation and search behavior mirrors PokeFinder 4.3.2 EggGenerator4,
 * EggSearcher4, EggState4, Daycare, MT, and PokeRNG under GPL-3.0-or-later.
 * The C ABI and packed result format are PokeRNGKit additions.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#include "gen4egg_bridge.h"

#include <Core/RNG/LCRNG.hpp>
#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>
#include <random>
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
    constexpr std::uint32_t expectedRequestWords = 50;
    constexpr std::size_t maxResults = 100000;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
    };

    struct Request
    {
        const std::uint32_t *value;

        std::uint32_t game() const { return value[0]; }
        std::uint32_t seedHeld() const { return value[1]; }
        std::uint32_t seedPickup() const { return value[2]; }
        std::uint32_t initialHeld() const { return value[3]; }
        std::uint32_t maxHeld() const { return value[4]; }
        std::uint32_t offsetHeld() const { return value[5]; }
        std::uint32_t initialPickup() const { return value[6]; }
        std::uint32_t maxPickup() const { return value[7]; }
        std::uint32_t offsetPickup() const { return value[8]; }
        std::uint32_t species() const { return value[9]; }
        std::uint32_t genderRatio() const { return value[10]; }
        std::uint32_t alternateGenderRatio() const { return value[11]; }
        std::uint32_t tid() const { return value[12]; }
        std::uint32_t sid() const { return value[13]; }
        bool masuda() const { return value[14] != 0; }
        std::uint32_t shinyFilter() const { return value[15]; }
        std::uint32_t genderFilter() const { return value[16]; }
        std::uint32_t abilityFilter() const { return value[17]; }
        std::uint32_t natureMask() const { return value[18]; }
        std::uint32_t powerMask() const { return value[19]; }
        std::uint32_t minimum(std::size_t index) const { return value[20 + index]; }
        std::uint32_t maximum(std::size_t index) const { return value[26 + index]; }
        std::uint8_t parentIv(std::size_t parent, std::size_t index) const
        {
            return static_cast<std::uint8_t>(value[32 + parent * 6 + index]);
        }
        std::uint32_t parentGender(std::size_t parent) const { return value[44 + parent]; }
        std::uint32_t minDelay() const { return value[46]; }
        std::uint32_t maxDelay() const { return value[47]; }
        std::uint32_t perfectIvValue() const { return value[48]; }
        std::uint32_t perfectIvCount() const { return value[49]; }
    };

    struct HeldState
    {
        std::uint32_t advances;
        std::uint32_t pid;
        std::uint8_t gender;
        std::uint8_t shiny;
    };

    thread_local std::vector<Gen4EggPackedState> generated;
    thread_local std::vector<Gen4EggPackedSearcherState> searched;
    thread_local bool searchResult = false;
    thread_local std::uint32_t lastError = ErrorCode::None;

    bool validParentCombination(const Request &request)
    {
        const auto left = request.parentGender(0);
        const auto right = request.parentGender(1);
        return (left == 0 && right == 1) || (left == 1 && right == 0)
            || (left == 3 && right == 1) || (left == 1 && right == 3)
            || (left == 0 && right == 3) || (left == 3 && right == 0)
            || (left == 2 && right == 3) || (left == 3 && right == 2);
    }

    bool validRequest(const Request &request)
    {
        if (request.game() > 1 || request.species() < 1 || request.species() > 493
            || request.genderRatio() > 255 || request.alternateGenderRatio() > 255
            || request.tid() > 0xffff || request.sid() > 0xffff || request.minDelay() > request.maxDelay()
            || request.natureMask() == 0 || request.natureMask() > 0x1ffffff
            || request.powerMask() == 0 || request.powerMask() > 0xffff || !validParentCombination(request)
            || request.perfectIvValue() > 31 || request.perfectIvCount() > 6)
        {
            return false;
        }
        for (std::size_t index = 0; index < 6; index++)
        {
            if (request.minimum(index) > request.maximum(index) || request.maximum(index) > 31
                || request.parentIv(0, index) > 31 || request.parentIv(1, index) > 31)
            {
                return false;
            }
        }
        return true;
    }

    std::uint8_t shiny(std::uint32_t pid, std::uint16_t tsv)
    {
        const auto psv = static_cast<std::uint16_t>((pid >> 16) ^ (pid & 0xffff));
        const auto value = static_cast<std::uint16_t>(psv ^ tsv);
        return value == 0 ? 2 : value < 8 ? 1 : 0;
    }

    std::uint8_t gender(std::uint32_t pid, std::uint32_t ratio)
    {
        if (ratio == 255) return 2;
        if (ratio == 254) return 1;
        if (ratio == 0) return 0;
        return static_cast<std::uint8_t>((pid & 255) < ratio ? 1 : 0);
    }

    std::uint32_t ratioForPid(const Request &request, std::uint32_t pid)
    {
        if ((request.species() == 29 || request.species() == 314) && (pid & 0x8000))
        {
            return request.alternateGenderRatio();
        }
        return request.genderRatio();
    }

    std::uint8_t hiddenPower(const std::array<std::uint8_t, 6> &ivs)
    {
        const auto value = (ivs[0] & 1) | ((ivs[1] & 1) << 1) | ((ivs[2] & 1) << 2)
            | ((ivs[5] & 1) << 3) | ((ivs[3] & 1) << 4) | ((ivs[4] & 1) << 5);
        return static_cast<std::uint8_t>(value * 15 / 63);
    }

    std::uint8_t hiddenPowerStrength(const std::array<std::uint8_t, 6> &ivs)
    {
        const auto value = ((ivs[0] >> 1) & 1) | (((ivs[1] >> 1) & 1) << 1)
            | (((ivs[2] >> 1) & 1) << 2) | (((ivs[5] >> 1) & 1) << 3)
            | (((ivs[3] >> 1) & 1) << 4) | (((ivs[4] >> 1) & 1) << 5);
        return static_cast<std::uint8_t>(30 + value * 40 / 63);
    }

    bool matchesPid(const Request &request, std::uint32_t pid, std::uint8_t pidGender, std::uint8_t pidShiny)
    {
        const auto shinyFilter = request.shinyFilter();
        if ((shinyFilter == 1 && pidShiny != 0) || (shinyFilter == 2 && pidShiny != 1)
            || (shinyFilter == 3 && pidShiny != 2) || (shinyFilter == 4 && pidShiny == 0))
        {
            return false;
        }
        const auto genderFilter = request.genderFilter();
        if ((genderFilter == 1 && pidGender != 0) || (genderFilter == 2 && pidGender != 1)
            || (genderFilter == 3 && pidGender != 2))
        {
            return false;
        }
        const auto abilityFilter = request.abilityFilter();
        if ((abilityFilter == 1 && (pid & 1) != 0) || (abilityFilter == 2 && (pid & 1) != 1))
        {
            return false;
        }
        return (request.natureMask() & (1u << (pid % 25))) != 0;
    }

    bool matchesIvs(const Request &request, const std::array<std::uint8_t, 6> &ivs)
    {
        std::uint32_t perfect = 0;
        for (std::size_t index = 0; index < ivs.size(); index++)
        {
            if (ivs[index] < request.minimum(index) || ivs[index] > request.maximum(index)) return false;
            if (ivs[index] >= request.perfectIvValue()) perfect++;
        }
        return perfect >= request.perfectIvCount()
            && (request.powerMask() & (1u << hiddenPower(ivs))) != 0;
    }

    std::vector<HeldState> generateHeld(const Request &request, std::uint32_t seed,
                                        std::uint32_t initialAdvances, std::uint32_t maxAdvances,
                                        std::uint32_t offset)
    {
        std::mt19937 mt(seed);
        mt.discard(static_cast<unsigned long long>(initialAdvances) + offset);
        const auto tsv = static_cast<std::uint16_t>(request.tid() ^ request.sid());
        std::vector<HeldState> states;
        states.reserve(static_cast<std::size_t>(maxAdvances) + 1);
        for (std::uint32_t count = 0;; count++)
        {
            std::uint32_t pid = mt();
            if (request.masuda())
            {
                ARNG rng(pid);
                for (int attempt = 0; attempt < 4; attempt++)
                {
                    if (shiny(pid, tsv) != 0) break;
                    pid = rng.next();
                }
            }
            const auto stateGender = gender(pid, ratioForPid(request, pid));
            const auto stateShiny = shiny(pid, tsv);
            if (matchesPid(request, pid, stateGender, stateShiny))
            {
                states.push_back({ initialAdvances + count, pid, stateGender, stateShiny });
            }
            if (count == maxAdvances) break;
        }
        return states;
    }

    void setInheritance(const Request &request, std::array<std::uint8_t, 6> &ivs,
                        std::array<std::uint8_t, 6> &inheritance,
                        const std::array<std::uint8_t, 3> &indices,
                        const std::array<std::uint8_t, 3> &parents)
    {
        if (request.game() == 0)
        {
            constexpr std::array<std::uint8_t, 6> available1 = { 0, 1, 2, 5, 3, 4 };
            constexpr std::array<std::uint8_t, 5> available2 = { 1, 2, 5, 3, 4 };
            constexpr std::array<std::uint8_t, 4> available3 = { 1, 5, 3, 4 };
            const std::array<std::uint8_t, 3> stats = {
                available1[indices[0]], available2[indices[1]], available3[indices[2]]
            };
            for (std::size_t index = 0; index < stats.size(); index++)
            {
                ivs[stats[index]] = request.parentIv(parents[index], stats[index]);
                inheritance[stats[index]] = parents[index] + 1;
            }
            return;
        }

        constexpr std::array<std::uint8_t, 6> order = { 0, 1, 2, 5, 3, 4 };
        std::array<std::uint8_t, 6> available = { 0, 1, 2, 3, 4, 5 };
        for (std::uint8_t index = 0; index < 3; index++)
        {
            const auto stat = order[available[indices[index]]];
            ivs[stat] = request.parentIv(parents[index], stat);
            inheritance[stat] = parents[index] + 1;
            for (std::uint8_t position = indices[index]; position < 5 - index; position++)
            {
                available[position] = available[position + 1];
            }
        }
    }

    Gen4EggPackedState pack(const HeldState &held, std::uint32_t pickupAdvances,
                            std::uint16_t prng, const std::array<std::uint8_t, 6> &ivs,
                            const std::array<std::uint8_t, 6> &inheritance)
    {
        return {
            held.advances, pickupAdvances, held.pid, held.pid & 1, held.gender, held.pid % 25, held.shiny,
            ivs[0], ivs[1], ivs[2], ivs[3], ivs[4], ivs[5], inheritance[0], inheritance[1],
            inheritance[2], inheritance[3], inheritance[4], inheritance[5], hiddenPower(ivs),
            hiddenPowerStrength(ivs), static_cast<std::uint32_t>(prng % 3),
            static_cast<std::uint32_t>(((prng % 8192) * 100) >> 13)
        };
    }

    std::vector<Gen4EggPackedState> generate(const Request &request, std::uint32_t seedHeld,
                                             std::uint32_t seedPickup, std::uint32_t initialHeld,
                                             std::uint32_t maxHeld, std::uint32_t offsetHeld)
    {
        const auto held = generateHeld(request, seedHeld, initialHeld, maxHeld, offsetHeld);
        std::vector<Gen4EggPackedState> states;
        if (held.empty()) return states;
        states.reserve(std::min(maxResults, held.size() * (static_cast<std::size_t>(request.maxPickup()) + 1)));

        PokeRNG rng(seedPickup, request.initialPickup());
        const auto jump = rng.getJump(request.offsetPickup());
        for (std::uint32_t count = 0;; count++)
        {
            PokeRNG go(rng, jump);
            const auto first = go.nextUShort();
            const auto second = go.nextUShort();
            std::array<std::uint8_t, 6> ivs = {
                static_cast<std::uint8_t>(first & 31),
                static_cast<std::uint8_t>((first >> 5) & 31),
                static_cast<std::uint8_t>((first >> 10) & 31),
                static_cast<std::uint8_t>((second >> 5) & 31),
                static_cast<std::uint8_t>((second >> 10) & 31),
                static_cast<std::uint8_t>(second & 31),
            };
            const std::array<std::uint8_t, 3> indices = {
                static_cast<std::uint8_t>(go.nextUShort(6)),
                static_cast<std::uint8_t>(go.nextUShort(5)),
                static_cast<std::uint8_t>(go.nextUShort(4)),
            };
            const std::array<std::uint8_t, 3> parents = {
                static_cast<std::uint8_t>(go.nextUShort(2)),
                static_cast<std::uint8_t>(go.nextUShort(2)),
                static_cast<std::uint8_t>(go.nextUShort(2)),
            };
            std::array<std::uint8_t, 6> inheritance = {};
            setInheritance(request, ivs, inheritance, indices, parents);
            const auto prng = rng.nextUShort();
            if (matchesIvs(request, ivs))
            {
                for (const auto &heldState : held)
                {
                    if (states.size() >= maxResults) break;
                    states.push_back(pack(heldState, request.initialPickup() + count, prng, ivs, inheritance));
                }
            }
            if (count == request.maxPickup() || states.size() >= maxResults) break;
        }
        std::sort(states.begin(), states.end(), [](const auto &left, const auto &right) {
            return left.advances < right.advances
                || (left.advances == right.advances && left.pickupAdvances < right.pickupAdvances);
        });
        return states;
    }

    void reset(bool search)
    {
        generated.clear();
        searched.clear();
        searchResult = search;
        lastError = ErrorCode::None;
    }
}

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen4egg_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4egg_generate(const std::uint32_t *values,
                                                        std::uint32_t words,
                                                        std::uint32_t initialAdvancesHeld,
                                                        std::uint32_t maxAdvancesHeld)
    {
        reset(false);
        if (!values || words != expectedRequestWords)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        const Request request { values };
        if (!validRequest(request))
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        generated = generate(request, request.seedHeld(), request.seedPickup(), initialAdvancesHeld,
                             maxAdvancesHeld, request.offsetHeld());
        return static_cast<std::uint32_t>(generated.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4egg_search(const std::uint32_t *values,
                                                      std::uint32_t words,
                                                      std::uint32_t startIndex,
                                                      std::uint32_t stateCount)
    {
        reset(true);
        if (!values || words != expectedRequestWords || stateCount == 0)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        const Request request { values };
        if (!validRequest(request))
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        const auto delayWidth = static_cast<std::uint64_t>(request.maxDelay()) - request.minDelay() + 1;
        const auto total = 256ull * 24ull * delayWidth;
        if (static_cast<std::uint64_t>(startIndex) + stateCount > total)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        for (std::uint32_t offset = 0; offset < stateCount && searched.size() < maxResults; offset++)
        {
            const auto index = static_cast<std::uint64_t>(startIndex) + offset;
            const auto ab = static_cast<std::uint32_t>(index / (24ull * delayWidth));
            const auto remainder = index % (24ull * delayWidth);
            const auto cd = static_cast<std::uint32_t>(remainder / delayWidth);
            const auto delay = request.minDelay() + static_cast<std::uint32_t>(remainder % delayWidth);
            const auto seed = ((ab << 24) | (cd << 16)) + delay;
            const auto states = generate(request, seed, seed, request.initialHeld(), request.maxHeld(), 0);
            for (const auto &state : states)
            {
                if (searched.size() >= maxResults) break;
                searched.push_back({ seed, seed & 0xffff, state });
            }
        }
        return static_cast<std::uint32_t>(searched.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen4egg_result_ptr()
    {
        return searchResult ? reinterpret_cast<std::uintptr_t>(searched.data())
                            : reinterpret_cast<std::uintptr_t>(generated.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4egg_result_count()
    {
        return static_cast<std::uint32_t>(searchResult ? searched.size() : generated.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4egg_last_error() { return lastError; }
}
