/*
 * PokeRNGKit Gen V Hidden Grotto native parity fixture
 * Copyright (C) 2026 Hakuhiro
 *
 * Expected states are derived from PokeFinder 4.3.2
 * Test/Gen5/hiddengrotto.json (GPL-3.0-or-later).
 */
#include "gen5hiddengrotto_bridge.h"

#include <array>
#include <cstddef>
#include <cstdint>
#include <iostream>
#include <string_view>

namespace
{
    constexpr std::uint64_t fnvOffset = 14695981039346656037ULL;
    constexpr std::uint64_t fnvPrime = 1099511628211ULL;

    bool check(bool condition, std::string_view message)
    {
        if (!condition) std::cerr << message << '\n';
        return condition;
    }

    void hashWord(std::uint64_t &hash, std::uint32_t value)
    {
        hash ^= value;
        hash *= fnvPrime;
    }

    std::array<std::uint8_t, 6> unpackIvs(const Gen5HiddenGrottoPackedResult &result)
    {
        return {
            static_cast<std::uint8_t>(result.ivs0),
            static_cast<std::uint8_t>(result.ivs0 >> 8),
            static_cast<std::uint8_t>(result.ivs0 >> 16),
            static_cast<std::uint8_t>(result.ivs0 >> 24),
            static_cast<std::uint8_t>(result.ivs1),
            static_cast<std::uint8_t>(result.ivs1 >> 8),
        };
    }

    std::array<std::uint16_t, 6> unpackStats(const Gen5HiddenGrottoPackedResult &result)
    {
        return {
            static_cast<std::uint16_t>(result.stats0),
            static_cast<std::uint16_t>(result.stats0 >> 16),
            static_cast<std::uint16_t>(result.stats1),
            static_cast<std::uint16_t>(result.stats1 >> 16),
            static_cast<std::uint16_t>(result.stats2),
            static_cast<std::uint16_t>(result.stats2 >> 16),
        };
    }

    std::uint8_t metadata(
        const Gen5HiddenGrottoPackedResult &result, std::uint8_t shift, std::uint32_t mask)
    {
        return static_cast<std::uint8_t>((result.metadata >> shift) & mask);
    }

    std::uint64_t hashSlotResults(
        const Gen5HiddenGrottoPackedResult *results, std::uint32_t count)
    {
        std::uint64_t hash = fnvOffset;
        for (std::uint32_t index = 0; index < count; index++)
        {
            const auto &result = results[index];
            hashWord(hash, result.advances);
            hashWord(hash, result.pidOrData);
            hashWord(hash, metadata(result, 18, 1));
            hashWord(hash, metadata(result, 0, 0x7f));
            hashWord(hash, metadata(result, 10, 3));
            hashWord(hash, metadata(result, 12, 3));
            hashWord(hash, metadata(result, 14, 0xf));
        }
        return hash;
    }

    std::uint64_t hashPokemonResults(
        const Gen5HiddenGrottoPackedResult *results, std::uint32_t count)
    {
        std::uint64_t hash = fnvOffset;
        for (std::uint32_t index = 0; index < count; index++)
        {
            const auto &result = results[index];
            hashWord(hash, result.pidOrData);
            for (const auto value : unpackStats(result)) hashWord(hash, value);
            hashWord(hash, result.abilityIndex);
            for (const auto value : unpackIvs(result)) hashWord(hash, value);
            hashWord(hash, metadata(result, 10, 3));
            hashWord(hash, result.speciesForm >> 16);
            hashWord(hash, metadata(result, 12, 3));
            hashWord(hash, (result.ivs1 >> 16) & 0xffU);
            hashWord(hash, result.ivs1 >> 24);
            hashWord(hash, metadata(result, 14, 0x7f));
            hashWord(hash, metadata(result, 21, 0x1f));
            hashWord(hash, metadata(result, 26, 3));
            hashWord(hash, result.advances);
            hashWord(hash, metadata(result, 0, 0x7f));
        }
        return hash;
    }

    bool samePayload(
        const Gen5HiddenGrottoPackedResult &left,
        const Gen5HiddenGrottoPackedResult &right)
    {
        const auto *leftWords = reinterpret_cast<const std::uint32_t *>(&left);
        const auto *rightWords = reinterpret_cast<const std::uint32_t *>(&right);
        for (std::size_t index = 5; index < 16; index++)
            if (leftWords[index] != rightWords[index]) return false;
        return true;
    }

    Gen5HiddenGrottoPackedRequest baseRequest()
    {
        Gen5HiddenGrottoPackedRequest request = {};
        request.operation = 0;
        request.version = 2;
        request.keypressCountMask = 1;
        request.tid = 12345;
        request.sid = 54321;
        request.lead = 255;
        request.natureMask = 0x1ffffff;
        request.hiddenPowerMask = 0xffff;
        request.levelMin = 1;
        request.levelMax = 100;
        request.resultLimit = 100;
        request.chunkCount = 1;
        for (std::size_t index = 0; index < 6; index++) request.ivMax[index] = 31;

        constexpr std::array<std::uint16_t, 12> species = {
            206, 507, 183, 206, 507, 183, 206, 507, 183, 206, 507, 183,
        };
        for (std::size_t index = 0; index < species.size(); index++)
        {
            request.pokemonSpeciesFormGender[index]
                = species[index] | (static_cast<std::uint32_t>(30) << 16);
            request.pokemonMinMaxLevel[index] = 10 | (15U << 8);
        }

        constexpr std::array<std::uint16_t, 16> items = {
            82, 2, 3, 4, 84, 2, 3, 4, 83, 77, 76, 79, 85, 25, 26, 17,
        };
        constexpr std::array<std::uint16_t, 16> hiddenItems = {
            50, 72, 87, 95, 51, 73, 86, 96, 51, 74, 86, 97, 53, 75, 86, 98,
        };
        for (std::size_t index = 0; index < items.size(); index++)
        {
            request.items[index] = items[index];
            request.hiddenItems[index] = hiddenItems[index];
        }
        return request;
    }

    void configureSearchProfile(Gen5HiddenGrottoPackedRequest &request)
    {
        constexpr std::uint64_t mac = 41860346966ULL;
        request.macLow = static_cast<std::uint32_t>(mac);
        request.macHigh = static_cast<std::uint32_t>(mac >> 32);
        request.vcount = 72;
        request.timer0Min = 2418;
        request.timer0Max = 2418;
        request.gxstat = 6;
        request.vframe = 5;
        request.startYear = request.endYear = 2000;
        request.startMonth = request.endMonth = 1;
        request.startDay = request.endDay = 1;
        request.chunkStart = 0;
        request.chunkCount = 1;
    }
}

int main()
{
    if (!check(gen5hiddengrotto_api_version() == 2, "unexpected API version")) return 1;

    auto slotNone = baseRequest();
    slotNone.maxAdvances = 99;
    std::array<Gen5HiddenGrottoPackedResult, 100> slotResults = {};
    auto count = gen5hiddengrotto_test_generate(
        &slotNone, slotResults.data(), slotResults.size());
    if (!check(count == 5, "slot None result count mismatch")
        || !check(hashSlotResults(slotResults.data(), count) == 0xa0899df5844726fdULL,
                  "slot None parity hash mismatch"))
        return 1;

    auto slotLevelS = slotNone;
    slotLevelS.grottoPower = 4;
    count = gen5hiddengrotto_test_generate(
        &slotLevelS, slotResults.data(), slotResults.size());
    if (!check(count == 60, "slot Level S result count mismatch")
        || !check(hashSlotResults(slotResults.data(), count) == 0x2ba9d0ccc1cef4beULL,
                  "slot Level S parity hash mismatch"))
        return 1;

    auto pokemonMale = baseRequest();
    pokemonMale.operation = 2;
    pokemonMale.filtersDisabled = 1;
    pokemonMale.maxAdvances = 9;
    pokemonMale.gender = 0;
    std::array<Gen5HiddenGrottoPackedResult, 10> pokemonResults = {};
    count = gen5hiddengrotto_test_generate(
        &pokemonMale, pokemonResults.data(), pokemonResults.size());
    if (!check(count == 10, "Pokemon male result count mismatch")
        || !check(hashPokemonResults(pokemonResults.data(), count) == 0x363762e112bb8404ULL,
                  "Pokemon male parity hash mismatch"))
        return 1;

    auto pokemonFemaleSync = pokemonMale;
    pokemonFemaleSync.lead = 0;
    pokemonFemaleSync.gender = 1;
    count = gen5hiddengrotto_test_generate(
        &pokemonFemaleSync, pokemonResults.data(), pokemonResults.size());
    if (!check(count == 10, "Pokemon Synchronize result count mismatch")
        || !check(hashPokemonResults(pokemonResults.data(), count) == 0x6dbc83081a7dc027ULL,
                  "Pokemon Synchronize parity hash mismatch"))
        return 1;

    gen5hiddengrotto_clear_cache();
    auto slotSearcher = baseRequest();
    slotSearcher.operation = 1;
    slotSearcher.maxAdvances = 99;
    configureSearchProfile(slotSearcher);
    const auto searchSeed = gen5hiddengrotto_test_seed(
        &slotSearcher, 0, 0, slotSearcher.timer0Min);
    if (!check(searchSeed == 5264333967543063602ULL, "Black 2 SHA fixture mismatch")) return 1;
    auto slotGenerator = slotSearcher;
    slotGenerator.operation = 0;
    slotGenerator.seedLow = static_cast<std::uint32_t>(searchSeed);
    slotGenerator.seedHigh = static_cast<std::uint32_t>(searchSeed >> 32);
    const auto generatedSlotCount = gen5hiddengrotto_test_generate(
        &slotGenerator, slotResults.data(), slotResults.size());
    if (!check(generatedSlotCount != 0, "slot search fixture generated no states")
        || !check(gen5hiddengrotto_search(&slotSearcher) == generatedSlotCount,
               "slot searcher result count mismatch")
        || !check(gen5hiddengrotto_last_error() == 0, "slot searcher returned an error")
        || !check(gen5hiddengrotto_processed_count() == 1,
                  "slot searcher processed the wrong unit count"))
        return 1;
    const auto *searchedSlots = reinterpret_cast<const Gen5HiddenGrottoPackedResult *>(
        gen5hiddengrotto_result_ptr());
    for (std::uint32_t index = 0; index < generatedSlotCount; index++)
        if (!check(samePayload(slotResults[index], searchedSlots[index]),
                   "slot searcher diverged from generator"))
            return 1;

    auto pokemonSearcher = baseRequest();
    pokemonSearcher.operation = 3;
    pokemonSearcher.maxAdvances = 9;
    pokemonSearcher.gender = 0;
    configureSearchProfile(pokemonSearcher);
    auto pokemonGenerator = pokemonSearcher;
    pokemonGenerator.operation = 2;
    pokemonGenerator.seedLow = static_cast<std::uint32_t>(searchSeed);
    pokemonGenerator.seedHigh = static_cast<std::uint32_t>(searchSeed >> 32);
    const auto generatedPokemonCount = gen5hiddengrotto_test_generate(
        &pokemonGenerator, pokemonResults.data(), pokemonResults.size());
    if (!check(generatedPokemonCount == 10, "Pokemon search fixture generated the wrong state count")
        || !check(gen5hiddengrotto_search(&pokemonSearcher) == generatedPokemonCount,
               "raw Pokemon searcher result count mismatch")
        || !check(gen5hiddengrotto_last_error() == 0,
                  "raw Pokemon searcher returned an error"))
        return 1;
    const auto *rawPokemon = reinterpret_cast<const Gen5HiddenGrottoPackedResult *>(
        gen5hiddengrotto_result_ptr());
    for (std::uint32_t index = 0; index < generatedPokemonCount; index++)
        if (!check(samePayload(pokemonResults[index], rawPokemon[index]),
                   "raw Pokemon searcher diverged from generator"))
            return 1;

    const std::array<std::uint32_t, 2> ivEntries = {
        0,
        static_cast<std::uint32_t>(searchSeed >> 32),
    };
    if (!check(gen5hiddengrotto_configure_cache(
                   ivEntries.data(), 1, nullptr, 0)
                   == 1,
               "IV cache configuration failed")
        || !check(gen5hiddengrotto_search(&pokemonSearcher) == generatedPokemonCount,
                  "IV cache Pokemon searcher result count mismatch"))
        return 1;
    const auto *cachedIvPokemon
        = reinterpret_cast<const Gen5HiddenGrottoPackedResult *>(
            gen5hiddengrotto_result_ptr());
    for (std::uint32_t index = 0; index < generatedPokemonCount; index++)
        if (!check(samePayload(pokemonResults[index], cachedIvPokemon[index]),
                   "IV cache Pokemon searcher diverged from generator"))
            return 1;

    const std::array<std::uint32_t, 4> shaEntries = {
        0,
        pokemonSearcher.timer0Min << 16,
        static_cast<std::uint32_t>(searchSeed),
        static_cast<std::uint32_t>(searchSeed >> 32),
    };
    if (!check(gen5hiddengrotto_configure_cache(
                   ivEntries.data(), 1, shaEntries.data(), 1)
                   == 1,
               "SHA cache configuration failed")
        || !check(gen5hiddengrotto_search(&pokemonSearcher) == generatedPokemonCount,
                  "SHA cache Pokemon searcher result count mismatch"))
        return 1;
    const auto *cachedShaPokemon
        = reinterpret_cast<const Gen5HiddenGrottoPackedResult *>(
            gen5hiddengrotto_result_ptr());
    for (std::uint32_t index = 0; index < generatedPokemonCount; index++)
        if (!check(samePayload(pokemonResults[index], cachedShaPokemon[index]),
                   "SHA cache Pokemon searcher diverged from generator"))
            return 1;

    gen5hiddengrotto_clear_cache();
    auto wrapping = pokemonMale;
    wrapping.initialAdvances = 0xffffffffU;
    wrapping.maxAdvances = 1;
    wrapping.resultLimit = 2;
    if (!check(gen5hiddengrotto_test_generate(
                   &wrapping, pokemonResults.data(), 2)
                   == 2,
               "uint32 advance wrapping diverged from upstream"))
        return 1;
    return 0;
}
