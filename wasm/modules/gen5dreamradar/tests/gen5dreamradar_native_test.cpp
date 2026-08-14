/*
 * PokeRNGKit Gen V Dream Radar native parity fixture
 * Copyright (C) 2026 Hakuhiro
 * GPL-3.0-or-later
 */
#include "gen5dreamradar_bridge.h"

#include <array>
#include <cstdint>
#include <iostream>

namespace
{
    struct Expected
    {
        std::uint32_t pid;
        std::array<std::uint8_t, 6> ivs;
        std::uint8_t nature;
        std::uint8_t needle;
        std::uint8_t hiddenPower;
        std::uint8_t hiddenPowerStrength;
        std::uint8_t ability;
        std::uint8_t gender;
        std::uint16_t abilityIndex;
    };

    constexpr std::array<Expected, 10> tornadus = { {
        { 0x97c71815U, { 16, 15, 18, 12, 29, 26 }, 15, 4, 8, 38, 2, 0, 144 },
        { 0x2cbc470fU, { 18, 12, 29, 26, 2, 10 }, 8, 0, 0, 66, 2, 0, 144 },
        { 0x9d7d0274U, { 29, 26, 2, 10, 2, 20 }, 2, 0, 0, 64, 2, 0, 144 },
        { 0x59869151U, { 2, 10, 2, 20, 0, 11 }, 17, 4, 1, 39, 2, 0, 144 },
        { 0x15c29f5bU, { 2, 20, 0, 11, 26, 30 }, 15, 1, 3, 66, 2, 0, 144 },
        { 0xaf8378e7U, { 0, 11, 26, 30, 24, 4 }, 3, 4, 0, 43, 2, 0, 144 },
        { 0xa3ce2539U, { 26, 30, 24, 4, 27, 27 }, 2, 2, 9, 57, 2, 0, 144 },
        { 0x2669f9c5U, { 24, 4, 27, 27, 31, 15 }, 15, 0, 14, 68, 2, 0, 144 },
        { 0x18e0bfb3U, { 27, 27, 31, 15, 25, 25 }, 13, 5, 15, 44, 2, 0, 144 },
        { 0x9e24f3ebU, { 31, 15, 25, 25, 14, 16 }, 15, 5, 5, 52, 2, 0, 144 },
    } };

    constexpr std::array<Expected, 10> lugia = { {
        { 0x64b21e0dU, { 19, 20, 12, 14, 9, 28 }, 24, 4, 7, 40, 2, 2, 136 },
        { 0x6eb90718U, { 12, 14, 9, 28, 1, 30 }, 1, 0, 8, 36, 2, 2, 136 },
        { 0xfe966699U, { 9, 28, 1, 30, 8, 12 }, 0, 0, 1, 40, 2, 2, 136 },
        { 0x0e0e3932U, { 1, 30, 8, 12, 15, 25 }, 10, 4, 9, 51, 2, 2, 136 },
        { 0x07fd199fU, { 8, 12, 15, 25, 25, 16 }, 7, 1, 12, 32, 2, 2, 136 },
        { 0x7070c25eU, { 15, 25, 25, 16, 15, 18 }, 8, 4, 9, 56, 2, 2, 136 },
        { 0x4c579e1cU, { 25, 16, 15, 18, 12, 29 }, 22, 2, 3, 42, 2, 2, 136 },
        { 0x566d3bb0U, { 15, 18, 12, 29, 26, 2 }, 5, 0, 4, 57, 2, 2, 136 },
        { 0xe8c031a5U, { 12, 29, 26, 2, 10, 2 }, 19, 5, 0, 68, 2, 2, 136 },
        { 0x33906a2cU, { 26, 2, 10, 2, 20, 0 }, 17, 5, 0, 44, 2, 2, 136 },
    } };

    constexpr std::array<Expected, 10> staryu = { {
        { 0x64b21ef2U, { 19, 20, 12, 14, 9, 28 }, 1, 4, 7, 40, 2, 2, 148 },
        { 0x6eb907b9U, { 12, 14, 9, 28, 1, 30 }, 14, 0, 8, 36, 2, 2, 148 },
        { 0xfe966675U, { 9, 28, 1, 30, 8, 12 }, 4, 0, 1, 40, 2, 2, 148 },
        { 0x0e0e39bfU, { 1, 30, 8, 12, 15, 25 }, 15, 4, 9, 51, 2, 2, 148 },
        { 0x07fd1955U, { 8, 12, 15, 25, 25, 16 }, 8, 1, 12, 32, 2, 2, 148 },
        { 0x7070c2b0U, { 15, 25, 25, 16, 15, 18 }, 2, 4, 9, 56, 2, 2, 148 },
        { 0x4c579e33U, { 25, 16, 15, 18, 12, 29 }, 17, 2, 3, 42, 2, 2, 148 },
        { 0x566d3b7aU, { 15, 18, 12, 29, 26, 2 }, 15, 0, 4, 57, 2, 2, 148 },
        { 0xe8c03173U, { 12, 29, 26, 2, 10, 2 }, 3, 5, 0, 68, 2, 2, 148 },
        { 0x33906af5U, { 26, 2, 10, 2, 20, 0 }, 2, 5, 0, 44, 2, 2, 148 },
    } };

    constexpr std::array<Expected, 10> slowpokeAfterStaryu = { {
        { 0xfe9666caU, { 16, 15, 18, 12, 29, 26 }, 0, 4, 8, 38, 2, 0, 144 },
        { 0x0e0e3995U, { 18, 12, 29, 26, 2, 10 }, 10, 0, 0, 66, 2, 0, 144 },
        { 0x07fd19cdU, { 29, 26, 2, 10, 2, 20 }, 7, 0, 0, 64, 2, 0, 144 },
        { 0x7070c2abU, { 2, 10, 2, 20, 0, 11 }, 8, 4, 1, 39, 2, 0, 144 },
        { 0x4c579e89U, { 2, 20, 0, 11, 26, 30 }, 22, 1, 3, 66, 2, 0, 144 },
        { 0x566d3bd6U, { 0, 11, 26, 30, 24, 4 }, 5, 4, 0, 43, 2, 0, 144 },
        { 0xe8c031d0U, { 26, 30, 24, 4, 27, 27 }, 19, 2, 9, 57, 2, 0, 144 },
        { 0x33906a92U, { 24, 4, 27, 27, 31, 15 }, 17, 0, 14, 68, 2, 0, 144 },
        { 0xc579848bU, { 27, 27, 31, 15, 25, 25 }, 23, 5, 15, 44, 2, 0, 144 },
        { 0xb2e809cdU, { 31, 15, 25, 25, 14, 16 }, 5, 5, 5, 52, 2, 0, 144 },
    } };

    bool check(bool condition, const char *message)
    {
        if (!condition) std::cerr << message << '\n';
        return condition;
    }

    Gen5DreamRadarPackedRequest request()
    {
        Gen5DreamRadarPackedRequest value = {};
        value.operation = 0;
        value.version = 2;
        value.language = 0;
        value.dsType = 0;
        value.keypressCountMask = 1;
        value.initialAdvances = 0;
        value.maxAdvances = 9;
        value.resultLimit = 100;
        value.tid = 12345;
        value.sid = 54321;
        value.slotCount = 1;
        value.natureMask = 0x1ffffff;
        value.hiddenPowerMask = 0xffff;
        value.chunkCount = 10;
        for (std::size_t index = 0; index < 6; index++) value.ivMax[index] = 31;
        return value;
    }

    bool checkFixture(Gen5DreamRadarPackedRequest value, const std::array<Expected, 10> &expected, const char *message)
    {
        std::array<Gen5DreamRadarPackedResult, 10> output = {};
        const auto count = gen5dreamradar_test_generate(&value, output.data(), output.size());
        if (!check(count == output.size(), "fixture returned an unexpected result count")) return false;
        for (std::size_t index = 0; index < output.size(); index++)
        {
            const auto &result = output[index];
            const auto &state = expected[index];
            const std::array<std::uint8_t, 6> ivs = {
                static_cast<std::uint8_t>(result.ivs0),
                static_cast<std::uint8_t>(result.ivs0 >> 8),
                static_cast<std::uint8_t>(result.ivs0 >> 16),
                static_cast<std::uint8_t>(result.ivs0 >> 24),
                static_cast<std::uint8_t>(result.ivs1),
                static_cast<std::uint8_t>(result.ivs1 >> 8),
            };
            const auto metadata = result.metadata;
            if (!check(result.advances == index && result.pid == state.pid && ivs == state.ivs
                           && ((metadata >> 15) & 0x1f) == state.nature && (metadata & 7) == state.needle
                           && ((result.ivs1 >> 16) & 0xff) == state.hiddenPower
                           && (result.ivs1 >> 24) == state.hiddenPowerStrength
                           && ((metadata >> 3) & 3) == state.ability && ((metadata >> 5) & 3) == state.gender
                           && ((metadata >> 7) & 0xff) == 5 && result.abilityIndex == state.abilityIndex,
                       message))
                return false;
        }
        return true;
    }
}

int main()
{
    if (!check(gen5dreamradar_api_version() == 1, "unexpected API version")) return 1;

    auto value = request();
    value.encounters[0] = 23;
    value.genders[0] = 0;
    if (!checkFixture(value, tornadus, "Tornadus fixture failed"))
        return 1;

    value.encounters[0] = 8;
    value.genders[0] = 2;
    if (!checkFixture(value, lugia, "Lugia fixture failed"))
        return 1;

    value.encounters[0] = 1;
    value.genders[0] = 2;
    if (!checkFixture(value, staryu, "Staryu fixture failed"))
        return 1;

    value.slotCount = 2;
    value.encounters[0] = 1;
    value.genders[0] = 2;
    value.encounters[1] = 0;
    value.genders[1] = 0;
    if (!checkFixture(value, slowpokeAfterStaryu, "multi-slot Slowpoke fixture failed"))
        return 1;

    auto invalid = request();
    invalid.slotCount = 2;
    invalid.encounters[0] = 1;
    invalid.genders[0] = 2;
    invalid.encounters[1] = 23;
    invalid.genders[1] = 0;
    if (!check(gen5dreamradar_search(&invalid) == 0 && gen5dreamradar_last_error() == 1,
               "invalid Genie slot was accepted"))
        return 1;

    invalid = request();
    invalid.chunkStart = 10;
    invalid.chunkCount = 1;
    if (!check(gen5dreamradar_search(&invalid) == 0 && gen5dreamradar_last_error() == 3,
               "invalid chunk returned the wrong error"))
        return 1;

    auto sha = request();
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
        if (gen5dreamradar_test_seed(&sha, second, 0, 2418) == 5264333967543063602ULL) seedFound = true;
    if (!check(seedFound, "Black 2 SHA fixture failed")) return 1;

    return 0;
}
