/*
 * PokeRNGKit Gen VIII Egg native parity fixture
 * Copyright (C) 2026 Hakuhiro
 * GPL-3.0-or-later
 */
#include "gen8egg_bridge.h"

#include <array>
#include <cstdint>
#include <iostream>
#include <limits>

namespace
{
    bool check(bool condition, const char *message)
    {
        if (!condition) std::cerr << message << '\n';
        return condition;
    }

    Gen8EggPackedRequest request(std::uint32_t species = 1)
    {
        Gen8EggPackedRequest value = {};
        value.seed0Low = 0x87654321U;
        value.seed0High = 0x12345678U;
        value.seed1Low = 0x12345678U;
        value.seed1High = 0x87654321U;
        value.chunkCount = 10;
        value.compatibility = 88;
        value.tid = 12345;
        value.sid = 54321;
        value.shinyCharm = 1;
        value.species = species;
        value.masuda = 1;
        value.parentAGender = 0;
        value.parentBGender = 1;
        value.filtersDisabled = 0;
        value.natureMask = 0x1ffffff;
        value.hiddenPowerMask = 0xffff;
        value.resultLimit = 100;
        for (std::size_t index = 0; index < 6; index++)
        {
            value.parentAIVs[index] = 31;
            value.parentBIVs[index] = 31;
            value.ivMax[index] = 31;
        }
        return value;
    }

    std::array<std::uint8_t, 6> unpackBytes(std::uint32_t first, std::uint32_t second)
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

    std::array<std::uint8_t, 6> unpackInheritance(std::uint32_t value)
    {
        std::array<std::uint8_t, 6> result = {};
        for (std::size_t index = 0; index < result.size(); index++)
            result[index] = static_cast<std::uint8_t>((value >> (index * 2)) & 3U);
        return result;
    }

    bool fixture(
        std::uint32_t species, std::uint32_t expectedSpecies, std::uint32_t abilityIndex,
        const std::array<std::uint16_t, 6> &stats)
    {
        auto value = request(species);
        if (!check(gen8egg_generate(&value) == 10, "fixture returned an unexpected result count")) return false;
        const auto *output = reinterpret_cast<const Gen8EggPackedResult *>(gen8egg_result_ptr());
        if (!check(output != nullptr, "fixture returned a null result pointer")) return false;
        const auto &first = output[0];
        const std::uint32_t metadata = first.metadata;
        const std::array<std::uint16_t, 6> actualStats = {
            static_cast<std::uint16_t>(first.stats01), static_cast<std::uint16_t>(first.stats01 >> 16),
            static_cast<std::uint16_t>(first.stats23), static_cast<std::uint16_t>(first.stats23 >> 16),
            static_cast<std::uint16_t>(first.stats45), static_cast<std::uint16_t>(first.stats45 >> 16),
        };
        return check(
            first.advances == 0 && first.seed == 2412930810U && first.ec == 544659516U
                && first.pid == 2284480039U && (metadata & 3U) == 0 && ((metadata >> 2) & 3U) == 0
                && ((metadata >> 4) & 0x1fU) == 4 && ((metadata >> 9) & 3U) == 0
                && ((metadata >> 11) & 0x1fU) == 6
                && unpackBytes(first.ivs0, first.ivs1) == std::array<std::uint8_t, 6>{ 5, 31, 31, 12, 7, 31 }
                && unpackInheritance(first.inheritance) == std::array<std::uint8_t, 6>{ 0, 1, 1, 0, 0, 1 }
                && first.abilityIndex == abilityIndex && first.species == expectedSpecies && actualStats == stats,
            "fixture first state mismatch");
    }
}

int main()
{
    if (!check(gen8egg_api_version() == 2, "unexpected API version")) return 1;
    if (!fixture(1, 1, 65, { 11, 6, 6, 6, 5, 6 })) return 1;
    if (!fixture(29, 32, 38, { 11, 6, 6, 5, 4, 6 })) return 1;
    if (!fixture(313, 313, 35, { 12, 6, 6, 6, 5, 7 })) return 1;

    auto invalid = request();
    invalid.seed0Low = 0;
    invalid.seed0High = 0;
    invalid.seed1Low = 0;
    invalid.seed1High = 0;
    if (!check(gen8egg_generate(&invalid) == 0 && gen8egg_last_error() == 1, "zero seeds were accepted")) return 1;

    invalid = request();
    invalid.initialAdvances = std::numeric_limits<std::uint32_t>::max();
    invalid.chunkCount = 2;
    if (!check(gen8egg_generate(&invalid) == 0 && gen8egg_last_error() == 1, "advance overflow was accepted")) return 1;

    auto limited = request();
    limited.resultLimit = 1;
    if (!check(gen8egg_generate(&limited) == 1 && gen8egg_limit_reached() == 1, "result limit was not enforced")) return 1;

    return 0;
}
