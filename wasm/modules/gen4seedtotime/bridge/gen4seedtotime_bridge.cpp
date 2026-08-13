/*
 * PokeRNGKit Gen IV Seed to Time WebAssembly bridge.
 * Copyright (C) 2017-2024 by Admiral_Fish, bumba, and EzPzStreamz
 * Copyright (C) 2026 Hakuhiro
 *
 * Derived from PokeFinder's SeedToTimeCalculator4, SeedTime4,
 * HGSSRoamer, and Utilities4 under GNU GPL-3.0-or-later.
 */

#include "gen4seedtotime_bridge.h"

#include <Core/RNG/LCRNG.hpp>
#include <array>
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
    constexpr std::uint32_t maxCalibrationResults = 2'000'000;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        ResultLimitExceeded = 2,
    };

    struct DateTimeParts
    {
        std::uint32_t year;
        std::uint32_t month;
        std::uint32_t day;
        std::uint32_t hour;
        std::uint32_t minute;
        std::uint32_t second;
    };

    struct RoamerState
    {
        std::uint32_t raikouRoute = 0;
        std::uint32_t enteiRoute = 0;
        std::uint32_t latiRoute = 0;
        std::uint32_t skips = 0;
    };

    thread_local std::vector<Gen4SeedToTimePackedState> results;
    thread_local std::vector<Gen4SeedToTimePackedCalibration> calibrations;
    thread_local std::uint32_t statusSequenceLow = 0;
    thread_local std::uint32_t statusSequenceHigh = 0;
    thread_local RoamerState statusRoamers;
    thread_local std::uint32_t lastError = ErrorCode::None;

    class Mt32
    {
    public:
        explicit Mt32(std::uint32_t seed) : index(624)
        {
            state[0] = seed;
            for (std::uint32_t i = 1; i < 624; i++)
                state[i] = 0x6c078965u * (state[i - 1] ^ (state[i - 1] >> 30)) + i;
        }

        std::uint32_t next()
        {
            if (index == 624)
            {
                twist();
                index = 0;
            }
            std::uint32_t value = state[index++];
            value ^= value >> 11;
            value ^= (value << 7) & 0x9d2c5680u;
            value ^= (value << 15) & 0xefc60000u;
            value ^= value >> 18;
            return value;
        }

    private:
        void twist()
        {
            for (std::uint32_t i = 0; i < 624; i++)
            {
                const std::uint32_t upper = state[i] & 0x80000000u;
                const std::uint32_t lower = state[(i + 1) % 624] & 0x7fffffffu;
                std::uint32_t value = (upper | lower) >> 1;
                if ((upper | lower) & 1) value ^= 0x9908b0dfu;
                state[i] = state[(i + 397) % 624] ^ value;
            }
        }

        std::array<std::uint32_t, 624> state {};
        std::uint32_t index;
    };

    constexpr bool isLeapYear(std::uint32_t year) { return (year % 4) == 0; }

    constexpr std::uint32_t daysInMonth(std::uint32_t year, std::uint32_t month)
    {
        constexpr std::array<std::uint32_t, 12> monthDays = { 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 };
        return month == 2 && isLeapYear(year) ? 29 : monthDays[month - 1];
    }

    bool validDateTime(const DateTimeParts &dateTime)
    {
        return dateTime.year >= 2000 && dateTime.year <= 2099 && dateTime.month >= 1 && dateTime.month <= 12
            && dateTime.day >= 1 && dateTime.day <= daysInMonth(dateTime.year, dateTime.month) && dateTime.hour <= 23
            && dateTime.minute <= 59 && dateTime.second <= 59;
    }

    bool addSeconds(DateTimeParts &dateTime, int offset)
    {
        int seconds = static_cast<int>(dateTime.hour * 3600 + dateTime.minute * 60 + dateTime.second) + offset;
        while (seconds < 0)
        {
            if (dateTime.day > 1)
            {
                dateTime.day--;
            }
            else if (dateTime.month > 1)
            {
                dateTime.month--;
                dateTime.day = daysInMonth(dateTime.year, dateTime.month);
            }
            else if (dateTime.year > 2000)
            {
                dateTime.year--;
                dateTime.month = 12;
                dateTime.day = 31;
            }
            else
            {
                return false;
            }
            seconds += 86400;
        }
        while (seconds >= 86400)
        {
            seconds -= 86400;
            if (dateTime.day < daysInMonth(dateTime.year, dateTime.month))
            {
                dateTime.day++;
            }
            else if (dateTime.month < 12)
            {
                dateTime.month++;
                dateTime.day = 1;
            }
            else if (dateTime.year < 2099)
            {
                dateTime.year++;
                dateTime.month = 1;
                dateTime.day = 1;
            }
            else
            {
                return false;
            }
        }
        dateTime.hour = static_cast<std::uint32_t>(seconds / 3600);
        seconds %= 3600;
        dateTime.minute = static_cast<std::uint32_t>(seconds / 60);
        dateTime.second = static_cast<std::uint32_t>(seconds % 60);
        return true;
    }

    std::uint32_t calculateSeed(const DateTimeParts &dateTime, std::uint32_t delay)
    {
        const std::uint32_t ab = (dateTime.month * dateTime.day + dateTime.minute + dateTime.second) & 0xff;
        return (ab << 24) + (dateTime.hour << 16) + delay + dateTime.year - 2000;
    }

    std::uint32_t getRouteJ(std::uint16_t prng)
    {
        const std::uint32_t value = prng & 15;
        return value < 11 ? value + 29 : value + 31;
    }

    std::uint32_t getRouteK(std::uint16_t prng)
    {
        const std::uint32_t value = prng % 25;
        if (value == 22)
            return 24;
        if (value == 23)
            return 26;
        if (value == 24)
            return 28;
        return value + 1;
    }

    RoamerState calculateRoamers(std::uint32_t seed, std::uint32_t mask, const std::array<std::uint32_t, 3> &routes)
    {
        RoamerState state;
        PokeRNG rng(seed);
        if ((mask & 1) != 0)
        {
            do
            {
                state.skips++;
                state.raikouRoute = getRouteJ(rng.nextUShort());
            } while (state.raikouRoute == routes[0]);
        }
        if ((mask & 2) != 0)
        {
            do
            {
                state.skips++;
                state.enteiRoute = getRouteJ(rng.nextUShort());
            } while (state.enteiRoute == routes[1]);
        }
        if ((mask & 4) != 0)
        {
            do
            {
                state.skips++;
                state.latiRoute = getRouteK(rng.nextUShort());
            } while (state.latiRoute == routes[2]);
        }
        return state;
    }

    std::uint64_t coinFlips(std::uint32_t seed)
    {
        Mt32 rng(seed);
        std::uint64_t sequence = 0;
        for (std::uint32_t index = 0; index < 20; index++)
            sequence |= static_cast<std::uint64_t>((rng.next() & 1) == 0 ? 0 : 1) << (index * 2);
        return sequence;
    }

    std::uint64_t calls(std::uint32_t seed, std::uint32_t skips)
    {
        PokeRNG rng(seed);
        std::uint64_t sequence = 0;
        for (std::uint32_t index = 0; index < 20 + skips; index++)
            sequence |= static_cast<std::uint64_t>(rng.nextUShort(3)) << (index * 2);
        return sequence;
    }

    void splitSequence(std::uint64_t sequence, std::uint32_t &low, std::uint32_t &high)
    {
        low = static_cast<std::uint32_t>(sequence);
        high = static_cast<std::uint32_t>(sequence >> 32);
    }

    bool validCommon(std::uint32_t year, std::uint32_t mode, std::uint32_t mask, std::uint32_t raikouRoute,
                     std::uint32_t enteiRoute, std::uint32_t latiRoute)
    {
        return year >= 2000 && year <= 2099 && mode <= 1 && mask <= 7 && raikouRoute <= 46 && enteiRoute <= 46
            && latiRoute <= 28;
    }
}

static_assert(sizeof(Gen4SeedToTimePackedState) == 28);
static_assert(sizeof(Gen4SeedToTimePackedCalibration) == 56);

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen4seedtotime_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4seedtotime_generate(
        std::uint32_t seed, std::uint32_t year, std::uint32_t forceSecond, std::uint32_t forcedSecond,
        std::uint32_t mode, std::uint32_t roamerMask, std::uint32_t raikouRoute, std::uint32_t enteiRoute,
        std::uint32_t latiRoute)
    {
        results.clear();
        calibrations.clear();
        statusRoamers = {};
        statusSequenceLow = 0;
        statusSequenceHigh = 0;
        lastError = ErrorCode::None;
        if (!validCommon(year, mode, roamerMask, raikouRoute, enteiRoute, latiRoute) || forceSecond > 1
            || forcedSecond > 59 || (mode == 0 && roamerMask != 0))
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }

        const std::uint32_t ab = seed >> 24;
        const std::uint32_t cd = (seed >> 16) & 0xff;
        const std::uint32_t efgh = seed & 0xffff;
        const std::uint32_t hour = cd > 23 ? 23 : cd;
        const std::uint32_t delay = cd > 23
            ? efgh + static_cast<std::uint32_t>(2000 - static_cast<int>(year)) + ((cd - 23) * 0x10000)
            : efgh + static_cast<std::uint32_t>(2000 - static_cast<int>(year));

        for (std::uint32_t month = 1; month <= 12; month++)
        {
            for (std::uint32_t day = 1; day <= daysInMonth(year, month); day++)
            {
                for (std::uint32_t minute = 0; minute < 60; minute++)
                {
                    for (std::uint32_t second = 0; second < 60; second++)
                    {
                        if (ab == ((month * day + minute + second) & 0xff)
                            && (forceSecond == 0 || second == forcedSecond))
                        {
                            results.push_back({ year, month, day, hour, minute, second, delay });
                        }
                    }
                }
            }
        }

        const std::array routes = { raikouRoute, enteiRoute, latiRoute };
        if (mode == 0)
        {
            splitSequence(coinFlips(seed), statusSequenceLow, statusSequenceHigh);
        }
        else
        {
            statusRoamers = calculateRoamers(seed, roamerMask, routes);
            splitSequence(calls(seed, statusRoamers.skips), statusSequenceLow, statusSequenceHigh);
        }
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4seedtotime_calibrate(
        std::uint32_t year, std::uint32_t month, std::uint32_t day, std::uint32_t hour, std::uint32_t minute,
        std::uint32_t second, std::uint32_t delay, std::uint32_t delayCalibration, std::uint32_t secondCalibration,
        std::uint32_t mode, std::uint32_t roamerMask, std::uint32_t raikouRoute, std::uint32_t enteiRoute,
        std::uint32_t latiRoute)
    {
        results.clear();
        calibrations.clear();
        lastError = ErrorCode::None;
        const DateTimeParts target = { year, month, day, hour, minute, second };
        if (!validDateTime(target) || !validCommon(year, mode, roamerMask, raikouRoute, enteiRoute, latiRoute)
            || secondCalibration > 500 || (mode == 0 && roamerMask != 0))
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        const std::uint64_t width = (static_cast<std::uint64_t>(delayCalibration) * 2 + 1)
            * (static_cast<std::uint64_t>(secondCalibration) * 2 + 1);
        if (width > maxCalibrationResults)
        {
            lastError = ErrorCode::ResultLimitExceeded;
            return 0;
        }

        calibrations.reserve(static_cast<std::size_t>(width));
        const std::array routes = { raikouRoute, enteiRoute, latiRoute };
        for (int secondOffset = -static_cast<int>(secondCalibration);
             secondOffset <= static_cast<int>(secondCalibration); secondOffset++)
        {
            DateTimeParts offset = target;
            if (!addSeconds(offset, secondOffset))
                continue;
            for (std::int64_t delayOffset = -static_cast<std::int64_t>(delayCalibration);
                 delayOffset <= static_cast<std::int64_t>(delayCalibration); delayOffset++)
            {
                const auto resultDelay = delay + static_cast<std::uint32_t>(delayOffset);
                const auto seed = calculateSeed(offset, resultDelay);
                const auto roamer = mode == 1 ? calculateRoamers(seed, roamerMask, routes) : RoamerState {};
                std::uint32_t sequenceLow = 0;
                std::uint32_t sequenceHigh = 0;
                splitSequence(mode == 0 ? coinFlips(seed) : calls(seed, roamer.skips), sequenceLow, sequenceHigh);
                calibrations.push_back({ seed,
                                         offset.year,
                                         offset.month,
                                         offset.day,
                                         offset.hour,
                                         offset.minute,
                                         offset.second,
                                         resultDelay,
                                         sequenceLow,
                                         sequenceHigh,
                                         roamer.raikouRoute,
                                         roamer.enteiRoute,
                                         roamer.latiRoute,
                                         roamer.skips });
            }
        }
        return static_cast<std::uint32_t>(calibrations.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen4seedtotime_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen4seedtotime_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }
    POKERNGKIT_KEEPALIVE std::uintptr_t gen4seedtotime_calibration_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(calibrations.data());
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen4seedtotime_calibration_count()
    {
        return static_cast<std::uint32_t>(calibrations.size());
    }
    POKERNGKIT_KEEPALIVE std::uint32_t gen4seedtotime_status_sequence_low() { return statusSequenceLow; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen4seedtotime_status_sequence_high() { return statusSequenceHigh; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen4seedtotime_status_raikou_route() { return statusRoamers.raikouRoute; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen4seedtotime_status_entei_route() { return statusRoamers.enteiRoute; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen4seedtotime_status_lati_route() { return statusRoamers.latiRoute; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen4seedtotime_status_skips() { return statusRoamers.skips; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen4seedtotime_last_error() { return lastError; }
}
