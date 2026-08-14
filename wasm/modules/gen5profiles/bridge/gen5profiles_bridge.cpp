/*
 * PokeRNGKit Gen V Profile Calibrator WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 ProfileSearcher5, SHA1,
 * Nazos, Keypresses, MTFast and Utilities5 by Admiral_Fish, bumba,
 * and EzPzStreamz (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen5profiles_bridge.h"

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
    constexpr std::uint32_t maximumResults = 100000;
    constexpr std::uint32_t maximumNeedles = 100;
    constexpr std::uint64_t maximumWork = 250000000;
    constexpr std::uint64_t bwMultiplier = 0x5d588b656c078965ULL;
    constexpr std::uint64_t bwAdd = 0x269ec3ULL;

    enum class Mode : std::uint32_t
    {
        IVs = 0,
        Needles = 1,
        Seed = 2,
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

    thread_local std::vector<Gen5ProfilesPackedResult> results;
    thread_local std::uint64_t processedCount = 0;
    thread_local std::uint32_t lastError = ErrorCode::None;
    thread_local bool resultLimitReached = false;

    constexpr bool inRange(std::uint32_t value, std::uint32_t maximum)
    {
        return value <= maximum;
    }

    constexpr bool ordered(std::uint32_t minimum, std::uint32_t maximum, std::uint32_t limit)
    {
        return minimum <= maximum && maximum <= limit;
    }

    constexpr std::uint32_t bcd(std::uint32_t value)
    {
        return ((value / 10) << 4) | (value % 10);
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

    constexpr std::uint32_t weekday(std::uint32_t year, std::uint32_t month, std::uint32_t day)
    {
        const std::uint32_t a = month < 3 ? 1 : 0;
        const std::uint32_t y = year + 4800 - a;
        const std::uint32_t m = month + 12 * a - 3;
        const std::uint32_t jd = day + ((153 * m + 2) / 5) - 32045 + 365 * y + y / 4 - y / 100 + y / 400;
        return (jd + 1) % 7;
    }

    NazoInput nazoInput(std::uint32_t language, std::uint32_t version, bool dsi)
    {
        // Source ordering follows the PokeRNGKit domain: ENG, SPA, FRE, ITA, DEU, JPN, KOR.
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
        {
            if ((mask & (1U << index)) != 0) value -= values[index];
        }
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
        while (advances-- != 0) nextBw(seed);
    }

    std::uint32_t probabilityTable(std::uint64_t &seed)
    {
        // The fifth round's first RNG call is counted by this initial value.
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

    std::array<std::uint32_t, 8> mtIVs(std::uint32_t seed, std::uint32_t advances)
    {
        std::array<std::uint32_t, 10> state = {};
        for (std::uint32_t index = 1; index < 10; index++)
        {
            state[index - 1] = seed;
            seed = 0x6c078965U * (seed ^ (seed >> 30)) + index;
        }
        for (std::uint32_t index = 10; index < 397; index++) seed = 0x6c078965U * (seed ^ (seed >> 30)) + index;
        std::array<std::uint32_t, 8> values = {};
        for (std::uint32_t index = 0; index < values.size(); index++)
        {
            seed = 0x6c078965U * (seed ^ (seed >> 30)) + index + 397;
            const std::uint32_t mixed = (state[index] & 0x80000000U) | (state[index + 1] & 0x7fffffffU);
            std::uint32_t value = (mixed >> 1) ^ seed;
            if ((mixed & 1U) != 0) value ^= 0x9908b0dfU;
            value ^= value >> 11;
            value ^= (value << 7) & 0x9d2c5680U;
            value ^= (value << 15) & 0xe8000000U;
            values[index] = value >> 27;
        }
        if (advances == 0) return values;
        std::array<std::uint32_t, 8> shifted = {};
        for (std::uint32_t index = 0; index + advances < values.size(); index++) shifted[index] = values[index + advances];
        return shifted;
    }

    std::uint64_t calculateSeed(const Gen5ProfilesPackedRequest &request, std::uint32_t vframe, std::uint32_t gxstat,
                                std::uint32_t timer0, std::uint32_t vcount, std::uint32_t second)
    {
        std::array<std::uint32_t, 80> words = {};
        const auto nazos = nazoValues(request.language, request.version, request.dsType);
        for (std::size_t index = 0; index < nazos.size(); index++) words[index] = nazos[index];
        words[5] = std::byteswap((vcount << 16) | timer0);
        const std::uint64_t mac = (static_cast<std::uint64_t>(request.macHigh) << 32) | request.macLow;
        words[6] = static_cast<std::uint32_t>(mac & 0xffffU);
        words[7] = static_cast<std::uint32_t>((mac >> 16) ^ (static_cast<std::uint64_t>(vframe) << 24) ^ gxstat);
        words[8] = (bcd(request.year % 100) << 24) | (bcd(request.month) << 16) | (bcd(request.day) << 8)
            | weekday(request.year, request.month, request.day);
        const std::uint32_t secondsSinceMidnight = request.hour * 3600 + request.minute * 60 + second;
        words[9] = (bcd(request.hour) << 24) | (bcd(request.minute) << 16) | (bcd(second) << 8);
        if (request.hour >= 12) words[9] |= 0x40000000U;
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
        return nextBw(seed);
    }

    bool validResult(const Gen5ProfilesPackedRequest &request, const std::uint8_t *needles, std::uint32_t needleCount, std::uint64_t seed)
    {
        const auto mode = static_cast<Mode>(request.mode);
        if (mode == Mode::Seed)
            return seed == ((static_cast<std::uint64_t>(request.seedHigh) << 32) | request.seedLow);
        if (mode == Mode::IVs)
        {
            const auto values = mtIVs(static_cast<std::uint32_t>(seed >> 32), request.version >= 2 ? 2 : 0);
            for (std::uint32_t index = 0; index < 6; index++)
                if (values[index] < request.minIVs[index] || values[index] > request.maxIVs[index]) return false;
            return true;
        }

        const bool sequel = request.version >= 2;
        const bool unovaLink = request.needleType == 0;
        std::uint64_t rng = seed;
        const auto advances = initialAdvances(seed, sequel, request.memoryLink != 0);
        advanceBw(rng, advances);
        if (unovaLink && request.memoryLink == 0) advanceBw(rng, 1);
        for (std::uint32_t index = 0; index < needleCount; index++)
        {
            if (nextBw(rng, 8) != needles[index]) return false;
            if (unovaLink) advanceBw(rng, 1);
        }
        return true;
    }

    bool validateRequest(const Gen5ProfilesPackedRequest &request, const std::uint8_t *needles, std::uint32_t needleCount)
    {
        if (request.mode > static_cast<std::uint32_t>(Mode::Seed) || request.version > 3 || request.language > 6 || request.dsType > 2
            || request.macHigh > 0xffff || request.buttonMask > 0xfff || request.year < 2000 || request.year > 2099
            || request.month < 1 || request.month > 12 || request.day < 1 || request.day > daysInMonth(request.year, request.month)
            || request.hour > 23 || request.minute > 59 || !ordered(request.minSeconds, request.maxSeconds, 59)
            || !ordered(request.minVCount, request.maxVCount, 0xff) || !ordered(request.minTimer0, request.maxTimer0, 0xffff)
            || !ordered(request.minGxStat, request.maxGxStat, 99) || !ordered(request.minVFrame, request.maxVFrame, 99)
            || request.needleType > 1 || request.memoryLink > 1 || request.resultLimit == 0 || request.resultLimit > maximumResults
            || needleCount > maximumNeedles || (needleCount != 0 && needles == nullptr)
            || (request.mode == static_cast<std::uint32_t>(Mode::Needles) && needleCount == 0)) return false;
        for (std::uint32_t index = 0; index < 6; index++)
            if (!ordered(request.minIVs[index], request.maxIVs[index], 31)) return false;
        for (std::uint32_t index = 0; index < needleCount; index++)
            if (!inRange(needles[index], 7)) return false;
        return true;
    }
}

static_assert(sizeof(Gen5ProfilesPackedRequest) == 39 * sizeof(std::uint32_t));
static_assert(sizeof(Gen5ProfilesPackedResult) == 4 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen5profiles_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5profiles_search(
        const Gen5ProfilesPackedRequest *request, const std::uint8_t *needles, std::uint32_t needleCount)
    {
        results.clear();
        processedCount = 0;
        lastError = ErrorCode::None;
        resultLimitReached = false;
        if (request == nullptr || !validateRequest(*request, needles, needleCount))
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        const std::uint64_t work = static_cast<std::uint64_t>(request->maxSeconds - request->minSeconds + 1)
            * (request->maxVCount - request->minVCount + 1) * (request->maxTimer0 - request->minTimer0 + 1)
            * (request->maxGxStat - request->minGxStat + 1) * (request->maxVFrame - request->minVFrame + 1);
        if (work > maximumWork)
        {
            lastError = ErrorCode::RangeTooLarge;
            return 0;
        }
        results.reserve(request->resultLimit);
        for (std::uint32_t vframe = request->minVFrame; vframe <= request->maxVFrame; vframe++)
            for (std::uint32_t gxstat = request->minGxStat; gxstat <= request->maxGxStat; gxstat++)
                for (std::uint32_t timer0 = request->minTimer0; timer0 <= request->maxTimer0; timer0++)
                    for (std::uint32_t vcount = request->minVCount; vcount <= request->maxVCount; vcount++)
                        for (std::uint32_t second = request->minSeconds; second <= request->maxSeconds; second++)
                        {
                            const auto seed = calculateSeed(*request, vframe, gxstat, timer0, vcount, second);
                            processedCount++;
                            if (!validResult(*request, needles, needleCount, seed)) continue;
                            results.push_back({ static_cast<std::uint32_t>(seed), static_cast<std::uint32_t>(seed >> 32),
                                                second | (vcount << 8) | (timer0 << 16), gxstat | (vframe << 8) });
                            if (results.size() >= request->resultLimit)
                            {
                                resultLimitReached = processedCount < work;
                                return static_cast<std::uint32_t>(results.size());
                            }
                        }
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen5profiles_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5profiles_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5profiles_processed_low()
    {
        return static_cast<std::uint32_t>(processedCount);
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5profiles_processed_high()
    {
        return static_cast<std::uint32_t>(processedCount >> 32);
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5profiles_limit_reached() { return resultLimitReached ? 1 : 0; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen5profiles_last_error() { return lastError; }
}
