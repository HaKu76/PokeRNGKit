/*
 * PokeRNGKit Gen III Egg WebAssembly bridge.
 * Copyright (C) 2017-2024 by Admiral_Fish, bumba, and EzPzStreamz
 * Copyright (C) 2026 Hakuhiro
 *
 * The Gen III breeding rules are derived from PokeFinder's EggGenerator3
 * under GNU GPL-3.0-or-later. The C ABI and packed result format are
 * PokeRNGKit additions.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#include "gen3egg_bridge.h"

#include <Core/RNG/LCRNG.hpp>
#include <array>
#include <algorithm>
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
    constexpr std::uint32_t requestWords = 54;
    constexpr std::uint32_t maxPairsPerCall = 100000;
    constexpr std::array<std::uint16_t, 182> allowedSpecies = {
        1, 4, 7, 10, 13, 16, 19, 21, 23, 27, 29, 32, 37, 41, 43, 46, 48, 50, 52, 54, 56, 58, 60, 63,
        66, 69, 72, 74, 77, 79, 81, 83, 84, 86, 88, 90, 92, 95, 96, 98, 100, 102, 104, 108, 109, 111,
        113, 114, 115, 116, 118, 120, 122, 123, 127, 128, 129, 131, 133, 137, 138, 140, 142, 143, 147,
        152, 155, 158, 161, 163, 165, 167, 170, 172, 173, 174, 175, 177, 179, 183, 185, 187, 190, 191,
        193, 194, 198, 200, 202, 203, 204, 206, 207, 209, 211, 213, 214, 215, 216, 218, 220, 222, 223,
        225, 226, 227, 228, 231, 234, 235, 236, 238, 239, 240, 241, 246, 252, 255, 258, 261, 263, 265,
        270, 273, 276, 278, 280, 283, 285, 287, 290, 292, 293, 296, 298, 299, 300, 302, 303, 304, 307,
        309, 311, 312, 313, 314, 315, 316, 318, 320, 322, 324, 325, 327, 328, 331, 333, 335, 336, 337,
        338, 339, 341, 343, 345, 347, 349, 351, 352, 353, 355, 357, 358, 359, 360, 361, 363, 366, 369,
        370, 371, 374 };

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        ResultLimit = 2,
    };

    thread_local std::vector<Gen3EggPackedState> results;
    thread_local std::uint32_t lastError = ErrorCode::None;
    thread_local std::uint32_t truncated = 0;

    struct Request
    {
        const std::uint32_t *v;
        std::uint32_t game() const { return v[0]; }
        std::uint32_t method() const { return v[1]; }
        std::uint32_t seedHeld() const { return v[2]; }
        std::uint32_t seedPickup() const { return v[3]; }
        std::uint32_t offsetHeld() const { return v[6]; }
        std::uint32_t initialPickup() const { return v[7]; }
        std::uint32_t maxPickup() const { return v[8]; }
        std::uint32_t offsetPickup() const { return v[9]; }
        std::uint32_t calibration() const { return v[10]; }
        std::uint32_t minRedraw() const { return v[11]; }
        std::uint32_t maxRedraw() const { return v[12]; }
        std::uint32_t compatibility() const { return v[13]; }
        std::uint32_t species() const { return v[14]; }
        std::uint32_t genderRatio() const { return v[15]; }
        std::uint32_t alternateGenderRatio() const { return v[16]; }
        std::uint32_t tid() const { return v[17]; }
        std::uint32_t sid() const { return v[18]; }
        std::uint32_t shinyFilter() const { return v[19]; }
        std::uint32_t genderFilter() const { return v[20]; }
        std::uint32_t abilityFilter() const { return v[21]; }
        std::uint32_t natureFilter() const { return v[22]; }
        std::uint32_t hiddenPowerFilter() const { return v[23]; }
        std::uint32_t parentGender(std::size_t parent) const { return v[48 + parent]; }
        std::uint32_t parentItem(std::size_t parent) const { return v[50 + parent]; }
        std::uint32_t parentNature(std::size_t parent) const { return v[52 + parent]; }
        std::uint8_t parentIv(std::size_t parent, std::size_t stat) const { return static_cast<std::uint8_t>(v[36 + parent * 6 + stat]); }
        std::uint32_t ivMin(std::size_t stat) const { return v[24 + stat]; }
        std::uint32_t ivMax(std::size_t stat) const { return v[30 + stat]; }
    };

    std::uint8_t getGender(std::uint32_t pid, std::uint32_t ratio)
    {
        if (ratio == 255) return 2;
        if (ratio == 254) return 1;
        if (ratio == 0) return 0;
        return static_cast<std::uint8_t>((pid & 0xff) < ratio ? 1 : 0);
    }

    std::uint8_t getShiny(std::uint32_t pid, std::uint16_t tsv)
    {
        const std::uint16_t psv = static_cast<std::uint16_t>((pid >> 16) ^ (pid & 0xffff));
        const std::uint16_t xorValue = static_cast<std::uint16_t>(tsv ^ psv);
        return xorValue == 0 ? 2 : xorValue < 8 ? 1 : 0;
    }

    bool matchesShiny(std::uint8_t value, std::uint32_t filter)
    {
        return filter == 0 || (filter == 1 && value == 1) || (filter == 2 && value == 2)
            || (filter == 3 && (value == 1 || value == 2));
    }

    bool matchesGender(std::uint8_t value, std::uint32_t filter)
    {
        return filter == 0 || (filter == 1 && value == 0) || (filter == 2 && value == 1);
    }

    bool matchesAbility(std::uint8_t value, std::uint32_t filter)
    {
        return filter == 0 || (filter == 1 && value == 0) || (filter == 2 && value == 1);
    }

    std::array<std::uint8_t, 6> decodeIvs(std::uint16_t first, std::uint16_t second)
    {
        return { static_cast<std::uint8_t>(first & 31), static_cast<std::uint8_t>((first >> 5) & 31),
                 static_cast<std::uint8_t>((first >> 10) & 31), static_cast<std::uint8_t>((second >> 5) & 31),
                 static_cast<std::uint8_t>((second >> 10) & 31), static_cast<std::uint8_t>(second & 31) };
    }

    std::uint8_t hiddenPowerType(const std::array<std::uint8_t, 6> &ivs)
    {
        return static_cast<std::uint8_t>(
            ((ivs[0] & 1) + 2 * (ivs[1] & 1) + 4 * (ivs[2] & 1) + 8 * (ivs[5] & 1)
             + 16 * (ivs[3] & 1) + 32 * (ivs[4] & 1)) * 15 / 63);
    }

    std::uint8_t hiddenPowerStrength(const std::array<std::uint8_t, 6> &ivs)
    {
        const auto bit = [&ivs](std::size_t index) { return static_cast<std::uint8_t>((ivs[index] >> 1) & 1); };
        const std::uint32_t value = bit(0) | (bit(1) << 1) | (bit(2) << 2) | (bit(5) << 3)
            | (bit(3) << 4) | (bit(4) << 5);
        return static_cast<std::uint8_t>(30 + value * 40 / 63);
    }

    bool matchesFinal(const Request &request, std::uint32_t pid, std::uint8_t gender, std::uint8_t shiny,
                      const std::array<std::uint8_t, 6> &ivs)
    {
        const std::uint8_t nature = static_cast<std::uint8_t>(pid % 25);
        return matchesShiny(shiny, request.shinyFilter()) && matchesGender(gender, request.genderFilter())
            && matchesAbility(static_cast<std::uint8_t>(pid & 1), request.abilityFilter())
            && (request.natureFilter() & (1u << nature)) != 0
            && (request.hiddenPowerFilter() & (1u << hiddenPowerType(ivs))) != 0
            && [&]() {
                for (std::size_t stat = 0; stat < 6; stat++)
                {
                    if (ivs[stat] < request.ivMin(stat) || ivs[stat] > request.ivMax(stat)) return false;
                }
                return true;
            }();
    }

    void inherit(const Request &request, bool emerald, std::uint8_t inheritCount, std::uint8_t iv1Skip,
                 std::uint8_t iv2Skip, PokeRNG &rng, std::array<std::uint8_t, 6> &ivs,
                 std::array<std::uint8_t, 6> &source)
    {
        rng.advance(iv1Skip);
        const auto first = rng.nextUShort();
        rng.advance(iv2Skip);
        const auto second = rng.nextUShort();
        ivs = decodeIvs(first, second);
        rng.advance(inheritCount);
        const std::array<std::uint8_t, 3> inh = { rng.nextUShort(6), rng.nextUShort(5), rng.nextUShort(4) };
        const std::array<std::uint8_t, 3> par = { rng.nextUShort(2), rng.nextUShort(2), rng.nextUShort(2) };
        if (emerald)
        {
            constexpr std::uint8_t available1[6] = { 0, 1, 2, 5, 3, 4 };
            constexpr std::uint8_t available2[5] = { 1, 2, 5, 3, 4 };
            constexpr std::uint8_t available3[4] = { 1, 5, 3, 4 };
            const std::uint8_t stat1 = available1[inh[0]];
            const std::uint8_t stat2 = available2[inh[1]];
            const std::uint8_t stat3 = available3[inh[2]];
            ivs[stat1] = request.parentIv(par[0], stat1); source[stat1] = par[0] + 1;
            ivs[stat2] = request.parentIv(par[1], stat2); source[stat2] = par[1] + 1;
            ivs[stat3] = request.parentIv(par[2], stat3); source[stat3] = par[2] + 1;
        }
        else
        {
            constexpr std::uint8_t order[6] = { 0, 1, 2, 5, 3, 4 };
            std::array<std::uint8_t, 6> available = { 0, 1, 2, 3, 4, 5 };
            const auto apply = [&request, &available, &ivs, &source, &par](std::uint8_t inheritIndex,
                                                                          std::uint8_t parentStep,
                                                                          std::uint8_t size) {
                const std::uint8_t stat = available[inheritIndex];
                const std::uint8_t ordered = order[stat];
                ivs[ordered] = request.parentIv(par[parentStep], ordered);
                source[ordered] = par[parentStep] + 1;
                // EggGenerator3 removes the selected value, not its current position.
                for (std::uint8_t move = stat; move < size; move++) available[move] = available[move + 1];
            };
            apply(inh[0], 0, 5);
            apply(inh[1], 1, 4);
            const std::uint8_t stat = available[inh[2]];
            const std::uint8_t ordered = order[stat];
            ivs[ordered] = request.parentIv(par[2], ordered);
            source[ordered] = par[2] + 1;
        }
    }

    void append(const Request &request, std::uint32_t advances, std::uint32_t pickupAdvances, std::uint8_t redraws,
                std::uint32_t pid, std::uint8_t gender, std::uint8_t shiny,
                const std::array<std::uint8_t, 6> &ivs, const std::array<std::uint8_t, 6> &source,
                std::uint32_t maxResults)
    {
        if (!matchesFinal(request, pid, gender, shiny, ivs)) return;
        if (results.size() >= maxResults)
        {
            truncated = 1;
            lastError = ErrorCode::ResultLimit;
            return;
        }
        results.push_back({ advances, pickupAdvances, redraws, pid, static_cast<std::uint8_t>(pid & 1), gender,
                            static_cast<std::uint8_t>(pid % 25), shiny, ivs[0], ivs[1], ivs[2], ivs[3], ivs[4], ivs[5],
                            source[0], source[1], source[2], source[3], source[4], source[5], hiddenPowerType(ivs),
                            hiddenPowerStrength(ivs) });
    }

    bool validateRequest(const Request &request, std::uint32_t heldStart, std::uint32_t heldCount,
                         std::uint32_t maxResults)
    {
        if (request.game() > 1 || request.method() > 6 || heldCount == 0 || maxResults == 0 || maxResults > maxPairsPerCall
            || request.species() == 0 || !std::ranges::binary_search(allowedSpecies, static_cast<std::uint16_t>(request.species()))
            || request.genderRatio() > 255
            || request.alternateGenderRatio() > 255 || request.tid() > 0xffff || request.sid() > 0xffff
            || request.compatibility() != 20 && request.compatibility() != 50 && request.compatibility() != 70
            || request.shinyFilter() > 3 || request.genderFilter() > 2 || request.abilityFilter() > 2
            || request.natureFilter() == 0 || request.natureFilter() > 0x1ff_ffff
            || request.hiddenPowerFilter() == 0 || request.hiddenPowerFilter() > 0xffff
            || request.calibration() > 255 || request.minRedraw() > request.maxRedraw() || request.maxRedraw() > 255)
        {
            return false;
        }
        if (request.game() == 0 && request.method() > 2 || request.game() == 1 && request.method() < 3)
        {
            return false;
        }
        if (request.game() == 1 && (request.seedHeld() > 0xffff || request.seedPickup() > 0xffff)) return false;
        if (static_cast<std::uint64_t>(heldStart) + request.offsetHeld() + heldCount - 1 > 0xffff_ffffULL
            || static_cast<std::uint64_t>(request.initialPickup()) + request.offsetPickup() + request.maxPickup()
                   > 0xffff_ffffULL)
            return false;
        const std::uint64_t redrawCount = request.game() == 0 ? request.maxRedraw() - request.minRedraw() + 1 : 1;
        const std::uint64_t pickupStates = static_cast<std::uint64_t>(request.maxPickup()) + 1;
        if (pickupStates * redrawCount > maxPairsPerCall || static_cast<std::uint64_t>(heldCount) * pickupStates * redrawCount > maxPairsPerCall)
            return false;
        const auto leftGender = request.parentGender(0);
        const auto rightGender = request.parentGender(1);
        const bool compatible = (leftGender == 0 && rightGender == 1) || (leftGender == 1 && rightGender == 0)
            || (leftGender == 3 && rightGender == 1) || (leftGender == 1 && rightGender == 3)
            || (leftGender == 0 && rightGender == 3) || (leftGender == 3 && rightGender == 0)
            || (leftGender == 2 && rightGender == 3) || (leftGender == 3 && rightGender == 2);
        if (!compatible || request.parentGender(0) > 3 || request.parentGender(1) > 3
            || request.parentItem(0) > 1 || request.parentItem(1) > 1
            || request.parentNature(0) > 24 || request.parentNature(1) > 24)
            return false;
        for (std::size_t stat = 0; stat < 6; stat++)
        {
            if (request.ivMin(stat) > 31 || request.ivMax(stat) > 31 || request.ivMin(stat) > request.ivMax(stat)
                || request.parentIv(0, stat) > 31 || request.parentIv(1, stat) > 31)
                return false;
        }
        return true;
    }
}

static_assert(sizeof(Gen3EggPackedState) == 88);

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen3egg_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3egg_generate(const std::uint32_t *rawRequest, std::uint32_t count,
                                                         std::uint32_t initialAdvancesHeld,
                                                         std::uint32_t maxAdvancesHeld,
                                                         std::uint32_t maxResults)
    {
        results.clear();
        lastError = ErrorCode::None;
        truncated = 0;
        if (rawRequest == nullptr || count != requestWords || maxResults == 0) { lastError = ErrorCode::InvalidInput; return 0; }
        const Request request { rawRequest };
        if (!validateRequest(request, initialAdvancesHeld, maxAdvancesHeld + 1, maxResults)) { lastError = ErrorCode::InvalidInput; return 0; }
        const bool emerald = request.game() == 0;
        const std::uint16_t tsv = static_cast<std::uint16_t>(request.tid() ^ request.sid());
        const std::uint8_t iv1Skip = request.method() == 3 || request.method() == 5 ? 1 : 0;
        const std::uint8_t iv2Skip = request.method() == 1 || request.method() == 4 ? 1 : 0;
        const std::uint8_t inheritCount = request.method() == 2 || request.method() == 5 || request.method() == 6 ? 2 : 1;
        std::uint8_t everstoneParent = 0;
        for (std::uint8_t parent = 0; parent < 2; parent++) if (request.parentGender(parent) == 1) everstoneParent = parent;
        for (std::uint8_t parent = 0; parent < 2; parent++) if (request.parentGender(parent) == 3) everstoneParent = parent;
        const bool everstone = emerald && request.parentItem(everstoneParent) == 1;
        std::vector<Gen3EggPackedState> heldStates;

        if (emerald)
        {
            PokeRNG rng(0, initialAdvancesHeld + request.offsetHeld());
            std::uint32_t val = initialAdvancesHeld + request.offsetHeld() + 1;
            for (std::uint32_t countHeld = 0; countHeld <= maxAdvancesHeld; countHeld++, val++)
            {
                if ((rng.nextUShort() * 100u) / 0xffffu >= request.compatibility()) continue;
                for (std::uint32_t redraw = request.minRedraw(); redraw <= request.maxRedraw(); redraw++)
                {
                    PokeRNG go(rng);
                    const auto calibration = request.calibration() + 3u * redraw;
                    const bool fixedNature = everstone && (go.nextUShort() >> 15) == 0;
                    PokeRNG trng(static_cast<std::uint32_t>(val - calibration) & 0xffff);
                    std::uint32_t pid = 0;
                    if (!fixedNature)
                    {
                        pid = static_cast<std::uint32_t>(go.nextUShort(0xfffe)) + 1;
                        pid |= trng.next() & 0xffff0000;
                    }
                    else
                    {
                        bool found = false;
                        for (std::uint8_t attempt = 0; attempt < 17; attempt++)
                        {
                            pid = go.nextUShort();
                            pid |= trng.next() & 0xffff0000;
                            if (attempt < 16 && pid % 25 == request.parentNature(everstoneParent))
                            {
                                found = true;
                                break;
                            }
                        }
                        if (!found) continue;
                    }
                    const auto ratio = request.species() == 29 || request.species() == 314
                        ? ((pid & 0x8000) ? request.alternateGenderRatio() : request.genderRatio())
                        : request.genderRatio();
                    const auto gender = getGender(pid, ratio);
                    if (!matchesAbility(static_cast<std::uint8_t>(pid & 1), request.abilityFilter())
                        || !matchesGender(gender, request.genderFilter())) continue;
                    heldStates.push_back({ initialAdvancesHeld + countHeld - calibration, 0, redraw, pid,
                                           static_cast<std::uint8_t>(pid & 1), gender, static_cast<std::uint8_t>(pid % 25),
                                           getShiny(pid, tsv), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 });
                }
            }
        }
        else
        {
            PokeRNG rng(request.seedHeld(), initialAdvancesHeld + request.offsetHeld());
            for (std::uint32_t countHeld = 0; countHeld <= maxAdvancesHeld; countHeld++, rng.next())
            {
                PokeRNG go(rng);
                if ((go.nextUShort() * 100u) / 0xffffu >= request.compatibility()) continue;
                const auto low = static_cast<std::uint16_t>(go.nextUShort(0xfffe) + 1);
                const auto ratio = request.species() == 29 || request.species() == 314
                    ? ((low & 0x8000) ? request.alternateGenderRatio() : request.genderRatio())
                    : request.genderRatio();
                const auto gender = getGender(low, ratio);
                if (!matchesAbility(static_cast<std::uint8_t>(low & 1), request.abilityFilter())
                    || !matchesGender(gender, request.genderFilter())) continue;
                heldStates.push_back({ initialAdvancesHeld + countHeld, 0, 0, low, static_cast<std::uint8_t>(low & 1), gender,
                                       0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 });
            }
        }

        for (std::uint32_t pickup = 0; pickup <= request.maxPickup(); pickup++)
        {
            PokeRNG pickupRng(emerald ? 0 : request.seedPickup(), request.initialPickup() + request.offsetPickup() + pickup);
            PokeRNG go(pickupRng);
            std::uint32_t high = 0;
            if (!emerald) high = static_cast<std::uint32_t>(go.nextUShort()) << 16;
            std::array<std::uint8_t, 6> ivs;
            std::array<std::uint8_t, 6> source = { 0, 0, 0, 0, 0, 0 };
            inherit(request, emerald, inheritCount, iv1Skip, iv2Skip, go, ivs, source);
            for (const auto &held : heldStates)
            {
                const auto pid = emerald ? held.pid : high | held.pid;
                const auto ratio = request.species() == 29 || request.species() == 314
                    ? ((pid & 0x8000) ? request.alternateGenderRatio() : request.genderRatio())
                    : request.genderRatio();
                const auto gender = getGender(pid, ratio);
                append(request, held.advances, request.initialPickup() + pickup, static_cast<std::uint8_t>(held.redraws), pid,
                       gender, emerald ? held.shiny : getShiny(pid, tsv), ivs, source, maxResults);
            }
        }
        std::ranges::sort(results, [](const auto &left, const auto &right) {
            return left.advances < right.advances || (left.advances == right.advances && left.pickupAdvances < right.pickupAdvances);
        });
        if (lastError == ErrorCode::ResultLimit) lastError = ErrorCode::None;
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen3egg_result_ptr() { return reinterpret_cast<std::uintptr_t>(results.data()); }
    POKERNGKIT_KEEPALIVE std::uint32_t gen3egg_result_count() { return static_cast<std::uint32_t>(results.size()); }
    POKERNGKIT_KEEPALIVE std::uint32_t gen3egg_result_truncated() { return truncated; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen3egg_last_error() { return lastError; }
}
