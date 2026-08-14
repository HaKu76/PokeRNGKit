/*
 * PokeRNGKit Gen V Adjacent Seeds WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 AdjacentSeedsCalculator,
 * SHA1, Nazos, Keypresses, MT, BWRNG and Utilities5 by Admiral_Fish,
 * bumba, and EzPzStreamz (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen5adjacentseeds_bridge.h"

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
    constexpr std::uint32_t maximumRows = 100000;
    constexpr std::uint32_t previewCount = 25;
    constexpr std::uint64_t bwMultiplier = 0x5d588b656c078965ULL;
    constexpr std::uint64_t bwAdd = 0x269ec3ULL;
    constexpr std::int64_t dateRangeDays = 36525;
    constexpr std::int64_t secondsPerDay = 86400;
    constexpr std::uint8_t jumpTable[9][2493] = {
#include "MTJump.txt"
    };

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        RangeTooLarge = 2,
    };

    struct NazoInput
    {
        std::uint32_t base;
        std::uint32_t zero;
        std::uint32_t one;
        bool sequel;
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

    thread_local std::vector<Gen5AdjacentSeedsPackedResult> results;
    thread_local std::uint32_t processedCount = 0;
    thread_local std::uint32_t lastError = ErrorCode::None;

    constexpr bool leapYear(std::uint32_t year)
    {
        return year % 4 == 0;
    }

    constexpr std::uint32_t daysInMonth(std::uint32_t year, std::uint32_t month)
    {
        constexpr std::array<std::uint32_t, 12> days = { 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 };
        return month == 2 && leapYear(year) ? 29 : days[month - 1];
    }

    constexpr std::uint32_t bcd(std::uint32_t value)
    {
        return ((value / 10) << 4) | (value % 10);
    }

    constexpr std::uint32_t weekday(std::uint32_t year, std::uint32_t month, std::uint32_t day)
    {
        const std::uint32_t a = month < 3 ? 1 : 0;
        const std::uint32_t y = year + 4800 - a;
        const std::uint32_t m = month + 12 * a - 3;
        const std::uint32_t jd = day + ((153 * m + 2) / 5) - 32045 + 365 * y + y / 4 - y / 100 + y / 400;
        return (jd + 1) % 7;
    }

    std::int64_t dayIndex(std::uint32_t year, std::uint32_t month, std::uint32_t day)
    {
        std::int64_t value = 0;
        for (std::uint32_t current = 2000; current < year; current++) value += leapYear(current) ? 366 : 365;
        for (std::uint32_t current = 1; current < month; current++) value += daysInMonth(year, current);
        return value + day - 1;
    }

    bool offsetDateTime(const Gen5AdjacentSeedsPackedRequest &request, std::int32_t offset, DateTimeParts &output)
    {
        std::int64_t value = dayIndex(request.year, request.month, request.day) * secondsPerDay
            + request.hour * 3600 + request.minute * 60 + request.second + offset;
        if (value < 0) return false;
        const auto range = dateRangeDays * secondsPerDay;
        if (value >= range) value %= range;

        std::int64_t days = value / secondsPerDay;
        std::uint32_t year = 2000;
        while (days >= (leapYear(year) ? 366 : 365))
        {
            days -= leapYear(year) ? 366 : 365;
            year++;
        }
        std::uint32_t month = 1;
        while (days >= daysInMonth(year, month))
        {
            days -= daysInMonth(year, month);
            month++;
        }
        const auto daySeconds = static_cast<std::uint32_t>(value % secondsPerDay);
        output = { year, month, static_cast<std::uint32_t>(days + 1), daySeconds / 3600,
                   (daySeconds % 3600) / 60, daySeconds % 60 };
        return true;
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
        std::uint64_t multiplier = bwMultiplier;
        std::uint64_t add = bwAdd;
        std::uint64_t jumpMultiplier = 1;
        std::uint64_t jumpAdd = 0;
        while (advances != 0)
        {
            if ((advances & 1U) != 0)
            {
                jumpAdd = jumpAdd * multiplier + add;
                jumpMultiplier *= multiplier;
            }
            add *= multiplier + 1;
            multiplier *= multiplier;
            advances >>= 1;
        }
        seed = seed * jumpMultiplier + jumpAdd;
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

    std::uint32_t initialAdvances(std::uint64_t seed, bool sequel, bool memoryLink)
    {
        std::uint32_t count = 0;
        for (std::uint32_t index = 0; index < 5; index++)
        {
            count += probabilityTable(seed);
            if (sequel && index == 0)
            {
                const auto amount = memoryLink ? 2U : 3U;
                advanceBw(seed, amount);
                count += amount;
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

    class MT
    {
    public:
        MT(std::uint32_t seed, std::uint32_t advances) : index(624)
        {
            state[0] = seed;
            for (std::uint32_t current = 1; current < state.size(); current++)
            {
                seed = 0x6c078965U * (seed ^ (seed >> 30)) + current;
                state[current] = seed;
            }
            jump(advances);
        }

        std::uint32_t next()
        {
            if (index == 624)
            {
                shuffle();
                index = 0;
            }
            std::uint32_t value = state[index++];
            value ^= value >> 11;
            value ^= (value << 7) & 0x9d2c5680U;
            value ^= (value << 15) & 0xefc60000U;
            value ^= value >> 18;
            return value;
        }

    private:
        std::array<std::uint32_t, 624> state = {};
        std::uint32_t index = 0;

        MT() = default;

        void addState(const MT &other)
        {
            for (std::uint32_t current = 0; current < state.size(); current++)
                state[current] ^= other.state[(other.index + current) % state.size()];
        }

        void advance(std::uint32_t advances)
        {
            std::uint64_t amount = static_cast<std::uint64_t>(advances) + index;
            while (amount >= 624)
            {
                shuffle();
                amount -= 624;
            }
            index = static_cast<std::uint32_t>(amount);
        }

        void jump(std::uint32_t advances)
        {
            index = 0;
            std::uint32_t high = advances >> 23;
            const std::uint32_t low = advances & 0x7fffffU;
            if (low != 0)
            {
                const std::uint32_t remainder = low % 624;
                advance(low - remainder);
                for (std::uint32_t current = 0; current < remainder; current++) nextState();
            }
            for (std::uint32_t table = 0; high != 0; table++, high >>= 1)
            {
                if ((high & 1U) == 0) continue;
                MT temporary;
                for (std::int32_t byte = 2492; byte >= 0; byte--)
                {
                    const auto value = jumpTable[table][byte];
                    for (std::uint32_t bit = 0; bit < 8; bit++)
                    {
                        if ((value & (1U << bit)) != 0) temporary.addState(*this);
                        nextState();
                    }
                }
                *this = temporary;
            }
            shuffle();
        }

        void nextState()
        {
            const std::uint32_t value = (state[index] & 0x80000000U)
                | (state[(index + 1) % state.size()] & 0x7fffffffU);
            state[index] = state[(index + 397) % state.size()] ^ (value >> 1)
                ^ ((value & 1U) != 0 ? 0x9908b0dfU : 0U);
            index = (index + 1) % state.size();
        }

        void shuffle()
        {
            for (std::uint32_t current = 0; current < state.size(); current++)
            {
                const std::uint32_t value = (state[current] & 0x80000000U)
                    | (state[(current + 1) % state.size()] & 0x7fffffffU);
                state[current] = state[(current + 397) % state.size()] ^ (value >> 1)
                    ^ ((value & 1U) != 0 ? 0x9908b0dfU : 0U);
            }
        }
    };

    std::array<std::uint8_t, 6> generateIVs(std::uint64_t seed, std::uint32_t version, std::uint32_t ivAdvance, bool roamer)
    {
        const bool sequel = version >= 2;
        MT rng(static_cast<std::uint32_t>(seed >> 32), ivAdvance + (sequel ? 2U : 0U) + (roamer ? 1U : 0U));
        std::array<std::uint8_t, 6> ivs = {};
        ivs[0] = static_cast<std::uint8_t>(rng.next() >> 27);
        ivs[1] = static_cast<std::uint8_t>(rng.next() >> 27);
        ivs[2] = static_cast<std::uint8_t>(rng.next() >> 27);
        if (roamer)
        {
            ivs[4] = static_cast<std::uint8_t>(rng.next() >> 27);
            ivs[5] = static_cast<std::uint8_t>(rng.next() >> 27);
            ivs[3] = static_cast<std::uint8_t>(rng.next() >> 27);
        }
        else
        {
            ivs[3] = static_cast<std::uint8_t>(rng.next() >> 27);
            ivs[4] = static_cast<std::uint8_t>(rng.next() >> 27);
            ivs[5] = static_cast<std::uint8_t>(rng.next() >> 27);
        }
        return ivs;
    }

    std::uint64_t calculateSeed(const Gen5AdjacentSeedsPackedRequest &request, const DateTimeParts &dateTime,
                                std::uint32_t timer0)
    {
        std::array<std::uint32_t, 80> words = {};
        const auto nazos = nazoValues(request.language, request.version, request.dsType);
        for (std::size_t index = 0; index < nazos.size(); index++) words[index] = nazos[index];
        words[5] = std::byteswap((request.vcount << 16) | timer0);
        const std::uint64_t mac = (static_cast<std::uint64_t>(request.macHigh) << 32) | request.macLow;
        words[6] = static_cast<std::uint32_t>(mac & 0xffffU);
        words[7] = static_cast<std::uint32_t>((mac >> 16) ^ (static_cast<std::uint64_t>(request.vframe) << 24) ^ request.gxstat);
        words[8] = (bcd(dateTime.year % 100) << 24) | (bcd(dateTime.month) << 16) | (bcd(dateTime.day) << 8)
            | weekday(dateTime.year, dateTime.month, dateTime.day);
        const std::uint32_t secondsSinceMidnight = dateTime.hour * 3600 + dateTime.minute * 60 + dateTime.second;
        words[9] = (bcd(dateTime.hour) << 24) | (bcd(dateTime.minute) << 16) | (bcd(dateTime.second) << 8);
        if (dateTime.hour >= 12) words[9] |= 0x40000000U;
        if (secondsSinceMidnight >= 43200 && request.dsType == 2) words[9] ^= 0x40000000U;
        words[12] = keypressValue(request.buttonMask);
        words[13] = 0x80000000U;
        words[15] = 0x000001a0U;
        for (std::uint32_t index = 16; index < words.size(); index++)
            words[index] = std::rotl(words[index - 3] ^ words[index - 8] ^ words[index - 14] ^ words[index - 16], 1);

        std::uint32_t a = 0x67452301U;
        std::uint32_t b = 0xefcdab89U;
        std::uint32_t c = 0x98badcfeU;
        std::uint32_t d = 0x10325476U;
        std::uint32_t e = 0xc3d2e1f0U;
        for (std::uint32_t index = 0; index < words.size(); index++)
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
        const std::uint32_t second = std::byteswap(b + 0xefcdab89U);
        std::uint64_t seed = (static_cast<std::uint64_t>(second) << 32) | first;
        return nextBw(seed);
    }

    std::uint32_t packIVs(const std::array<std::uint8_t, 6> &ivs)
    {
        std::uint32_t packed = 0;
        for (std::uint32_t index = 0; index < ivs.size(); index++) packed |= static_cast<std::uint32_t>(ivs[index]) << (index * 5);
        return packed;
    }

    bool validateRequest(const Gen5AdjacentSeedsPackedRequest &request)
    {
        if (request.version > 3 || request.language > 6 || request.dsType > 2 || request.macHigh > 0xffff
            || request.vcount > 0xff || request.timer0Min > request.timer0Max || request.timer0Max > 0xffff
            || request.gxstat > 99 || request.vframe > 99 || request.memoryLink > 1 || request.year < 2000
            || request.year > 2099 || request.month < 1 || request.month > 12 || request.day < 1
            || request.day > daysInMonth(request.year, request.month) || request.hour > 23 || request.minute > 59
            || request.second > 59 || request.seconds > 99 || request.buttonMask > 0xfff || request.roamer > 1
            || request.minSecondOffset < -static_cast<std::int32_t>(request.seconds)
            || request.maxSecondOffset > static_cast<std::int32_t>(request.seconds)
            || request.minSecondOffset > request.maxSecondOffset) return false;
        const std::uint32_t mtOffset = (request.version >= 2 ? 2U : 0U) + request.roamer;
        return static_cast<std::uint64_t>(request.initialIVAdvance) + request.maxIVAdvances + mtOffset <= 0xffffffffULL;
    }
}

static_assert(sizeof(Gen5AdjacentSeedsPackedRequest) == 24 * sizeof(std::uint32_t));
static_assert(sizeof(Gen5AdjacentSeedsPackedResult) == 8 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen5adjacentseeds_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5adjacentseeds_generate(const Gen5AdjacentSeedsPackedRequest *request)
    {
        results.clear();
        processedCount = 0;
        lastError = ErrorCode::None;
        if (request == nullptr || !validateRequest(*request))
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        const std::uint64_t secondCount = static_cast<std::uint64_t>(request->maxSecondOffset - request->minSecondOffset + 1);
        const std::uint64_t timerCount = request->timer0Max - request->timer0Min + 1;
        const std::uint64_t ivCount = static_cast<std::uint64_t>(request->maxIVAdvances) + 1;
        const std::uint64_t work = secondCount * timerCount * ivCount;
        if (work > maximumRows)
        {
            lastError = ErrorCode::RangeTooLarge;
            return 0;
        }
        results.reserve(static_cast<std::size_t>(work));
        for (std::int32_t offset = request->minSecondOffset; offset <= request->maxSecondOffset; offset++)
        {
            DateTimeParts dateTime = {};
            if (!offsetDateTime(*request, offset, dateTime))
            {
                processedCount += static_cast<std::uint32_t>(timerCount * ivCount);
                continue;
            }
            for (std::uint32_t timer0 = request->timer0Min; timer0 <= request->timer0Max; timer0++)
            {
                const auto seed = calculateSeed(*request, dateTime, timer0);
                const auto pidAdvance = initialAdvances(seed, request->version >= 2, request->memoryLink != 0);
                for (std::uint64_t ivOffset = 0; ivOffset <= request->maxIVAdvances; ivOffset++)
                {
                    const auto ivAdvance
                        = request->initialIVAdvance + static_cast<std::uint32_t>(ivOffset);
                    const auto ivs = generateIVs(seed, request->version, ivAdvance, request->roamer != 0);
                    const bool target = offset == 0 && timer0 == request->timer0Min && ivAdvance == request->initialIVAdvance;
                    results.push_back({ static_cast<std::uint32_t>(seed), static_cast<std::uint32_t>(seed >> 32),
                                        dateTime.year | (dateTime.month << 16) | (dateTime.day << 24),
                                        dateTime.hour | (dateTime.minute << 8) | (dateTime.second << 16), timer0,
                                        ivAdvance, packIVs(ivs), pidAdvance | (target ? 0x80000000U : 0U) });
                    processedCount++;
                }
            }
        }
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen5adjacentseeds_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5adjacentseeds_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5adjacentseeds_processed_count() { return processedCount; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5adjacentseeds_preview(std::uint32_t seedLow, std::uint32_t seedHigh,
                                                                 std::uint32_t pidAdvance, std::uint32_t chatot,
                                                                 std::uint8_t *output, std::uint32_t capacity)
    {
        lastError = ErrorCode::None;
        if (output == nullptr || capacity < previewCount || chatot > 1)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        std::uint64_t seed = (static_cast<std::uint64_t>(seedHigh) << 32) | seedLow;
        advanceBw(seed, pidAdvance);
        for (std::uint32_t index = 0; index < previewCount; index++)
            output[index] = static_cast<std::uint8_t>(chatot != 0 ? nextBw(seed, 0x1fff) / 82 : nextBw(seed, 8));
        return previewCount;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5adjacentseeds_last_error() { return lastError; }
}
