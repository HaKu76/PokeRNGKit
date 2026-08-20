/*
 * PokeRNGKit Gen IV Seed Finder WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokemonRNGGuides Gen 4 Seed Finder. The Gen IV MT
 * and LCRNG behavior follows PokeFinder 4.3.2 under GPL-3.0-or-later.
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or later.
 */
#include "gen4seedfinder_bridge.h"

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
    constexpr std::uint32_t maxSequence = 32;
    constexpr std::uint32_t maxDelay = 1'000'000;
    constexpr std::uint32_t maxDelayRange = 100'000;
    constexpr std::uint32_t maxResults = 100'000;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        ResultLimit = 2,
    };

    struct DateTime
    {
        std::uint32_t year;
        std::uint32_t month;
        std::uint32_t day;
        std::uint32_t hour;
        std::uint32_t minute;
        std::uint32_t second;
    };

    thread_local std::vector<Gen4SeedFinderPackedResult> results;
    thread_local std::uint32_t lastError = ErrorCode::None;

    bool leap(std::uint32_t year) { return year % 4 == 0 || year % 400 == 0; }
    std::uint32_t daysInMonth(std::uint32_t year, std::uint32_t month)
    {
        constexpr std::array days{31U, 28U, 31U, 30U, 31U, 30U, 31U, 31U, 30U, 31U, 30U, 31U};
        if (month == 2 && leap(year)) return 29;
        return month >= 1 && month <= 12 ? days[month - 1] : 0;
    }

    void addSecond(DateTime& value)
    {
        if (++value.second < 60) return;
        value.second = 0;
        if (++value.minute < 60) return;
        value.minute = 0;
        if (++value.hour < 24) return;
        value.hour = 0;
        if (++value.day <= daysInMonth(value.year, value.month)) return;
        value.day = 1;
        if (++value.month <= 12) return;
        value.month = 1;
        ++value.year;
    }

    std::uint32_t calculateSeed(const DateTime& date, std::uint32_t delay)
    {
        const auto ab = (date.month * date.day + date.minute + date.second) & 0xffU;
        const auto base = (ab << 24) | ((date.hour & 0xffU) << 16);
        return base + delay + date.year - 2000U;
    }

    class MT
    {
    public:
        explicit MT(std::uint32_t seed)
        {
            state[0] = seed;
            for (std::size_t i = 1; i < state.size(); ++i)
                state[i] = 0x6C078965U * (state[i - 1] ^ (state[i - 1] >> 30)) + static_cast<std::uint32_t>(i);
        }

        std::uint32_t next()
        {
            if (index >= state.size())
            {
                for (std::size_t i = 0; i < state.size(); ++i)
                {
                    const auto y = (state[i] & 0x80000000U) | (state[(i + 1) % state.size()] & 0x7fffffffU);
                    state[i] = state[(i + 397) % state.size()] ^ (y >> 1) ^ ((y & 1U) ? 0x9908B0DFU : 0U);
                }
                index = 0;
            }
            auto value = state[index++];
            value ^= value >> 11;
            value ^= (value << 7) & 0x9D2C5680U;
            value ^= (value << 15) & 0xEFC60000U;
            value ^= value >> 18;
            return value;
        }

    private:
        std::array<std::uint32_t, 624> state{};
        std::size_t index = 624;
    };

    std::uint32_t lcrng(std::uint32_t& state)
    {
        state = state * 0x41C64E6DU + 0x6073U;
        return state;
    }

    std::uint32_t sequenceValue(std::uint32_t game, std::uint32_t random)
    {
        if (game == 0) return random & 1U;
        return static_cast<std::uint32_t>((random >> 16) % 3U);
    }

    bool matches(std::uint32_t game, std::uint32_t seed, std::uint32_t filterLow,
                 std::uint32_t filterHigh, std::uint32_t filterLength,
                 std::uint32_t sequenceCount, std::uint32_t& sequenceLow,
                 std::uint32_t& sequenceHigh)
    {
        sequenceLow = 0;
        sequenceHigh = 0;
        MT mt(seed);
        std::uint32_t lcrngState = seed;
        std::array<std::uint32_t, maxSequence> sequence{};
        for (std::uint32_t index = 0; index < sequenceCount; ++index)
        {
            const auto value = sequenceValue(game, game == 0 ? mt.next() : lcrng(lcrngState));
            sequence[index] = value;
            if (index < 16) sequenceLow |= value << (index * 2);
            else sequenceHigh |= value << ((index - 16) * 2);
        }
        if (filterLength == 0) return true;
        for (std::uint32_t start = 0; start + filterLength <= sequenceCount; ++start)
        {
            bool matched = true;
            for (std::uint32_t offset = 0; offset < filterLength; ++offset)
            {
                const auto expected = offset < 16
                    ? (filterLow >> (offset * 2)) & 3U
                    : (filterHigh >> ((offset - 16) * 2)) & 3U;
                if (sequence[start + offset] != expected) { matched = false; break; }
            }
            if (matched) return true;
        }
        return false;
    }
}

POKERNGKIT_KEEPALIVE std::uint32_t gen4seedfinder_api_version() { return apiVersion; }

POKERNGKIT_KEEPALIVE std::uint32_t gen4seedfinder_search(
    std::uint32_t game, std::uint32_t year, std::uint32_t month, std::uint32_t day,
    std::uint32_t hour, std::uint32_t minute, std::uint32_t minSecond,
    std::uint32_t maxSecond, std::uint32_t minDelay, std::uint32_t maxDelay,
    std::uint32_t filterLow, std::uint32_t filterHigh, std::uint32_t filterLength,
    std::uint32_t sequenceCount)
{
    results.clear();
    lastError = ErrorCode::None;
    if (game > 1 || year < 2000 || year > 2099 || month < 1 || month > 12 ||
        day < 1 || day > daysInMonth(year, month) || hour > 23 || minute > 59 ||
        minSecond > 59 || maxSecond < minSecond || maxSecond > 60 ||
        minDelay > maxDelay || maxDelay > 1'000'000 ||
        maxDelay - minDelay > maxDelayRange || filterLength > maxSequence ||
        sequenceCount == 0 || sequenceCount > maxSequence || filterLength > sequenceCount)
    {
        lastError = ErrorCode::InvalidInput;
        return 0;
    }
    const auto seconds = maxSecond - minSecond;
    results.reserve(static_cast<std::size_t>(seconds + 1) * (maxDelay - minDelay + 1));
    DateTime date{year, month, day, hour, minute, minSecond};
    for (std::uint32_t secondOffset = 0; secondOffset <= seconds; ++secondOffset)
    {
        for (std::uint32_t delay = minDelay; delay <= maxDelay; ++delay)
        {
            const auto seed = calculateSeed(date, delay);
            std::uint32_t sequenceLow = 0;
            std::uint32_t sequenceHigh = 0;
            if (matches(game, seed, filterLow, filterHigh, filterLength, sequenceCount, sequenceLow, sequenceHigh))
                results.push_back({seed, date.year, date.month, date.day, date.hour, date.minute, date.second, delay, sequenceLow, sequenceHigh});
            if (results.size() >= maxResults)
            {
                lastError = ErrorCode::ResultLimit;
                return 0;
            }
            if (delay == 0xffffffffU) break;
        }
        if (secondOffset < seconds) addSecond(date);
    }
    return static_cast<std::uint32_t>(results.size());
}

POKERNGKIT_KEEPALIVE std::uintptr_t gen4seedfinder_result_ptr() { return reinterpret_cast<std::uintptr_t>(results.data()); }
POKERNGKIT_KEEPALIVE std::uint32_t gen4seedfinder_result_count() { return static_cast<std::uint32_t>(results.size()); }
POKERNGKIT_KEEPALIVE std::uint32_t gen4seedfinder_last_error() { return lastError; }
