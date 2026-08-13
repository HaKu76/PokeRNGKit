/*
 * PokeRNGKit Gen III GameCube Seed Finder WebAssembly bridge.
 * Copyright (C) 2017-2024 by Admiral_Fish, bumba, and EzPzStreamz
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#include "gen3ngcseed_bridge.h"

#include <Core/RNG/LCRNG.hpp>
#include <algorithm>
#include <cstring>
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
    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
    };

    thread_local std::vector<Gen3NgcSeedPackedState> results;
    thread_local std::uint32_t lastError = None;

    constexpr std::uint8_t channelPattern(const std::uint32_t *patterns, std::uint32_t index)
    {
        return static_cast<std::uint8_t>(patterns[index]);
    }

    constexpr bool validChannelPattern(std::uint8_t pattern)
    {
        return pattern == 11 || pattern == 12 || pattern == 13 || pattern == 15 || pattern == 16 || pattern == 17
            || pattern == 22 || pattern == 24 || pattern == 26 || pattern == 30 || pattern == 32 || pattern == 34;
    }

    bool searchChannelSeed(XDRNG &rng, const std::uint32_t *criteria, std::uint32_t count)
    {
        for (std::uint32_t i = 0; i < count; i++)
        {
            const std::uint8_t compare = channelPattern(criteria, i);
            std::uint8_t mask = 0;
            std::uint8_t shift = 0;
            std::uint8_t pattern = 0;
            while (mask != 7)
            {
                const std::uint8_t number = static_cast<std::uint8_t>(rng.next() >> 30);
                if (shift == 0)
                {
                    if ((compare > 20 && number != 0) || (compare < 20 && number == 0)) return false;
                    if (number == 0) shift++;
                }
                if ((mask & 1) == 0 && number == 1)
                {
                    pattern += static_cast<std::uint8_t>(number << shift++);
                    mask |= 1;
                }
                else if ((mask & 2) == 0 && number == 2)
                {
                    pattern += static_cast<std::uint8_t>(number << shift++);
                    mask |= 2;
                }
                else if ((mask & 4) == 0 && number == 3)
                {
                    pattern += static_cast<std::uint8_t>(number << shift++);
                    mask |= 4;
                }
            }
            if (pattern != compare) return false;
        }
        return true;
    }

    constexpr std::uint16_t enemyHpStats[5][2] = { { 290, 310 }, { 290, 270 }, { 290, 250 }, { 320, 270 }, { 270, 230 } };
    constexpr std::uint16_t playerHpStats[5][2] = { { 322, 340 }, { 310, 290 }, { 210, 620 }, { 320, 230 }, { 310, 310 } };

    std::uint8_t generateEVs(XDRNG &rng)
    {
        std::uint8_t evs[6] = { 0, 0, 0, 0, 0, 0 };
        std::uint16_t sum = 0;
        for (std::uint8_t i = 0; i <= 100; i++)
        {
            for (auto &ev : evs) { ev += rng.nextUShort(256); sum += ev; }
            if (sum == 510) return evs[0];
            if (490 < sum && sum < 530) break;
            if (sum > 510 && i != 100) { std::memset(evs, 0, sizeof(evs)); sum = 0; }
        }
        while (sum != 510)
        {
            for (auto &ev : evs)
            {
                if (sum < 510 && ev < 255) { ev++; sum++; }
                else if (sum > 510 && ev != 0) { ev--; sum--; }
            }
        }
        return evs[0];
    }

    std::uint8_t generateGalesPokemon(XDRNG &rng, std::uint16_t tsv)
    {
        rng.advance(2);
        const auto hp = static_cast<std::uint8_t>(rng.nextUShort(32));
        rng.advance(2);
        std::uint16_t psv;
        do { psv = static_cast<std::uint16_t>(rng.nextUShort() ^ rng.nextUShort()); } while ((psv ^ tsv) < 8);
        return hp;
    }

    bool searchGalesSeed(XDRNG &rng, std::uint8_t playerIndex, std::uint8_t enemyIndex,
                         const std::uint16_t enemyHp[2], const std::uint16_t playerHp[2])
    {
        rng.next();
        if (rng.nextUShort(5) != playerIndex || rng.nextUShort(5) != enemyIndex) return false;
        rng.next();
        auto tsv = static_cast<std::uint16_t>(rng.nextUShort() ^ rng.nextUShort());
        for (std::uint8_t i = 0; i < 2; i++)
        {
            const auto hpIV = generateGalesPokemon(rng, tsv);
            if ((generateEVs(rng) >> 2) + hpIV + enemyHpStats[enemyIndex][i] != enemyHp[i]) return false;
        }
        rng.next();
        tsv = static_cast<std::uint16_t>(rng.nextUShort() ^ rng.nextUShort());
        for (std::uint8_t i = 0; i < 2; i++)
        {
            const auto hpIV = generateGalesPokemon(rng, tsv);
            if ((generateEVs(rng) >> 2) + hpIV + playerHpStats[playerIndex][i] != playerHp[i]) return false;
        }
        return true;
    }

    bool searchGalesSeedSkip(XDRNG &rng, std::uint8_t playerIndex, std::uint8_t enemyIndex,
                             const std::uint16_t enemyHp[2], const std::uint16_t playerHp[2])
    {
        if (rng.nextUShort(5) != enemyIndex) return false;
        rng.next();
        auto tsv = static_cast<std::uint16_t>(rng.nextUShort() ^ rng.nextUShort());
        for (std::uint8_t i = 0; i < 2; i++)
        {
            const auto hpIV = generateGalesPokemon(rng, tsv);
            if ((generateEVs(rng) >> 2) + hpIV + enemyHpStats[enemyIndex][i] != enemyHp[i]) return false;
        }
        rng.next();
        tsv = static_cast<std::uint16_t>(rng.nextUShort() ^ rng.nextUShort());
        for (std::uint8_t i = 0; i < 2; i++)
        {
            const auto hpIV = generateGalesPokemon(rng, tsv);
            if ((generateEVs(rng) >> 2) + hpIV + playerHpStats[playerIndex][i] != playerHp[i]) return false;
        }
        return true;
    }

    constexpr std::uint8_t natures[8][6] = { { 0x16, 0x15, 0x0f, 0x13, 0x04, 0x04 }, { 0x0b, 0x08, 0x01, 0x10, 0x10, 0x0c },
        { 0x02, 0x10, 0x0f, 0x12, 0x0f, 0x03 }, { 0x10, 0x13, 0x03, 0x16, 0x03, 0x18 }, { 0x11, 0x10, 0x0f, 0x13, 0x05, 0x04 },
        { 0x0f, 0x11, 0x01, 0x03, 0x13, 0x03 }, { 0x01, 0x08, 0x03, 0x01, 0x03, 0x03 }, { 0x03, 0x0a, 0x0f, 0x03, 0x0f, 0x03 } };
    constexpr std::uint8_t genders[8][6] = { { 0, 1, 1, 0, 0, 1 }, { 2, 1, 0, 0, 1, 0 }, { 0, 1, 0, 1, 0, 1 }, { 2, 1, 1, 1, 0, 0 },
        { 0, 0, 0, 0, 0, 1 }, { 2, 1, 2, 0, 2, 1 }, { 2, 0, 0, 1, 1, 0 }, { 1, 0, 1, 0, 1, 0 } };
    constexpr std::uint8_t genderRatios[8][6] = { { 0x1f, 0x7f, 0x7f, 0x7f, 0xbf, 0x7f }, { 0xff, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f },
        { 0x1f, 0x3f, 0x7f, 0x7f, 0x7f, 0x7f }, { 0xff, 0xbf, 0x7f, 0x7f, 0x1f, 0x7f }, { 0x1f, 0x1f, 0x1f, 0x1f, 0x1f, 0x7f },
        { 0xff, 0x7f, 0xff, 0x7f, 0xff, 0x7f }, { 0xff, 0x1f, 0x3f, 0x7f, 0x7f, 0x3f }, { 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f } };

    void generateColoPokemon(XDRNG &rng, std::uint16_t tsv, std::uint8_t nature, std::uint8_t gender, std::uint8_t ratio)
    {
        rng.advance(5);
        while (true)
        {
            const auto high = rng.nextUShort();
            const auto low = rng.nextUShort();
            if (ratio != 0xff && static_cast<std::uint8_t>((low & 0xff) < ratio) != gender) continue;
            if (((static_cast<std::uint32_t>(high) << 16) | low) % 25 != nature) continue;
            if ((high ^ low ^ tsv) >= 8) return;
        }
    }

    bool searchColoSeed(XDRNG &rng, std::uint8_t lead, std::uint8_t trainer)
    {
        const auto enemy = static_cast<std::uint8_t>(rng.nextUShort(8));
        std::uint8_t player;
        do { player = static_cast<std::uint8_t>(rng.nextUShort(8)); } while (enemy == player);
        if (player != lead) return false;
        auto tsv = static_cast<std::uint16_t>(rng.nextUShort() ^ rng.nextUShort());
        for (std::uint8_t i = 0; i < 6; i++) generateColoPokemon(rng, tsv, natures[enemy][i], genders[enemy][i], genderRatios[enemy][i]);
        if (rng.nextUShort(3) != trainer) return false;
        tsv = static_cast<std::uint16_t>(rng.nextUShort() ^ rng.nextUShort());
        for (std::uint8_t i = 0; i < 6; i++) generateColoPokemon(rng, tsv, natures[player][i], genders[player][i], genderRatios[player][i]);
        return true;
    }

    bool searchColoSeedSkip(XDRNG &rng, std::uint8_t lead, std::uint8_t trainer)
    {
        std::uint8_t enemy;
        XDRNGR reverse(rng);
        do { enemy = static_cast<std::uint8_t>(reverse.nextUShort(8)); } while (enemy == lead);
        auto tsv = static_cast<std::uint16_t>(rng.nextUShort() ^ rng.nextUShort());
        for (std::uint8_t i = 0; i < 6; i++) generateColoPokemon(rng, tsv, natures[enemy][i], genders[enemy][i], genderRatios[enemy][i]);
        if (rng.nextUShort(3) != trainer) return false;
        tsv = static_cast<std::uint16_t>(rng.nextUShort() ^ rng.nextUShort());
        for (std::uint8_t i = 0; i < 6; i++) generateColoPokemon(rng, tsv, natures[lead][i], genders[lead][i], genderRatios[lead][i]);
        return true;
    }
}

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen3ngcseed_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3ngcseed_search_gales(std::uint32_t playerIndex, std::uint32_t enemyIndex,
        std::uint32_t enemyHpLeft, std::uint32_t enemyHpRight, std::uint32_t playerHpLeft, std::uint32_t playerHpRight,
        const std::uint32_t *seeds, std::uint32_t seedCount, std::uint32_t lowStart, std::uint32_t lowCount)
    {
        results.clear(); lastError = None;
        if (playerIndex > 4 || enemyIndex > 4 || enemyHpLeft > 714 || enemyHpRight > 714
            || playerHpLeft > 714 || playerHpRight > 714)
        { lastError = InvalidInput; return 0; }
        const std::uint16_t enemyHp[2] = { static_cast<std::uint16_t>(enemyHpLeft), static_cast<std::uint16_t>(enemyHpRight) };
        const std::uint16_t playerHp[2] = { static_cast<std::uint16_t>(playerHpLeft), static_cast<std::uint16_t>(playerHpRight) };
        if ((seedCount > 0 && seeds == nullptr)
            || (seedCount == 0
                && (lowCount == 0 || static_cast<std::uint64_t>(lowStart) + lowCount > 0x10000ULL)))
        { lastError = InvalidInput; return 0; }
        if (seedCount > 0)
        {
            for (std::uint32_t i = 0; i < seedCount; i++)
            { XDRNG rng(seeds[i]); if (searchGalesSeed(rng, static_cast<std::uint8_t>(playerIndex), static_cast<std::uint8_t>(enemyIndex), enemyHp, playerHp)) results.push_back({ rng.getSeed() }); }
        }
        else
        {
            for (std::uint32_t low = lowStart; low < lowStart + lowCount; low++)
                for (std::uint32_t high = playerIndex; high < 0x10000; high += 5)
                { XDRNG rng((high << 16) | low); if (searchGalesSeedSkip(rng, static_cast<std::uint8_t>(playerIndex), static_cast<std::uint8_t>(enemyIndex), enemyHp, playerHp)) results.push_back({ rng.getSeed() }); }
        }
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3ngcseed_search_colo(std::uint32_t partyLead, std::uint32_t trainer,
        const std::uint32_t *seeds, std::uint32_t seedCount, std::uint32_t lowStart, std::uint32_t lowCount)
    {
        results.clear(); lastError = None;
        if (partyLead > 7 || trainer > 2) { lastError = InvalidInput; return 0; }
        if ((seedCount > 0 && seeds == nullptr)
            || (seedCount == 0
                && (lowCount == 0 || static_cast<std::uint64_t>(lowStart) + lowCount > 0x10000ULL)))
        { lastError = InvalidInput; return 0; }
        if (seedCount > 0)
        {
            for (std::uint32_t i = 0; i < seedCount; i++)
            { XDRNG rng(seeds[i]); if (searchColoSeed(rng, static_cast<std::uint8_t>(partyLead), static_cast<std::uint8_t>(trainer))) results.push_back({ rng.getSeed() }); }
        }
        else
        {
            for (std::uint32_t low = lowStart; low < lowStart + lowCount; low++)
                for (std::uint32_t high = partyLead; high < 0x10000; high += 8)
                { XDRNG rng((high << 16) | low); if (searchColoSeedSkip(rng, static_cast<std::uint8_t>(partyLead), static_cast<std::uint8_t>(trainer))) results.push_back({ rng.getSeed() }); }
        }
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3ngcseed_search_channel(const std::uint32_t *patterns, std::uint32_t count,
        std::uint32_t startSeed, std::uint32_t stateCount)
    {
        results.clear(); lastError = None;
        if (patterns == nullptr || count < 10 || startSeed < 0x40000001 || stateCount == 0
            || static_cast<std::uint64_t>(startSeed) + stateCount > 0xffffffffULL)
        { lastError = InvalidInput; return 0; }
        for (std::uint32_t i = 0; i < count; i++)
            if (!validChannelPattern(channelPattern(patterns, i))) { lastError = InvalidInput; return 0; }
        const std::uint64_t endSeed = static_cast<std::uint64_t>(startSeed) + stateCount;
        for (std::uint64_t seed = startSeed; seed < endSeed; seed++)
        { XDRNG rng(static_cast<std::uint32_t>(seed)); if (searchChannelSeed(rng, patterns, count)) results.push_back({ rng.getSeed() }); }
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen3ngcseed_result_ptr() { return reinterpret_cast<std::uintptr_t>(results.data()); }
    POKERNGKIT_KEEPALIVE std::uint32_t gen3ngcseed_result_count() { return static_cast<std::uint32_t>(results.size()); }
    POKERNGKIT_KEEPALIVE std::uint32_t gen3ngcseed_last_error() { return lastError; }
}
