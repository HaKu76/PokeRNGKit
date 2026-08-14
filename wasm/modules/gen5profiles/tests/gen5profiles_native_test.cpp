/*
 * PokeRNGKit Gen V Profile Calibrator native parity fixture
 * Copyright (C) 2026 Hakuhiro
 * GPL-3.0-or-later
 */
#include "gen5profiles_bridge.h"

#include <cstdint>
#include <iostream>

namespace
{
    Gen5ProfilesPackedRequest request(std::uint32_t version, std::uint32_t vcount, std::uint32_t timer0)
    {
        Gen5ProfilesPackedRequest value = {};
        value.mode = 2;
        value.version = version;
        value.language = 0;
        value.dsType = 0;
        const std::uint64_t mac = 41860346966ULL;
        value.macLow = static_cast<std::uint32_t>(mac);
        value.macHigh = static_cast<std::uint32_t>(mac >> 32);
        value.year = 2000;
        value.month = 1;
        value.day = 1;
        value.maxSeconds = 59;
        value.minVCount = value.maxVCount = vcount;
        value.minTimer0 = value.maxTimer0 = timer0;
        value.minGxStat = value.maxGxStat = 6;
        value.minVFrame = value.maxVFrame = 5;
        for (std::uint32_t index = 0; index < 6; index++) value.maxIVs[index] = 31;
        value.resultLimit = 10;
        return value;
    }

    bool check(bool condition, const char *message)
    {
        if (!condition) std::cerr << message << '\n';
        return condition;
    }

    bool checkSeed(const Gen5ProfilesPackedRequest &value, const std::uint8_t *needles, std::uint32_t needleCount,
                   std::uint64_t expected, const char *message)
    {
        const auto count = gen5profiles_search(&value, needles, needleCount);
        if (count != 1)
        {
            std::cerr << message << ": returned " << count << " results\n";
            return false;
        }
        const auto *result = reinterpret_cast<const Gen5ProfilesPackedResult *>(gen5profiles_result_ptr());
        const auto seed = (static_cast<std::uint64_t>(result[0].seedHigh) << 32) | result[0].seedLow;
        if (seed != expected)
        {
            std::cerr << message << ": returned seed " << seed << '\n';
            return false;
        }
        return true;
    }
}

int main()
{
    if (!check(gen5profiles_api_version() == 1, "unexpected API version")) return 1;

    auto black = request(0, 46, 1544);
    constexpr std::uint64_t blackSeed = 6812116909077463616ULL;
    black.seedLow = static_cast<std::uint32_t>(blackSeed);
    black.seedHigh = static_cast<std::uint32_t>(blackSeed >> 32);
    if (!checkSeed(black, nullptr, 0, blackSeed, "Black seed fixture failed")) return 1;

    auto black2 = request(2, 72, 2418);
    constexpr std::uint64_t black2Seed = 5264333967543063602ULL;
    black2.seedLow = static_cast<std::uint32_t>(black2Seed);
    black2.seedHigh = static_cast<std::uint32_t>(black2Seed >> 32);
    if (!checkSeed(black2, nullptr, 0, black2Seed, "Black 2 seed fixture failed")) return 1;

    auto blackIVs = request(0, 46, 1544);
    blackIVs.mode = 0;
    const std::uint32_t blackIVValues[6] = { 24, 4, 18, 5, 26, 0 };
    for (std::uint32_t index = 0; index < 6; index++)
        blackIVs.minIVs[index] = blackIVs.maxIVs[index] = blackIVValues[index];
    if (!checkSeed(blackIVs, nullptr, 0, blackSeed, "Black IV fixture failed")) return 1;

    auto black2IVs = request(2, 72, 2418);
    black2IVs.mode = 0;
    const std::uint32_t black2IVValues[6] = { 5, 4, 27, 10, 7, 17 };
    for (std::uint32_t index = 0; index < 6; index++)
        black2IVs.minIVs[index] = black2IVs.maxIVs[index] = black2IVValues[index];
    if (!checkSeed(black2IVs, nullptr, 0, black2Seed, "Black 2 IV fixture failed")) return 1;

    auto blackNeedles = request(0, 46, 1544);
    blackNeedles.mode = 1;
    blackNeedles.needleType = 1;
    const std::uint8_t blackNeedleValues[4] = { 5, 4, 0, 5 };
    if (!checkSeed(blackNeedles, blackNeedleValues, 4, blackSeed, "Black needle fixture failed")) return 1;

    auto black2Needles = request(2, 72, 2418);
    black2Needles.mode = 1;
    const std::uint8_t black2NeedleValues[4] = { 7, 4, 7, 0 };
    if (!checkSeed(black2Needles, black2NeedleValues, 4, black2Seed, "Black 2 needle fixture failed")) return 1;

    auto black2MemoryNeedles = black2Needles;
    black2MemoryNeedles.memoryLink = 1;
    const std::uint8_t black2MemoryNeedleValues[4] = { 0, 1, 0, 7 };
    if (!checkSeed(black2MemoryNeedles, black2MemoryNeedleValues, 4, black2Seed, "Black 2 memory-link needle fixture failed"))
        return 1;

    auto invalid = black;
    invalid.minTimer0 = 2;
    invalid.maxTimer0 = 1;
    if (!check(gen5profiles_search(&invalid, nullptr, 0) == 0, "invalid range unexpectedly returned results")) return 1;
    if (!check(gen5profiles_last_error() == 1, "invalid range returned the wrong error")) return 1;
    return 0;
}
