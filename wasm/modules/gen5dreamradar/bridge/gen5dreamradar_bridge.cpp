/*
 * PokeRNGKit Gen V Dream Radar WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 DreamRadarGenerator, Searcher5,
 * SHA1, Nazos, Keypresses and Utilities5 by Admiral_Fish, bumba, and
 * EzPzStreamz (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen5dreamradar_bridge.h"

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
    constexpr std::uint64_t maximumEvaluations = 250000000;
    constexpr std::uint64_t bwMultiplier = 0x5d588b656c078965ULL;
    constexpr std::uint64_t bwAdd = 0x269ec3ULL;
    constexpr std::array<std::uint8_t, 9> levelTable = { 5, 10, 10, 20, 20, 30, 30, 40, 40 };

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
        AdvanceOverflow = 4,
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
    };

    struct Encounter
    {
        std::uint16_t species;
        std::uint8_t ability;
        std::uint8_t templateGender;
        std::uint8_t personalGender;
        std::array<std::uint16_t, 3> abilities;
        bool genie;
        bool legend;
    };

    constexpr std::array<Encounter, 26> encounters = { {
        { 79, 2, 255, 127, { 12, 20, 144 }, false, false },
        { 120, 2, 255, 255, { 35, 30, 148 }, false, false },
        { 137, 2, 255, 255, { 36, 88, 148 }, false, false },
        { 163, 2, 255, 127, { 15, 51, 110 }, false, false },
        { 174, 2, 255, 191, { 56, 56, 132 }, false, false },
        { 175, 2, 255, 31, { 55, 32, 105 }, false, false },
        { 213, 2, 255, 127, { 5, 82, 126 }, false, false },
        { 238, 2, 255, 254, { 12, 108, 93 }, false, false },
        { 249, 2, 0, 255, { 46, 46, 136 }, false, true },
        { 250, 2, 0, 255, { 46, 46, 144 }, false, true },
        { 280, 2, 255, 127, { 28, 36, 140 }, false, false },
        { 333, 2, 255, 127, { 30, 30, 13 }, false, false },
        { 374, 2, 255, 255, { 29, 29, 135 }, false, false },
        { 425, 2, 255, 127, { 106, 84, 138 }, false, false },
        { 436, 2, 255, 255, { 26, 85, 134 }, false, false },
        { 442, 2, 255, 127, { 46, 46, 151 }, false, false },
        { 447, 2, 255, 31, { 80, 39, 158 }, false, false },
        { 479, 255, 255, 255, { 26, 26, 26 }, false, false },
        { 483, 2, 0, 255, { 46, 46, 140 }, false, true },
        { 484, 2, 0, 255, { 46, 46, 140 }, false, true },
        { 487, 2, 0, 255, { 46, 46, 140 }, false, true },
        { 517, 2, 255, 127, { 108, 28, 140 }, false, false },
        { 561, 2, 255, 127, { 147, 98, 110 }, false, false },
        { 641, 2, 0, 0, { 144, 144, 144 }, true, true },
        { 642, 2, 0, 0, { 10, 10, 10 }, true, true },
        { 645, 2, 0, 0, { 22, 22, 22 }, true, true },
    } };

    thread_local std::vector<Gen5DreamRadarPackedResult> results;
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
        switch (language)
        {
        case 0:
            return version == 2 ? NazoInput { dsi ? 0x027a5f70U : 0x02200010U, 0x0209aee8U, 0x02039de9U }
                                : NazoInput { dsi ? 0x027a5e90U : 0x02200050U, 0x0209af28U, 0x02039e15U };
        case 1:
            return version == 2 ? NazoInput { dsi ? 0x027a6070U : 0x021fffd0U, 0x0209aea8U, 0x02039db9U }
                                : NazoInput { dsi ? 0x027a5fb0U : 0x021ffff0U, 0x0209aec8U, 0x02039de5U };
        case 2:
            return version == 2 ? NazoInput { dsi ? 0x027a5f90U : 0x02200030U, 0x0209af08U, 0x02039df9U }
                                : NazoInput { dsi ? 0x027a5ef0U : 0x02200050U, 0x0209af28U, 0x02039e25U };
        case 3:
            return version == 2 ? NazoInput { dsi ? 0x027a5f70U : 0x021fff10U, 0x0209ade8U, 0x02039d69U }
                                : NazoInput { dsi ? 0x027a5ed0U : 0x021fff50U, 0x0209ae28U, 0x02039d95U };
        case 4:
            return version == 2 ? NazoInput { dsi ? 0x027a6110U : 0x021fff50U, 0x0209ae28U, 0x02039d69U }
                                : NazoInput { dsi ? 0x027a6010U : 0x021fff70U, 0x0209ae48U, 0x02039d95U };
        case 5:
            return version == 2 ? NazoInput { dsi ? 0x027aa730U : 0x021ff9b0U, 0x0209a8dcU, 0x02039ac9U }
                                : NazoInput { dsi ? 0x027aa5f0U : 0x021ff9d0U, 0x0209a8fcU, 0x02039af5U };
        default:
            return version == 2 ? NazoInput { dsi ? 0x02200770U : 0x02200750U, 0x0209b60cU, 0x0203a4d5U }
                                : NazoInput { dsi ? 0x027a57b0U : 0x02200770U, 0x0209b62cU, 0x0203a501U };
        }
    }

    std::array<std::uint32_t, 5> nazoValues(std::uint32_t language, std::uint32_t version, std::uint32_t dsType)
    {
        const auto input = nazoInput(language, version, dsType != 0);
        return { std::byteswap(input.zero), std::byteswap(input.one), std::byteswap(input.base),
                 std::byteswap(input.base + 0x54), std::byteswap(input.base + 0x54) };
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

    std::vector<std::uint32_t> keypresses(const Gen5DreamRadarPackedRequest &request)
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

    std::uint32_t nextBw(std::uint64_t &seed, std::uint32_t maximum)
    {
        return static_cast<std::uint32_t>(((nextBw(seed) >> 32) * maximum) >> 32);
    }

    void advanceBw(std::uint64_t &seed, std::uint32_t advances)
    {
        while (advances-- != 0) nextBw(seed);
    }

    std::uint32_t probabilityTable(std::uint64_t &seed)
    {
        std::uint32_t count = 1;
        advanceBw(seed, 1);
        count++;
        if (nextBw(seed, 101) > 50)
        {
            advanceBw(seed, 1);
            count++;
        }
        count++;
        if (nextBw(seed, 101) > 30)
        {
            advanceBw(seed, 1);
            count++;
        }
        count++;
        if (nextBw(seed, 101) > 25)
        {
            count++;
            if (nextBw(seed, 101) > 30)
            {
                advanceBw(seed, 1);
                count++;
            }
        }
        count++;
        if (nextBw(seed, 101) > 20)
        {
            count++;
            if (nextBw(seed, 101) > 25)
            {
                count++;
                if (nextBw(seed, 101) > 33)
                {
                    advanceBw(seed, 1);
                    count++;
                }
            }
        }
        return count;
    }

    std::uint32_t initialAdvancesBW2(std::uint64_t seed, bool memoryLink)
    {
        std::uint32_t count = 0;
        for (std::uint32_t index = 0; index < 5; index++)
        {
            count += probabilityTable(seed);
            if (index == 0)
            {
                const std::uint32_t extra = memoryLink ? 2U : 3U;
                count += extra;
                advanceBw(seed, extra);
            }
        }
        for (std::uint32_t limit = 0; limit < 100; limit++)
        {
            count += 3;
            const auto one = nextBw(seed, 15);
            const auto two = nextBw(seed, 15);
            const auto three = nextBw(seed, 15);
            if (one != two && one != three && two != three) break;
        }
        return count;
    }

    std::uint64_t calculateSeed(const Gen5DreamRadarPackedRequest &request, const Date &date,
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

    std::uint32_t createPid(std::uint16_t tsv, std::uint8_t gender, std::uint8_t ratio, std::uint64_t &rng)
    {
        std::uint32_t pid = static_cast<std::uint32_t>(nextBw(rng) >> 32);
        if (gender < 2)
        {
            std::uint8_t low = 8;
            if (ratio > 0 && ratio < 254) low = gender == 0 ? ratio : static_cast<std::uint8_t>(ratio - 1);
            if (gender == 0) low = static_cast<std::uint8_t>(nextBw(rng, 0xfe - low) + low);
            else low = static_cast<std::uint8_t>(nextBw(rng, low) + 1);
            pid = (pid & 0xffffff00U) | low;
        }
        if ((tsv ^ static_cast<std::uint16_t>((pid >> 16) ^ (pid & 0xffffU))) < 8) pid ^= 0x10000000U;
        // PokeFinder's createPID compares bit 16 directly with the argument 2,
        // so the Dream Radar call always toggles this bit.
        if (((pid >> 16) & 1U) != 2U) pid ^= 0x10000U;
        return pid;
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

    bool matches(const Gen5DreamRadarPackedRequest &request, const std::array<std::uint8_t, 6> &ivs,
                 std::uint8_t nature, std::uint8_t hiddenPowerType)
    {
        if (request.filtersDisabled != 0) return true;
        for (std::size_t index = 0; index < ivs.size(); index++)
            if (ivs[index] < request.ivMin[index] || ivs[index] > request.ivMax[index]) return false;
        return (request.natureMask & (1U << nature)) != 0 && (request.hiddenPowerMask & (1U << hiddenPowerType)) != 0;
    }

    std::uint8_t generateIv(MT &rng)
    {
        return static_cast<std::uint8_t>(rng.next() >> 27);
    }

    template <typename Emit>
    bool generate(const Gen5DreamRadarPackedRequest &request, std::uint64_t seed, std::uint32_t frameOffset,
                  std::uint32_t frameCount, std::uint32_t &evaluated, Emit emit)
    {
        std::uint8_t pidAdvances = 0;
        std::uint8_t ivAdvances = 0;
        for (std::uint32_t index = 0; index < request.slotCount; index++)
        {
            const auto &slot = encounters[request.encounters[index]];
            if (slot.genie)
            {
                pidAdvances += 5;
                ivAdvances += 13;
            }
            if (index + 1 != request.slotCount)
            {
                pidAdvances += slot.legend || slot.personalGender != 255 ? 5 : 4;
                ivAdvances += 13;
            }
        }
        const auto &target = encounters[request.encounters[request.slotCount - 1]];
        const auto selectedGender = static_cast<std::uint8_t>(request.genders[request.slotCount - 1]);
        const std::uint8_t targetGender
            = target.templateGender == 255 ? selectedGender : target.templateGender;
        const std::uint8_t displayGender = target.legend && !target.genie ? 2 : targetGender;
        const std::uint16_t tsv = static_cast<std::uint16_t>((request.tid ^ request.sid) >> 3);
        const std::uint32_t initial = request.initialAdvances + frameOffset;
        const std::uint32_t doubled = initial * 2;

        std::uint64_t rng = seed;
        advanceBw(rng, doubled + initialAdvancesBW2(seed, request.memoryLink != 0));
        if (request.memoryLink == 0) nextBw(rng);
        RNGList<std::uint8_t, MT, 8, generateIv> ivList(
            static_cast<std::uint32_t>(seed >> 32), doubled + ivAdvances + 9);

        for (std::uint32_t count = 0; count < frameCount; count++)
        {
            std::uint64_t go = rng;
            advanceBw(go, pidAdvances);
            std::array<std::uint8_t, 6> ivs;
            for (auto &iv : ivs) iv = ivList.next();
            nextBw(go);
            const auto pid = createPid(tsv, targetGender, target.personalGender, go);
            const std::uint8_t ability = target.ability == 255 ? static_cast<std::uint8_t>((pid >> 16) & 1U) : 2;
            advanceBw(go, 2);
            const auto nature = static_cast<std::uint8_t>(nextBw(go, 25));
            const auto needle = static_cast<std::uint8_t>(nextBw(rng, 8));
            const auto [powerType, powerStrength] = hiddenPower(ivs);
            evaluated++;
            if (matches(request, ivs, nature, powerType)
                && emit(initial + count, needle, pid, ability, displayGender, nature, ivs, powerType, powerStrength,
                        target.abilities[ability]))
                return true;
            ivList.advanceStates(2);
            nextBw(rng);
        }
        return false;
    }

    Gen5DreamRadarPackedResult packResult(std::uint64_t seed, const Date *date, std::uint32_t seconds,
                                          std::uint32_t timer0, std::uint32_t buttons, std::uint32_t advances,
                                          std::uint8_t needle, std::uint32_t pid, std::uint8_t ability,
                                          std::uint8_t gender, std::uint8_t level, std::uint8_t nature,
                                          const std::array<std::uint8_t, 6> &ivs, std::uint8_t powerType,
                                          std::uint8_t powerStrength, std::uint16_t abilityIndex)
    {
        const std::uint32_t packedDate = date == nullptr ? 0 : date->year | (date->month << 16) | (date->day << 24);
        return {
            static_cast<std::uint32_t>(seed),
            static_cast<std::uint32_t>(seed >> 32),
            packedDate,
            date == nullptr ? 0 : seconds,
            date == nullptr ? 0 : timer0 | (buttons << 16),
            advances,
            pid,
            static_cast<std::uint32_t>(needle) | (static_cast<std::uint32_t>(ability) << 3)
                | (static_cast<std::uint32_t>(gender) << 5) | (static_cast<std::uint32_t>(level) << 7)
                | (static_cast<std::uint32_t>(nature) << 15),
            static_cast<std::uint32_t>(ivs[0]) | (static_cast<std::uint32_t>(ivs[1]) << 8)
                | (static_cast<std::uint32_t>(ivs[2]) << 16) | (static_cast<std::uint32_t>(ivs[3]) << 24),
            static_cast<std::uint32_t>(ivs[4]) | (static_cast<std::uint32_t>(ivs[5]) << 8)
                | (static_cast<std::uint32_t>(powerType) << 16) | (static_cast<std::uint32_t>(powerStrength) << 24),
            abilityIndex,
        };
    }

    bool genderAllowed(const Encounter &encounter, std::uint32_t gender)
    {
        if (encounter.templateGender != 255) return gender == (encounter.genie ? 0U : 2U);
        if (encounter.personalGender == 255) return gender == 2;
        if (encounter.personalGender == 254) return gender == 1;
        if (encounter.personalGender == 0) return gender == 0;
        return gender <= 1;
    }

    bool filtersAcceptAll(const Gen5DreamRadarPackedRequest &request)
    {
        if (request.filtersDisabled != 0) return true;
        for (std::size_t index = 0; index < 6; index++)
            if (request.ivMin[index] != 0 || request.ivMax[index] != 31) return false;
        return request.natureMask == 0x1ffffffU && request.hiddenPowerMask == 0xffffU;
    }

    bool validateRequest(const Gen5DreamRadarPackedRequest &request)
    {
        const Date start = { request.startYear, request.startMonth, request.startDay };
        const Date end = { request.endYear, request.endMonth, request.endDay };
        if (request.operation > 1 || request.version < 2 || request.version > 3 || request.language > 6 || request.dsType > 2
            || request.macHigh > 0xffff || request.vcount > 0xff || request.timer0Min > 0xffff
            || request.timer0Max > 0xffff || request.gxstat > 99 || request.vframe > 99 || request.keypressCountMask > 0x1ff
            || request.skipLR > 1 || request.memoryLink > 1 || request.maxAdvances > 0xffffffffU - request.initialAdvances
            || request.badges > 8 || request.resultLimit == 0 || request.resultLimit > maximumResults || request.tid > 0xffff
            || request.sid > 0xffff || request.slotCount == 0 || request.slotCount > 6 || request.filtersDisabled > 1
            || request.natureMask == 0 || request.natureMask > 0x1ffffffU || request.hiddenPowerMask == 0
            || request.hiddenPowerMask > 0xffffU || request.chunkCount == 0)
            return false;
        if (request.operation == static_cast<std::uint32_t>(Operation::Searcher)
            && (request.filtersDisabled != 0 || !validDate(start) || !validDate(end) || serialDate(start) > serialDate(end)))
            return false;
        for (std::uint32_t index = 0; index < request.slotCount; index++)
        {
            if (request.encounters[index] >= encounters.size()) return false;
            const auto &slot = encounters[request.encounters[index]];
            if ((index != 0 && slot.genie) || !genderAllowed(slot, request.genders[index])) return false;
        }
        for (std::size_t index = 0; index < 6; index++)
            if (request.ivMin[index] > request.ivMax[index] || request.ivMax[index] > 31) return false;
        return true;
    }

    std::uint64_t taskCount(const Gen5DreamRadarPackedRequest &request, std::uint64_t keypressCount)
    {
        const std::uint64_t statesPerSeed = static_cast<std::uint64_t>(request.maxAdvances) + 1;
        if (request.operation == static_cast<std::uint32_t>(Operation::Generator))
            return filtersAcceptAll(request) ? std::min<std::uint64_t>(statesPerSeed, request.resultLimit) : statesPerSeed;
        const Date start = { request.startYear, request.startMonth, request.startDay };
        const Date end = { request.endYear, request.endMonth, request.endDay };
        const std::uint64_t dateCount = serialDate(end) - serialDate(start) + 1;
        const std::uint64_t timer0Count
            = request.timer0Min > request.timer0Max ? 0U : request.timer0Max - request.timer0Min + 1;
        const std::uint64_t candidates = dateCount * timer0Count * keypressCount * 86400;
        if (!filtersAcceptAll(request)) return candidates;
        const std::uint64_t candidatesForLimit = (request.resultLimit + statesPerSeed - 1) / statesPerSeed;
        return std::min(candidates, candidatesForLimit);
    }

    std::uint64_t rawUnitCount(const Gen5DreamRadarPackedRequest &request, std::uint64_t keypressCount)
    {
        if (request.operation == static_cast<std::uint32_t>(Operation::Generator))
            return static_cast<std::uint64_t>(request.maxAdvances) + 1;
        const Date start = { request.startYear, request.startMonth, request.startDay };
        const Date end = { request.endYear, request.endMonth, request.endDay };
        const std::uint64_t dateCount = serialDate(end) - serialDate(start) + 1;
        const std::uint64_t timer0Count
            = request.timer0Min > request.timer0Max ? 0U : request.timer0Max - request.timer0Min + 1;
        return dateCount * timer0Count * keypressCount * 86400;
    }
}

static_assert(sizeof(Gen5DreamRadarPackedRequest) == 58 * sizeof(std::uint32_t));
static_assert(sizeof(Gen5DreamRadarPackedResult) == 11 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen5dreamradar_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5dreamradar_search(const Gen5DreamRadarPackedRequest *request)
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
        const std::uint64_t units = taskCount(*request, buttons.size());
        const std::uint64_t rawUnits = rawUnitCount(*request, buttons.size());
        if (units == 0) return 0;
        const std::uint64_t statesPerSeed = static_cast<std::uint64_t>(request->maxAdvances) + 1;
        if (units > maximumEvaluations
            || (request->operation == static_cast<std::uint32_t>(Operation::Searcher)
                && statesPerSeed > maximumEvaluations / units))
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

        const auto emit = [&](std::uint64_t seed, const Date *date, std::uint32_t seconds, std::uint32_t timer0,
                              std::uint32_t buttonMask, std::uint32_t advances, std::uint8_t needle, std::uint32_t pid,
                              std::uint8_t ability, std::uint8_t gender, std::uint8_t nature,
                              const std::array<std::uint8_t, 6> &ivs, std::uint8_t powerType,
                              std::uint8_t powerStrength, std::uint16_t abilityIndex) {
            results.emplace_back(packResult(seed, date, seconds, timer0, buttonMask, advances, needle, pid, ability,
                                            gender, levelTable[request->badges], nature, ivs, powerType, powerStrength,
                                            abilityIndex));
            return results.size() >= request->resultLimit;
        };

        if (request->operation == static_cast<std::uint32_t>(Operation::Generator))
        {
            const std::uint64_t seed = (static_cast<std::uint64_t>(request->seedHigh) << 32) | request->seedLow;
            std::uint32_t evaluated = 0;
            const bool stopped = generate(
                *request, seed, request->chunkStart, request->chunkCount, evaluated,
                [&](std::uint32_t advances, std::uint8_t needle, std::uint32_t pid, std::uint8_t ability,
                    std::uint8_t gender, std::uint8_t nature, const std::array<std::uint8_t, 6> &ivs,
                    std::uint8_t powerType, std::uint8_t powerStrength, std::uint16_t abilityIndex) {
                    return emit(seed, nullptr, 0, 0, 0, advances, needle, pid, ability, gender, nature, ivs, powerType,
                                powerStrength, abilityIndex);
                });
            processedCount = evaluated;
            resultLimitReached = stopped && (evaluated < request->chunkCount || chunkEnd < rawUnits);
            return static_cast<std::uint32_t>(results.size());
        }

        const Date start = { request->startYear, request->startMonth, request->startDay };
        const Date end = { request->endYear, request->endMonth, request->endDay };
        const std::uint64_t dateCount = serialDate(end) - serialDate(start) + 1;
        const std::uint64_t keypressCount = buttons.size();
        for (std::uint64_t offset = 0; offset < request->chunkCount; offset++)
        {
            std::uint64_t remaining = static_cast<std::uint64_t>(request->chunkStart) + offset;
            const auto seconds = static_cast<std::uint32_t>(remaining % 86400);
            remaining /= 86400;
            const auto buttonMask = buttons[remaining % keypressCount];
            remaining /= keypressCount;
            const auto date = dateFromSerial(serialDate(start) + static_cast<std::uint32_t>(remaining % dateCount));
            remaining /= dateCount;
            const auto timer0 = request->timer0Min + static_cast<std::uint32_t>(remaining);
            const auto seed = calculateSeed(*request, date, seconds, buttonMask, timer0);
            std::uint32_t evaluated = 0;
            const bool stopped = generate(
                *request, seed, 0, request->maxAdvances + 1, evaluated,
                [&](std::uint32_t advances, std::uint8_t needle, std::uint32_t pid, std::uint8_t ability,
                    std::uint8_t gender, std::uint8_t nature, const std::array<std::uint8_t, 6> &ivs,
                    std::uint8_t powerType, std::uint8_t powerStrength, std::uint16_t abilityIndex) {
                    return emit(seed, &date, seconds, timer0, buttonMask, advances, needle, pid, ability, gender, nature,
                                ivs, powerType, powerStrength, abilityIndex);
                });
            processedCount++;
            if (stopped)
            {
                resultLimitReached
                    = offset + 1 < request->chunkCount || evaluated < static_cast<std::uint64_t>(request->maxAdvances) + 1
                    || chunkEnd < rawUnits;
                return static_cast<std::uint32_t>(results.size());
            }
        }
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen5dreamradar_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5dreamradar_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5dreamradar_processed_count() { return processedCount; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen5dreamradar_limit_reached() { return resultLimitReached ? 1U : 0U; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen5dreamradar_last_error() { return lastError; }

#ifndef __EMSCRIPTEN__
    std::uint32_t gen5dreamradar_test_generate(
        const Gen5DreamRadarPackedRequest *request, Gen5DreamRadarPackedResult *output, std::uint32_t capacity)
    {
        if (request == nullptr || output == nullptr || capacity == 0) return 0;
        auto copy = *request;
        copy.operation = static_cast<std::uint32_t>(Operation::Generator);
        copy.resultLimit = std::min(copy.resultLimit, capacity);
        copy.chunkStart = 0;
        copy.chunkCount = std::min<std::uint64_t>(static_cast<std::uint64_t>(copy.maxAdvances) + 1, copy.resultLimit);
        const auto count = gen5dreamradar_search(&copy);
        for (std::uint32_t index = 0; index < count; index++) output[index] = results[index];
        return count;
    }

    std::uint64_t gen5dreamradar_test_seed(
        const Gen5DreamRadarPackedRequest *request, std::uint32_t second, std::uint32_t buttonMask, std::uint32_t timer0)
    {
        if (request == nullptr || second > 86399 || buttonMask > 0xfff || timer0 > 0xffff) return 0;
        const Date date = { request->startYear, request->startMonth, request->startDay };
        if (!validDate(date)) return 0;
        return calculateSeed(*request, date, second, buttonMask, timer0);
    }
#endif
}
