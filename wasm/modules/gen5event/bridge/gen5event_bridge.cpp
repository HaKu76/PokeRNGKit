/*
 * PokeRNGKit Gen V Event WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 EventGenerator5, Searcher5, SHA1,
 * Nazos, Keypresses and Utilities5 by Admiral_Fish, bumba, and EzPzStreamz
 * (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen5event_bridge.h"

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

    struct BwJump
    {
        std::uint64_t multiplier;
        std::uint64_t add;
    };

    struct Personal
    {
        std::array<std::uint8_t, 6> stats;
        std::uint8_t gender;
        std::array<std::uint8_t, 3> abilities;
    };

    struct EventState
    {
        std::uint32_t advances;
        std::uint32_t pid;
        std::array<std::uint8_t, 6> ivs;
        std::uint16_t abilityIndex;
        std::uint8_t chatot;
        std::uint8_t needle;
        std::uint8_t ability;
        std::uint8_t gender;
        std::uint8_t level;
        std::uint8_t nature;
        std::uint8_t shiny;
        std::uint8_t hiddenPower;
        std::uint8_t hiddenPowerStrength;
    };

#include "personal_data.inc"

    thread_local std::vector<Gen5EventPackedResult> results;
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

    std::vector<std::uint32_t> keypresses(const Gen5EventPackedRequest &request)
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

    std::uint64_t calculateSeed(const Gen5EventPackedRequest &request, const Date &date,
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

    std::uint32_t createPid(const Gen5EventPackedRequest &request, std::uint16_t tsv, std::uint32_t genderRatio,
                            std::uint64_t &rng)
    {
        std::uint32_t pid = nextBwUInt(rng);
        if (request.gender < 2)
        {
            std::uint8_t low = 8;
            if (genderRatio > 0 && genderRatio < 254)
                low = request.gender == 0 ? static_cast<std::uint8_t>(genderRatio)
                                          : static_cast<std::uint8_t>(genderRatio - 1);
            if (request.gender == 0)
                low = static_cast<std::uint8_t>(nextBwUInt(rng, 0xfe - low) + low);
            else
                low = static_cast<std::uint8_t>(nextBwUInt(rng, low) + 1);
            pid = (pid & 0xffffff00U) | low;
        }

        if (request.shiny == 2)
        {
            const std::uint32_t low = pid & 0xffU;
            pid = ((low ^ tsv) << 16) | low;
        }
        else if (request.shiny == 1 && isShiny(pid, tsv))
        {
            pid ^= 0x10000000U;
        }

        const std::uint32_t abilitySpec = request.ability == 2 ? 0 : request.ability;
        if (((pid >> 16) & 1U) != abilitySpec) pid ^= 0x10000U;
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

    bool matches(const Gen5EventPackedRequest &request, const EventState &state)
    {
        if (request.filtersDisabled != 0) return true;
        for (std::size_t index = 0; index < state.ivs.size(); index++)
            if (state.ivs[index] < request.ivMin[index] || state.ivs[index] > request.ivMax[index]) return false;
        return (request.abilityFilter == 255 || request.abilityFilter == state.ability)
            && (request.genderFilter == 255 || request.genderFilter == state.gender)
            && (request.shinyFilter == 255 || (request.shinyFilter & state.shiny) != 0)
            && (request.natureMask & (1U << state.nature)) != 0
            && (request.hiddenPowerMask & (1U << state.hiddenPower)) != 0;
    }

    std::uint32_t templateAdvances(const Gen5EventPackedRequest &request)
    {
        std::uint32_t advances = 8;
        advances += 2U * (6U - std::popcount(request.fixedIVMask & 0x3fU));
        if (request.gender < 2) advances += 2;
        if (request.nature == 255) advances += 2;
        return advances;
    }

    Gen5EventPackedResult packResult(std::uint64_t seed, const Date *date, std::uint32_t seconds,
                                     std::uint32_t timer0, std::uint32_t buttons, const EventState &state)
    {
        const std::uint32_t packedDate = date == nullptr ? 0 : date->year | (date->month << 16) | (date->day << 24);
        const std::uint32_t metadata = static_cast<std::uint32_t>(state.chatot)
            | (static_cast<std::uint32_t>(state.needle) << 7) | (static_cast<std::uint32_t>(state.ability) << 10)
            | (static_cast<std::uint32_t>(state.gender) << 12) | (static_cast<std::uint32_t>(state.level) << 14)
            | (static_cast<std::uint32_t>(state.nature) << 21) | (static_cast<std::uint32_t>(state.shiny) << 26);
        return {
            static_cast<std::uint32_t>(seed),
            static_cast<std::uint32_t>(seed >> 32),
            packedDate,
            date == nullptr ? 0 : seconds,
            date == nullptr ? 0 : timer0 | (buttons << 16),
            state.advances,
            state.pid,
            metadata,
            static_cast<std::uint32_t>(state.ivs[0]) | (static_cast<std::uint32_t>(state.ivs[1]) << 8)
                | (static_cast<std::uint32_t>(state.ivs[2]) << 16) | (static_cast<std::uint32_t>(state.ivs[3]) << 24),
            static_cast<std::uint32_t>(state.ivs[4]) | (static_cast<std::uint32_t>(state.ivs[5]) << 8)
                | (static_cast<std::uint32_t>(state.hiddenPower) << 16)
                | (static_cast<std::uint32_t>(state.hiddenPowerStrength) << 24),
            state.abilityIndex,
        };
    }

    bool appendResult(const Gen5EventPackedRequest &request, std::uint64_t seed, const Date *date,
                      std::uint32_t seconds, std::uint32_t timer0, std::uint32_t buttons, const EventState &state)
    {
        results.emplace_back(packResult(seed, date, seconds, timer0, buttons, state));
        if (results.size() < request.resultLimit) return false;
        resultLimitReached = true;
        return true;
    }

    bool generateFrames(const Gen5EventPackedRequest &request, std::uint64_t seed, std::uint32_t frameStart,
                        std::uint32_t frameCount, const Date *date, std::uint32_t seconds,
                        std::uint32_t timer0, std::uint32_t buttons, std::uint32_t *framesProcessed = nullptr)
    {
        const auto &personal = personalData()[request.species];
        const std::uint16_t tsv = request.egg != 0 ? 0 : static_cast<std::uint16_t>(request.eventTID ^ request.eventSID);
        const std::uint32_t bootAdvances = initialAdvances(seed, request.version >= 2, request.memoryLink != 0);
        std::uint64_t rng = seed;
        jumpBw(rng, bootAdvances + request.initialAdvances + frameStart);
        const auto templateJump = bwJump(templateAdvances(request) + request.offset);

        for (std::uint32_t count = 0; count < frameCount; count++)
        {
            std::uint64_t go = rng;
            applyJump(go, templateJump);
            EventState state = {};
            state.advances = bootAdvances + request.initialAdvances + frameStart + count;
            state.level = static_cast<std::uint8_t>(request.level);
            for (std::size_t index = 0; index < state.ivs.size(); index++)
            {
                state.ivs[index] = (request.fixedIVMask & (1U << index)) != 0
                    ? static_cast<std::uint8_t>(request.ivs[index])
                    : static_cast<std::uint8_t>(nextBwUInt(go, 32));
            }
            nextBwUInt(go);
            nextBwUInt(go);
            state.pid = createPid(request, tsv, personal.gender, go);
            if (request.nature == 255)
            {
                nextBwUInt(go);
                state.nature = static_cast<std::uint8_t>(nextBwUInt(go, 25));
            }
            else
            {
                state.nature = static_cast<std::uint8_t>(request.nature);
            }
            state.ability = request.ability <= 2 ? static_cast<std::uint8_t>(request.ability)
                                                 : static_cast<std::uint8_t>((state.pid >> 16) & 1U);
            state.gender = genderValue(state.pid, personal.gender);
            state.shiny = shinyValue(state.pid, tsv);
            const auto [powerType, powerStrength] = hiddenPower(state.ivs);
            state.hiddenPower = powerType;
            state.hiddenPowerStrength = powerStrength;
            state.abilityIndex = personal.abilities[state.ability];
            const std::uint32_t prng = nextBwUInt(rng);
            state.chatot = static_cast<std::uint8_t>(((static_cast<std::uint64_t>(prng) * 0x1fffU) >> 32) / 82);
            state.needle = static_cast<std::uint8_t>((static_cast<std::uint64_t>(prng) * 8) >> 32);
            if (matches(request, state) && appendResult(request, seed, date, seconds, timer0, buttons, state))
            {
                if (framesProcessed != nullptr) (*framesProcessed)++;
                return true;
            }
            if (framesProcessed != nullptr) (*framesProcessed)++;
        }
        return false;
    }

    bool validFilterChoice(std::uint32_t value)
    {
        return value <= 2 || value == 255;
    }

    bool validShinyFilter(std::uint32_t value)
    {
        return value == 1 || value == 2 || value == 3 || value == 255;
    }

    bool multiplyWithin(std::uint64_t left, std::uint64_t right, std::uint64_t maximum, std::uint64_t &result)
    {
        if (left != 0 && right > maximum / left) return false;
        result = left * right;
        return result <= maximum;
    }

    std::uint64_t searcherUnits(const Gen5EventPackedRequest &request, std::uint64_t keypressCount)
    {
        const Date start = { request.startYear, request.startMonth, request.startDay };
        const Date end = { request.endYear, request.endMonth, request.endDay };
        const std::uint64_t days = serialDate(end) - serialDate(start) + 1;
        const std::uint64_t timers = request.timer0Max - request.timer0Min + 1;
        return days * timers * keypressCount * 86400ULL;
    }

    bool validRequest(const Gen5EventPackedRequest &request)
    {
        const Date start = { request.startYear, request.startMonth, request.startDay };
        const Date end = { request.endYear, request.endMonth, request.endDay };
        if (request.operation > 1 || request.version > 3 || request.language > 6 || request.dsType > 2
            || request.profileTID > 0xffff || request.profileSID > 0xffff || request.macHigh > 0xffff
            || request.vcount > 0xff || request.timer0Min > request.timer0Max || request.timer0Max > 0xffff
            || request.gxstat > 99 || request.vframe > 99
            || request.keypressCountMask > 0x1ff || request.skipLR > 1 || request.memoryLink > 1
            || request.eventTID > 0xffff || request.eventSID > 0xffff || request.species == 0
            || request.species > 649 || !((request.nature <= 24) || request.nature == 255)
            || request.gender > 2 || request.ability > 3 || request.shiny > 2 || request.level == 0
            || request.level > 100 || request.egg > 1 || request.fixedIVMask > 0x3f
            || request.filtersDisabled > 1
            || !validFilterChoice(request.abilityFilter) || !validFilterChoice(request.genderFilter)
            || !validShinyFilter(request.shinyFilter) || request.natureMask == 0
            || request.natureMask > 0x1ffffffU || request.hiddenPowerMask == 0
            || request.hiddenPowerMask > 0xffffU || request.resultLimit == 0
            || request.resultLimit > maximumResults || request.chunkCount == 0)
            return false;
        for (std::size_t index = 0; index < 6; index++)
            if (request.ivs[index] > 31 || request.ivMin[index] > request.ivMax[index] || request.ivMax[index] > 31)
                return false;
        if (request.maxAdvances > std::numeric_limits<std::uint32_t>::max() - request.initialAdvances
            || request.offset > std::numeric_limits<std::uint32_t>::max() - request.initialAdvances - request.maxAdvances)
            return false;
        if (request.operation == static_cast<std::uint32_t>(Operation::Generator))
        {
            const std::uint64_t total = static_cast<std::uint64_t>(request.maxAdvances) + 1;
            return total <= maximumEvaluations && request.chunkStart < total
                && static_cast<std::uint64_t>(request.chunkStart) + request.chunkCount <= total;
        }
        const auto buttons = keypresses(request);
        if (buttons.empty()) return false;
        if (request.filtersDisabled != 0 || request.offset != 0 || !validDate(start) || !validDate(end)
            || serialDate(start) > serialDate(end))
            return false;
        const std::uint64_t total = searcherUnits(request, buttons.size());
        std::uint64_t evaluations;
        return total != 0
            && multiplyWithin(total, static_cast<std::uint64_t>(request.maxAdvances) + 1, maximumEvaluations, evaluations)
            && request.chunkStart < total && static_cast<std::uint64_t>(request.chunkStart) + request.chunkCount <= total;
    }

    void runGenerator(const Gen5EventPackedRequest &request)
    {
        const std::uint64_t seed = (static_cast<std::uint64_t>(request.seedHigh) << 32) | request.seedLow;
        generateFrames(request, seed, request.chunkStart, request.chunkCount, nullptr, 0, 0, 0, &processedCount);
    }

    void runSearcher(const Gen5EventPackedRequest &request)
    {
        const auto buttons = keypresses(request);
        const std::uint32_t startSerial = serialDate({ request.startYear, request.startMonth, request.startDay });
        const std::uint32_t endSerial = serialDate({ request.endYear, request.endMonth, request.endDay });
        const std::uint64_t days = static_cast<std::uint64_t>(endSerial - startSerial) + 1;
        const std::uint64_t keyCount = buttons.size();
        for (std::uint64_t offset = 0; offset < request.chunkCount; offset++)
        {
            std::uint64_t index = static_cast<std::uint64_t>(request.chunkStart) + offset;
            const std::uint32_t seconds = static_cast<std::uint32_t>(index % 86400ULL);
            index /= 86400ULL;
            const std::uint32_t buttonMask = buttons[index % keyCount];
            index /= keyCount;
            const Date date = dateFromSerial(startSerial + static_cast<std::uint32_t>(index % days));
            index /= days;
            const std::uint32_t timer0 = request.timer0Min + static_cast<std::uint32_t>(index);
            const std::uint64_t seed = calculateSeed(request, date, seconds, buttonMask, timer0);
            const bool stopped = generateFrames(
                request, seed, 0, request.maxAdvances + 1, &date, seconds, timer0, buttonMask);
            processedCount++;
            if (stopped) return;
        }
    }
}

static_assert(sizeof(Gen5EventPackedRequest) == 64 * sizeof(std::uint32_t));
static_assert(sizeof(Gen5EventPackedResult) == 11 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen5event_api_version()
    {
        return apiVersion;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5event_search(const Gen5EventPackedRequest *request)
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
        results.reserve(std::min<std::uint32_t>(request->resultLimit, request->chunkCount));
        if (request->operation == static_cast<std::uint32_t>(Operation::Generator)) runGenerator(*request);
        else runSearcher(*request);
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen5event_result_ptr()
    {
        return results.empty() ? 0 : reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5event_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5event_processed_count()
    {
        return processedCount;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5event_limit_reached()
    {
        return resultLimitReached ? 1U : 0U;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5event_last_error()
    {
        return lastError;
    }

#ifndef __EMSCRIPTEN__
    std::uint32_t gen5event_test_generate(
        const Gen5EventPackedRequest *request, Gen5EventPackedResult *output, std::uint32_t capacity)
    {
        if (request == nullptr || output == nullptr || capacity == 0) return 0;
        auto copy = *request;
        copy.operation = static_cast<std::uint32_t>(Operation::Generator);
        copy.chunkStart = 0;
        copy.chunkCount = copy.maxAdvances + 1;
        copy.resultLimit = std::min(copy.resultLimit, capacity);
        const auto count = gen5event_search(&copy);
        std::copy_n(results.begin(), std::min<std::uint32_t>(count, capacity), output);
        return std::min<std::uint32_t>(count, capacity);
    }

    std::uint64_t gen5event_test_seed(
        const Gen5EventPackedRequest *request, std::uint32_t second, std::uint32_t buttonMask, std::uint32_t timer0)
    {
        if (request == nullptr) return 0;
        return calculateSeed(*request, { request->startYear, request->startMonth, request->startDay }, second, buttonMask, timer0);
    }
#endif
}
