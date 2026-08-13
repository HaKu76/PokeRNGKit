/*
 * PokeRNGKit Gen IV ID WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Generation IV ID behavior is adapted from PokeFinder 4.3.2 by
 * Admiral_Fish, bumba, and EzPzStreamz (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen4id_bridge.h"

#include <cstdint>
#include <limits>
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
    constexpr std::uint32_t valuesPerDelay = 256 * 24;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        RangeTooLarge = 2,
        ResultLimit = 3,
    };

    enum FilterMode : std::uint32_t
    {
        NoFilter = 0,
        FilterTid = 1,
        FilterSid = 2,
        FilterTidSid = 3,
        FilterPid = 4,
        FilterTidPid = 5,
        FilterTsv = 6,
    };

    thread_local std::vector<Gen4IdPackedState> results;
    thread_local std::uint32_t lastError = ErrorCode::None;

    std::uint32_t nextMtId(std::uint32_t seed)
    {
        std::uint32_t state0 = seed;
        std::uint32_t state1 = 0;
        std::uint32_t state2 = 0;
        for (std::uint32_t index = 1; index <= 396; index++)
        {
            seed = 0x6c078965U * (seed ^ (seed >> 30)) + index;
            if (index == 1) state1 = seed;
            if (index == 2) state2 = seed;
        }

        seed = 0x6c078965U * (seed ^ (seed >> 30)) + 397;
        std::uint32_t first = (state0 & 0x80000000U) | (state1 & 0x7fffffffU);
        first = (first >> 1) ^ ((first & 1U) != 0 ? 0x9908b0dfU : 0U) ^ seed;
        (void)first;

        seed = 0x6c078965U * (seed ^ (seed >> 30)) + 398;
        std::uint32_t value = (state1 & 0x80000000U) | (state2 & 0x7fffffffU);
        value = (value >> 1) ^ ((value & 1U) != 0 ? 0x9908b0dfU : 0U) ^ seed;
        value ^= value >> 11;
        value ^= (value << 7) & 0x9d2c5680U;
        value ^= (value << 15) & 0xefc60000U;
        value ^= value >> 18;
        return value;
    }

    bool validDate(std::uint32_t year, std::uint32_t month, std::uint32_t day)
    {
        if (year < 2000 || year > 2099 || month < 1 || month > 12 || day < 1) return false;
        constexpr std::uint32_t days[] = { 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 };
        std::uint32_t maximum = days[month - 1];
        if (month == 2 && year % 4 == 0) maximum = 29;
        return day <= maximum;
    }

    bool matches(std::uint32_t mode, const std::uint32_t *values, std::uint32_t count,
                 std::uint16_t tid, std::uint16_t sid, std::uint16_t tsv)
    {
        if (mode == NoFilter) return true;
        const bool pairMode = mode == FilterTidSid || mode == FilterTidPid;
        for (std::uint32_t index = 0; index < count; index++)
        {
            const auto first = values[index * (pairMode ? 2U : 1U)];
            const auto second = pairMode ? values[index * 2U + 1U] : 0U;
            if ((mode == FilterTid && tid == first) || (mode == FilterSid && sid == first)
                || (mode == FilterTidSid && tid == first && sid == second)
                || (mode == FilterPid && tsv == first)
                || (mode == FilterTidPid && tid == first && tsv == second)
                || (mode == FilterTsv && tsv == first))
            {
                return true;
            }
        }
        return false;
    }

    bool validFilter(std::uint32_t mode, const std::uint32_t *values, std::uint32_t count)
    {
        if (mode > FilterTsv || count > 4096) return false;
        if (mode == NoFilter) return count == 0;
        if (count == 0 || values == nullptr) return false;
        const bool pairMode = mode == FilterTidSid || mode == FilterTidPid;
        for (std::uint32_t index = 0; index < count; index++)
        {
            const auto first = values[index * (pairMode ? 2U : 1U)];
            const auto second = pairMode ? values[index * 2U + 1U] : 0U;
            if (first > 0xffffU) return false;
            if ((mode == FilterTidSid && second > 0xffffU)
                || ((mode == FilterPid || mode == FilterTidPid || mode == FilterTsv)
                    && (pairMode ? second : first) > 0x1fffU))
            {
                return false;
            }
        }
        return true;
    }

    bool append(std::uint32_t seed, std::uint32_t delay, std::uint32_t seconds,
                std::uint32_t mode, const std::uint32_t *values, std::uint32_t count)
    {
        const auto sidtid = nextMtId(seed);
        const auto tid = static_cast<std::uint16_t>(sidtid);
        const auto sid = static_cast<std::uint16_t>(sidtid >> 16);
        const auto tsv = static_cast<std::uint16_t>((tid ^ sid) >> 3);
        if (!matches(mode, values, count, tid, sid, tsv)) return true;
        if (results.size() >= maxStatesPerCall)
        {
            lastError = ErrorCode::ResultLimit;
            return false;
        }
        results.push_back({ seed, delay, tid, sid, tsv, seconds });
        return true;
    }
}

static_assert(sizeof(Gen4IdPackedState) == 24);

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen4id_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4id_generate(
        std::uint32_t second, std::uint32_t minDelay, std::uint32_t maxDelay,
        std::uint32_t year, std::uint32_t month, std::uint32_t day, std::uint32_t hour,
        std::uint32_t minute, std::uint32_t filterMode,
        const std::uint32_t *filterValues, std::uint32_t filterCount)
    {
        results.clear();
        lastError = ErrorCode::None;
        if (!validDate(year, month, day) || hour > 23 || minute > 59 || second > 59
            || minDelay > maxDelay || static_cast<std::uint64_t>(maxDelay) - minDelay + 1 > maxStatesPerCall
            || !validFilter(filterMode, filterValues, filterCount))
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        const auto yearOffset = year - 2000;
        if (maxDelay > std::numeric_limits<std::uint32_t>::max() - yearOffset)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        for (std::uint64_t delay = minDelay; delay <= maxDelay; delay++)
        {
            const auto adjustedDelay = static_cast<std::uint32_t>(delay) + yearOffset;
            const auto seed = static_cast<std::uint32_t>(
                (((month * day + minute + second) & 0xffU) << 24) | (hour << 16)) + adjustedDelay;
            if (!append(seed, static_cast<std::uint32_t>(delay), second, filterMode, filterValues, filterCount)) return 0;
        }
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4id_search(
        std::uint32_t minDelay, std::uint32_t maxDelay, std::uint32_t year,
        std::uint32_t filterMode,
        const std::uint32_t *filterValues, std::uint32_t filterCount)
    {
        results.clear();
        lastError = ErrorCode::None;
        const auto delayCount = static_cast<std::uint64_t>(maxDelay) - minDelay + 1;
        if (year < 2000 || year > 2099 || minDelay > maxDelay
            || delayCount * valuesPerDelay > maxStatesPerCall
            || !validFilter(filterMode, filterValues, filterCount))
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        const auto yearOffset = year - 2000;
        if (maxDelay > std::numeric_limits<std::uint32_t>::max() - yearOffset)
        {
            lastError = ErrorCode::RangeTooLarge;
            return 0;
        }
        for (std::uint64_t delay = minDelay; delay <= maxDelay; delay++)
        {
            const auto adjustedDelay = static_cast<std::uint32_t>(delay) + yearOffset;
            for (std::uint32_t ab = 0; ab < 256; ab++)
            {
                for (std::uint32_t cd = 0; cd < 24; cd++)
                {
                    const auto seed = static_cast<std::uint32_t>(((ab << 24) | (cd << 16)) + adjustedDelay);
                    if (!append(seed, static_cast<std::uint32_t>(delay), std::numeric_limits<std::uint32_t>::max(),
                                filterMode, filterValues, filterCount)) return 0;
                }
            }
        }
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen4id_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen4id_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen4id_last_error() { return lastError; }
}
