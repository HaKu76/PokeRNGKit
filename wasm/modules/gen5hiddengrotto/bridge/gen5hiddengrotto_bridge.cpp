/*
 * PokeRNGKit Gen V Hidden Grotto WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 HiddenGrottoGenerator,
 * Searcher5, IVSearcher5, IVCache, SHA1Cache, SHA1, Nazos, Keypresses
 * and Utilities5 by Admiral_Fish, bumba, and EzPzStreamz
 * (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen5hiddengrotto_bridge.h"

#include <Core/RNG/MT.hpp>
#include <Core/RNG/RNGList.hpp>
#include <algorithm>
#include <array>
#include <bit>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <string_view>
#include <utility>
#include <vector>

#include "personal_data.inc"

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

    enum class Operation : std::uint32_t
    {
        SlotGenerator = 0,
        SlotSearcher = 1,
        PokemonGenerator = 2,
        PokemonSearcher = 3,
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

    struct Personal
    {
        std::array<std::uint8_t, 6> stats;
        std::array<std::uint8_t, 2> types;
        std::array<std::uint16_t, 3> items;
        std::array<std::uint16_t, 3> abilities;
        std::uint8_t gender;
    };

    struct GrottoPokemonSlot
    {
        std::uint16_t species;
        std::uint8_t form;
        std::uint8_t spawnGender;
        std::uint8_t minimumLevel;
        std::uint8_t maximumLevel;
        Personal personal;
    };

    thread_local std::vector<Gen5HiddenGrottoPackedResult> results;
    thread_local std::vector<IvCacheEntry> ivCache;
    thread_local std::vector<ShaCacheEntry> shaCache;
    thread_local std::uint32_t processedCount = 0;
    thread_local std::uint32_t lastError = ErrorCode::None;
    thread_local bool resultLimitReached = false;

    std::vector<std::uint8_t> decodeBase64(std::string_view input)
    {
        constexpr std::string_view alphabet
            = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        std::vector<std::uint8_t> output;
        output.reserve(input.size() * 3 / 4);
        std::uint32_t buffer = 0;
        std::uint32_t bits = 0;
        for (const char character : input)
        {
            if (character == '=') break;
            const auto position = alphabet.find(character);
            if (position == std::string_view::npos) continue;
            buffer = (buffer << 6) | static_cast<std::uint32_t>(position);
            bits += 6;
            if (bits >= 8)
            {
                bits -= 8;
                output.push_back(static_cast<std::uint8_t>(buffer >> bits));
                buffer &= (1U << bits) - 1U;
            }
        }
        return output;
    }

    std::uint16_t readU16(const std::vector<std::uint8_t> &data, std::size_t offset)
    {
        return static_cast<std::uint16_t>(data[offset] | (static_cast<std::uint16_t>(data[offset + 1]) << 8));
    }

    const std::vector<std::uint8_t> &personalData(bool sequel)
    {
        static const auto bw = decodeBase64(gen5HiddenGrottoPersonalBwBase64);
        static const auto b2w2 = decodeBase64(gen5HiddenGrottoPersonalB2w2Base64);
        return sequel ? b2w2 : bw;
    }

    const std::vector<std::uint8_t> &formIndexData(bool sequel)
    {
        static const auto bw = decodeBase64(gen5HiddenGrottoFormIndexBwBase64);
        static const auto b2w2 = decodeBase64(gen5HiddenGrottoFormIndexB2w2Base64);
        return sequel ? b2w2 : bw;
    }

    bool loadPersonal(bool sequel, std::uint16_t species, std::uint8_t form, Personal &personal)
    {
        constexpr std::size_t recordSize = 21;
        const auto &data = personalData(sequel);
        const auto &formIndexes = formIndexData(sequel);
        if (species >= 650 || formIndexes.size() != 1300 || data.size() % recordSize != 0) return false;
        std::uint32_t index = species;
        const auto formIndex = readU16(formIndexes, static_cast<std::size_t>(species) * 2);
        if (form != 0 && formIndex != 0) index = formIndex + form - 1;
        const std::size_t offset = static_cast<std::size_t>(index) * recordSize;
        if (offset + recordSize > data.size()) return false;
        constexpr std::array<std::uint8_t, 6> statOrder = { 0, 1, 2, 4, 5, 3 };
        for (std::size_t stat = 0; stat < personal.stats.size(); stat++)
            personal.stats[stat] = data[offset + statOrder[stat]];
        std::copy_n(data.begin() + offset + 6, 2, personal.types.begin());
        for (std::size_t item = 0; item < personal.items.size(); item++)
            personal.items[item] = readU16(data, offset + 8 + item * 2);
        personal.gender = data[offset + 14];
        for (std::size_t ability = 0; ability < personal.abilities.size(); ability++)
            personal.abilities[ability] = data[offset + 15 + ability];
        return true;
    }

    bool loadArea(const Gen5HiddenGrottoPackedRequest &request,
                  std::array<GrottoPokemonSlot, 12> &slots)
    {
        for (std::size_t index = 0; index < slots.size(); index++)
        {
            const auto packedSpecies = request.pokemonSpeciesFormGender[index];
            const auto packedLevel = request.pokemonMinMaxLevel[index];
            auto &slot = slots[index];
            slot.species = static_cast<std::uint16_t>(packedSpecies & 0x7ffU);
            slot.form = static_cast<std::uint8_t>((packedSpecies >> 11) & 0x1fU);
            slot.spawnGender = static_cast<std::uint8_t>((packedSpecies >> 16) & 0xffU);
            slot.minimumLevel = static_cast<std::uint8_t>(packedLevel & 0xffU);
            slot.maximumLevel = static_cast<std::uint8_t>((packedLevel >> 8) & 0xffU);
            if (!loadPersonal(true, slot.species, slot.form, slot.personal)) return false;
        }
        return true;
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

    std::vector<std::uint32_t> keypresses(const Gen5HiddenGrottoPackedRequest &request)
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

    std::uint64_t calculateSeed(const Gen5HiddenGrottoPackedRequest &request, const Date &date,
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

    std::uint32_t createHiddenGrottoPid(
        std::uint16_t tsv, std::uint8_t gender, std::uint8_t ratio, std::uint64_t &rng)
    {
        std::uint32_t pid = nextBwUInt(rng);
        if (gender < 2)
        {
            std::uint8_t low = 8;
            if (ratio > 0 && ratio < 254) low = gender == 0 ? ratio : static_cast<std::uint8_t>(ratio - 1);
            if (gender == 0)
                low = static_cast<std::uint8_t>(nextBwUInt(rng, 0xfe - low) + low);
            else
                low = static_cast<std::uint8_t>(nextBwUInt(rng, low) + 1);
            pid = (pid & 0xffffff00U) | low;
        }

        if (isShiny(pid, tsv)) pid ^= 0x10000000U;

        // PokeFinder passes ability 2. createPID therefore flips the ability
        // bit once because it never equals the sentinel value 2.
        pid ^= 0x10000U;
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
        return { static_cast<std::uint8_t>(type * 15 / 63),
                 static_cast<std::uint8_t>(30 + power * 40 / 63) };
    }

    bool ivMatches(const Gen5HiddenGrottoPackedRequest &request,
                   const std::array<std::uint8_t, 6> &ivs, std::uint8_t hiddenPowerType)
    {
        if (request.filtersDisabled != 0) return true;
        for (std::size_t index = 0; index < ivs.size(); index++)
            if (ivs[index] < request.ivMin[index] || ivs[index] > request.ivMax[index]) return false;
        return request.hiddenPowerMask == 0
            || (request.hiddenPowerMask & (1U << hiddenPowerType)) != 0;
    }

    bool pokemonStateMatches(
        const Gen5HiddenGrottoPackedRequest &request, std::uint8_t level, std::uint8_t nature)
    {
        if (request.filtersDisabled != 0) return true;
        return (request.natureMask == 0
                || (request.natureMask & (1U << nature)) != 0)
            && level >= request.levelMin && level <= request.levelMax;
    }

    bool slotStateMatches(const Gen5HiddenGrottoPackedRequest &request,
                          std::uint8_t group, std::uint8_t slot, std::uint8_t gender)
    {
        if (request.grottoSlotMask != 0 && (request.grottoSlotMask & (1U << slot)) == 0) return false;
        if (slot < 3 && request.grottoGenderMask != 0
            && (request.grottoGenderMask & (1U << gender)) == 0)
            return false;
        return request.grottoGroupMask == 0 || (request.grottoGroupMask & (1U << group)) != 0;
    }

    std::uint8_t generateIv(MT &rng)
    {
        return static_cast<std::uint8_t>(rng.next() >> 27);
    }

    std::array<std::uint8_t, 6> readIvs(RNGList<std::uint8_t, MT, 8, generateIv> &rng)
    {
        std::array<std::uint8_t, 6> ivs;
        std::ranges::generate(ivs, [&rng] { return rng.next(); });
        return ivs;
    }

    std::array<std::uint8_t, 6> cachedIvs(std::uint32_t seedHigh, std::uint32_t advances)
    {
        MT rng(seedHigh, advances);
        std::array<std::uint8_t, 6> ivs;
        std::ranges::generate(ivs, [&rng] { return generateIv(rng); });
        return ivs;
    }

    void appendIvState(std::vector<IvState> &states, const Gen5HiddenGrottoPackedRequest &request,
                       std::uint32_t advances, const std::array<std::uint8_t, 6> &ivs)
    {
        const auto [type, power] = hiddenPower(ivs);
        if (ivMatches(request, ivs, type)) states.push_back({ advances, ivs, type, power });
    }

    std::vector<IvState> rawIvStates(
        const Gen5HiddenGrottoPackedRequest &request, std::uint64_t seed)
    {
        RNGList<std::uint8_t, MT, 8, generateIv> rng(
            static_cast<std::uint32_t>(seed >> 32), request.initialIVAdvances + 2);
        std::vector<IvState> states;
        states.reserve(static_cast<std::size_t>(request.maxIVAdvances) + 1);
        for (std::uint64_t count = 0; count <= request.maxIVAdvances; count++, rng.advanceState())
        {
            const auto ivs = readIvs(rng);
            appendIvState(states, request, request.initialIVAdvances + static_cast<std::uint32_t>(count), ivs);
        }
        return states;
    }

    std::vector<IvState> cachedIvStates(
        const Gen5HiddenGrottoPackedRequest &request, std::uint64_t seed)
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
        const std::uint64_t endAdvance
            = static_cast<std::uint64_t>(request.initialIVAdvances) + request.maxIVAdvances;
        for (auto entry = first; entry != last; ++entry)
        {
            if (entry->advances < request.initialIVAdvances || entry->advances > endAdvance) continue;
            appendIvState(states, request, entry->advances, cachedIvs(seedHigh, entry->advances + 2));
        }
        return states;
    }

    std::uint16_t computeStat(std::uint8_t base, std::uint8_t iv, std::uint8_t nature,
                              std::uint8_t level, std::uint8_t index)
    {
        const std::uint16_t value = static_cast<std::uint16_t>(((2 * base + iv) * level) / 100);
        if (index == 0) return value + level + 10;
        constexpr std::array<std::uint8_t, 5> natureStatOrder = { 0, 1, 4, 2, 3 };
        const std::uint8_t natureIndex = index - 1;
        const std::uint8_t increased = natureStatOrder[nature / 5];
        const std::uint8_t decreased = natureStatOrder[nature % 5];
        const std::uint16_t neutral = value + 5;
        if (increased == decreased) return neutral;
        if (natureIndex == increased) return neutral * 110 / 100;
        if (natureIndex == decreased) return neutral * 90 / 100;
        return neutral;
    }

    std::uint8_t characteristic(std::uint32_t pid, const std::array<std::uint8_t, 6> &ivs)
    {
        constexpr std::array<std::uint8_t, 6> order = { 0, 1, 2, 5, 3, 4 };
        constexpr std::array<std::uint8_t, 11> characteristicOrder = { 0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4 };
        const auto start = static_cast<std::uint8_t>(pid % 6);
        auto selected = start;
        std::uint8_t maximum = 0;
        for (std::uint8_t index = 0; index < 6; index++)
        {
            const auto candidate = characteristicOrder[start + index];
            if (ivs[order[candidate]] > maximum)
            {
                selected = candidate;
                maximum = ivs[order[candidate]];
            }
        }
        return static_cast<std::uint8_t>(selected * 5 + maximum % 5);
    }

    std::uint32_t packedDate(const Date *date)
    {
        return date == nullptr ? 0 : date->year | (date->month << 16) | (date->day << 24);
    }

    Gen5HiddenGrottoPackedResult packSlotResult(
        std::uint64_t seed, const Date *date, std::uint32_t seconds, std::uint32_t timer0,
        std::uint32_t buttons, std::uint32_t advances, std::uint16_t data,
        std::uint8_t chatot, std::uint8_t needle, std::uint8_t gender,
        std::uint8_t group, std::uint8_t slot)
    {
        const std::uint32_t metadata = static_cast<std::uint32_t>(chatot)
            | (static_cast<std::uint32_t>(needle) << 7)
            | (static_cast<std::uint32_t>(gender) << 10)
            | (static_cast<std::uint32_t>(group) << 12)
            | (static_cast<std::uint32_t>(slot) << 14)
            | (static_cast<std::uint32_t>(slot >= 3) << 18);
        return {
            static_cast<std::uint32_t>(seed),
            static_cast<std::uint32_t>(seed >> 32),
            packedDate(date),
            date == nullptr ? 0 : seconds,
            date == nullptr ? 0 : timer0 | (buttons << 16),
            advances,
            0,
            data,
            metadata,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
        };
    }

    Gen5HiddenGrottoPackedResult packPokemonResult(
        std::uint64_t seed, const Date *date, std::uint32_t seconds, std::uint32_t timer0,
        std::uint32_t buttons, std::uint32_t advances, const IvState &ivs,
        std::uint32_t pid, std::uint8_t chatot, std::uint8_t needle,
        std::uint8_t ability, std::uint8_t gender, std::uint8_t level,
        std::uint8_t nature, const GrottoPokemonSlot &slot)
    {
        const std::uint32_t metadata = static_cast<std::uint32_t>(chatot)
            | (static_cast<std::uint32_t>(needle) << 7)
            | (static_cast<std::uint32_t>(ability) << 10)
            | (static_cast<std::uint32_t>(gender) << 12)
            | (static_cast<std::uint32_t>(level) << 14)
            | (static_cast<std::uint32_t>(nature) << 21);
        std::array<std::uint16_t, 6> stats;
        for (std::uint8_t index = 0; index < stats.size(); index++)
            stats[index] = computeStat(
                slot.personal.stats[index], ivs.values[index], nature, level, index);
        const std::uint32_t speciesForm = static_cast<std::uint32_t>(slot.species)
            | (static_cast<std::uint32_t>(slot.form) << 11)
            | (static_cast<std::uint32_t>(characteristic(pid, ivs.values)) << 16);
        return {
            static_cast<std::uint32_t>(seed),
            static_cast<std::uint32_t>(seed >> 32),
            packedDate(date),
            date == nullptr ? 0 : seconds,
            date == nullptr ? 0 : timer0 | (buttons << 16),
            advances,
            ivs.advances,
            pid,
            metadata,
            static_cast<std::uint32_t>(ivs.values[0])
                | (static_cast<std::uint32_t>(ivs.values[1]) << 8)
                | (static_cast<std::uint32_t>(ivs.values[2]) << 16)
                | (static_cast<std::uint32_t>(ivs.values[3]) << 24),
            static_cast<std::uint32_t>(ivs.values[4])
                | (static_cast<std::uint32_t>(ivs.values[5]) << 8)
                | (static_cast<std::uint32_t>(ivs.hiddenPower) << 16)
                | (static_cast<std::uint32_t>(ivs.hiddenPowerStrength) << 24),
            speciesForm,
            slot.personal.abilities[ability],
            static_cast<std::uint32_t>(stats[0]) | (static_cast<std::uint32_t>(stats[1]) << 16),
            static_cast<std::uint32_t>(stats[2]) | (static_cast<std::uint32_t>(stats[3]) << 16),
            static_cast<std::uint32_t>(stats[4]) | (static_cast<std::uint32_t>(stats[5]) << 16),
        };
    }

    bool appendSlotResult(
        const Gen5HiddenGrottoPackedRequest &request, std::uint64_t seed, const Date *date,
        std::uint32_t seconds, std::uint32_t timer0, std::uint32_t buttons,
        std::uint32_t advances, std::uint16_t data, std::uint8_t chatot,
        std::uint8_t needle, std::uint8_t gender, std::uint8_t group,
        std::uint8_t slot)
    {
        results.emplace_back(packSlotResult(
            seed, date, seconds, timer0, buttons, advances, data, chatot, needle,
            gender, group, slot));
        if (results.size() < request.resultLimit) return false;
        resultLimitReached = true;
        return true;
    }

    bool appendPokemonResult(
        const Gen5HiddenGrottoPackedRequest &request, std::uint64_t seed,
        const Date *date, std::uint32_t seconds, std::uint32_t timer0,
        std::uint32_t buttons, std::uint32_t advances, const IvState &ivs,
        std::uint32_t pid, std::uint8_t chatot, std::uint8_t needle,
        std::uint8_t ability, std::uint8_t gender, std::uint8_t level,
        std::uint8_t nature, const GrottoPokemonSlot &slot)
    {
        results.emplace_back(packPokemonResult(
            seed, date, seconds, timer0, buttons, advances, ivs, pid, chatot,
            needle, ability, gender, level, nature, slot));
        if (results.size() < request.resultLimit) return false;
        resultLimitReached = true;
        return true;
    }

    constexpr std::array<std::uint8_t, 100> grottoEncounterTable = {
        0,
        1, 1, 1, 1,
        2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
        3,
        4, 4, 4, 4,
        5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
        6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
        7,
        8, 8, 8, 8,
        9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
        10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10,
    };

    template <typename Emit>
    bool generateSlotStates(
        const Gen5HiddenGrottoPackedRequest &request, std::uint64_t seed,
        std::uint32_t frameStart, std::uint32_t frameCount, Emit emit,
        std::uint32_t *framesProcessed = nullptr)
    {
        constexpr std::array<std::uint8_t, 4> thresholds = { 10, 20, 30, 50 };
        std::array<GrottoPokemonSlot, 12> slots = {};
        if (!loadArea(request, slots)) return false;

        std::uint8_t rolls = 1;
        std::uint8_t threshold = 5;
        if (request.grottoPower != 0)
        {
            rolls += 2;
            threshold += thresholds[request.grottoPower - 1];
        }

        const std::uint32_t bootAdvances = initialAdvances(seed, true, request.memoryLink != 0);
        std::uint64_t rng = seed;
        jumpBw(rng, bootAdvances + request.initialAdvances + frameStart);
        const auto offsetJump = bwJump(request.offset);

        for (std::uint32_t count = 0; count < frameCount; count++)
        {
            std::uint64_t go = rng;
            applyJump(go, offsetJump);
            const std::uint32_t prng = nextBwUInt(rng);
            if (nextBwUInt(go, 100) < threshold)
            {
                const auto group = static_cast<std::uint8_t>(nextBwUInt(go, 4));
                std::uint8_t slot = 0;
                for (std::uint8_t roll = 0; roll < rolls; roll++)
                {
                    slot = grottoEncounterTable[nextBwUInt(go, 100)];
                    if (slot < 3) break;
                }

                std::uint8_t gender = 0;
                std::uint16_t data;
                if (slot < 3)
                {
                    const auto &pokemon = slots[group * 3 + slot];
                    gender = nextBwUInt(go, 100) < pokemon.spawnGender;
                    data = pokemon.species;
                }
                else if (slot < 7)
                {
                    data = static_cast<std::uint16_t>(request.items[group * 4 + slot - 3]);
                }
                else
                {
                    data = static_cast<std::uint16_t>(request.hiddenItems[group * 4 + slot - 7]);
                }

                if (slotStateMatches(request, group, slot, gender))
                {
                    const auto chatot = static_cast<std::uint8_t>(
                        ((static_cast<std::uint64_t>(prng) * 0x1fffU) >> 32) / 82);
                    const auto needle = static_cast<std::uint8_t>(
                        (static_cast<std::uint64_t>(prng) * 8) >> 32);
                    if (emit(bootAdvances + request.initialAdvances + frameStart + count,
                             data, chatot, needle, gender, group, slot))
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

    template <typename Emit>
    bool generatePokemonStates(
        const Gen5HiddenGrottoPackedRequest &request, std::uint64_t seed,
        std::uint32_t frameStart, std::uint32_t frameCount,
        const std::vector<IvState> &ivs, Emit emit,
        std::uint32_t *framesProcessed = nullptr)
    {
        std::array<GrottoPokemonSlot, 12> slots = {};
        if (!loadArea(request, slots)) return false;
        const auto &slot = slots[request.selectedGroup * 3 + request.selectedSlot];
        const std::uint16_t tsv = static_cast<std::uint16_t>(request.tid ^ request.sid);
        const std::uint8_t levelRange = slot.maximumLevel - slot.minimumLevel;
        const bool fixedGender = slot.personal.gender == 0 || slot.personal.gender == 254
            || slot.personal.gender == 255;
        const std::uint8_t forcedGender
            = fixedGender ? 255 : static_cast<std::uint8_t>(request.gender);
        const std::uint8_t shinyRolls = request.shinyCharm == 0 ? 1 : 3;

        const std::uint32_t bootAdvances = initialAdvances(seed, true, request.memoryLink != 0);
        std::uint64_t rng = seed;
        jumpBw(rng, bootAdvances + request.initialAdvances + frameStart);
        const auto offsetJump = bwJump(request.offset);

        for (std::uint32_t count = 0; count < frameCount; count++)
        {
            std::uint64_t go = rng;
            applyJump(go, offsetJump);
            const auto level = static_cast<std::uint8_t>(
                slot.minimumLevel + nextBwUInt(go, levelRange));
            const bool synchronize
                = nextBwUInt(go, 100) < 50 && request.lead <= 24;

            std::uint32_t pid = 0;
            for (std::uint8_t roll = 0; roll < shinyRolls; roll++)
                pid = createHiddenGrottoPid(tsv, forcedGender, slot.personal.gender, go);

            std::uint8_t ability = 2;
            if (slot.personal.abilities[2] == 0)
                ability = static_cast<std::uint8_t>((pid >> 16) & 1U);
            auto nature = static_cast<std::uint8_t>(nextBwUInt(go, 25));
            if (synchronize) nature = static_cast<std::uint8_t>(request.lead);

            const std::uint32_t prng = nextBwUInt(rng);
            const auto chatot = static_cast<std::uint8_t>(
                ((static_cast<std::uint64_t>(prng) * 0x1fffU) >> 32) / 82);
            const auto needle = static_cast<std::uint8_t>(
                (static_cast<std::uint64_t>(prng) * 8) >> 32);
            const std::uint32_t advances
                = bootAdvances + request.initialAdvances + frameStart + count;
            if (pokemonStateMatches(request, level, nature))
            {
                for (const auto &iv : ivs)
                    if (emit(advances, iv, pid, chatot, needle, ability,
                             static_cast<std::uint8_t>(request.gender), level, nature, slot))
                    {
                        if (framesProcessed != nullptr) (*framesProcessed)++;
                        return true;
                    }
            }
            if (framesProcessed != nullptr) (*framesProcessed)++;
        }
        return false;
    }

    bool validLead(std::uint32_t value)
    {
        return value <= 24 || value == 255;
    }

    bool isSlotOperation(Operation operation)
    {
        return operation == Operation::SlotGenerator || operation == Operation::SlotSearcher;
    }

    bool isGeneratorOperation(Operation operation)
    {
        return operation == Operation::SlotGenerator || operation == Operation::PokemonGenerator;
    }

    bool validateRequest(const Gen5HiddenGrottoPackedRequest &request)
    {
        const Date start = { request.startYear, request.startMonth, request.startDay };
        const Date end = { request.endYear, request.endMonth, request.endDay };
        if (request.operation > static_cast<std::uint32_t>(Operation::PokemonSearcher)
            || request.version < 2 || request.version > 3 || request.language > 6
            || request.dsType > 2 || request.macHigh > 0xffff || request.vcount > 0xff
            || request.timer0Min > 0xffff || request.timer0Max > 0xffff
            || request.timer0Min > request.timer0Max || request.gxstat > 99
            || request.vframe > 99 || request.keypressCountMask > 0x1ff
            || request.skipLR > 1 || request.memoryLink > 1 || request.shinyCharm > 1
            || request.tid > 0xffff || request.sid > 0xffff
            || !validLead(request.lead) || request.grottoPower > 4
            || request.selectedGroup > 3 || request.selectedSlot > 2
            || request.gender > 2 || request.filtersDisabled > 1
            || request.grottoSlotMask > 0x7ff || request.grottoGenderMask > 0x3
            || request.grottoGroupMask > 0xf || request.resultLimit == 0
            || request.resultLimit > maximumResults || request.chunkCount == 0)
            return false;

        std::array<GrottoPokemonSlot, 12> slots = {};
        for (std::size_t index = 0; index < slots.size(); index++)
        {
            const auto species = request.pokemonSpeciesFormGender[index] & 0x7ffU;
            const auto form = (request.pokemonSpeciesFormGender[index] >> 11) & 0x1fU;
            const auto spawnGender = (request.pokemonSpeciesFormGender[index] >> 16) & 0xffU;
            const auto minimumLevel = request.pokemonMinMaxLevel[index] & 0xffU;
            const auto maximumLevel = (request.pokemonMinMaxLevel[index] >> 8) & 0xffU;
            if ((request.pokemonSpeciesFormGender[index] >> 24) != 0
                || (request.pokemonMinMaxLevel[index] >> 16) != 0
                || species == 0 || species >= 650 || form > 31 || spawnGender > 100
                || minimumLevel == 0 || minimumLevel > maximumLevel || maximumLevel > 100)
                return false;
        }
        for (const auto item : request.items)
            if (item > 0xffff) return false;
        for (const auto item : request.hiddenItems)
            if (item > 0xffff) return false;
        if (!loadArea(request, slots)) return false;

        const auto operation = static_cast<Operation>(request.operation);
        if (isSlotOperation(operation))
        {
            if (request.filtersDisabled != 0 || request.initialIVAdvances != 0
                || request.maxIVAdvances != 0 || request.lead != 255)
                return false;
        }
        else
        {
            if (request.natureMask > 0x1ffffffU
                || request.hiddenPowerMask > 0xffffU
                || request.levelMin == 0 || request.levelMin > request.levelMax
                || request.levelMax > 100)
                return false;
            for (std::size_t index = 0; index < 6; index++)
                if (request.ivMin[index] > request.ivMax[index] || request.ivMax[index] > 31)
                    return false;

            const auto &slot = slots[request.selectedGroup * 3 + request.selectedSlot];
            if ((slot.personal.gender == 0 && request.gender != 0)
                || (slot.personal.gender == 254 && request.gender != 1)
                || (slot.personal.gender == 255 && request.gender != 2)
                || (slot.personal.gender > 0 && slot.personal.gender < 254 && request.gender > 1))
                return false;
            if (operation == Operation::PokemonGenerator && request.maxIVAdvances != 0)
                return false;
        }

        if (isGeneratorOperation(operation)) return true;
        const auto buttons = keypresses(request);
        if (buttons.empty() || request.filtersDisabled != 0 || request.offset != 0
            || !validDate(start) || !validDate(end) || serialDate(start) > serialDate(end))
            return false;
        return true;
    }

    bool multiplyWithin(std::uint64_t left, std::uint64_t right, std::uint64_t maximum, std::uint64_t &result)
    {
        if (left != 0 && right > maximum / left) return false;
        result = left * right;
        return result <= maximum;
    }

    std::uint64_t rawSearcherUnits(const Gen5HiddenGrottoPackedRequest &request, std::uint64_t keypressCount)
    {
        const Date start = { request.startYear, request.startMonth, request.startDay };
        const Date end = { request.endYear, request.endMonth, request.endDay };
        const std::uint64_t days = serialDate(end) - serialDate(start) + 1;
        const std::uint64_t timer0 = request.timer0Max - request.timer0Min + 1;
        return days * timer0 * keypressCount * 86400;
    }

    std::uint64_t taskUnits(const Gen5HiddenGrottoPackedRequest &request, std::uint64_t keypressCount)
    {
        const auto operation = static_cast<Operation>(request.operation);
        if (isGeneratorOperation(operation))
            return static_cast<std::uint64_t>(request.maxAdvances) + 1;
        if (operation == Operation::PokemonSearcher && !shaCache.empty()) return shaCache.size();
        return rawSearcherUnits(request, keypressCount);
    }

    bool evaluationRangeAllowed(const Gen5HiddenGrottoPackedRequest &request, std::uint64_t keypressCount)
    {
        const auto operation = static_cast<Operation>(request.operation);
        if (isGeneratorOperation(operation))
            return static_cast<std::uint64_t>(request.maxAdvances) + 1 <= maximumEvaluations;

        const std::uint64_t pidCount = static_cast<std::uint64_t>(request.maxAdvances) + 1;
        const std::uint64_t rawSeeds = rawSearcherUnits(request, keypressCount);
        if (operation == Operation::SlotSearcher)
        {
            std::uint64_t total;
            return multiplyWithin(rawSeeds, pidCount, maximumEvaluations, total);
        }

        const std::uint64_t ivCount = static_cast<std::uint64_t>(request.maxIVAdvances) + 1;
        if (!shaCache.empty())
        {
            std::uint64_t total;
            return multiplyWithin(shaCache.size(), pidCount, maximumEvaluations, total);
        }

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

    bool searchSeed(const Gen5HiddenGrottoPackedRequest &request, std::uint64_t seed, const Date *date,
                    std::uint32_t seconds, std::uint32_t timer0, std::uint32_t buttons)
    {
        if (request.operation == static_cast<std::uint32_t>(Operation::SlotSearcher))
        {
            return generateSlotStates(
                request, seed, 0, request.maxAdvances + 1,
                [&](std::uint32_t advances, std::uint16_t data, std::uint8_t chatot,
                    std::uint8_t needle, std::uint8_t gender, std::uint8_t group,
                    std::uint8_t slot) {
                    return appendSlotResult(request, seed, date, seconds, timer0, buttons,
                                            advances, data, chatot, needle, gender, group, slot);
                });
        }

        const auto ivs = ivCache.empty() ? rawIvStates(request, seed) : cachedIvStates(request, seed);
        if (ivs.empty()) return false;
        return generatePokemonStates(
            request, seed, 0, request.maxAdvances + 1, ivs,
            [&](std::uint32_t advances, const IvState &iv, std::uint32_t pid, std::uint8_t chatot,
                std::uint8_t needle, std::uint8_t ability, std::uint8_t gender, std::uint8_t level,
                std::uint8_t nature, const GrottoPokemonSlot &slot) {
                return appendPokemonResult(request, seed, date, seconds, timer0, buttons,
                                           advances, iv, pid, chatot, needle, ability,
                                           gender, level, nature, slot);
            });
    }
}

static_assert(sizeof(Gen5HiddenGrottoPackedRequest) == 114 * sizeof(std::uint32_t));
static_assert(sizeof(Gen5HiddenGrottoPackedResult) == 16 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen5hiddengrotto_api_version()
    {
        return apiVersion;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5hiddengrotto_configure_cache(
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

    POKERNGKIT_KEEPALIVE void gen5hiddengrotto_clear_cache()
    {
        ivCache.clear();
        ivCache.shrink_to_fit();
        shaCache.clear();
        shaCache.shrink_to_fit();
        lastError = ErrorCode::None;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5hiddengrotto_search(const Gen5HiddenGrottoPackedRequest *request)
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

        const auto operation = static_cast<Operation>(request->operation);
        if (operation == Operation::SlotGenerator)
        {
            const std::uint64_t seed = (static_cast<std::uint64_t>(request->seedHigh) << 32) | request->seedLow;
            generateSlotStates(
                *request, seed, request->chunkStart, request->chunkCount,
                [&](std::uint32_t advances, std::uint16_t data, std::uint8_t chatot,
                    std::uint8_t needle, std::uint8_t gender, std::uint8_t group,
                    std::uint8_t slot) {
                    return appendSlotResult(*request, seed, nullptr, 0, 0, 0,
                                            advances, data, chatot, needle, gender,
                                            group, slot);
                },
                &processedCount);
            return static_cast<std::uint32_t>(results.size());
        }
        if (operation == Operation::PokemonGenerator)
        {
            const std::uint64_t seed = (static_cast<std::uint64_t>(request->seedHigh) << 32) | request->seedLow;
            const auto ivs = rawIvStates(*request, seed);
            generatePokemonStates(
                *request, seed, request->chunkStart, request->chunkCount, ivs,
                [&](std::uint32_t advances, const IvState &iv, std::uint32_t pid,
                    std::uint8_t chatot, std::uint8_t needle, std::uint8_t ability,
                    std::uint8_t gender, std::uint8_t level, std::uint8_t nature,
                    const GrottoPokemonSlot &slot) {
                    return appendPokemonResult(*request, seed, nullptr, 0, 0, 0,
                                               advances, iv, pid, chatot, needle,
                                               ability, gender, level, nature, slot);
                },
                &processedCount);
            return static_cast<std::uint32_t>(results.size());
        }

        const Date start = { request->startYear, request->startMonth, request->startDay };
        const Date end = { request->endYear, request->endMonth, request->endDay };
        const std::uint32_t startSerial = serialDate(start);
        const std::uint32_t endSerial = serialDate(end);

        if (operation == Operation::PokemonSearcher && !shaCache.empty())
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

    POKERNGKIT_KEEPALIVE std::uintptr_t gen5hiddengrotto_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5hiddengrotto_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5hiddengrotto_processed_count()
    {
        return processedCount;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5hiddengrotto_limit_reached()
    {
        return resultLimitReached ? 1U : 0U;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen5hiddengrotto_last_error()
    {
        return lastError;
    }

#ifndef __EMSCRIPTEN__
    std::uint32_t gen5hiddengrotto_test_generate(
        const Gen5HiddenGrottoPackedRequest *request, Gen5HiddenGrottoPackedResult *output, std::uint32_t capacity)
    {
        if (request == nullptr || output == nullptr || capacity == 0) return 0;
        auto copy = *request;
        if (copy.operation == static_cast<std::uint32_t>(Operation::SlotSearcher))
            copy.operation = static_cast<std::uint32_t>(Operation::SlotGenerator);
        else if (copy.operation == static_cast<std::uint32_t>(Operation::PokemonSearcher))
            copy.operation = static_cast<std::uint32_t>(Operation::PokemonGenerator);
        copy.maxAdvances = std::min(copy.maxAdvances, capacity - 1);
        copy.resultLimit = std::min(copy.resultLimit, capacity);
        copy.chunkStart = 0;
        copy.chunkCount = copy.maxAdvances + 1;
        const auto count = gen5hiddengrotto_search(&copy);
        for (std::uint32_t index = 0; index < count; index++) output[index] = results[index];
        return count;
    }

    std::uint64_t gen5hiddengrotto_test_seed(
        const Gen5HiddenGrottoPackedRequest *request, std::uint32_t second, std::uint32_t buttonMask, std::uint32_t timer0)
    {
        if (request == nullptr || second > 86399 || buttonMask > 0xfff || timer0 > 0xffff) return 0;
        const Date date = { request->startYear, request->startMonth, request->startDay };
        if (!validDate(date)) return 0;
        return calculateSeed(*request, date, second, buttonMask, timer0);
    }
#endif
}
