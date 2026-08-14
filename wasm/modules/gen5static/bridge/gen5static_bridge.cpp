/*
 * PokeRNGKit Gen V Static WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 StaticGenerator5, IVSearcher5,
 * Searcher5, IVCache, SHA1Cache, SHA1, Nazos, Keypresses and Utilities5
 * by Admiral_Fish, bumba, and EzPzStreamz (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen5static_bridge.h"

#include <Core/RNG/MT.hpp>
#include <Core/RNG/RNGList.hpp>
#include <algorithm>
#include <array>
#include <bit>
#include <cstddef>
#include <cstdint>
#include <limits>
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
    constexpr std::uint32_t maximumResults = 100000;
    constexpr std::uint32_t maximumCacheEntries = 1000000;
    constexpr std::uint64_t maximumEvaluations = 250000000;
    constexpr std::uint64_t bwMultiplier = 0x5d588b656c078965ULL;
    constexpr std::uint64_t bwAdd = 0x269ec3ULL;

    constexpr std::uint32_t wildFlag = 1U << 0;
    constexpr std::uint32_t eggFlag = 1U << 1;
    constexpr std::uint32_t roamerFlag = 1U << 2;
    constexpr std::uint32_t curtisFlag = 1U << 3;
    constexpr std::uint32_t yancyFlag = 1U << 4;

    enum class Operation : std::uint32_t
    {
        Generator = 0,
        Searcher = 1,
    };

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        RangeTooLarge = 2,
        InvalidChunk = 3,
        InvalidCache = 4,
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

    struct BwJump
    {
        std::uint64_t multiplier;
        std::uint64_t add;
    };

    struct IvState
    {
        std::uint32_t advances;
        std::array<std::uint8_t, 6> values;
        std::uint8_t hiddenPower;
        std::uint8_t hiddenPowerStrength;
    };

    struct IvCacheEntry
    {
        std::uint32_t advances;
        std::uint32_t seedHigh;
    };

    struct ShaCacheEntry
    {
        std::uint32_t keyLow;
        std::uint32_t keyHigh;
        std::uint64_t seed;
    };

    thread_local std::vector<Gen5StaticPackedResult> results;
    thread_local std::vector<IvCacheEntry> ivCache;
    thread_local std::vector<ShaCacheEntry> shaCache;
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
        return date.year >= 2000 && date.year <= 2099 && date.month >= 1 && date.month <= 12 && date.day >= 1
            && date.day <= daysInMonth(date.year, date.month);
    }

    std::uint32_t serialDate(const Date &date)
    {
        std::uint32_t days = 0;
        for (std::uint32_t year = 2000; year < date.year; year++) days += leapYear(year) ? 366 : 365;
        for (std::uint32_t month = 1; month < date.month; month++) days += daysInMonth(date.year, month);
        return days + date.day - 1;
    }

    Date dateFromSerial(std::uint32_t serial)
    {
        Date date = { 2000, 1, 1 };
        while (serial >= (leapYear(date.year) ? 366U : 365U))
        {
            serial -= leapYear(date.year) ? 366U : 365U;
            date.year++;
        }
        while (serial >= daysInMonth(date.year, date.month))
        {
            serial -= daysInMonth(date.year, date.month);
            date.month++;
        }
        date.day += serial;
        return date;
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
        // PokeRNGKit language order: ENG, SPA, FRE, ITA, DEU, JPN, KOR.
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
            case 0:
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
            case 0:
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

    bool validKeypress(std::uint32_t mask, bool skipLR)
    {
        if (skipLR && (mask & 0x3U) != 0) return false;
        if ((mask & 0xc00U) == 0xc00U || (mask & 0x300U) == 0x300U || (mask & 0xc3U) == 0xc3U) return false;
        return true;
    }

    std::vector<std::uint32_t> keypresses(const Gen5StaticPackedRequest &request)
    {
        std::vector<std::uint32_t> values;
        for (std::uint32_t mask = 0; mask < 0x1000; mask++)
        {
            const auto count = std::popcount(mask);
            if (count <= 8 && (request.keypressCountMask & (1U << count)) != 0 && validKeypress(mask, request.skipLR != 0))
                values.emplace_back(mask);
        }
        return values;
    }

    std::uint64_t nextBw(std::uint64_t &seed)
    {
        seed = seed * bwMultiplier + bwAdd;
        return seed;
    }

    std::uint32_t nextBwUInt(std::uint64_t &seed)
    {
        return static_cast<std::uint32_t>(nextBw(seed) >> 32);
    }

    std::uint32_t nextBwUInt(std::uint64_t &seed, std::uint32_t maximum)
    {
        return static_cast<std::uint32_t>(((nextBw(seed) >> 32) * maximum) >> 32);
    }

    BwJump bwJump(std::uint32_t advances)
    {
        BwJump result = { 1, 0 };
        std::uint64_t multiplier = bwMultiplier;
        std::uint64_t add = bwAdd;
        while (advances != 0)
        {
            if ((advances & 1U) != 0)
            {
                result.add = result.add * multiplier + add;
                result.multiplier *= multiplier;
            }
            add *= multiplier + 1;
            multiplier *= multiplier;
            advances >>= 1;
        }
        return result;
    }

    void applyJump(std::uint64_t &seed, const BwJump &jump)
    {
        seed = seed * jump.multiplier + jump.add;
    }

    void jumpBw(std::uint64_t &seed, std::uint32_t advances)
    {
        applyJump(seed, bwJump(advances));
    }

    std::uint32_t probabilityTable(std::uint64_t &seed)
    {
        std::uint32_t count = 1;
        nextBw(seed);
        count++;
        if (nextBwUInt(seed, 101) > 50)
        {
            nextBw(seed);
            count++;
        }
        count++;
        if (nextBwUInt(seed, 101) > 30)
        {
            nextBw(seed);
            count++;
        }
        count++;
        if (nextBwUInt(seed, 101) > 25)
        {
            count++;
            if (nextBwUInt(seed, 101) > 30)
            {
                nextBw(seed);
                count++;
            }
        }
        count++;
        if (nextBwUInt(seed, 101) > 20)
        {
            count++;
            if (nextBwUInt(seed, 101) > 25)
            {
                count++;
                if (nextBwUInt(seed, 101) > 33)
                {
                    nextBw(seed);
                    count++;
                }
            }
        }
        return count;
    }

    std::uint32_t initialAdvances(std::uint64_t seed, bool sequel, bool memoryLink)
    {
        std::uint32_t count = 0;
        for (std::uint32_t index = 0; index < 5; index++)
        {
            count += probabilityTable(seed);
            if (sequel && index == 0)
            {
                const std::uint32_t extra = memoryLink ? 2U : 3U;
                count += extra;
                jumpBw(seed, extra);
            }
        }
        if (sequel)
        {
            for (std::uint32_t limit = 0; limit < 100; limit++)
            {
                count += 3;
                const auto one = nextBwUInt(seed, 15);
                const auto two = nextBwUInt(seed, 15);
                const auto three = nextBwUInt(seed, 15);
                if (one != two && one != three && two != three) break;
            }
        }
        return count;
    }

    std::uint64_t calculateSeed(const Gen5StaticPackedRequest &request, const Date &date,
                                std::uint32_t secondsSinceMidnight, std::uint32_t buttonMask, std::uint32_t timer0)
    {
        std::array<std::uint32_t, 80> words = {};
        const auto nazos = nazoValues(request.language, request.version, request.dsType);
        for (std::size_t index = 0; index < nazos.size(); index++) words[index] = nazos[index];
        words[5] = std::byteswap((request.vcount << 16) | timer0);
        const std::uint64_t mac = (static_cast<std::uint64_t>(request.macHigh) << 32) | request.macLow;
        words[6] = static_cast<std::uint32_t>(mac & 0xffffU);
        words[7]
            = static_cast<std::uint32_t>((mac >> 16) ^ (static_cast<std::uint64_t>(request.vframe) << 24) ^ request.gxstat);
        words[8] = (bcd(date.year % 100) << 24) | (bcd(date.month) << 16) | (bcd(date.day) << 8) | weekday(date);
        const std::uint32_t hour = secondsSinceMidnight / 3600;
        const std::uint32_t minute = (secondsSinceMidnight % 3600) / 60;
        const std::uint32_t second = secondsSinceMidnight % 60;
        words[9] = (bcd(hour) << 24) | (bcd(minute) << 16) | (bcd(second) << 8);
        if (hour >= 12) words[9] |= 0x40000000U;
        if (secondsSinceMidnight >= 43200 && request.dsType == 2) words[9] ^= 0x40000000U;
        words[12] = keypressValue(buttonMask);
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
        return nextBw(seed);
    }

    bool isShiny(std::uint32_t pid, std::uint16_t tsv)
    {
        const std::uint16_t psv = static_cast<std::uint16_t>((pid >> 16) ^ (pid & 0xffffU));
        return (tsv ^ psv) < 8;
    }

    std::uint8_t shinyValue(std::uint32_t pid, std::uint16_t tsv)
    {
        const std::uint16_t psv = static_cast<std::uint16_t>((pid >> 16) ^ (pid & 0xffffU));
        if (tsv == psv) return 2;
        if ((tsv ^ psv) < 8) return 1;
        return 0;
    }

    std::uint32_t createPid(const Gen5StaticPackedRequest &request, std::uint16_t tsv, std::uint8_t gender,
                            bool wild, std::uint64_t &rng)
    {
        std::uint32_t pid = nextBwUInt(rng);
        if (gender < 2)
        {
            std::uint8_t low = 8;
            if (request.personalGender > 0 && request.personalGender < 254)
                low = gender == 0 ? static_cast<std::uint8_t>(request.personalGender)
                                  : static_cast<std::uint8_t>(request.personalGender - 1);
            if (gender == 0)
                low = static_cast<std::uint8_t>(nextBwUInt(rng, 0xfe - low) + low);
            else
                low = static_cast<std::uint8_t>(nextBwUInt(rng, low) + 1);
            pid = (pid & 0xffffff00U) | low;
        }

        if (request.shinyLock == 2)
        {
            const std::uint32_t low = pid & 0xffU;
            pid = ((low ^ tsv) << 16) | low;
        }
        else if (request.shinyLock == 1 && isShiny(pid, tsv))
        {
            pid ^= 0x10000000U;
        }

        if (((pid >> 16) & 1U) != request.templateAbility) pid ^= 0x10000U;

        // Preserve the precedence bug in PokeFinder's Gen 5 wild PID routine.
        if (wild && request.shinyLock == 0)
        {
            if (((tsv ^ pid) & 1U) != 0)
                pid |= 0x80000000U;
            else
                pid &= 0x7fffffffU;
        }
        return pid;
    }

    std::uint8_t genderValue(std::uint32_t pid, std::uint32_t ratio)
    {
        if (ratio == 255) return 2;
        if (ratio == 254) return 1;
        if (ratio == 0) return 0;
        return (pid & 0xffU) < ratio ? 1 : 0;
    }

    std::pair<std::uint8_t, std::uint8_t> hiddenPower(const std::array<std::uint8_t, 6> &ivs)
    {
        constexpr std::array<std::uint8_t, 6> order = { 0, 1, 2, 5, 3, 4 };
        std::uint8_t type = 0;
        std::uint8_t power = 0;
        for (std::uint8_t index = 0; index < order.size(); index++)
        {
            type |= (ivs[order[index]] & 1U) << index;
            power |= ((ivs[order[index]] >> 1) & 1U) << index;
        }
        return { static_cast<std::uint8_t>(type * 15 / 63), static_cast<std::uint8_t>(30 + power * 40 / 63) };
    }

    bool ivMatches(const Gen5StaticPackedRequest &request, const std::array<std::uint8_t, 6> &ivs,
                   std::uint8_t hiddenPowerType)
    {
        if (request.filtersDisabled != 0) return true;
        for (std::size_t index = 0; index < ivs.size(); index++)
            if (ivs[index] < request.ivMin[index] || ivs[index] > request.ivMax[index]) return false;
        return (request.hiddenPowerMask & (1U << hiddenPowerType)) != 0;
    }

    bool stateMatches(const Gen5StaticPackedRequest &request, std::uint8_t ability, std::uint8_t gender,
                      std::uint8_t nature, std::uint8_t shiny)
    {
        if (request.filtersDisabled != 0) return true;
        return (request.abilityFilter == 255 || request.abilityFilter == ability)
            && (request.genderFilter == 255 || request.genderFilter == gender)
            && (request.shinyFilter == 255 || (request.shinyFilter & shiny) != 0)
            && (request.natureMask & (1U << nature)) != 0;
    }

    std::uint8_t generateIv(MT &rng)
    {
        return static_cast<std::uint8_t>(rng.next() >> 27);
    }

    std::array<std::uint8_t, 6> readIvs(RNGList<std::uint8_t, MT, 8, generateIv> &rng, bool roamer)
    {
        std::array<std::uint8_t, 6> ivs;
        ivs[0] = rng.next();
        ivs[1] = rng.next();
        ivs[2] = rng.next();
        if (roamer)
        {
            ivs[4] = rng.next();
            ivs[5] = rng.next();
            ivs[3] = rng.next();
        }
        else
        {
            ivs[3] = rng.next();
            ivs[4] = rng.next();
            ivs[5] = rng.next();
        }
        return ivs;
    }

    std::array<std::uint8_t, 6> cachedIvs(std::uint32_t seedHigh, std::uint32_t advances, bool roamer)
    {
        MT rng(seedHigh, advances);
        std::array<std::uint8_t, 6> ivs;
        ivs[0] = generateIv(rng);
        ivs[1] = generateIv(rng);
        ivs[2] = generateIv(rng);
        if (roamer)
        {
            ivs[4] = generateIv(rng);
            ivs[5] = generateIv(rng);
            ivs[3] = generateIv(rng);
        }
        else
        {
            ivs[3] = generateIv(rng);
            ivs[4] = generateIv(rng);
            ivs[5] = generateIv(rng);
        }
        return ivs;
    }

    void appendIvState(std::vector<IvState> &states, const Gen5StaticPackedRequest &request, std::uint32_t advances,
                       const std::array<std::uint8_t, 6> &ivs)
    {
        const auto [type, power] = hiddenPower(ivs);
        if (ivMatches(request, ivs, type)) states.push_back({ advances, ivs, type, power });
    }

    std::vector<IvState> rawIvStates(const Gen5StaticPackedRequest &request, std::uint64_t seed)
    {
        const bool sequel = request.version >= 2;
        const bool egg = (request.flags & eggFlag) != 0;
        const bool roamer = (request.flags & roamerFlag) != 0;
        const std::uint32_t offset = (sequel ? 2U : 0U) + ((egg || roamer) ? 1U : 0U);
        RNGList<std::uint8_t, MT, 8, generateIv> rng(
            static_cast<std::uint32_t>(seed >> 32), request.initialIVAdvances + offset);
        std::vector<IvState> states;
        states.reserve(static_cast<std::size_t>(request.maxIVAdvances) + 1);
        for (std::uint64_t count = 0; count <= request.maxIVAdvances; count++, rng.advanceState())
        {
            const auto ivs = readIvs(rng, roamer);
            appendIvState(states, request, request.initialIVAdvances + static_cast<std::uint32_t>(count), ivs);
        }
        return states;
    }

    std::vector<IvState> cachedIvStates(const Gen5StaticPackedRequest &request, std::uint64_t seed)
    {
        std::vector<IvState> states;
        const auto seedHigh = static_cast<std::uint32_t>(seed >> 32);
        const auto first = std::lower_bound(ivCache.begin(), ivCache.end(), seedHigh,
                                            [](const IvCacheEntry &entry, std::uint32_t value) {
                                                return entry.seedHigh < value;
                                            });
        const auto last = std::upper_bound(first, ivCache.end(), seedHigh,
                                           [](std::uint32_t value, const IvCacheEntry &entry) {
                                               return value < entry.seedHigh;
                                           });
        states.reserve(static_cast<std::size_t>(last - first));
        const bool sequel = request.version >= 2;
        const bool roamer = (request.flags & roamerFlag) != 0;
        const std::uint64_t endAdvance = static_cast<std::uint64_t>(request.initialIVAdvances) + request.maxIVAdvances;
        for (auto entry = first; entry != last; ++entry)
        {
            if (entry->advances < request.initialIVAdvances || entry->advances > endAdvance) continue;
            // IVCache::getNormalCache uses only the BW2 +2 adjustment. This intentionally
            // preserves PokeFinder 4.3.2's fast-cache behavior for Larvesta/Happiny.
            const std::uint32_t effective = entry->advances + (roamer ? 1U : sequel ? 2U : 0U);
            appendIvState(states, request, entry->advances, cachedIvs(seedHigh, effective, roamer));
        }
        return states;
    }

    Gen5StaticPackedResult packResult(std::uint64_t seed, const Date *date, std::uint32_t seconds,
                                      std::uint32_t timer0, std::uint32_t buttons, std::uint32_t advances,
                                      const IvState &ivs, std::uint32_t pid, std::uint8_t chatot,
                                      std::uint8_t needle, std::uint8_t ability, std::uint8_t gender,
                                      std::uint8_t level, std::uint8_t nature, std::uint8_t shiny,
                                      std::uint16_t abilityIndex)
    {
        const std::uint32_t packedDate = date == nullptr ? 0 : date->year | (date->month << 16) | (date->day << 24);
        const std::uint32_t metadata = static_cast<std::uint32_t>(chatot)
            | (static_cast<std::uint32_t>(needle) << 7) | (static_cast<std::uint32_t>(ability) << 10)
            | (static_cast<std::uint32_t>(gender) << 12) | (static_cast<std::uint32_t>(level) << 14)
            | (static_cast<std::uint32_t>(nature) << 21) | (static_cast<std::uint32_t>(shiny) << 26);
        return {
            static_cast<std::uint32_t>(seed),
            static_cast<std::uint32_t>(seed >> 32),
            packedDate,
            date == nullptr ? 0 : seconds,
            date == nullptr ? 0 : timer0 | (buttons << 16),
            advances,
            ivs.advances,
            pid,
            metadata,
            static_cast<std::uint32_t>(ivs.values[0]) | (static_cast<std::uint32_t>(ivs.values[1]) << 8)
                | (static_cast<std::uint32_t>(ivs.values[2]) << 16) | (static_cast<std::uint32_t>(ivs.values[3]) << 24),
            static_cast<std::uint32_t>(ivs.values[4]) | (static_cast<std::uint32_t>(ivs.values[5]) << 8)
                | (static_cast<std::uint32_t>(ivs.hiddenPower) << 16)
                | (static_cast<std::uint32_t>(ivs.hiddenPowerStrength) << 24),
            abilityIndex,
        };
    }

    std::uint8_t percentRand(std::uint64_t &rng, bool bw)
    {
        return bw ? static_cast<std::uint8_t>(nextBwUInt(rng, 0xffff) / 656)
                  : static_cast<std::uint8_t>(nextBwUInt(rng, 100));
    }

    template <typename Emit>
    bool generateStates(const Gen5StaticPackedRequest &request, std::uint64_t seed, std::uint32_t frameStart,
                        std::uint32_t frameCount, const std::vector<IvState> &ivs, Emit emit,
                        std::uint32_t *framesProcessed = nullptr)
    {
        const bool bw = request.version < 2;
        const bool wild = (request.flags & wildFlag) != 0;
        const bool egg = (request.flags & eggFlag) != 0;
        const bool roamer = (request.flags & roamerFlag) != 0;
        std::uint16_t tsv = static_cast<std::uint16_t>(request.tid ^ request.sid);
        if ((request.flags & curtisFlag) != 0) tsv = 54118;
        // StaticTemplate5::getYancy() returns curtis in 4.3.2, so Yancy keeps the profile TSV.

        const std::uint32_t bootAdvances = initialAdvances(seed, !bw, request.memoryLink != 0);
        std::uint64_t rng = seed;
        jumpBw(rng, bootAdvances + request.initialAdvances + frameStart);
        const auto offsetJump = bwJump(request.offset);

        for (std::uint32_t count = 0; count < frameCount; count++)
        {
            std::uint64_t go = rng;
            applyJump(go, offsetJump);
            std::uint32_t pid;
            std::uint8_t nature;
            std::uint8_t ability;
            std::uint8_t gender;
            std::uint8_t shiny;

            if (wild)
            {
                bool cuteCharm = false;
                bool synchronize = false;
                if ((request.lead == 25 || request.lead == 26) && percentRand(go, bw) < 67)
                {
                    cuteCharm = true;
                }
                else
                {
                    const bool activated = percentRand(go, bw) >= 50;
                    if (request.lead <= 24) synchronize = activated;
                }

                std::uint8_t forcedGender = 255;
                const bool fixedGender
                    = request.personalGender == 0 || request.personalGender == 254 || request.personalGender == 255;
                if (!fixedGender)
                {
                    forcedGender = static_cast<std::uint8_t>(request.templateGender);
                    if (cuteCharm && forcedGender == 255)
                        forcedGender = request.lead == 25 ? 0 : 1;
                }

                std::uint8_t shinyRolls = 1;
                if (!bw)
                {
                    if (request.shinyCharm != 0) shinyRolls += 2;
                    if (request.luckyPower == 3) shinyRolls++;
                }
                for (std::uint8_t roll = 0; roll < shinyRolls; roll++)
                {
                    pid = createPid(request, tsv, forcedGender, true, go);
                    if (isShiny(pid, tsv)) break;
                }
                ability = request.templateAbility == 2 ? 2 : static_cast<std::uint8_t>((pid >> 16) & 1U);
                gender = genderValue(pid, request.personalGender);
                shiny = shinyValue(pid, tsv);
                nature = static_cast<std::uint8_t>(nextBwUInt(go, 25));
                if (synchronize) nature = static_cast<std::uint8_t>(request.lead);
            }
            else
            {
                if (egg)
                {
                    pid = nextBwUInt(go);
                    nextBwUInt(go);
                }
                else if (roamer)
                {
                    pid = nextBwUInt(go);
                }
                else
                {
                    pid = createPid(request, tsv, static_cast<std::uint8_t>(request.templateGender), false, go);
                }
                ability = request.templateAbility == 2 ? 2 : static_cast<std::uint8_t>((pid >> 16) & 1U);
                gender = genderValue(pid, request.personalGender);
                shiny = shinyValue(pid, tsv);
                nature = static_cast<std::uint8_t>(nextBwUInt(go, 25));
            }

            const std::uint32_t prng = nextBwUInt(rng);
            const std::uint8_t chatot
                = static_cast<std::uint8_t>(((static_cast<std::uint64_t>(prng) * 0x1fffU) >> 32) / 82);
            const std::uint8_t needle = static_cast<std::uint8_t>((static_cast<std::uint64_t>(prng) * 8) >> 32);
            const std::uint32_t advances = bootAdvances + request.initialAdvances + frameStart + count;
            if (stateMatches(request, ability, gender, nature, shiny))
            {
                const auto abilityIndex = static_cast<std::uint16_t>(request.abilities[ability]);
                for (const auto &iv : ivs)
                {
                    if (emit(advances, iv, pid, chatot, needle, ability, gender, nature, shiny, abilityIndex))
                    {
                        if (framesProcessed != nullptr) (*framesProcessed)++;
                        return true;
                    }
                }
            }
            if (framesProcessed != nullptr) (*framesProcessed)++;
        }
        return false;
    }

    bool validOptionalChoice(std::uint32_t value)
    {
        return value <= 2 || value == 255;
    }

    bool validFilterChoice(std::uint32_t value)
    {
        return value <= 1 || value == 255;
    }

    bool validShinyFilter(std::uint32_t value)
    {
        return value == 1 || value == 2 || value == 3 || value == 255;
    }

    bool validateRequest(const Gen5StaticPackedRequest &request)
    {
        const Date start = { request.startYear, request.startMonth, request.startDay };
        const Date end = { request.endYear, request.endMonth, request.endDay };
        if (request.operation > 1 || request.version > 3 || request.language > 6 || request.dsType > 2
            || request.macHigh > 0xffff || request.vcount > 0xff || request.timer0Min > 0xffff
            || request.timer0Max > 0xffff || request.timer0Min > request.timer0Max || request.gxstat > 99
            || request.vframe > 99 || request.keypressCountMask == 0 || request.keypressCountMask > 0x1ff
            || request.skipLR > 1 || request.memoryLink > 1 || request.shinyCharm > 1
            || request.tid > 0xffff || request.sid > 0xffff
            || request.maxAdvances > std::numeric_limits<std::uint32_t>::max() - request.initialAdvances
            || request.offset > std::numeric_limits<std::uint32_t>::max() - request.initialAdvances - request.maxAdvances
            || request.maxIVAdvances > std::numeric_limits<std::uint32_t>::max() - request.initialIVAdvances
            || !((request.lead <= 26) || request.lead == 255) || !(request.luckyPower == 0 || request.luckyPower == 3)
            || request.level == 0 || request.level > 100 || request.shinyLock > 2
            || !validOptionalChoice(request.templateAbility) || !validOptionalChoice(request.templateGender)
            || request.personalGender > 255 || request.abilities[0] == 0 || request.abilities[0] > 0xffff
            || request.abilities[1] == 0 || request.abilities[1] > 0xffff || request.abilities[2] == 0
            || request.abilities[2] > 0xffff || request.flags > (wildFlag | eggFlag | roamerFlag | curtisFlag | yancyFlag)
            || request.filtersDisabled > 1 || !validFilterChoice(request.abilityFilter)
            || !validFilterChoice(request.genderFilter) || !validShinyFilter(request.shinyFilter)
            || request.natureMask == 0 || request.natureMask > 0x1ffffffU || request.hiddenPowerMask == 0
            || request.hiddenPowerMask > 0xffffU || request.resultLimit == 0 || request.resultLimit > maximumResults
            || request.chunkCount == 0)
            return false;
        for (std::size_t index = 0; index < 6; index++)
            if (request.ivMin[index] > request.ivMax[index] || request.ivMax[index] > 31) return false;
        if (((request.flags & eggFlag) != 0 && (request.flags & roamerFlag) != 0)
            || ((request.flags & curtisFlag) != 0 && (request.flags & yancyFlag) != 0))
            return false;
        const auto buttons = keypresses(request);
        if (buttons.empty()) return false;
        if (request.operation == static_cast<std::uint32_t>(Operation::Generator))
            return request.maxIVAdvances == 0;
        return request.filtersDisabled == 0 && request.offset == 0 && validDate(start) && validDate(end)
            && serialDate(start) <= serialDate(end);
    }

    bool multiplyWithin(std::uint64_t left, std::uint64_t right, std::uint64_t maximum, std::uint64_t &result)
    {
        if (left != 0 && right > maximum / left) return false;
        result = left * right;
        return result <= maximum;
    }

    std::uint64_t rawSearcherUnits(const Gen5StaticPackedRequest &request, std::uint64_t keypressCount)
    {
        const Date start = { request.startYear, request.startMonth, request.startDay };
        const Date end = { request.endYear, request.endMonth, request.endDay };
        const std::uint64_t days = serialDate(end) - serialDate(start) + 1;
        const std::uint64_t timer0 = request.timer0Max - request.timer0Min + 1;
        return days * timer0 * keypressCount * 86400;
    }

    std::uint64_t taskUnits(const Gen5StaticPackedRequest &request, std::uint64_t keypressCount)
    {
        if (request.operation == static_cast<std::uint32_t>(Operation::Generator))
            return static_cast<std::uint64_t>(request.maxAdvances) + 1;
        if (!shaCache.empty()) return shaCache.size();
        return rawSearcherUnits(request, keypressCount);
    }

    bool evaluationRangeAllowed(const Gen5StaticPackedRequest &request, std::uint64_t keypressCount)
    {
        if (request.operation == static_cast<std::uint32_t>(Operation::Generator))
            return static_cast<std::uint64_t>(request.maxAdvances) + 1 <= maximumEvaluations;

        const std::uint64_t ivCount = static_cast<std::uint64_t>(request.maxIVAdvances) + 1;
        const std::uint64_t pidCount = static_cast<std::uint64_t>(request.maxAdvances) + 1;
        if (!shaCache.empty())
        {
            std::uint64_t total;
            return multiplyWithin(shaCache.size(), pidCount, maximumEvaluations, total);
        }

        const std::uint64_t rawSeeds = rawSearcherUnits(request, keypressCount);
        if (ivCache.empty())
        {
            std::uint64_t ivEvaluations;
            if (!multiplyWithin(rawSeeds, ivCount, maximumEvaluations, ivEvaluations)) return false;
            std::uint64_t total;
            return multiplyWithin(ivEvaluations, pidCount + 1, maximumEvaluations, total);
        }

        constexpr std::uint64_t mtSeedSpace = std::uint64_t { 1 } << 32;
        const std::uint64_t cacheSize = ivCache.size();
        std::uint64_t wholeMatches;
        if (!multiplyWithin(rawSeeds / mtSeedSpace, cacheSize, maximumEvaluations, wholeMatches)) return false;

        std::uint64_t remainderProduct;
        if (!multiplyWithin(rawSeeds % mtSeedSpace, cacheSize, std::numeric_limits<std::uint64_t>::max(),
                            remainderProduct))
            return false;
        const std::uint64_t partialMatches
            = remainderProduct / mtSeedSpace + static_cast<std::uint64_t>(remainderProduct % mtSeedSpace != 0);
        if (wholeMatches > maximumEvaluations - partialMatches) return false;

        const std::uint64_t matchingSeeds = wholeMatches + partialMatches;
        std::uint64_t pidEvaluations;
        if (!multiplyWithin(matchingSeeds, pidCount, maximumEvaluations, pidEvaluations)) return false;
        return rawSeeds <= maximumEvaluations - pidEvaluations;
    }

    bool appendResult(const Gen5StaticPackedRequest &request, std::uint64_t seed, const Date *date,
                      std::uint32_t seconds, std::uint32_t timer0, std::uint32_t buttons, std::uint32_t advances,
                      const IvState &ivs, std::uint32_t pid, std::uint8_t chatot, std::uint8_t needle,
                      std::uint8_t ability, std::uint8_t gender, std::uint8_t nature, std::uint8_t shiny,
                      std::uint16_t abilityIndex)
    {
        results.emplace_back(packResult(seed, date, seconds, timer0, buttons, advances, ivs, pid, chatot, needle,
                                        ability, gender, static_cast<std::uint8_t>(request.level), nature, shiny,
                                        abilityIndex));
        if (results.size() < request.resultLimit) return false;
        resultLimitReached = true;
        return true;
    }

    bool searchSeed(const Gen5StaticPackedRequest &request, std::uint64_t seed, const Date *date,
                    std::uint32_t seconds, std::uint32_t timer0, std::uint32_t buttons)
    {
        const auto ivs = ivCache.empty() ? rawIvStates(request, seed) : cachedIvStates(request, seed);
        if (ivs.empty()) return false;
        return generateStates(
            request, seed, 0, request.maxAdvances + 1, ivs,
            [&](std::uint32_t advances, const IvState &iv, std::uint32_t pid, std::uint8_t chatot,
                std::uint8_t needle, std::uint8_t ability, std::uint8_t gender, std::uint8_t nature,
                std::uint8_t shiny, std::uint16_t abilityIndex) {
                return appendResult(request, seed, date, seconds, timer0, buttons, advances, iv, pid, chatot,
                                    needle, ability, gender, nature, shiny, abilityIndex);
            });
    }
}

static_assert(sizeof(Gen5StaticPackedRequest) == 62 * sizeof(std::uint32_t));
static_assert(sizeof(Gen5StaticPackedResult) == 12 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen5static_api_version()
    {
        return apiVersion;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5static_configure_cache(
        const std::uint32_t *ivEntries, std::uint32_t ivEntryCount,
        const std::uint32_t *shaEntries, std::uint32_t shaEntryCount)
    {
        lastError = ErrorCode::None;
        if (ivEntries == nullptr || ivEntryCount == 0 || ivEntryCount > maximumCacheEntries
            || shaEntryCount > maximumCacheEntries || (shaEntryCount != 0 && shaEntries == nullptr))
        {
            lastError = ErrorCode::InvalidCache;
            return 0;
        }

        std::vector<IvCacheEntry> nextIvCache;
        nextIvCache.reserve(ivEntryCount);
        for (std::uint32_t index = 0; index < ivEntryCount; index++)
            nextIvCache.push_back({ ivEntries[index * 2], ivEntries[index * 2 + 1] });
        std::ranges::sort(nextIvCache, [](const IvCacheEntry &left, const IvCacheEntry &right) {
            return left.seedHigh < right.seedHigh
                || (left.seedHigh == right.seedHigh && left.advances < right.advances);
        });
        nextIvCache.erase(std::unique(nextIvCache.begin(), nextIvCache.end(),
                                      [](const IvCacheEntry &left, const IvCacheEntry &right) {
                                          return left.seedHigh == right.seedHigh && left.advances == right.advances;
                                      }),
                          nextIvCache.end());

        std::vector<ShaCacheEntry> nextShaCache;
        nextShaCache.reserve(shaEntryCount);
        for (std::uint32_t index = 0; index < shaEntryCount; index++)
        {
            const std::size_t offset = static_cast<std::size_t>(index) * 4;
            nextShaCache.push_back({ shaEntries[offset], shaEntries[offset + 1],
                                     (static_cast<std::uint64_t>(shaEntries[offset + 3]) << 32)
                                         | shaEntries[offset + 2] });
        }

        ivCache = std::move(nextIvCache);
        shaCache = std::move(nextShaCache);
        return 1;
    }

    POKERNGKIT_KEEPALIVE void gen5static_clear_cache()
    {
        ivCache.clear();
        ivCache.shrink_to_fit();
        shaCache.clear();
        shaCache.shrink_to_fit();
        lastError = ErrorCode::None;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5static_search(const Gen5StaticPackedRequest *request)
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

        const auto buttons = keypresses(*request);
        const std::uint64_t units = taskUnits(*request, buttons.size());
        if (units == 0 || !evaluationRangeAllowed(*request, buttons.size()))
        {
            lastError = ErrorCode::RangeTooLarge;
            return 0;
        }
        const std::uint64_t chunkEnd = static_cast<std::uint64_t>(request->chunkStart) + request->chunkCount;
        if (request->chunkStart >= units || chunkEnd > units)
        {
            lastError = ErrorCode::InvalidChunk;
            return 0;
        }
        results.reserve(request->resultLimit);

        if (request->operation == static_cast<std::uint32_t>(Operation::Generator))
        {
            const std::uint64_t seed = (static_cast<std::uint64_t>(request->seedHigh) << 32) | request->seedLow;
            const auto ivs = rawIvStates(*request, seed);
            generateStates(
                *request, seed, request->chunkStart, request->chunkCount, ivs,
                [&](std::uint32_t advances, const IvState &iv, std::uint32_t pid, std::uint8_t chatot,
                    std::uint8_t needle, std::uint8_t ability, std::uint8_t gender, std::uint8_t nature,
                    std::uint8_t shiny, std::uint16_t abilityIndex) {
                    return appendResult(*request, seed, nullptr, 0, 0, 0, advances, iv, pid, chatot, needle,
                                        ability, gender, nature, shiny, abilityIndex);
                },
                &processedCount);
            return static_cast<std::uint32_t>(results.size());
        }

        const Date start = { request->startYear, request->startMonth, request->startDay };
        const Date end = { request->endYear, request->endMonth, request->endDay };
        const std::uint32_t startSerial = serialDate(start);
        const std::uint32_t endSerial = serialDate(end);

        if (!shaCache.empty())
        {
            for (std::uint64_t offset = 0; offset < request->chunkCount; offset++)
            {
                const auto &entry = shaCache[static_cast<std::size_t>(request->chunkStart) + offset];
                const std::uint32_t buttonMask = entry.keyLow & 0xfffU;
                const std::uint32_t seconds = entry.keyLow >> 12;
                const std::uint32_t dateSerial = entry.keyHigh & 0xffffU;
                const std::uint32_t timer0 = entry.keyHigh >> 16;
                bool stopped = false;
                if (seconds < 86400 && dateSerial >= startSerial && dateSerial <= endSerial
                    && timer0 >= request->timer0Min && timer0 <= request->timer0Max
                    && std::ranges::binary_search(buttons, buttonMask))
                {
                    const Date date = dateFromSerial(dateSerial);
                    stopped = searchSeed(*request, entry.seed, &date, seconds, timer0, buttonMask);
                }
                processedCount++;
                if (stopped) return static_cast<std::uint32_t>(results.size());
            }
            return static_cast<std::uint32_t>(results.size());
        }

        const std::uint64_t dateCount = endSerial - startSerial + 1;
        const std::uint64_t keypressCount = buttons.size();
        for (std::uint64_t offset = 0; offset < request->chunkCount; offset++)
        {
            std::uint64_t remaining = static_cast<std::uint64_t>(request->chunkStart) + offset;
            const auto seconds = static_cast<std::uint32_t>(remaining % 86400);
            remaining /= 86400;
            const auto buttonMask = buttons[remaining % keypressCount];
            remaining /= keypressCount;
            const auto date = dateFromSerial(startSerial + static_cast<std::uint32_t>(remaining % dateCount));
            remaining /= dateCount;
            const auto timer0 = request->timer0Min + static_cast<std::uint32_t>(remaining);
            const auto seed = calculateSeed(*request, date, seconds, buttonMask, timer0);
            const bool stopped = searchSeed(*request, seed, &date, seconds, timer0, buttonMask);
            processedCount++;
            if (stopped) return static_cast<std::uint32_t>(results.size());
        }
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen5static_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5static_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5static_processed_count()
    {
        return processedCount;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5static_limit_reached()
    {
        return resultLimitReached ? 1U : 0U;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5static_last_error()
    {
        return lastError;
    }

#ifndef __EMSCRIPTEN__
    std::uint32_t gen5static_test_generate(
        const Gen5StaticPackedRequest *request, Gen5StaticPackedResult *output, std::uint32_t capacity)
    {
        if (request == nullptr || output == nullptr || capacity == 0) return 0;
        auto copy = *request;
        copy.operation = static_cast<std::uint32_t>(Operation::Generator);
        copy.maxAdvances = std::min(copy.maxAdvances, capacity - 1);
        copy.resultLimit = std::min(copy.resultLimit, capacity);
        copy.chunkStart = 0;
        copy.chunkCount = copy.maxAdvances + 1;
        const auto count = gen5static_search(&copy);
        for (std::uint32_t index = 0; index < count; index++) output[index] = results[index];
        return count;
    }

    std::uint64_t gen5static_test_seed(
        const Gen5StaticPackedRequest *request, std::uint32_t second, std::uint32_t buttonMask, std::uint32_t timer0)
    {
        if (request == nullptr || second > 86399 || buttonMask > 0xfff || timer0 > 0xffff) return 0;
        const Date date = { request->startYear, request->startMonth, request->startDay };
        if (!validDate(date)) return 0;
        return calculateSeed(*request, date, second, buttonMask, timer0);
    }
#endif
}
