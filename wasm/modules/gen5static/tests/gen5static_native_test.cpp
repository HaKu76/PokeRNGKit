/*
 * PokeRNGKit Gen V Static native parity fixture
 * Copyright (C) 2026 Hakuhiro
 * GPL-3.0-or-later
 */
#include "gen5static_bridge.h"

#include <array>
#include <cstdint>
#include <iostream>

namespace
{
    struct Expected
    {
        std::uint32_t pid;
        std::uint32_t advances;
        std::array<std::uint8_t, 6> ivs;
        std::uint16_t abilityIndex;
        std::uint8_t chatot;
        std::uint8_t ability;
        std::uint8_t gender;
        std::uint8_t nature;
        std::uint8_t shiny;
        std::uint8_t hiddenPower;
        std::uint8_t hiddenPowerStrength;
    };

    bool check(bool condition, const char *message)
    {
        if (!condition) std::cerr << message << '\n';
        return condition;
    }

    Gen5StaticPackedRequest baseRequest()
    {
        Gen5StaticPackedRequest request = {};
        request.operation = 0;
        request.version = 0;
        request.language = 0;
        request.dsType = 0;
        request.keypressCountMask = 1;
        request.tid = 12345;
        request.sid = 54321;
        request.maxAdvances = 9;
        request.lead = 255;
        request.level = 5;
        request.templateAbility = 255;
        request.templateGender = 255;
        request.personalGender = 31;
        request.abilities[0] = 65;
        request.abilities[1] = 65;
        request.abilities[2] = 126;
        request.abilityFilter = 255;
        request.genderFilter = 255;
        request.shinyFilter = 255;
        request.natureMask = 0x1ffffff;
        request.hiddenPowerMask = 0xffff;
        for (std::size_t index = 0; index < 6; index++) request.ivMax[index] = 31;
        request.resultLimit = 100;
        request.chunkCount = 10;
        return request;
    }

    std::array<std::uint8_t, 6> unpackIvs(const Gen5StaticPackedResult &result)
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

    bool matches(const Gen5StaticPackedResult &result, const Expected &expected, const char *message)
    {
        const std::uint32_t metadata = result.metadata;
        return check(result.pid == expected.pid && result.advances == expected.advances && result.ivAdvances == 0
                         && unpackIvs(result) == expected.ivs && (metadata & 0x7fU) == expected.chatot
                         && ((metadata >> 10) & 3U) == expected.ability
                         && ((metadata >> 12) & 3U) == expected.gender
                         && ((metadata >> 21) & 0x1fU) == expected.nature
                         && ((metadata >> 26) & 3U) == expected.shiny
                         && ((result.ivs1 >> 16) & 0xffU) == expected.hiddenPower
                         && (result.ivs1 >> 24) == expected.hiddenPowerStrength
                         && result.abilityIndex == expected.abilityIndex,
                     message);
    }

    bool fixture(Gen5StaticPackedRequest request, const Expected &first, const Expected &last, const char *message)
    {
        std::array<Gen5StaticPackedResult, 10> output = {};
        const auto count = gen5static_test_generate(&request, output.data(), output.size());
        return check(count == output.size(), "fixture returned an unexpected result count")
            && matches(output.front(), first, message) && matches(output.back(), last, message);
    }

    bool sameResult(const Gen5StaticPackedResult &left, const Gen5StaticPackedResult &right)
    {
        return left.seedLow == right.seedLow && left.seedHigh == right.seedHigh && left.date == right.date
            && left.seconds == right.seconds && left.timer0Buttons == right.timer0Buttons
            && left.advances == right.advances && left.ivAdvances == right.ivAdvances && left.pid == right.pid
            && left.metadata == right.metadata && left.ivs0 == right.ivs0 && left.ivs1 == right.ivs1
            && left.abilityIndex == right.abilityIndex;
    }
}

int main()
{
    if (!check(gen5static_api_version() == 2, "unexpected API version")) return 1;

    auto request = baseRequest();
    if (!fixture(request,
                 { 4087061897U, 39, { 17, 18, 22, 27, 19, 27 }, 65, 95, 1, 0, 10, 0, 13, 69 },
                 { 1689394930U, 48, { 17, 18, 22, 27, 19, 27 }, 65, 39, 0, 0, 0, 0, 13, 69 },
                 "Snivy fixture failed"))
        return 1;

    request = baseRequest();
    request.level = 1;
    request.personalGender = 127;
    request.abilities[0] = 49;
    request.abilities[1] = 49;
    request.abilities[2] = 68;
    request.flags = 2;
    if (!fixture(request,
                 { 4086996361U, 39, { 18, 22, 27, 19, 27, 17 }, 49, 95, 0, 0, 14, 0, 14, 64 },
                 { 1689460466U, 48, { 18, 22, 27, 19, 27, 17 }, 49, 39, 1, 0, 10, 0, 14, 64 },
                 "Larvesta fixture failed"))
        return 1;

    request = baseRequest();
    request.level = 40;
    request.personalGender = 0;
    request.abilities[0] = 158;
    request.abilities[1] = 158;
    request.abilities[2] = 128;
    request.flags = 4;
    if (!fixture(request,
                 { 4086996361U, 39, { 18, 22, 27, 17, 19, 27 }, 158, 95, 0, 0, 10, 0, 14, 59 },
                 { 1689460466U, 48, { 18, 22, 27, 17, 19, 27 }, 158, 39, 1, 0, 0, 0, 14, 59 },
                 "Tornadus fixture failed"))
        return 1;

    request = baseRequest();
    request.level = 50;
    request.templateAbility = 2;
    request.personalGender = 127;
    request.abilities[0] = 108;
    request.abilities[1] = 28;
    request.abilities[2] = 140;
    request.flags = 1;
    if (!fixture(request,
                 { 3923043449U, 39, { 17, 18, 22, 27, 19, 27 }, 140, 95, 2, 1, 14, 0, 13, 69 },
                 { 2244597635U, 48, { 17, 18, 22, 27, 19, 27 }, 140, 39, 2, 0, 10, 0, 13, 69 },
                 "Musharna fixture failed"))
        return 1;

    gen5static_clear_cache();
    request = baseRequest();
    request.operation = 1;
    request.maxAdvances = 0;
    request.maxIVAdvances = 0;
    request.macLow = static_cast<std::uint32_t>(41860346966ULL);
    request.macHigh = static_cast<std::uint32_t>(41860346966ULL >> 32);
    request.vcount = 72;
    request.timer0Min = 2418;
    request.timer0Max = 2418;
    request.gxstat = 6;
    request.vframe = 5;
    request.startYear = request.endYear = 2000;
    request.startMonth = request.endMonth = 1;
    request.startDay = request.endDay = 1;
    request.chunkCount = 1;
    if (!check(gen5static_search(&request) == 1 && gen5static_last_error() == 0, "raw search fixture failed")) return 1;
    const auto raw = *reinterpret_cast<const Gen5StaticPackedResult *>(gen5static_result_ptr());

    const std::array<std::uint32_t, 2> ivEntries = { 0, raw.seedHigh };
    if (!check(gen5static_configure_cache(ivEntries.data(), 1, nullptr, 0) == 1, "IV cache configuration failed")) return 1;
    if (!check(gen5static_search(&request) == 1, "IV cache search fixture failed")) return 1;
    const auto cachedIv = *reinterpret_cast<const Gen5StaticPackedResult *>(gen5static_result_ptr());
    if (!check(sameResult(raw, cachedIv), "IV cache search diverged from raw search")) return 1;

    const std::array<std::uint32_t, 4> shaEntries
        = { 0, request.timer0Min << 16, raw.seedLow, raw.seedHigh };
    if (!check(gen5static_configure_cache(ivEntries.data(), 1, shaEntries.data(), 1) == 1,
               "SHA1 cache configuration failed"))
        return 1;
    if (!check(gen5static_search(&request) == 1, "SHA1 cache search fixture failed")) return 1;
    const auto cachedSha = *reinterpret_cast<const Gen5StaticPackedResult *>(gen5static_result_ptr());
    if (!check(sameResult(raw, cachedSha), "SHA1 cache search diverged from raw search")) return 1;

    if (!check(gen5static_configure_cache(nullptr, 0, nullptr, 0) == 0 && gen5static_last_error() == 4,
               "invalid cache configuration was accepted"))
        return 1;
    gen5static_clear_cache();
    return 0;
}
