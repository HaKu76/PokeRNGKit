/*
 * PokeRNGKit Gen V Egg WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 EggGenerator5, Searcher5, SHA1,
 * Nazos, Keypresses and Utilities5 by Admiral_Fish, bumba, and EzPzStreamz
 * (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen5egg_bridge.h"

#include <Core/RNG/MT.hpp>
#include <algorithm>
#include <array>
#include <bit>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <string_view>
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
    constexpr std::string_view allowedSpeciesBase64
        = "kiSpKCFKVZUkpVqVVbFejSvWCEmq9IrKRt3q1Z7cQ5CkQlKpNN2pX7Wpr6rrS04ASJJKlVaK1s+qDQCAAIIkpaqUmpzUtFZVUlqtpKRtrRMAAA==";

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

    struct Personal
    {
        std::array<std::uint8_t, 6> stats;
        std::uint8_t gender;
        std::array<std::uint8_t, 3> abilities;
    };

    struct EggState
    {
        std::uint32_t advances;
        std::uint32_t pid;
        std::array<std::uint8_t, 6> ivs;
        std::array<std::uint8_t, 6> inheritance;
        std::array<std::uint16_t, 6> stats;
        std::uint16_t abilityIndex;
        std::uint16_t species;
        std::uint8_t chatot;
        std::uint8_t needle;
        std::uint8_t ability;
        std::uint8_t gender;
        std::uint8_t nature;
        std::uint8_t shiny;
        std::uint8_t hiddenPower;
        std::uint8_t hiddenPowerStrength;
        std::uint8_t characteristic;
    };

#include "personal_data.inc"

    thread_local std::vector<Gen5EggPackedResult> results;
    thread_local std::uint32_t processedCount = 0;
    thread_local std::uint32_t lastError = ErrorCode::None;
    thread_local bool resultLimitReached = false;

    int base64Value(char value)
    {
        if (value >= 'A' && value <= 'Z') return value - 'A';
        if (value >= 'a' && value <= 'z') return value - 'a' + 26;
        if (value >= '0' && value <= '9') return value - '0' + 52;
        if (value == '+') return 62;
        if (value == '/') return 63;
        return -1;
    }

    std::vector<std::uint8_t> decodeBase64(std::string_view encoded)
    {
        std::vector<std::uint8_t> decoded;
        decoded.reserve(encoded.size() * 3 / 4);
        std::uint32_t accumulator = 0;
        int bits = 0;
        for (const char value : encoded)
        {
            if (value == '=') break;
            const int digit = base64Value(value);
            if (digit < 0) continue;
            accumulator = (accumulator << 6) | static_cast<std::uint32_t>(digit);
            bits += 6;
            if (bits >= 8)
            {
                bits -= 8;
                decoded.push_back(static_cast<std::uint8_t>((accumulator >> bits) & 0xffU));
            }
        }
        return decoded;
    }

    const std::array<Personal, 650> &personalData()
    {
        static const std::array<Personal, 650> data = [] {
            std::array<Personal, 650> values = {};
            const auto decoded = decodeBase64(gen5EggPersonalBase64);
            if (decoded.size() != values.size() * 10) return values;
            for (std::size_t species = 0; species < values.size(); species++)
            {
                const std::size_t offset = species * 10;
                for (std::size_t index = 0; index < 6; index++) values[species].stats[index] = decoded[offset + index];
                values[species].gender = decoded[offset + 6];
                for (std::size_t index = 0; index < 3; index++) values[species].abilities[index] = decoded[offset + 7 + index];
            }
            return values;
        }();
        return data;
    }

    bool allowedSpecies(std::uint32_t species)
    {
        static const auto bits = decodeBase64(allowedSpeciesBase64);
        return species < 650 && species / 8 < bits.size() && (bits[species / 8] & (1U << (species % 8))) != 0;
    }

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

    std::vector<std::uint32_t> keypresses(const Gen5EggPackedRequest &request)
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

    void jumpBw(std::uint64_t &seed, std::uint32_t advances)
    {
        std::uint64_t accumulatedMultiplier = 1;
        std::uint64_t accumulatedAdd = 0;
        std::uint64_t currentMultiplier = bwMultiplier;
        std::uint64_t currentAdd = bwAdd;
        while (advances != 0)
        {
            if ((advances & 1U) != 0)
            {
                accumulatedAdd = accumulatedAdd * currentMultiplier + currentAdd;
                accumulatedMultiplier *= currentMultiplier;
            }
            currentAdd *= currentMultiplier + 1;
            currentMultiplier *= currentMultiplier;
            advances >>= 1;
        }
        seed = accumulatedMultiplier * seed + accumulatedAdd;
    }

    std::uint32_t probabilityTable(std::uint64_t &seed)
    {
        std::uint32_t count = 1;
        nextBw(seed);
        count++;
        if (nextBw(seed, 101) > 50)
        {
            nextBw(seed);
            count++;
        }
        count++;
        if (nextBw(seed, 101) > 30)
        {
            nextBw(seed);
            count++;
        }
        count++;
        if (nextBw(seed, 101) > 25)
        {
            count++;
            if (nextBw(seed, 101) > 30)
            {
                nextBw(seed);
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
                const auto one = nextBw(seed, 15);
                const auto two = nextBw(seed, 15);
                const auto three = nextBw(seed, 15);
                if (one != two && one != three && two != three) break;
            }
        }
        return count;
    }

    std::uint64_t calculateSeed(const Gen5EggPackedRequest &request, const Date &date,
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

    std::uint32_t nextBwUInt(std::uint64_t &seed)
    {
        return static_cast<std::uint32_t>(nextBw(seed) >> 32);
    }

    std::uint8_t shinyValue(std::uint32_t pid, std::uint16_t tsv)
    {
        const auto psv = static_cast<std::uint16_t>((pid >> 16) ^ (pid & 0xffffU));
        if (psv == tsv) return 2;
        return static_cast<std::uint16_t>(psv ^ tsv) < 8 ? 1 : 0;
    }

    bool isShiny(std::uint32_t pid, std::uint16_t tsv)
    {
        const auto psv = static_cast<std::uint16_t>((pid >> 16) ^ (pid & 0xffffU));
        return static_cast<std::uint16_t>(psv ^ tsv) < 8;
    }

    std::uint8_t genderValue(std::uint32_t pid, const Personal &personal)
    {
        if (personal.gender == 255) return 2;
        if (personal.gender == 254) return 1;
        if (personal.gender == 0) return 0;
        return static_cast<std::uint8_t>((pid & 0xffU) < personal.gender);
    }

    void updateDerived(EggState &state)
    {
        constexpr std::array<std::uint8_t, 6> order = { 0, 1, 2, 5, 3, 4 };
        constexpr std::array<std::uint8_t, 5> statMap = { 1, 2, 5, 3, 4 };
        const auto &personal = personalData()[state.species];
        std::uint8_t type = 0;
        std::uint8_t power = 0;
        std::uint8_t characteristicIndex = static_cast<std::uint8_t>(state.pid % 6);
        std::uint8_t maximumIv = 0;
        for (std::uint8_t index = 0; index < 6; index++)
        {
            type |= static_cast<std::uint8_t>((state.ivs[order[index]] & 1U) << index);
            power |= static_cast<std::uint8_t>(((state.ivs[order[index]] >> 1) & 1U) << index);

            const std::uint8_t candidate = static_cast<std::uint8_t>((state.pid % 6 + index) % 6);
            if (state.ivs[order[candidate]] > maximumIv)
            {
                characteristicIndex = candidate;
                maximumIv = state.ivs[order[candidate]];
            }

            const std::uint16_t raw = static_cast<std::uint16_t>((2U * personal.stats[index] + state.ivs[index]) / 100U);
            if (index == 0)
            {
                state.stats[index] = raw + 11;
            }
            else
            {
                std::uint16_t stat = raw + 5;
                const std::uint8_t raised = statMap[state.nature / 5];
                const std::uint8_t lowered = statMap[state.nature % 5];
                if (raised != lowered)
                {
                    if (index == raised) stat = static_cast<std::uint16_t>(stat * 110U / 100U);
                    if (index == lowered) stat = static_cast<std::uint16_t>(stat * 90U / 100U);
                }
                state.stats[index] = stat;
            }
        }
        state.hiddenPower = static_cast<std::uint8_t>(type * 15U / 63U);
        state.hiddenPowerStrength = static_cast<std::uint8_t>(30U + power * 40U / 63U);
        state.characteristic = static_cast<std::uint8_t>(characteristicIndex * 5U + maximumIv % 5U);
        state.abilityIndex = personal.abilities[state.ability];
        state.gender = genderValue(state.pid, personal);
    }

    bool compareFilters(const Gen5EggPackedRequest &request, const EggState &state)
    {
        if (request.filtersDisabled != 0) return true;
        if (request.shinyFilter == 1 && state.shiny != 0) return false;
        if (request.shinyFilter == 2 && state.shiny != 1) return false;
        if (request.shinyFilter == 3 && state.shiny != 2) return false;
        if (request.shinyFilter == 4 && state.shiny == 0) return false;
        if (request.genderFilter != 0 && state.gender != request.genderFilter - 1) return false;
        if (request.abilityFilter != 0 && state.ability != request.abilityFilter - 1) return false;
        if ((request.natureMask & (1U << state.nature)) == 0) return false;
        if ((request.hiddenPowerMask & (1U << state.hiddenPower)) == 0) return false;
        for (std::size_t index = 0; index < state.ivs.size(); index++)
            if (state.ivs[index] < request.ivMin[index] || state.ivs[index] > request.ivMax[index]) return false;
        return true;
    }

    bool compareFixedBw2Filters(const Gen5EggPackedRequest &request, const EggState &state)
    {
        if (request.filtersDisabled != 0) return true;
        if (request.abilityFilter != 0 && state.ability != request.abilityFilter - 1) return false;
        if ((request.natureMask & (1U << state.nature)) == 0) return false;
        if ((request.hiddenPowerMask & (1U << state.hiddenPower)) == 0) return false;
        for (std::size_t index = 0; index < state.ivs.size(); index++)
            if (state.ivs[index] < request.ivMin[index] || state.ivs[index] > request.ivMax[index]) return false;
        return true;
    }

    std::uint32_t selectedSpecies(std::uint32_t species, std::uint64_t &seed)
    {
        if (species == 29 || species == 32) return nextBw(seed, 2) != 0 ? 32 : 29;
        if (species == 313 || species == 314) return nextBw(seed, 2) != 0 ? 314 : 313;
        return species;
    }

    std::uint32_t parentIv(const Gen5EggPackedRequest &request, std::uint32_t parent, std::uint32_t index)
    {
        return parent == 0 ? request.parentAIVs[index] : request.parentBIVs[index];
    }

    std::uint32_t parentItem(const Gen5EggPackedRequest &request, std::uint32_t parent)
    {
        return parent == 0 ? request.parentAItem : request.parentBItem;
    }

    std::uint32_t parentNature(const Gen5EggPackedRequest &request, std::uint32_t parent)
    {
        return parent == 0 ? request.parentANature : request.parentBNature;
    }

    void inheritPowerItem(const Gen5EggPackedRequest &request, std::uint64_t &seed, EggState &state,
                          std::uint32_t powerItemCount, std::uint8_t &inheritanceCount)
    {
        if (powerItemCount == 0) return;
        inheritanceCount = 1;
        std::uint32_t parent;
        if (powerItemCount == 2)
        {
            parent = nextBw(seed, 2);
        }
        else
        {
            parent = request.parentAItem >= 2 && request.parentAItem <= 7 ? 0 : 1;
        }
        const std::uint32_t item = parentItem(request, parent);
        const std::uint32_t index = item - 2;
        state.ivs[index] = static_cast<std::uint8_t>(parentIv(request, parent, index));
        state.inheritance[index] = static_cast<std::uint8_t>(parent + 1);
    }

    void inheritRemainingIvs(const Gen5EggPackedRequest &request, std::uint64_t &seed, EggState &state,
                             std::uint8_t inheritanceCount)
    {
        while (inheritanceCount < 3)
        {
            const std::uint32_t index = nextBw(seed, 6);
            const std::uint32_t parent = nextBw(seed, 2);
            if (state.inheritance[index] == 0)
            {
                state.ivs[index] = static_cast<std::uint8_t>(parentIv(request, parent, index));
                state.inheritance[index] = static_cast<std::uint8_t>(parent + 1);
                inheritanceCount++;
            }
        }
    }

    EggState generateBw2Egg(const Gen5EggPackedRequest &request, std::uint64_t eggSeed)
    {
        EggState state = {};
        state.species = static_cast<std::uint16_t>(selectedSpecies(request.species, eggSeed));
        state.nature = static_cast<std::uint8_t>(nextBw(eggSeed, 25));
        const std::uint32_t everstoneCount = (request.parentAItem == 1) + (request.parentBItem == 1);
        if (everstoneCount == 2)
        {
            state.nature = static_cast<std::uint8_t>(parentNature(request, nextBw(eggSeed, 2)));
        }
        else if (everstoneCount == 1)
        {
            state.nature = static_cast<std::uint8_t>(parentNature(request, request.parentAItem == 1 ? 0 : 1));
        }

        const bool ditto = request.parentAGender == 3 || request.parentBGender == 3;
        if (!ditto)
        {
            const std::uint32_t random = nextBw(eggSeed, 100);
            if (request.parentBAbility == 0) state.ability = random < 80 ? 0 : 1;
            else if (request.parentBAbility == 1) state.ability = random < 20 ? 0 : 1;
            else state.ability = random < 20 ? 0 : random < 40 ? 1 : 2;
        }
        else
        {
            nextBw(eggSeed);
            state.ability = static_cast<std::uint8_t>(nextBw(eggSeed, 2));
        }

        const std::uint32_t powerItemCount
            = (request.parentAItem >= 2 && request.parentAItem <= 7) + (request.parentBItem >= 2 && request.parentBItem <= 7);
        std::uint8_t inheritanceCount = 0;
        inheritPowerItem(request, eggSeed, state, powerItemCount, inheritanceCount);
        inheritRemainingIvs(request, eggSeed, state, inheritanceCount);
        for (std::size_t index = 0; index < state.ivs.size(); index++)
            if (state.inheritance[index] == 0) state.ivs[index] = static_cast<std::uint8_t>(nextBw(eggSeed, 32));
        updateDerived(state);
        return state;
    }

    std::uint32_t createBw2Pid(std::uint64_t &seed, std::uint8_t ability)
    {
        std::uint32_t pid = nextBwUInt(seed);
        if (((pid >> 16) & 1U) != ability) pid ^= 0x10000U;
        return pid;
    }

    Gen5EggPackedResult packResult(const EggState &state, std::uint64_t seed, const Date *date = nullptr,
                                   std::uint32_t seconds = 0, std::uint32_t timer0 = 0, std::uint32_t buttonMask = 0)
    {
        Gen5EggPackedResult packed = {};
        packed.seedLow = static_cast<std::uint32_t>(seed);
        packed.seedHigh = static_cast<std::uint32_t>(seed >> 32);
        if (date != nullptr)
        {
            packed.date = date->year | (date->month << 16) | (date->day << 24);
            packed.seconds = seconds;
            packed.timer0Buttons = timer0 | (buttonMask << 16);
        }
        packed.advances = state.advances;
        packed.pid = state.pid;
        packed.metadata = state.chatot | (static_cast<std::uint32_t>(state.needle) << 7)
            | (static_cast<std::uint32_t>(state.ability) << 10) | (static_cast<std::uint32_t>(state.gender) << 12)
            | (static_cast<std::uint32_t>(state.nature) << 14) | (static_cast<std::uint32_t>(state.shiny) << 19)
            | (static_cast<std::uint32_t>(state.characteristic) << 21);
        packed.ivs0 = state.ivs[0] | (static_cast<std::uint32_t>(state.ivs[1]) << 8)
            | (static_cast<std::uint32_t>(state.ivs[2]) << 16) | (static_cast<std::uint32_t>(state.ivs[3]) << 24);
        packed.ivs1 = state.ivs[4] | (static_cast<std::uint32_t>(state.ivs[5]) << 8)
            | (static_cast<std::uint32_t>(state.hiddenPower) << 16)
            | (static_cast<std::uint32_t>(state.hiddenPowerStrength) << 24);
        for (std::size_t index = 0; index < state.inheritance.size(); index++)
            packed.inheritance |= static_cast<std::uint32_t>(state.inheritance[index]) << (index * 2);
        packed.abilityIndex = state.abilityIndex;
        packed.stats01 = state.stats[0] | (static_cast<std::uint32_t>(state.stats[1]) << 16);
        packed.stats23 = state.stats[2] | (static_cast<std::uint32_t>(state.stats[3]) << 16);
        packed.stats45 = state.stats[4] | (static_cast<std::uint32_t>(state.stats[5]) << 16);
        packed.species = state.species;
        return packed;
    }

    bool appendState(const Gen5EggPackedRequest &request, EggState &state, std::uint64_t seed, const Date *date,
                     std::uint32_t seconds, std::uint32_t timer0, std::uint32_t buttonMask)
    {
        updateDerived(state);
        if (!compareFilters(request, state)) return true;
        if (results.size() >= request.resultLimit)
        {
            resultLimitReached = true;
            return false;
        }
        results.emplace_back(packResult(state, seed, date, seconds, timer0, buttonMask));
        if (results.size() >= request.resultLimit) resultLimitReached = true;
        return !resultLimitReached;
    }

    bool generateBwFrames(const Gen5EggPackedRequest &request, std::uint64_t seed, std::uint32_t frameStart,
                          std::uint32_t frameCount, const Date *date, std::uint32_t seconds,
                          std::uint32_t timer0, std::uint32_t buttonMask, std::uint32_t *framesProcessed = nullptr)
    {
        MT mt(static_cast<std::uint32_t>(seed >> 32));
        mt.advance(7);
        std::array<std::uint8_t, 6> mtIvs = {};
        for (auto &iv : mtIvs) iv = static_cast<std::uint8_t>(mt.next() >> 27);

        const bool ditto = request.parentAGender == 3 || request.parentBGender == 3;
        const std::uint32_t everstoneCount = (request.parentAItem == 1) + (request.parentBItem == 1);
        const std::uint32_t powerItemCount
            = (request.parentAItem >= 2 && request.parentAItem <= 7) + (request.parentBItem >= 2 && request.parentBItem <= 7);
        const std::uint8_t rolls = static_cast<std::uint8_t>(request.masuda != 0 ? 5 : 0);
        const auto tsv = static_cast<std::uint16_t>(request.tid ^ request.sid);
        const std::uint32_t automatic = initialAdvances(seed, false, false);
        std::uint64_t baseSeed = seed;
        jumpBw(baseSeed, automatic + request.initialAdvances + frameStart);

        for (std::uint32_t frame = 0; frame < frameCount; frame++)
        {
            std::uint64_t go = baseSeed;
            jumpBw(go, request.offset);
            nextBw(go);
            nextBw(go);

            EggState state = {};
            state.ivs = mtIvs;
            state.species = static_cast<std::uint16_t>(selectedSpecies(request.species, go));
            state.nature = static_cast<std::uint8_t>(nextBw(go, 25));
            if (everstoneCount != 0 && nextBw(go, 2) != 0)
            {
                if (everstoneCount == 2) state.nature = static_cast<std::uint8_t>(parentNature(request, nextBw(go, 2)));
                else state.nature = static_cast<std::uint8_t>(parentNature(request, request.parentAItem == 1 ? 0 : 1));
            }

            bool hiddenAbility = false;
            if (ditto)
            {
                nextBw(go);
                nextBw(go);
            }
            else
            {
                hiddenAbility = nextBw(go, 100) >= 40 && request.parentBAbility == 2;
            }

            std::uint8_t inheritanceCount = 0;
            inheritPowerItem(request, go, state, powerItemCount, inheritanceCount);
            inheritRemainingIvs(request, go, state, inheritanceCount);
            state.pid = nextBw(go, 0xffffffffU);
            for (std::uint8_t roll = 0; roll < rolls && !isShiny(state.pid, tsv); roll++)
                state.pid = nextBw(go, 0xffffffffU);
            state.ability = hiddenAbility ? 2 : static_cast<std::uint8_t>((state.pid >> 16) & 1U);
            state.shiny = shinyValue(state.pid, tsv);
            state.advances = automatic + request.initialAdvances + frameStart + frame;
            const std::uint32_t prng = nextBwUInt(baseSeed);
            state.chatot = static_cast<std::uint8_t>(((static_cast<std::uint64_t>(prng) * 0x1fffU) >> 32) / 82U);
            state.needle = static_cast<std::uint8_t>((static_cast<std::uint64_t>(prng) * 8U) >> 32);
            if (framesProcessed != nullptr) (*framesProcessed)++;
            if (!appendState(request, state, seed, date, seconds, timer0, buttonMask)) return false;
        }
        return true;
    }

    bool generateBw2Frames(const Gen5EggPackedRequest &request, std::uint64_t seed, std::uint32_t frameStart,
                           std::uint32_t frameCount, const Date *date, std::uint32_t seconds,
                           std::uint32_t timer0, std::uint32_t buttonMask, std::uint32_t *framesProcessed = nullptr)
    {
        MT mt(static_cast<std::uint32_t>(seed >> 32));
        mt.advance(2);
        const std::uint64_t eggSeed = (static_cast<std::uint64_t>(mt.next()) << 32) | mt.next();
        EggState fixed = generateBw2Egg(request, eggSeed);
        if (!compareFixedBw2Filters(request, fixed))
        {
            if (framesProcessed != nullptr) *framesProcessed += frameCount;
            return true;
        }

        const auto tsv = static_cast<std::uint16_t>(request.tid ^ request.sid);
        const std::uint8_t pidAbility = fixed.ability == 2 ? 0 : fixed.ability;
        const std::uint8_t rolls = static_cast<std::uint8_t>((request.shinyCharm != 0 ? 2 : 0) + (request.masuda != 0 ? 5 : 0));
        const std::uint32_t automatic = initialAdvances(seed, true, request.memoryLink != 0);
        std::uint64_t baseSeed = seed;
        jumpBw(baseSeed, automatic + request.initialAdvances + frameStart);
        for (std::uint32_t frame = 0; frame < frameCount; frame++)
        {
            std::uint64_t go = baseSeed;
            jumpBw(go, request.offset);
            nextBw(go);
            nextBw(go);

            EggState state = fixed;
            state.pid = createBw2Pid(go, pidAbility);
            for (std::uint8_t roll = 0; roll < rolls && !isShiny(state.pid, tsv); roll++)
                state.pid = createBw2Pid(go, pidAbility);
            state.shiny = shinyValue(state.pid, tsv);
            state.advances = automatic + request.initialAdvances + frameStart + frame;
            const std::uint32_t prng = nextBwUInt(baseSeed);
            state.chatot = static_cast<std::uint8_t>(((static_cast<std::uint64_t>(prng) * 0x1fffU) >> 32) / 82U);
            state.needle = static_cast<std::uint8_t>((static_cast<std::uint64_t>(prng) * 8U) >> 32);
            state.gender = genderValue(state.pid, personalData()[state.species]);
            if (framesProcessed != nullptr) (*framesProcessed)++;
            if (request.filtersDisabled != 0
                || ((request.genderFilter == 0 || state.gender == request.genderFilter - 1)
                    && (request.shinyFilter == 0 || (request.shinyFilter == 1 && state.shiny == 0)
                        || (request.shinyFilter == 2 && state.shiny == 1) || (request.shinyFilter == 3 && state.shiny == 2)
                        || (request.shinyFilter == 4 && state.shiny != 0))))
            {
                if (results.size() >= request.resultLimit)
                {
                    resultLimitReached = true;
                    return false;
                }
                results.emplace_back(packResult(state, seed, date, seconds, timer0, buttonMask));
                if (results.size() >= request.resultLimit)
                {
                    resultLimitReached = true;
                    return false;
                }
            }
        }
        return true;
    }

    bool generateFrames(const Gen5EggPackedRequest &request, std::uint64_t seed, std::uint32_t frameStart,
                        std::uint32_t frameCount, const Date *date = nullptr, std::uint32_t seconds = 0,
                        std::uint32_t timer0 = 0, std::uint32_t buttonMask = 0,
                        std::uint32_t *framesProcessed = nullptr)
    {
        if (request.version < 2)
            return generateBwFrames(request, seed, frameStart, frameCount, date, seconds, timer0, buttonMask, framesProcessed);
        return generateBw2Frames(request, seed, frameStart, frameCount, date, seconds, timer0, buttonMask, framesProcessed);
    }

    bool validParentCombination(std::uint32_t left, std::uint32_t right)
    {
        return (left == 0 && right == 1) || (left == 1 && right == 0) || (left == 3 && right == 1)
            || (left == 1 && right == 3) || (left == 0 && right == 3) || (left == 3 && right == 0)
            || (left == 2 && right == 3) || (left == 3 && right == 2);
    }

    bool reorderParents(std::uint32_t left, std::uint32_t right)
    {
        return (left == 1 && right == 0) || (left == 1 && right == 3) || (left == 3 && right == 0)
            || (left == 3 && right == 2);
    }

    void canonicalizeParents(Gen5EggPackedRequest &request)
    {
        if (!reorderParents(request.parentAGender, request.parentBGender)) return;
        for (std::size_t index = 0; index < 6; index++) std::swap(request.parentAIVs[index], request.parentBIVs[index]);
        std::swap(request.parentAAbility, request.parentBAbility);
        std::swap(request.parentAGender, request.parentBGender);
        std::swap(request.parentAItem, request.parentBItem);
        std::swap(request.parentANature, request.parentBNature);
    }

    bool validRequest(const Gen5EggPackedRequest &request)
    {
        if (request.operation > 1 || request.version > 3 || request.language > 6 || request.dsType > 2
            || request.macHigh > 0xffff || request.vcount > 0xff || request.timer0Min > request.timer0Max
            || request.timer0Max > 0xffff || request.gxstat > 99 || request.vframe > 99
            || request.keypressCountMask > 0x1ff || request.skipLR > 1
            || request.memoryLink > 1 || request.shinyCharm > 1 || request.tid > 0xffff || request.sid > 0xffff
            || request.resultLimit == 0 || request.resultLimit > maximumResults || !allowedSpecies(request.species)
            || request.masuda > 1 || request.parentAAbility > 2 || request.parentBAbility > 2
            || request.parentAGender > 3 || request.parentBGender > 3 || request.parentAItem > 7
            || request.parentBItem > 7 || request.parentANature > 24 || request.parentBNature > 24
            || request.filtersDisabled > 1 || request.shinyFilter > 4 || request.genderFilter > 3
            || request.abilityFilter > 3 || request.natureMask == 0 || request.natureMask > 0x1ffffff
            || request.hiddenPowerMask == 0 || request.hiddenPowerMask > 0xffff || request.chunkCount == 0
            || !validParentCombination(request.parentAGender, request.parentBGender))
            return false;
        for (std::size_t index = 0; index < 6; index++)
            if (request.parentAIVs[index] > 31 || request.parentBIVs[index] > 31 || request.ivMin[index] > request.ivMax[index]
                || request.ivMax[index] > 31)
                return false;

        if (static_cast<std::uint64_t>(request.initialAdvances) + request.maxAdvances > std::numeric_limits<std::uint32_t>::max())
            return false;
        if (request.filtersDisabled == 0 && request.abilityFilter == 3)
        {
            Gen5EggPackedRequest normalized = request;
            canonicalizeParents(normalized);
            if (normalized.parentAGender != 0 || normalized.parentBGender != 1 || normalized.parentBAbility != 2) return false;
        }

        if (request.operation == static_cast<std::uint32_t>(Operation::Generator))
        {
            const std::uint64_t total = static_cast<std::uint64_t>(request.maxAdvances) + 1;
            if (static_cast<std::uint64_t>(request.initialAdvances) + request.offset + request.maxAdvances
                    > std::numeric_limits<std::uint32_t>::max()
                || total > maximumEvaluations || request.chunkStart >= total
                || static_cast<std::uint64_t>(request.chunkStart) + request.chunkCount > total)
                return false;
            return true;
        }

        if (request.filtersDisabled != 0 || request.offset != 0) return false;
        const Date start = { request.startYear, request.startMonth, request.startDay };
        const Date end = { request.endYear, request.endMonth, request.endDay };
        if (!validDate(start) || !validDate(end)) return false;
        const std::uint32_t startSerial = serialDate(start);
        const std::uint32_t endSerial = serialDate(end);
        if (startSerial > endSerial) return false;
        const auto keys = keypresses(request);
        if (keys.empty()) return false;
        const std::uint64_t days = static_cast<std::uint64_t>(endSerial - startSerial) + 1;
        const std::uint64_t timers = static_cast<std::uint64_t>(request.timer0Max - request.timer0Min) + 1;
        const std::uint64_t total = days * timers * keys.size() * 86400ULL;
        if (total == 0 || total > maximumEvaluations
            || total * (static_cast<std::uint64_t>(request.maxAdvances) + 1) > maximumEvaluations
            || request.chunkStart >= total || static_cast<std::uint64_t>(request.chunkStart) + request.chunkCount > total)
            return false;
        return true;
    }

    void runGenerator(const Gen5EggPackedRequest &request)
    {
        const std::uint64_t seed = (static_cast<std::uint64_t>(request.seedHigh) << 32) | request.seedLow;
        generateFrames(request, seed, request.chunkStart, request.chunkCount, nullptr, 0, 0, 0, &processedCount);
    }

    void runSearcher(const Gen5EggPackedRequest &request)
    {
        const auto keys = keypresses(request);
        const std::uint32_t startSerial = serialDate({ request.startYear, request.startMonth, request.startDay });
        const std::uint32_t endSerial = serialDate({ request.endYear, request.endMonth, request.endDay });
        const std::uint64_t days = static_cast<std::uint64_t>(endSerial - startSerial) + 1;
        const std::uint64_t keyCount = keys.size();
        for (std::uint64_t offset = 0; offset < request.chunkCount; offset++)
        {
            std::uint64_t index = static_cast<std::uint64_t>(request.chunkStart) + offset;
            const std::uint32_t seconds = static_cast<std::uint32_t>(index % 86400ULL);
            index /= 86400ULL;
            const std::uint32_t buttonMask = keys[index % keyCount];
            index /= keyCount;
            const Date date = dateFromSerial(startSerial + static_cast<std::uint32_t>(index % days));
            index /= days;
            const std::uint32_t timer0 = request.timer0Min + static_cast<std::uint32_t>(index);
            const std::uint64_t seed = calculateSeed(request, date, seconds, buttonMask, timer0);
            generateFrames(request, seed, 0, request.maxAdvances + 1, &date, seconds, timer0, buttonMask);
            processedCount++;
            if (resultLimitReached) break;
        }
    }
}

static_assert(sizeof(Gen5EggPackedRequest) == 71 * sizeof(std::uint32_t));
static_assert(sizeof(Gen5EggPackedResult) == 16 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen5egg_api_version()
    {
        return apiVersion;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5egg_search(const Gen5EggPackedRequest *request)
    {
        results.clear();
        processedCount = 0;
        lastError = ErrorCode::None;
        resultLimitReached = false;
        if (request == nullptr || !validRequest(*request))
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        Gen5EggPackedRequest normalized = *request;
        canonicalizeParents(normalized);
        results.reserve(std::min<std::uint32_t>(normalized.resultLimit, normalized.chunkCount));
        if (normalized.operation == static_cast<std::uint32_t>(Operation::Generator)) runGenerator(normalized);
        else runSearcher(normalized);
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen5egg_result_ptr()
    {
        return results.empty() ? 0 : reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5egg_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5egg_processed_count()
    {
        return processedCount;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5egg_limit_reached()
    {
        return resultLimitReached ? 1 : 0;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5egg_last_error()
    {
        return lastError;
    }

#ifndef __EMSCRIPTEN__
    std::uint32_t gen5egg_test_generate(
        const Gen5EggPackedRequest *request, Gen5EggPackedResult *output, std::uint32_t capacity)
    {
        results.clear();
        processedCount = 0;
        lastError = ErrorCode::None;
        resultLimitReached = false;
        if (request == nullptr) return 0;
        Gen5EggPackedRequest normalized = *request;
        canonicalizeParents(normalized);
        runGenerator(normalized);
        const std::uint32_t count = static_cast<std::uint32_t>(results.size());
        if (output != nullptr)
        {
            const std::uint32_t copied = std::min(count, capacity);
            std::copy_n(results.begin(), copied, output);
        }
        return count;
    }

    std::uint64_t gen5egg_test_seed(
        const Gen5EggPackedRequest *request, std::uint32_t second, std::uint32_t buttonMask, std::uint32_t timer0)
    {
        if (request == nullptr) return 0;
        return calculateSeed(*request, { request->startYear, request->startMonth, request->startDay }, second, buttonMask, timer0);
    }
#endif
}
