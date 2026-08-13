/*
 * PokeRNGKit Pokerus Finder bridge.
 * Copyright (C) 2017 Real.96 and Signum21
 * Copyright (C) 2026 Hakuhiro
 *
 * Derived from DevonStudios Pokerus Finder under GNU GPL-3.0.
 * The C ABI and packed result format are PokeRNGKit additions.
 */
#include "pokerusfinder_bridge.h"

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
    constexpr std::uint32_t lcgMultiplier = 0x41c64e6d;
    constexpr std::uint32_t lcgAddend = 0x6073;
    enum ErrorCode : std::uint32_t { None = 0, InvalidInput = 1 };
    thread_local std::vector<std::uint32_t> results;
    thread_local std::uint32_t resultCount = 0;
    thread_local std::uint32_t lastError = ErrorCode::None;

    bool isPokerus(std::uint32_t seed)
    {
        const auto high = seed >> 16;
        return high == 0x4000 || high == 0x8000 || high == 0xc000;
    }

    std::uint32_t next(std::uint32_t seed)
    {
        return lcgMultiplier * seed + lcgAddend;
    }

    bool validDate(std::uint32_t year, std::uint32_t month, std::uint32_t day)
    {
        if (year < 2000 || year > 2099 || month < 1 || month > 12 || day < 1) return false;
        constexpr std::uint32_t monthDays[] = { 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 };
        auto maxDay = monthDays[month - 1];
        if (month == 2 && year % 4 == 0) maxDay = 29;
        return day <= maxDay;
    }

}

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t pokerusfinder_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t pokerusfinder_search_gen3(std::uint32_t seed, std::uint32_t frame, std::uint32_t delay, std::uint32_t maxFrames)
    {
        results.clear();
        resultCount = 0;
        lastError = ErrorCode::None;
        const bool isGen3 = maxFrames == 9'999'999;
        const bool isDp = maxFrames == 99'999;
        if ((!isGen3 && !isDp) || (isGen3 && seed > 0xffff) || frame > maxFrames || delay > 999)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        results.reserve(128);
        for (std::uint32_t i = 0; i < maxFrames; i++)
        {
            const auto temp = next(seed);
            const auto effectiveFrame = static_cast<std::int64_t>(i) - delay;
            if (isPokerus(temp) && effectiveFrame >= frame)
            {
                results.push_back(static_cast<std::uint32_t>(effectiveFrame));
                results.push_back(seed);
            }
            seed = temp;
        }
        resultCount = static_cast<std::uint32_t>(results.size() / 2);
        return resultCount;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t pokerusfinder_search_pthgss(std::uint32_t year, std::uint32_t month, std::uint32_t day, std::uint32_t hour, std::uint32_t minute)
    {
        results.clear();
        resultCount = 0;
        lastError = ErrorCode::None;
        if (!validDate(year, month, day) || hour > 23 || minute > 59)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        results.reserve(128);
        for (std::uint32_t second = 0; second < 60; second++)
        {
            for (std::int32_t delay = -1400; delay <= -1000; delay++)
            {
                const auto ab = (month * day + minute + second) % 256;
                const auto cgd = delay % 65536 + 1;
                const auto efgh = static_cast<std::uint32_t>((static_cast<std::int32_t>(year) + cgd) % 10000);
                const auto initialSeed = (ab << 24) | (hour << 16) | efgh;
                auto seed = initialSeed;
                for (std::uint32_t frame = 0; frame <= 100; frame++)
                {
                    const auto temp = next(seed);
                    if (isPokerus(temp) && frame >= 24)
                    {
                        results.push_back(frame);
                        results.push_back(initialSeed);
                        results.push_back(static_cast<std::uint32_t>(delay + 2001));
                        results.push_back(second);
                    }
                    seed = temp;
                }
            }
        }
        resultCount = static_cast<std::uint32_t>(results.size() / 4);
        return resultCount;
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t pokerusfinder_result_ptr() { return reinterpret_cast<std::uintptr_t>(results.data()); }
    POKERNGKIT_KEEPALIVE std::uint32_t pokerusfinder_result_count() { return resultCount; }
    POKERNGKIT_KEEPALIVE std::uint32_t pokerusfinder_last_error() { return lastError; }
}
