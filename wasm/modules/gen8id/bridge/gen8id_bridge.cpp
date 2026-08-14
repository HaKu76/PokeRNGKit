/*
 * PokeRNGKit Gen VIII ID WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 IDGenerator8, Xorshift,
 * RNGList, IDFilter and IDState8 by Admiral_Fish, bumba, and
 * EzPzStreamz (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen8id_bridge.h"

#include <Core/Gen8/Generators/IDGenerator8.hpp>
#include <Core/Gen8/States/IDState8.hpp>
#include <Core/Parents/Filters/IDFilter.hpp>
#include <Core/RNG/Xorshift.hpp>
#include <array>
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
    constexpr std::uint32_t apiVersion = 2;
    constexpr std::uint32_t maxStatesPerCall = 100000;
    constexpr std::uint32_t maxEvaluations = 250000000;
    constexpr std::uint32_t maxFilterValues = 4096;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        RangeTooLarge = 2,
    };

    enum FilterMode : std::uint32_t
    {
        NoFilter = 0,
        FilterTid = 1,
        FilterSid = 2,
        FilterTidSid = 3,
        FilterPid = 4,
        FilterTsv = 5,
        FilterDisplayTid = 6,
    };

    thread_local std::vector<Gen8IdPackedState> results;
    thread_local std::uint32_t lastError = ErrorCode::None;

    bool validFilter(std::uint32_t mode, const std::uint32_t *values, std::uint32_t count)
    {
        if (mode > FilterDisplayTid || count > maxFilterValues) return false;
        if (count == 0) return values == nullptr;
        if (mode == NoFilter || values == nullptr) return false;

        for (std::uint32_t index = 0; index < count; index++)
        {
            const auto value = values[index];
            if ((mode == FilterTid || mode == FilterSid) && value > 0xffffU) return false;
            if (mode == FilterTsv && value > 0x1fffU) return false;
            if (mode == FilterDisplayTid && value > 999999U) return false;
        }
        return true;
    }

    IDFilter makeFilter(std::uint32_t mode, const std::uint32_t *values, std::uint32_t count)
    {
        std::vector<u16> tidFilter;
        std::vector<u16> sidFilter;
        std::vector<std::pair<u16, u16>> tidSidFilter;
        std::vector<u16> tsvFilter;
        std::vector<std::pair<u16, u16>> tidTsvFilter;
        std::vector<u32> displayFilter;

        for (std::uint32_t index = 0; index < count; index++)
        {
            const auto value = values[index];
            switch (mode)
            {
            case FilterTid:
                tidFilter.emplace_back(static_cast<u16>(value));
                break;
            case FilterSid:
                sidFilter.emplace_back(static_cast<u16>(value));
                break;
            case FilterTidSid:
                tidSidFilter.emplace_back(static_cast<u16>(value), static_cast<u16>(value >> 16));
                break;
            case FilterPid:
            {
                const auto psv = static_cast<u16>((value >> 16) ^ (value & 0xffffU));
                tsvFilter.emplace_back(psv >> 4);
                break;
            }
            case FilterTsv:
                tsvFilter.emplace_back(static_cast<u16>(value));
                break;
            case FilterDisplayTid:
                displayFilter.emplace_back(value);
                break;
            default:
                break;
            }
        }

        return IDFilter(tidFilter, sidFilter, tidSidFilter, tsvFilter, tidTsvFilter, displayFilter);
    }

    std::vector<IDState8> generateChunk(
        std::uint64_t seed0, std::uint64_t seed1, std::uint32_t initialAdvances,
        std::uint32_t chunkOffset, std::uint32_t maxAdvances, const IDFilter &filter)
    {
        if (chunkOffset == 0)
        {
            return IDGenerator8(initialAdvances, maxAdvances, filter).generate(seed0, seed1);
        }

        Xorshift rng(seed0, seed1, initialAdvances);
        rng.jump(chunkOffset);
        const auto nextId = [&rng]() { return rng.next(0x80000000, 0x7fffffff); };
        std::array<std::uint32_t, 2> list = { nextId(), nextId() };
        std::uint32_t head = 0;
        std::uint32_t pointer = 0;
        std::vector<IDState8> states;

        for (std::uint32_t count = 0; count < maxAdvances; count++)
        {
            std::uint32_t sidTid;
            do
            {
                sidTid = list[pointer++];
                pointer %= list.size();
            } while (sidTid == 0);

            const auto tid = static_cast<std::uint16_t>(sidTid);
            const auto sid = static_cast<std::uint16_t>(sidTid >> 16);
            const auto advances = initialAdvances + chunkOffset + count;
            IDState8 state(advances, tid, sid, sidTid % 1000000);
            if (filter.compareState(state)) states.emplace_back(state);

            list[head++] = nextId();
            head %= list.size();
            pointer = head;
        }
        return states;
    }
}

static_assert(sizeof(Gen8IdPackedState) == 16);

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen8id_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen8id_generate(
        std::uint32_t seed0Low, std::uint32_t seed0High, std::uint32_t seed1Low,
        std::uint32_t seed1High, std::uint32_t initialAdvances,
        std::uint32_t chunkOffset, std::uint32_t maxAdvances,
        std::uint32_t filterMode,
        const std::uint32_t *filterValues, std::uint32_t filterCount)
    {
        results.clear();
        lastError = ErrorCode::None;

        const auto seed0 = (static_cast<std::uint64_t>(seed0High) << 32) | seed0Low;
        const auto seed1 = (static_cast<std::uint64_t>(seed1High) << 32) | seed1Low;
        if ((seed0 == 0 && seed1 == 0) || !validFilter(filterMode, filterValues, filterCount))
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        if (maxAdvances > maxStatesPerCall || chunkOffset > maxEvaluations
            || maxAdvances > maxEvaluations - chunkOffset)
        {
            lastError = ErrorCode::RangeTooLarge;
            return 0;
        }
        const IDFilter filter = makeFilter(filterMode, filterValues, filterCount);
        const auto states = generateChunk(seed0, seed1, initialAdvances, chunkOffset, maxAdvances, filter);
        results.reserve(states.size());
        for (const auto &state : states)
        {
            results.push_back({
                state.getAdvances(),
                static_cast<std::uint32_t>(state.getTID()) | (static_cast<std::uint32_t>(state.getSID()) << 16),
                state.getTSV(),
                state.getDisplayTID(),
            });
        }
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen8id_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen8id_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen8id_last_error() { return lastError; }
}
