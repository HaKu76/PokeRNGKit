/*
 * PokeRNGKit Gen V SHA1 Cache Finder WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 SHA1CacheSearcher, SHA1,
 * Nazos and Keypresses by Admiral_Fish, bumba, and EzPzStreamz
 * (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen5sha1cache_bridge.h"

#include <algorithm>
#include <array>
#include <bit>
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
    constexpr std::uint32_t secondsPerDay = 86400;
    constexpr std::uint32_t maximumResults = 100000;
    constexpr std::uint64_t maximumSeedCount = 1000000;
    constexpr std::uint64_t bwMultiplier = 0x5d588b656c078965ULL;
    constexpr std::uint64_t bwAdd = 0x269ec3ULL;

    enum Category : std::uint32_t
    {
        Entralink = 0,
        Normal = 1,
        Roamer = 2,
    };

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        InvalidSeedData = 2,
    };

    struct Date
    {
        std::uint32_t year;
        std::uint32_t month;
        std::uint32_t day;
    };

    struct NazoInput
    {
        std::uint32_t base;
        std::uint32_t zero;
        std::uint32_t one;
        bool sequel;
    };

    thread_local std::vector<Gen5Sha1CachePackedResult> results;
    thread_local std::uint32_t processedCount = 0;
    thread_local std::uint32_t lastError = ErrorCode::None;
    thread_local bool resultLimitReached = false;

    constexpr bool leapYear(std::uint32_t year)
    {
        return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
    }

    constexpr std::uint32_t daysInMonth(std::uint32_t year, std::uint32_t month)
    {
        constexpr std::array<std::uint32_t, 12> days = { 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 };
        return month == 2 && leapYear(year) ? 29 : days[month - 1];
    }

    constexpr bool validDate(const Date &date)
    {
        return date.year >= 2000 && date.year <= 2099 && date.month >= 1 && date.month <= 12
            && date.day >= 1 && date.day <= daysInMonth(date.year, date.month);
    }

    constexpr std::uint32_t bcd(std::uint32_t value)
    {
        return ((value / 10) << 4) | (value % 10);
    }

    constexpr std::uint32_t weekday(const Date &date)
    {
        const std::uint32_t adjustment = date.month < 3 ? 1 : 0;
        const std::uint32_t year = date.year + 4800 - adjustment;
        const std::uint32_t month = date.month + 12 * adjustment - 3;
        const std::uint32_t jd
            = date.day + ((153 * month + 2) / 5) - 32045 + 365 * year + year / 4 - year / 100 + year / 400;
        return (jd + 1) % 7;
    }

    NazoInput nazoInput(std::uint32_t language, std::uint32_t version, bool dsi)
    {
        // Ordering follows the PokeRNGKit domain: ENG, SPA, FRE, ITA, DEU, JPN, KOR.
        switch (language)
        {
        case 0:
            switch (version)
            {
            case 0: return { dsi ? 0x02760190U : 0x022160b0U, 0, 0, false };
            case 1: return { dsi ? 0x027601b0U : 0x022160d0U, 0, 0, false };
            case 2: return { dsi ? 0x027a5f70U : 0x02200010U, 0x0209aee8U, 0x02039de9U, true };
            default: return { dsi ? 0x027a5e90U : 0x02200050U, 0x0209af28U, 0x02039e15U, true };
            }
        case 1:
            switch (version)
            {
            case 0: return { dsi ? 0x027601f0U : 0x02216070U, 0, 0, false };
            case 1: return { dsi ? 0x027601f0U : 0x02216070U, 0, 0, false };
            case 2: return { dsi ? 0x027a6070U : 0x021fffd0U, 0x0209aea8U, 0x02039db9U, true };
            default: return { dsi ? 0x027a5fb0U : 0x021ffff0U, 0x0209aec8U, 0x02039de5U, true };
            }
        case 2:
            switch (version)
            {
            case 0: return { dsi ? 0x02760230U : 0x02216030U, 0, 0, false };
            case 1: return { dsi ? 0x02760250U : 0x02216050U, 0, 0, false };
            case 2: return { dsi ? 0x027a5f90U : 0x02200030U, 0x0209af08U, 0x02039df9U, true };
            default: return { dsi ? 0x027a5ef0U : 0x02200050U, 0x0209af28U, 0x02039e25U, true };
            }
        case 3:
            switch (version)
            {
            case 0: return { dsi ? 0x027601d0U : 0x02215fb0U, 0, 0, false };
            case 1: return { dsi ? 0x027601d0U : 0x02215fd0U, 0, 0, false };
            case 2: return { dsi ? 0x027a5f70U : 0x021fff10U, 0x0209ade8U, 0x02039d69U, true };
            default: return { dsi ? 0x027a5ed0U : 0x021fff50U, 0x0209ae28U, 0x02039d95U, true };
            }
        case 4:
            switch (version)
            {
            case 0: return { dsi ? 0x027602f0U : 0x02215ff0U, 0, 0, false };
            case 1: return { dsi ? 0x027602f0U : 0x02216010U, 0, 0, false };
            case 2: return { dsi ? 0x027a6110U : 0x021fff50U, 0x0209ae28U, 0x02039d69U, true };
            default: return { dsi ? 0x027a6010U : 0x021fff70U, 0x0209ae48U, 0x02039d95U, true };
            }
        case 5:
            switch (version)
            {
            case 0: return { dsi ? 0x02761150U : 0x02215f10U, 0, 0, false };
            case 1: return { dsi ? 0x02761150U : 0x02215f30U, 0, 0, false };
            case 2: return { dsi ? 0x027aa730U : 0x021ff9b0U, 0x0209a8dcU, 0x02039ac9U, true };
            default: return { dsi ? 0x027aa5f0U : 0x021ff9d0U, 0x0209a8fcU, 0x02039af5U, true };
            }
        default:
            switch (version)
            {
            case 0: return { dsi ? 0x02761150U : 0x022167b0U, 0, 0, false };
            case 1: return { dsi ? 0x02761150U : 0x022167b0U, 0, 0, false };
            case 2: return { dsi ? 0x02200770U : 0x02200750U, 0x0209b60cU, 0x0203a4d5U, true };
            default: return { dsi ? 0x027a57b0U : 0x02200770U, 0x0209b62cU, 0x0203a501U, true };
            }
        }
    }

    std::array<std::uint32_t, 5> nazoValues(std::uint32_t language, std::uint32_t version, std::uint32_t dsType)
    {
        const auto input = nazoInput(language, version, dsType != 0);
        if (input.sequel)
        {
            return { std::byteswap(input.zero), std::byteswap(input.one), std::byteswap(input.base),
                     std::byteswap(input.base + 0x54), std::byteswap(input.base + 0x54) };
        }
        return { std::byteswap(input.base), std::byteswap(input.base + 0xfc), std::byteswap(input.base + 0xfc),
                 std::byteswap(input.base + 0x148), std::byteswap(input.base + 0x148) };
    }

    std::uint32_t keypressValue(std::uint32_t mask)
    {
        constexpr std::array<std::uint32_t, 12> values = {
            0x10000, 0x20000, 0x40000, 0x80000, 0x1000000, 0x2000000,
            0x4000000, 0x8000000, 0x10000000, 0x20000000, 0x40000000, 0x80000000,
        };
        std::uint32_t value = 0xff2f0000;
        for (std::uint32_t index = 0; index < values.size(); index++)
            if ((mask & (1U << index)) != 0) value -= values[index];
        return value;
    }

    bool validKeypress(std::uint32_t mask)
    {
        return mask <= 0xfff && std::popcount(mask) <= 8 && (mask & 0xc00U) != 0xc00U
            && (mask & 0x300U) != 0x300U && (mask & 0xc3U) != 0xc3U;
    }

    std::uint64_t calculateSeed(const Gen5Sha1CachePackedRequest &request, std::uint32_t secondsSinceMidnight)
    {
        std::array<std::uint32_t, 80> words = {};
        const auto nazos = nazoValues(request.language, request.version, request.dsType);
        for (std::size_t index = 0; index < nazos.size(); index++) words[index] = nazos[index];
        words[5] = std::byteswap((request.vcount << 16) | request.timer0);
        const std::uint64_t mac = (static_cast<std::uint64_t>(request.macHigh) << 32) | request.macLow;
        words[6] = static_cast<std::uint32_t>(mac & 0xffffU);
        words[7]
            = static_cast<std::uint32_t>((mac >> 16) ^ (static_cast<std::uint64_t>(request.vframe) << 24) ^ request.gxstat);
        const Date date = { request.year, request.month, request.day };
        words[8] = (bcd(date.year % 100) << 24) | (bcd(date.month) << 16) | (bcd(date.day) << 8) | weekday(date);
        const std::uint32_t hour = secondsSinceMidnight / 3600;
        const std::uint32_t minute = (secondsSinceMidnight % 3600) / 60;
        const std::uint32_t second = secondsSinceMidnight % 60;
        words[9] = (bcd(hour) << 24) | (bcd(minute) << 16) | (bcd(second) << 8);
        if (hour >= 12) words[9] |= 0x40000000U;
        if (secondsSinceMidnight >= 43200 && request.dsType == 2) words[9] ^= 0x40000000U;
        words[12] = keypressValue(request.buttonMask);
        words[13] = 0x80000000U;
        words[15] = 0x000001a0U;
        for (std::uint32_t index = 16; index < 80; index++)
            words[index] = std::rotl(words[index - 3] ^ words[index - 8] ^ words[index - 14] ^ words[index - 16], 1);

        std::uint32_t a = 0x67452301U;
        std::uint32_t b = 0xefcdab89U;
        std::uint32_t c = 0x98badcfeU;
        std::uint32_t d = 0x10325476U;
        std::uint32_t e = 0xc3d2e1f0U;
        for (std::uint32_t index = 0; index < 80; index++)
        {
            std::uint32_t function;
            std::uint32_t constant;
            if (index < 20)
            {
                function = (b & c) | (~b & d);
                constant = 0x5a827999U;
            }
            else if (index < 40)
            {
                function = b ^ c ^ d;
                constant = 0x6ed9eba1U;
            }
            else if (index < 60)
            {
                function = (b & c) | (b & d) | (c & d);
                constant = 0x8f1bbcdcU;
            }
            else
            {
                function = b ^ c ^ d;
                constant = 0xca62c1d6U;
            }
            const std::uint32_t temporary = std::rotl(a, 5) + function + e + constant + words[index];
            e = d;
            d = c;
            c = std::rotl(b, 30);
            b = a;
            a = temporary;
        }
        const std::uint32_t first = std::byteswap(a + 0x67452301U);
        const std::uint32_t secondWord = std::byteswap(b + 0xefcdab89U);
        std::uint64_t seed = (static_cast<std::uint64_t>(secondWord) << 32) | first;
        return seed * bwMultiplier + bwAdd;
    }

    bool validateRequest(const Gen5Sha1CachePackedRequest &request)
    {
        const Date date = { request.year, request.month, request.day };
        return request.version <= 3 && request.language <= 6 && request.dsType <= 2 && request.macHigh <= 0xffff
            && request.vcount <= 0xff && request.timer0 <= 0xffff && request.gxstat <= 99 && request.vframe <= 99
            && validDate(date) && validKeypress(request.buttonMask) && request.resultLimit > 0
            && request.resultLimit <= maximumResults;
    }

    bool validateSeedList(const std::uint32_t *seeds, std::uint32_t count)
    {
        if (count == 0) return true;
        return seeds != nullptr && std::is_sorted(seeds, seeds + count);
    }

    bool matches(const std::uint32_t *seeds, std::uint32_t count, std::uint32_t value)
    {
        return count != 0 && std::binary_search(seeds, seeds + count, value);
    }
}

static_assert(sizeof(Gen5Sha1CachePackedRequest) == 14 * sizeof(std::uint32_t));
static_assert(sizeof(Gen5Sha1CachePackedResult) == 4 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen5sha1cache_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5sha1cache_search(
        const Gen5Sha1CachePackedRequest *request,
        const std::uint32_t *entralinkSeeds,
        std::uint32_t entralinkCount,
        const std::uint32_t *normalSeeds,
        std::uint32_t normalCount,
        const std::uint32_t *roamerSeeds,
        std::uint32_t roamerCount)
    {
        results.clear();
        processedCount = 0;
        lastError = ErrorCode::None;
        resultLimitReached = false;
        if (request == nullptr || !validateRequest(*request))
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        const std::uint64_t totalSeedCount
            = static_cast<std::uint64_t>(entralinkCount) + normalCount + roamerCount;
        if (totalSeedCount > maximumSeedCount || !validateSeedList(entralinkSeeds, entralinkCount)
            || !validateSeedList(normalSeeds, normalCount) || !validateSeedList(roamerSeeds, roamerCount))
        {
            lastError = ErrorCode::InvalidSeedData;
            return 0;
        }

        results.reserve(request->resultLimit);
        for (std::uint32_t seconds = 0; seconds < secondsPerDay; seconds++)
        {
            const auto seed = calculateSeed(*request, seconds);
            processedCount++;
            const auto high = static_cast<std::uint32_t>(seed >> 32);
            const std::array<bool, 3> categoryMatches = {
                matches(entralinkSeeds, entralinkCount, high),
                matches(normalSeeds, normalCount, high),
                matches(roamerSeeds, roamerCount, high),
            };
            for (std::uint32_t category = 0; category < categoryMatches.size(); category++)
            {
                if (!categoryMatches[category]) continue;
                results.push_back({ static_cast<std::uint32_t>(seed), high, seconds, category });
                if (results.size() >= request->resultLimit)
                {
                    resultLimitReached = seconds + 1 < secondsPerDay || category + 1 < categoryMatches.size();
                    return static_cast<std::uint32_t>(results.size());
                }
            }
        }
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen5sha1cache_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5sha1cache_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5sha1cache_processed_count() { return processedCount; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen5sha1cache_limit_reached() { return resultLimitReached ? 1 : 0; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen5sha1cache_last_error() { return lastError; }

#ifndef __EMSCRIPTEN__
    std::uint64_t gen5sha1cache_test_seed(const Gen5Sha1CachePackedRequest *request, std::uint32_t seconds)
    {
        if (request == nullptr || !validateRequest(*request) || seconds >= secondsPerDay) return 0;
        return calculateSeed(*request, seconds);
    }
#endif
}
