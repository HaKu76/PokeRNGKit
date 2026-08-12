/*
 * PokeRNGKit Gen III Seed to Time WebAssembly bridge.
 * Copyright (C) 2017-2024 by Admiral_Fish, bumba, and EzPzStreamz
 * Copyright (C) 2026 Hakuhiro
 *
 * Derived from PokeFinder's SeedToTimeCalculator3 under GNU GPL-3.0-or-later.
 * The C ABI and packed result format are PokeRNGKit additions.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#include "gen3seedtotime_bridge.h"

#include <Core/RNG/LCRNG.hpp>
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
    constexpr std::uint32_t minYear = 2000;
    constexpr std::uint32_t maxYear = 2037;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
    };

    thread_local std::vector<Gen3SeedToTimePackedState> results;
    thread_local std::uint32_t originSeed = 0;
    thread_local std::uint32_t advances = 0;
    thread_local std::uint32_t lastError = ErrorCode::None;

    constexpr bool isLeapYear(std::uint32_t year)
    {
        return (year % 4) == 0;
    }

    constexpr std::uint32_t daysInMonth(std::uint32_t year, std::uint32_t month)
    {
        constexpr std::uint32_t monthDays[] = { 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 };
        return month == 2 && isLeapYear(year) ? 29 : monthDays[month - 1];
    }

    std::uint32_t daysFromStart(std::uint32_t year, std::uint32_t month, std::uint32_t day)
    {
        std::uint32_t days = 0;
        for (std::uint32_t current = minYear; current < year; current++)
        {
            days += isLeapYear(current) ? 366 : 365;
        }
        for (std::uint32_t current = 1; current < month; current++)
        {
            days += daysInMonth(year, current);
        }
        return days + day - 1;
    }

    std::uint16_t calculateOriginSeed(std::uint32_t seed)
    {
        PokeRNGR rng(seed);
        while (rng.getSeed() > 0xffff)
        {
            rng.next(&advances);
        }
        return static_cast<std::uint16_t>(rng.getSeed());
    }

    void calculateTimes(std::uint16_t seed, std::uint32_t year)
    {
        results.clear();
        results.reserve(16);
        for (std::uint32_t month = 1; month <= 12; month++)
        {
            for (std::uint32_t day = 1; day <= daysInMonth(year, month); day++)
            {
                // PokeFinder preserves the game's post-2000 calendar bug.
                const std::uint32_t days = daysFromStart(year, month, day) - (year > 2000 ? 366 : 0) + 1;
                for (std::uint32_t hour = 0; hour < 24; hour++)
                {
                    for (std::uint32_t minute = 0; minute < 60; minute++)
                    {
                        std::uint32_t value = 1440 * days + 960 * (hour / 10) + 60 * (hour % 10)
                            + 16 * (minute / 10) + (minute % 10);
                        value = (value >> 16) ^ (value & 0xffff);
                        if (value == seed)
                        {
                            results.push_back({ year, month, day, hour, minute });
                        }
                    }
                }
            }
        }
    }
}

static_assert(sizeof(Gen3SeedToTimePackedState) == 20);

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen3seedtotime_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3seedtotime_calculate(std::uint32_t seed, std::uint32_t year)
    {
        results.clear();
        originSeed = 0;
        advances = 0;
        lastError = ErrorCode::None;
        if (year < minYear || year > maxYear)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        originSeed = calculateOriginSeed(seed);
        calculateTimes(static_cast<std::uint16_t>(originSeed), year);
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3seedtotime_origin_seed() { return originSeed; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen3seedtotime_advances() { return advances; }
    POKERNGKIT_KEEPALIVE std::uintptr_t gen3seedtotime_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen3seedtotime_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen3seedtotime_last_error() { return lastError; }
}
