/*
 * PokeRNGKit Gen V ID WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 IDGenerator5, IDSearcher5,
 * Searcher5, SHA1, Nazos, Keypresses and Utilities5 by Admiral_Fish,
 * bumba, and EzPzStreamz (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen5id_bridge.h"

#include <array>
#include <bit>
#include <cstddef>
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
    constexpr std::uint32_t maximumResults = 100000;
    constexpr std::uint64_t maximumEvaluations = 250000000;
    constexpr std::uint64_t bwMultiplier = 0x5d588b656c078965ULL;
    constexpr std::uint64_t bwAdd = 0x269ec3ULL;

    enum class Operation : std::uint32_t
    {
        Search = 0,
        SeedFinder = 1,
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
        bool sequel;
    };

    struct GenerationStatus
    {
        bool stopped;
        bool moreFrames;
        bool advanceOverflow;
    };

    thread_local std::vector<Gen5IdPackedResult> results;
    thread_local std::uint64_t processedCount = 0;
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
            if ((mask & (1U << index)) != 0) value -= values[index];
        return value;
    }

    bool validKeypress(std::uint32_t mask, bool skipLR)
    {
        if (skipLR && (mask & 0x3U) != 0) return false;
        if ((mask & 0xc00U) == 0xc00U || (mask & 0x300U) == 0x300U || (mask & 0xc3U) == 0xc3U) return false;
        return true;
    }

    std::vector<std::uint32_t> keypresses(const Gen5IdPackedRequest &request)
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

    std::uint32_t initialAdvancesID(std::uint64_t seed, bool sequel)
    {
        std::uint32_t count = sequel ? 10U : 2U;
        for (std::uint32_t index = 0; index < 3; index++)
        {
            count += probabilityTable(seed);
            if (sequel && index == 0) advanceBw(seed, 2);
            else if (sequel && index == 1) advanceBw(seed, 4);
        }
        return count;
    }

    std::uint64_t calculateSeed(const Gen5IdPackedRequest &request, const Date &date, std::uint32_t secondsSinceMidnight,
                                std::uint32_t buttonMask, std::uint32_t timer0)
    {
        std::array<std::uint32_t, 80> words = {};
        const auto nazos = nazoValues(request.language, request.version, request.dsType);
        for (std::size_t index = 0; index < nazos.size(); index++) words[index] = nazos[index];
        words[5] = std::byteswap((request.vcount << 16) | timer0);
        const std::uint64_t mac = (static_cast<std::uint64_t>(request.macHigh) << 32) | request.macLow;
        words[6] = static_cast<std::uint32_t>(mac & 0xffffU);
        words[7] = static_cast<std::uint32_t>((mac >> 16) ^ (static_cast<std::uint64_t>(request.vframe) << 24) ^ request.gxstat);
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

    template <typename Emit>
    GenerationStatus generate(std::uint64_t seed, bool sequel, std::uint32_t maxAdvances, Emit emit)
    {
        const auto initial = initialAdvancesID(seed, sequel);
        if (maxAdvances > std::numeric_limits<std::uint32_t>::max() - initial) return { false, false, true };
        std::uint64_t rng = seed;
        advanceBw(rng, initial);
        for (std::uint64_t count = 0; count <= maxAdvances; count++)
        {
            const std::uint32_t value = nextBw(rng, 0xffffffffU);
            const std::uint16_t tid = value & 0xffffU;
            const std::uint16_t sid = value >> 16;
            const std::uint16_t tsv = (tid ^ sid) >> 3;
            if (emit(initial, static_cast<std::uint32_t>(initial + static_cast<std::uint32_t>(count)), tid, sid, tsv))
                return { true, count < maxAdvances, false };
        }
        return { false, false, false };
    }

    bool matches(const Gen5IdPackedRequest &request, std::uint16_t tid, std::uint16_t sid, std::uint16_t tsv)
    {
        const auto operation = static_cast<Operation>(request.operation);
        if (operation == Operation::SeedFinder) return tid == request.tid;
        if ((request.filterFlags & 4U) != 0 && tid != request.tid) return false;
        if ((request.filterFlags & 8U) != 0 && sid != request.sid) return false;
        if ((request.filterFlags & 1U) == 0) return true;
        const std::uint16_t psv = static_cast<std::uint16_t>((request.pid >> 16) ^ (request.pid & 0xffffU));
        bool shiny = (psv >> 3) == tsv;
        if (shiny && (request.filterFlags & 2U) != 0)
        {
            const bool pidBit = ((request.pid >> 31) ^ (request.pid & 1U)) != 0;
            const bool idBit = ((tid & 1U) ^ (sid & 1U)) != 0;
            shiny = idBit == pidBit;
        }
        return shiny;
    }

    bool validateRequest(const Gen5IdPackedRequest &request)
    {
        const Date start = { request.startYear, request.startMonth, request.startDay };
        const Date end = { request.endYear, request.endMonth, request.endDay };
        if (request.operation > static_cast<std::uint32_t>(Operation::SeedFinder) || request.version > 3 || request.language > 6
            || request.dsType > 2 || request.macHigh > 0xffff || request.vcount > 0xff || request.timer0Min > 0xffff
            || request.timer0Max > 0xffff || request.gxstat > 99 || request.vframe > 99 || request.keypressCountMask > 0x1ff
            || request.skipLR > 1 || request.resultLimit == 0 || request.resultLimit > maximumResults || !validDate(start)
            || !validDate(end) || serialDate(start) > serialDate(end) || request.hour > 23 || request.minute > 59
            || request.minSecond > 59 || request.maxSecond > 59 || request.filterFlags > 0xf || request.tid > 0xffff
            || request.sid > 0xffff || request.chunkUnitCount == 0)
            return false;
        if (request.operation == static_cast<std::uint32_t>(Operation::Search) && (request.filterFlags & 2U) != 0
            && (request.filterFlags & 1U) == 0)
            return false;
        return true;
    }
}

static_assert(sizeof(Gen5IdPackedRequest) == 31 * sizeof(std::uint32_t));
static_assert(sizeof(Gen5IdPackedResult) == 9 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen5id_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5id_search(const Gen5IdPackedRequest *request)
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
        const std::uint64_t keypressCount = buttons.size();
        const Date start = { request->startYear, request->startMonth, request->startDay };
        const Date end = { request->endYear, request->endMonth, request->endDay };
        const std::uint64_t dateCount = serialDate(end) - serialDate(start) + 1;
        const std::uint64_t timer0Count
            = request->timer0Min > request->timer0Max ? 0U : request->timer0Max - request->timer0Min + 1;
        const auto operation = static_cast<Operation>(request->operation);
        const std::uint64_t unitCount
            = timer0Count * keypressCount * (operation == Operation::Search ? dateCount : 1U);
        const std::uint64_t secondsPerUnit = operation == Operation::Search
            ? 86400U
            : (request->minSecond > request->maxSecond ? 0U : request->maxSecond - request->minSecond + 1);
        if (unitCount == 0 || secondsPerUnit == 0) return 0;
        const std::uint64_t candidateCount = unitCount * secondsPerUnit;
        const std::uint64_t advancesPerCandidate = static_cast<std::uint64_t>(request->maxAdvances) + 1;
        const bool guaranteedMatch = operation == Operation::Search && (request->filterFlags & 0xdU) == 0;
        if (!guaranteedMatch
            && (candidateCount > maximumEvaluations || advancesPerCandidate > maximumEvaluations / candidateCount))
        {
            lastError = ErrorCode::RangeTooLarge;
            return 0;
        }
        const std::uint64_t chunkEnd = static_cast<std::uint64_t>(request->chunkStartUnit) + request->chunkUnitCount;
        if (request->chunkStartUnit >= unitCount || chunkEnd > unitCount)
        {
            lastError = ErrorCode::InvalidChunk;
            return 0;
        }

        results.reserve(request->resultLimit);
        const auto startSerial = serialDate(start);
        for (std::uint64_t unit = request->chunkStartUnit; unit < chunkEnd; unit++)
        {
            std::uint64_t remaining = unit;
            const auto keypressIndex = remaining % keypressCount;
            remaining /= keypressCount;
            std::uint32_t dateIndex = 0;
            if (operation == Operation::Search)
            {
                dateIndex = static_cast<std::uint32_t>(remaining % dateCount);
                remaining /= dateCount;
            }
            const auto timer0 = request->timer0Min + static_cast<std::uint32_t>(remaining);
            const auto date = dateFromSerial(startSerial + dateIndex);
            const auto buttonMask = buttons[keypressIndex];
            const std::uint32_t firstSecond
                = operation == Operation::Search ? 0U : request->hour * 3600 + request->minute * 60 + request->minSecond;
            const std::uint32_t lastSecond
                = operation == Operation::Search ? 86399U : request->hour * 3600 + request->minute * 60 + request->maxSecond;
            for (std::uint32_t seconds = firstSecond; seconds <= lastSecond; seconds++)
            {
                const auto seed = calculateSeed(*request, date, seconds, buttonMask, timer0);
                processedCount++;
                const auto status = generate(seed, request->version >= 2, request->maxAdvances,
                                             [&](std::uint32_t initial, std::uint32_t advances, std::uint16_t tid,
                                                 std::uint16_t sid, std::uint16_t tsv) {
                    if (!matches(*request, tid, sid, tsv)) return false;
                    results.push_back({ static_cast<std::uint32_t>(seed), static_cast<std::uint32_t>(seed >> 32),
                                        date.year | (date.month << 16) | (date.day << 24), seconds,
                                        timer0 | (buttonMask << 16), initial, advances,
                                        static_cast<std::uint32_t>(tid) | (static_cast<std::uint32_t>(sid) << 16), tsv });
                    return results.size() >= request->resultLimit;
                });
                if (status.advanceOverflow)
                {
                    results.clear();
                    lastError = ErrorCode::AdvanceOverflow;
                    return 0;
                }
                if (status.stopped)
                {
                    const bool moreCandidates = status.moreFrames || seconds < lastSecond || unit + 1 < unitCount;
                    resultLimitReached = moreCandidates;
                    return static_cast<std::uint32_t>(results.size());
                }
            }
        }
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen5id_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5id_result_count() { return static_cast<std::uint32_t>(results.size()); }
    POKERNGKIT_KEEPALIVE std::uint32_t gen5id_processed_low() { return static_cast<std::uint32_t>(processedCount); }
    POKERNGKIT_KEEPALIVE std::uint32_t gen5id_processed_high() { return static_cast<std::uint32_t>(processedCount >> 32); }
    POKERNGKIT_KEEPALIVE std::uint32_t gen5id_limit_reached() { return resultLimitReached ? 1U : 0U; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen5id_last_error() { return lastError; }

#ifndef __EMSCRIPTEN__
    std::uint64_t gen5id_test_seed(
        const Gen5IdPackedRequest *request, std::uint32_t second, std::uint32_t buttonMask, std::uint32_t timer0)
    {
        if (request == nullptr) return 0;
        const Date date = { request->startYear, request->startMonth, request->startDay };
        if (!validDate(date) || second > 86399 || buttonMask > 0xfff || timer0 > 0xffff) return 0;
        return calculateSeed(*request, date, second, buttonMask, timer0);
    }

    std::uint32_t gen5id_test_generate(
        std::uint64_t seed, std::uint32_t version, std::uint32_t maxAdvances, Gen5IdPackedResult *output, std::uint32_t capacity)
    {
        if (version > 3 || output == nullptr || capacity == 0) return 0;
        std::uint32_t count = 0;
        const auto status = generate(seed, version >= 2, maxAdvances,
                                     [&](std::uint32_t initial, std::uint32_t advances, std::uint16_t tid,
                                         std::uint16_t sid, std::uint16_t tsv) {
            if (count >= capacity) return true;
            output[count++] = { static_cast<std::uint32_t>(seed), static_cast<std::uint32_t>(seed >> 32), 0, 0, 0,
                                initial, advances,
                                static_cast<std::uint32_t>(tid) | (static_cast<std::uint32_t>(sid) << 16), tsv };
            return count >= capacity;
        });
        return status.advanceOverflow ? 0 : count;
    }
#endif
}
