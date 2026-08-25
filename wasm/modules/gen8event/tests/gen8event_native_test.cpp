/*
 * PokeRNGKit Gen VIII Event native parity fixture
 * Copyright (C) 2026 Hakuhiro
 * GPL-3.0-or-later
 */
#include "gen8event_bridge.h"

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

    Gen8EventPackedRequest request()
    {
        Gen8EventPackedRequest value = {};
        value.seed0Low = 0x87654321U;
        value.seed0High = 0x12345678U;
        value.seed1Low = 0x12345678U;
        value.seed1High = 0x87654321U;
        value.chunkCount = 10;
        value.profileTid = 12345;
        value.profileSid = 54321;
        value.species = 490;
        value.gender = 2;
        value.egg = 1;
        value.nature = 255;
        value.ability = 0;
        value.pidType = 0;
        value.ivCount = 3;
        value.level = 1;
        value.natureMask = 0x1ffffff;
        value.hiddenPowerMask = 0xffff;
        value.heightMax = 255;
        value.weightMax = 255;
        value.resultLimit = 100;
        for (std::size_t index = 0; index < 6; index++) value.ivMax[index] = 31;
        return value;
    }

    std::array<std::uint8_t, 6> unpackIvs(const Gen8EventPackedResult &result)
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

    std::array<std::uint16_t, 6> unpackStats(const Gen8EventPackedResult &result)
    {
        return {
            static_cast<std::uint16_t>(result.stats01),
            static_cast<std::uint16_t>(result.stats01 >> 16),
            static_cast<std::uint16_t>(result.stats23),
            static_cast<std::uint16_t>(result.stats23 >> 16),
            static_cast<std::uint16_t>(result.stats45),
            static_cast<std::uint16_t>(result.stats45 >> 16),
        };
    }

    std::uint8_t shiny(const Gen8EventPackedResult &result)
    {
        return static_cast<std::uint8_t>((result.metadata >> 9) & 3U);
    }
}

int main()
{
    if (!check(gen8event_api_version() == 2, "unexpected API version")) return 1;

    auto value = request();
    if (!check(gen8event_generate(&value) == 10, "fixture returned an unexpected result count")) return 1;
    const auto *output = reinterpret_cast<const Gen8EventPackedResult *>(gen8event_result_ptr());
    if (!check(output != nullptr, "fixture returned a null result pointer")) return 1;
    const auto &first = output[0];
    const auto &last = output[9];
    if (!check(
            first.advances == 0 && first.ec == 0x220345d0U && first.pid == 0x8fd266faU
                && unpackIvs(first) == std::array<std::uint8_t, 6>{ 15, 30, 31, 19, 31, 31 }
                && ((first.metadata >> 4) & 0x1fU) == 24 && ((first.metadata >> 11) & 0x1fU) == 11
                && (first.metadata & 3U) == 0 && ((first.metadata >> 2) & 3U) == 2 && shiny(first) == 0
                && (first.measures & 0xffU) == 52 && ((first.measures >> 8) & 0xffU) == 48
                && first.abilityIndex == 93 && unpackStats(first) == std::array<std::uint16_t, 6>{ 13, 7, 7, 7, 7, 7 },
            "fixture first state mismatch"))
        return 1;
    if (!check(
            last.advances == 9 && last.ec == 0xe8d55a32U && last.pid == 0x6541c199U
                && unpackIvs(last) == std::array<std::uint8_t, 6>{ 31, 30, 0, 21, 31, 31 }
                && ((last.metadata >> 4) & 0x1fU) == 24 && ((last.metadata >> 11) & 0x1fU) == 1
                && (last.measures & 0xffU) == 245 && ((last.measures >> 8) & 0xffU) == 150,
            "fixture last state mismatch"))
        return 1;

    value = request();
    value.chunkCount = 1;
    value.pidType = 1;
    if (!check(gen8event_generate(&value) == 1 && shiny(*reinterpret_cast<const Gen8EventPackedResult *>(gen8event_result_ptr())) <= 2,
               "random PID type failed"))
        return 1;

    value.pidType = 2;
    if (!check(gen8event_generate(&value) == 1 && shiny(*reinterpret_cast<const Gen8EventPackedResult *>(gen8event_result_ptr())) == 1,
               "star PID type failed"))
        return 1;

    value.pidType = 3;
    if (!check(gen8event_generate(&value) == 1 && shiny(*reinterpret_cast<const Gen8EventPackedResult *>(gen8event_result_ptr())) == 2,
               "square PID type failed"))
        return 1;

    value.pidType = 4;
    value.pid = static_cast<std::uint32_t>(value.profileTid ^ value.profileSid) << 16;
    if (!check(gen8event_generate(&value) == 1 && shiny(*reinterpret_cast<const Gen8EventPackedResult *>(gen8event_result_ptr())) == 2,
               "static PID type failed"))
        return 1;

    auto invalid = request();
    invalid.seed0Low = 0;
    invalid.seed0High = 0;
    invalid.seed1Low = 0;
    invalid.seed1High = 0;
    if (!check(gen8event_generate(&invalid) == 0 && gen8event_last_error() == 1, "zero seeds were accepted")) return 1;

    invalid = request();
    invalid.initialAdvances = std::numeric_limits<std::uint32_t>::max();
    invalid.chunkCount = 2;
    if (!check(gen8event_generate(&invalid) == 0 && gen8event_last_error() == 1, "advance overflow was accepted")) return 1;

    invalid = request();
    invalid.chunkStart = 250000000;
    invalid.chunkCount = 1;
    if (!check(gen8event_generate(&invalid) == 0 && gen8event_last_error() == 2, "range limit returned the wrong error")) return 1;

    auto limited = request();
    limited.resultLimit = 1;
    if (!check(gen8event_generate(&limited) == 1 && gen8event_limit_reached() == 1, "result limit was not enforced")) return 1;

    return 0;
}
