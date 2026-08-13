/*
 * PokeRNGKit Gen IV Chained Shiny to SID WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 ChainedSIDCalc by
 * Admiral_Fish, bumba, and EzPzStreamz (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen4chainedsid_bridge.h"

#include <Core/Enum/Method.hpp>
#include <Core/RNG/LCRNG.hpp>
#include <Core/RNG/LCRNGReverse.hpp>
#include <algorithm>
#include <cstdint>
#include <utility>
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
    constexpr std::uint32_t maximumEntries = 1024;
    constexpr std::uint32_t statMaximums[] = { 651, 435, 545, 435, 545, 435 };

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        TooManyEntries = 2,
    };

    thread_local std::vector<std::uint32_t> results;
    thread_local std::uint32_t lastError = ErrorCode::None;

    bool validEntry(const Gen4ChainedSidPackedEntry &entry)
    {
        const std::uint32_t stats[] = { entry.hp, entry.atk, entry.def, entry.spa, entry.spd, entry.spe };
        for (std::size_t index = 0; index < 6; index++)
        {
            if (stats[index] > statMaximums[index]) return false;
        }
        if (entry.ability > 0xffff || entry.ability0 > 0xffff || entry.ability1 > 0xffff) return false;
        if (entry.gender > 2 || entry.nature > 24 || entry.genderRatio > 0xff) return false;
        return entry.ability == entry.ability0 || entry.ability == entry.ability1;
    }

    std::vector<std::uint16_t> filterEntry(std::uint16_t tid, const Gen4ChainedSidPackedEntry &entry,
                                           const std::vector<std::uint16_t> &sids)
    {
        std::vector<std::pair<std::uint32_t, std::uint32_t>> pids;
        auto seeds = LCRNGReverse::recoverPokeRNGIV(
            static_cast<std::uint8_t>(entry.hp), static_cast<std::uint8_t>(entry.atk),
            static_cast<std::uint8_t>(entry.def), static_cast<std::uint8_t>(entry.spa),
            static_cast<std::uint8_t>(entry.spd), static_cast<std::uint8_t>(entry.spe), Method::Method1);

        for (int index = 0; index < seeds.count; index++)
        {
            PokeRNGR rng(seeds[index]);
            std::uint32_t adjust = 0;
            for (std::uint8_t bit = 0; bit < 13; bit++)
            {
                adjust |= static_cast<std::uint32_t>((rng.nextUShort() & 1) << (15 - bit));
            }

            const auto pid2 = rng.nextUShort();
            const auto pid1 = rng.nextUShort();
            const auto adjustLow = adjust | (pid1 & 7);
            const auto ability = (adjustLow & 1) == 0 ? entry.ability0 : entry.ability1;

            std::uint8_t gender;
            switch (entry.genderRatio)
            {
            case 255:
                gender = 2;
                break;
            case 254:
                gender = 1;
                break;
            case 0:
                gender = 0;
                break;
            default:
                gender = (adjustLow & 255) < entry.genderRatio;
                break;
            }

            if (entry.ability == ability && entry.gender == gender) pids.emplace_back(adjustLow, pid2);
        }

        std::vector<std::uint16_t> filtered;
        for (const auto sid : sids)
        {
            for (const auto &[adjustLow, pid2] : pids)
            {
                auto adjustHigh = static_cast<std::uint32_t>(adjustLow ^ tid ^ sid);
                adjustHigh &= 0xfff8;
                adjustHigh += pid2 & 7;
                const auto pid = (adjustHigh << 16) | adjustLow;
                if (pid % 25 == entry.nature) filtered.emplace_back(sid);
            }
        }
        filtered.erase(std::unique(filtered.begin(), filtered.end()), filtered.end());
        return filtered;
    }
}

static_assert(sizeof(Gen4ChainedSidPackedEntry) == 12 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen4chainedsid_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4chainedsid_calculate(
        std::uint32_t tid, const Gen4ChainedSidPackedEntry *entries, std::uint32_t entryCount)
    {
        results.clear();
        lastError = ErrorCode::None;
        if (tid > 0xffff || (entryCount != 0 && entries == nullptr))
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        if (entryCount > maximumEntries)
        {
            lastError = ErrorCode::TooManyEntries;
            return 0;
        }
        for (std::uint32_t index = 0; index < entryCount; index++)
        {
            if (!validEntry(entries[index]))
            {
                lastError = ErrorCode::InvalidInput;
                return 0;
            }
        }

        std::vector<std::uint16_t> candidates;
        candidates.reserve(8192);
        for (std::uint32_t sid = 0; sid <= 0xffff; sid += 8)
        {
            candidates.emplace_back(static_cast<std::uint16_t>(sid));
        }
        for (std::uint32_t index = 0; index < entryCount && !candidates.empty(); index++)
        {
            candidates = filterEntry(static_cast<std::uint16_t>(tid), entries[index], candidates);
        }

        results.assign(candidates.begin(), candidates.end());
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen4chainedsid_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4chainedsid_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4chainedsid_last_error() { return lastError; }
}
