/*
 * PokeRNGKit Gen V Egg native parity fixture
 * Copyright (C) 2026 Hakuhiro
 * GPL-3.0-or-later
 */
#include "gen5egg_bridge.h"

#include <array>
#include <cstdint>
#include <iostream>
#include <limits>

namespace
{
    using Values = std::array<std::uint8_t, 6>;

    struct FirstState
    {
        std::uint32_t advances;
        std::uint32_t pid;
        Values ivs;
        Values inheritance;
        Values stats;
        std::uint16_t abilityIndex;
        std::uint16_t species;
        std::uint8_t ability;
        std::uint8_t nature;
        std::uint8_t chatot;
        std::uint8_t gender;
        std::uint8_t shiny;
        std::uint8_t hiddenPower;
        std::uint8_t hiddenPowerStrength;
        std::uint8_t characteristic;
    };

    constexpr std::array<std::array<std::uint32_t, 10>, 6> pids = { {
        { 0x15c39f00U, 0x07fc1954U, 0x15c39f00U, 0x566c3b79U, 0x15c39f00U,
          0x566c3b79U, 0x15c39f00U, 0x566c3b79U, 0xa3cf2590U, 0x33916af4U },
        { 0x598791deU, 0x0e0f39beU, 0x598791deU, 0x566c3b79U, 0x598791deU,
          0x566c3b79U, 0x598791deU, 0x566c3b79U, 0xa3cf2590U, 0x566c3b79U },
        { 0x15c39f00U, 0x07fc1954U, 0x15c39f00U, 0x566c3b79U, 0x15c39f00U,
          0x566c3b79U, 0x15c39f00U, 0x566c3b79U, 0xa3cf2590U, 0x33916af4U },
        { 0x97c6182bU, 0x0e0e39bfU, 0x2cbc4714U, 0x07fc1955U, 0x9d7c022bU,
          0x7070c2b0U, 0x598691dfU, 0x4c569e33U, 0x15c29f01U, 0x566c3b7aU },
        { 0x97c6182bU, 0x0e0e39bfU, 0x2cbc4714U, 0x07fc1955U, 0x9d7c022bU,
          0x7070c2b0U, 0x598691dfU, 0x4c569e33U, 0x15c29f01U, 0x566c3b7aU },
        { 0x97c6182bU, 0x0e0e39bfU, 0x2cbc4714U, 0x07fc1955U, 0x9d7c022bU,
          0x7070c2b0U, 0x598691dfU, 0x4c569e33U, 0x15c29f01U, 0x566c3b7aU },
    } };

    constexpr std::array<FirstState, 6> firstStates = { {
        { 39, 0x15c39f00U, { 31, 13, 31, 20, 12, 31 }, { 1, 0, 1, 0, 0, 2 }, { 12, 6, 6, 6, 6, 6 },
          34, 1, 2, 0, 95, 1, 0, 3, 38, 1 },
        { 39, 0x598791deU, { 31, 13, 31, 20, 12, 31 }, { 1, 0, 1, 0, 0, 2 }, { 12, 6, 6, 6, 5, 6 },
          79, 32, 1, 12, 95, 0, 0, 3, 38, 1 },
        { 39, 0x15c39f00U, { 31, 13, 31, 20, 12, 31 }, { 1, 0, 1, 0, 0, 2 }, { 12, 6, 6, 6, 6, 7 },
          158, 314, 2, 12, 95, 1, 0, 3, 38, 1 },
        { 46, 0x97c6182bU, { 31, 14, 31, 31, 12, 19 }, { 2, 0, 2, 2, 0, 0 }, { 12, 6, 6, 6, 6, 6 },
          34, 1, 2, 0, 40, 0, 0, 6, 49, 1 },
        { 46, 0x97c6182bU, { 31, 26, 14, 31, 12, 31 }, { 1, 0, 0, 1, 0, 2 }, { 12, 6, 6, 6, 5, 6 },
          38, 29, 0, 12, 40, 1, 0, 5, 49, 1 },
        { 46, 0x97c6182bU, { 12, 19, 3, 31, 31, 31 }, { 0, 0, 0, 1, 1, 2 }, { 12, 6, 6, 6, 6, 7 },
          35, 313, 0, 12, 40, 0, 0, 14, 69, 16 },
    } };

    bool check(bool condition, const char *message)
    {
        if (!condition) std::cerr << message << '\n';
        return condition;
    }

    Gen5EggPackedRequest request(std::size_t index = 0)
    {
        Gen5EggPackedRequest value = {};
        value.operation = 0;
        value.version = index < 3 ? 0 : 2;
        value.language = 0;
        value.dsType = 0;
        value.keypressCountMask = 1;
        value.tid = 12345;
        value.sid = 54321;
        value.maxAdvances = 9;
        value.resultLimit = 100;
        value.species = std::array<std::uint32_t, 6>{ 1, 29, 313, 1, 29, 313 }[index];
        value.masuda = 1;
        value.parentAAbility = 0;
        value.parentBAbility = std::array<std::uint32_t, 6>{ 2, 0, 2, 2, 0, 0 }[index];
        value.parentAGender = 0;
        value.parentBGender = std::array<std::uint32_t, 6>{ 1, 2, 1, 1, 2, 1 }[index];
        value.parentAItem = std::array<std::uint32_t, 6>{ 0, 2, 0, 0, 2, 0 }[index];
        value.parentBItem = std::array<std::uint32_t, 6>{ 1, 0, 0, 1, 0, 0 }[index];
        value.natureMask = 0x1ffffff;
        value.hiddenPowerMask = 0xffff;
        value.chunkCount = 10;
        for (std::size_t stat = 0; stat < 6; stat++)
        {
            value.parentAIVs[stat] = 31;
            value.parentBIVs[stat] = 31;
            value.ivMax[stat] = 31;
        }
        return value;
    }

    Values unpackBytes(std::uint32_t first, std::uint32_t second)
    {
        return {
            static_cast<std::uint8_t>(first),
            static_cast<std::uint8_t>(first >> 8),
            static_cast<std::uint8_t>(first >> 16),
            static_cast<std::uint8_t>(first >> 24),
            static_cast<std::uint8_t>(second),
            static_cast<std::uint8_t>(second >> 8),
        };
    }

    Values unpackInheritance(std::uint32_t packed)
    {
        Values values = {};
        for (std::size_t index = 0; index < values.size(); index++)
            values[index] = static_cast<std::uint8_t>((packed >> (index * 2)) & 3U);
        return values;
    }

    Values unpackStats(const Gen5EggPackedResult &result)
    {
        return {
            static_cast<std::uint8_t>(result.stats01),
            static_cast<std::uint8_t>(result.stats01 >> 16),
            static_cast<std::uint8_t>(result.stats23),
            static_cast<std::uint8_t>(result.stats23 >> 16),
            static_cast<std::uint8_t>(result.stats45),
            static_cast<std::uint8_t>(result.stats45 >> 16),
        };
    }

    bool checkFixture(std::size_t fixture)
    {
        auto value = request(fixture);
        std::array<Gen5EggPackedResult, 10> output = {};
        if (!check(gen5egg_test_generate(&value, output.data(), output.size()) == output.size(),
                   "fixture returned an unexpected result count"))
            return false;
        for (std::size_t index = 0; index < output.size(); index++)
            if (!check(output[index].advances == firstStates[fixture].advances + index
                           && output[index].pid == pids[fixture][index],
                       "fixture PID or advance mismatch"))
                return false;

        const auto &result = output[0];
        const auto &expected = firstStates[fixture];
        const std::uint32_t metadata = result.metadata;
        const bool matches = result.seedLow == 0 && result.seedHigh == 0 && result.date == 0 && result.pid == expected.pid
            && unpackBytes(result.ivs0, result.ivs1) == expected.ivs
            && unpackInheritance(result.inheritance) == expected.inheritance && unpackStats(result) == expected.stats
            && result.abilityIndex == expected.abilityIndex && result.species == expected.species
            && (metadata & 0x7fU) == expected.chatot && ((metadata >> 10) & 3U) == expected.ability
            && ((metadata >> 12) & 3U) == expected.gender && ((metadata >> 14) & 0x1fU) == expected.nature
            && ((metadata >> 19) & 3U) == expected.shiny && ((metadata >> 21) & 0x1fU) == expected.characteristic
            && ((result.ivs1 >> 16) & 0xffU) == expected.hiddenPower
            && ((result.ivs1 >> 24) & 0xffU) == expected.hiddenPowerStrength;
        if (!matches)
        {
            std::cerr << "fixture " << fixture << " actual: species=" << result.species << " ability="
                      << ((metadata >> 10) & 3U) << " abilityIndex=" << result.abilityIndex << " nature="
                      << ((metadata >> 14) & 0x1fU) << " chatot=" << (metadata & 0x7fU) << " gender="
                      << ((metadata >> 12) & 3U) << " shiny=" << ((metadata >> 19) & 3U) << " hp="
                      << ((result.ivs1 >> 16) & 0xffU) << " power=" << ((result.ivs1 >> 24) & 0xffU) << " char="
                      << ((metadata >> 21) & 0x1fU) << '\n';
        }
        return check(matches, "fixture first state mismatch");
    }
}

int main()
{
    if (!check(gen5egg_api_version() == 2, "unexpected API version")) return 1;
    for (std::size_t fixture = 0; fixture < pids.size(); fixture++)
        if (!checkFixture(fixture)) return 1;

    auto invalid = request();
    invalid.chunkCount = 0;
    if (!check(gen5egg_search(&invalid) == 0 && gen5egg_last_error() == 1, "invalid chunk was accepted")) return 1;

    invalid = request();
    invalid.initialAdvances = std::numeric_limits<std::uint32_t>::max();
    invalid.maxAdvances = 1;
    if (!check(gen5egg_search(&invalid) == 0 && gen5egg_last_error() == 1, "advance overflow was accepted")) return 1;

    auto limited = request();
    limited.resultLimit = 1;
    if (!check(gen5egg_search(&limited) == 1 && gen5egg_limit_reached() == 1, "result limit was not enforced")) return 1;

    auto noKeypressCounts = request();
    noKeypressCounts.keypressCountMask = 0;
    if (!check(gen5egg_search(&noKeypressCounts) == 10 && gen5egg_last_error() == 0,
               "generator rejected a profile without enabled keypress counts"))
        return 1;

    auto sha = request(3);
    constexpr std::uint64_t mac = 41860346966ULL;
    sha.macLow = static_cast<std::uint32_t>(mac);
    sha.macHigh = static_cast<std::uint32_t>(mac >> 32);
    sha.vcount = 72;
    sha.gxstat = 6;
    sha.vframe = 5;
    sha.startYear = 2000;
    sha.startMonth = 1;
    sha.startDay = 1;
    bool seedFound = false;
    for (std::uint32_t second = 0; second < 60; second++)
        if (gen5egg_test_seed(&sha, second, 0, 2418) == 5264333967543063602ULL) seedFound = true;
    if (!check(seedFound, "Black 2 SHA fixture failed")) return 1;

    return 0;
}
