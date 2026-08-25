/*
 * PokeRNGKit Gen V Wild native parity fixture
 * Copyright (C) 2026 Hakuhiro
 * GPL-3.0-or-later
 */
#include "gen5wild_bridge.h"

#include <array>
#include <cstdint>
#include <iostream>

namespace
{
    struct SlotInput
    {
        std::uint16_t speciesForm;
        std::uint8_t minimumLevel;
        std::uint8_t maximumLevel;
    };

    bool check(bool condition, const char *message)
    {
        if (!condition) std::cerr << message << '\n';
        return condition;
    }

    Gen5WildPackedRequest baseRequest()
    {
        Gen5WildPackedRequest request = {};
        request.operation = 0;
        request.version = 0;
        request.language = 0;
        request.dsType = 0;
        request.keypressCountMask = 1;
        request.tid = 12345;
        request.sid = 54321;
        request.maxAdvances = 9;
        request.lead = 255;
        request.filtersDisabled = 1;
        request.abilityFilter = 255;
        request.genderFilter = 255;
        request.shinyFilter = 255;
        request.natureMask = 0x1ffffff;
        request.hiddenPowerMask = 0xffff;
        request.levelMin = 1;
        request.levelMax = 100;
        for (std::size_t index = 0; index < 6; index++) request.ivMax[index] = 31;
        request.resultLimit = 100;
        request.chunkCount = 10;
        return request;
    }

    template <std::size_t Size>
    void setArea(Gen5WildPackedRequest &request, std::uint32_t encounter, std::uint8_t rate,
                 const std::array<SlotInput, Size> &slots)
    {
        request.encounter = encounter;
        request.rate = rate;
        request.slotCount = Size;
        request.slotMask = (1U << Size) - 1;
        for (std::size_t index = 0; index < slots.size(); index++)
        {
            request.speciesForm[index] = slots[index].speciesForm;
            request.minMaxLevel[index] = slots[index].minimumLevel | (slots[index].maximumLevel << 8);
        }
    }

    void setBlackGrass(Gen5WildPackedRequest &request)
    {
        setArea(request, 0, 3, std::array<SlotInput, 12> { {
                                   { 595, 24, 24 }, { 599, 25, 25 }, { 595, 25, 25 }, { 525, 24, 24 },
                                   { 597, 24, 24 }, { 597, 25, 25 }, { 595, 26, 26 }, { 599, 26, 26 },
                                   { 595, 27, 27 }, { 599, 27, 27 }, { 602, 27, 27 }, { 602, 27, 27 },
                               } });
    }

    void setBlackFishing(Gen5WildPackedRequest &request)
    {
        setArea(request, 8, 50, std::array<SlotInput, 5> { {
                                    { 118, 35, 55 }, { 550, 35, 55 }, { 118, 35, 55 },
                                    { 118, 35, 55 }, { 118, 35, 55 },
                                } });
    }

    void setBlack2Grass(Gen5WildPackedRequest &request)
    {
        request.version = 2;
        setArea(request, 0, 7, std::array<SlotInput, 12> { {
                                   { 595, 25, 25 }, { 599, 26, 26 }, { 595, 26, 26 }, { 299, 27, 27 },
                                   { 597, 26, 26 }, { 597, 27, 27 }, { 595, 27, 27 }, { 525, 25, 25 },
                                   { 595, 28, 28 }, { 599, 28, 28 }, { 602, 28, 28 }, { 602, 28, 28 },
                               } });
    }

    void setBlack2Fishing(Gen5WildPackedRequest &request)
    {
        request.version = 2;
        setArea(request, 8, 50, std::array<SlotInput, 5> { {
                                    { 118, 40, 50 }, { 550, 40, 50 }, { 118, 50, 60 },
                                    { 118, 50, 60 }, { 118, 50, 60 },
                                } });
    }

    std::array<std::uint8_t, 6> unpackIvs(const Gen5WildPackedResult &result)
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

    std::array<std::uint16_t, 6> unpackStats(const Gen5WildPackedResult &result)
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

    std::uint8_t metadata(const Gen5WildPackedResult &result, std::uint8_t shift, std::uint32_t mask)
    {
        return static_cast<std::uint8_t>((result.metadata >> shift) & mask);
    }

    bool sameResult(const Gen5WildPackedResult &left, const Gen5WildPackedResult &right)
    {
        const auto *leftWords = reinterpret_cast<const std::uint32_t *>(&left);
        const auto *rightWords = reinterpret_cast<const std::uint32_t *>(&right);
        for (std::size_t index = 0; index < 16; index++)
            if (leftWords[index] != rightWords[index]) return false;
        return true;
    }
}

int main()
{
    if (!check(gen5wild_api_version() == 2, "unexpected API version")) return 1;

    auto request = baseRequest();
    setBlackGrass(request);
    std::array<Gen5WildPackedResult, 10> output = {};
    auto count = gen5wild_test_generate(&request, output.data(), output.size());
    const auto &grass = output.front();
    if (count != 10)
        std::cerr << "Black grass returned " << count << " results with error " << gen5wild_last_error() << '\n';
    if ((grass.speciesForm & 0x7ffU) != 595 || (grass.itemAbilityIndex & 0xffffU) != 0
        || (grass.itemAbilityIndex >> 16) != 14)
        std::cerr << "Black grass packed species=" << (grass.speciesForm & 0x7ffU)
                  << " item=" << (grass.itemAbilityIndex & 0xffffU)
                  << " ability=" << (grass.itemAbilityIndex >> 16) << '\n';
    if (!check(count == 10, "Black grass result count mismatch")
        || !check(grass.advances == 39 && grass.pid == 0x839ae73dU, "Black grass frame mismatch")
        || !check(unpackIvs(grass) == std::array<std::uint8_t, 6> { 17, 18, 22, 27, 19, 27 },
                  "Black grass IV mismatch")
        || !check(metadata(grass, 0, 0x7f) == 95 && metadata(grass, 10, 3) == 0
                      && metadata(grass, 12, 3) == 1 && metadata(grass, 14, 0x7f) == 25
                      && metadata(grass, 21, 0x1f) == 23 && metadata(grass, 28, 0xf) == 2,
                  "Black grass metadata mismatch")
        || !check((grass.ivs1 >> 16) == (13U | (69U << 8)), "Black grass Hidden Power mismatch")
        || !check((grass.speciesForm & 0x7ffU) == 595 && (grass.itemAbilityIndex & 0xffffU) == 0
                      && (grass.itemAbilityIndex >> 16) == 14,
                  "Black grass species, item, or ability mismatch")
        || !check(unpackStats(grass) == std::array<std::uint16_t, 6> { 64, 33, 35, 36, 37, 44 },
                  "Black grass stat mismatch"))
        return 1;

    request.lead = 25;
    count = gen5wild_test_generate(&request, output.data(), output.size());
    if (!check(count == 10 && output[0].pid == 0x72141264U && metadata(output[0], 28, 0xf) == 3
                   && (output[0].speciesForm & 0x7ffU) == 525
                   && (output[0].itemAbilityIndex & 0xffffU) == 229 && metadata(output[0], 14, 0x7f) == 24,
               "Black Cute Charm fixture failed"))
        return 1;

    request.lead = 27;
    count = gen5wild_test_generate(&request, output.data(), output.size());
    if (!check(count == 10 && output[0].pid == 0x839ae73dU && metadata(output[0], 28, 0xf) == 4
                   && (output[0].speciesForm & 0x7ffU) == 597 && (output[0].itemAbilityIndex >> 16) == 160,
               "Black Magnet Pull fixture failed"))
        return 1;

    request = baseRequest();
    setBlackFishing(request);
    count = gen5wild_test_generate(&request, output.data(), output.size());
    if (!check(count == 6 && output[0].advances == 39 && output[0].pid == 0x72141264U
                   && metadata(output[0], 28, 0xf) == 1 && (output[0].speciesForm & 0x7ffU) == 550
                   && metadata(output[0], 14, 0x7f) == 44,
               "Black fishing fixture failed"))
        return 1;

    request.lead = 33;
    count = gen5wild_test_generate(&request, output.data(), output.size());
    if (!check(count == 10 && output[0].pid == 0x839ae73dU && metadata(output[0], 28, 0xf) == 1
                   && (output[0].speciesForm & 0x7ffU) == 550 && metadata(output[0], 14, 0x7f) == 52,
               "Black Suction Cups fixture failed"))
        return 1;

    request = baseRequest();
    setBlack2Grass(request);
    request.luckyPower = 3;
    count = gen5wild_test_generate(&request, output.data(), output.size());
    if (!check(count == 10 && output[0].advances == 46 && output[0].pid == 0xeeb907b9U
                   && unpackIvs(output[0]) == std::array<std::uint8_t, 6> { 22, 27, 19, 27, 17, 27 }
                   && metadata(output[0], 28, 0xf) == 9 && (output[0].speciesForm & 0x7ffU) == 599
                   && metadata(output[0], 14, 0x7f) == 28,
               "Black 2 Lucky Power fixture failed"))
        return 1;

    request = baseRequest();
    setBlack2Fishing(request);
    count = gen5wild_test_generate(&request, output.data(), output.size());
    if (!check(count == 7 && output[0].advances == 47 && output[0].pid == 0x910f9b83U
                   && metadata(output[0], 28, 0xf) == 0 && (output[0].speciesForm & 0x7ffU) == 118
                   && metadata(output[0], 14, 0x7f) == 50,
               "Black 2 fishing fixture failed"))
        return 1;

    gen5wild_clear_cache();
    request = baseRequest();
    setBlackGrass(request);
    request.operation = 1;
    request.filtersDisabled = 0;
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
    if (!check(gen5wild_search(&request) == 1 && gen5wild_last_error() == 0, "raw search fixture failed")) return 1;
    const auto raw = *reinterpret_cast<const Gen5WildPackedResult *>(gen5wild_result_ptr());

    const std::array<std::uint32_t, 2> ivEntries = { 0, raw.seedHigh };
    if (!check(gen5wild_configure_cache(ivEntries.data(), 1, nullptr, 0) == 1, "IV cache configuration failed")) return 1;
    if (!check(gen5wild_search(&request) == 1, "IV cache search fixture failed")) return 1;
    const auto cachedIv = *reinterpret_cast<const Gen5WildPackedResult *>(gen5wild_result_ptr());
    if (!check(sameResult(raw, cachedIv), "IV cache search diverged from raw search")) return 1;

    const std::array<std::uint32_t, 4> shaEntries = { 0, request.timer0Min << 16, raw.seedLow, raw.seedHigh };
    if (!check(gen5wild_configure_cache(ivEntries.data(), 1, shaEntries.data(), 1) == 1,
               "SHA1 cache configuration failed"))
        return 1;
    if (!check(gen5wild_search(&request) == 1, "SHA1 cache search fixture failed")) return 1;
    const auto cachedSha = *reinterpret_cast<const Gen5WildPackedResult *>(gen5wild_result_ptr());
    if (!check(sameResult(raw, cachedSha), "SHA1 cache search diverged from raw search")) return 1;

    if (!check(gen5wild_configure_cache(nullptr, 0, nullptr, 0) == 0 && gen5wild_last_error() == 4,
               "invalid cache configuration was accepted"))
        return 1;
    gen5wild_clear_cache();

    request = baseRequest();
    setBlackGrass(request);
    request.lead = 33;
    if (!check(gen5wild_search(&request) == 0 && gen5wild_last_error() == 1,
               "Suction Cups or Sticky Hold was accepted outside Fishing"))
        return 1;

    request = baseRequest();
    setBlackGrass(request);
    request.initialAdvances = 0xffffffffU;
    request.maxAdvances = 1;
    request.chunkCount = 1;
    if (!check(gen5wild_search(&request) == 0 && gen5wild_last_error() == 1,
               "overflowing PID advance range was accepted"))
        return 1;

    request = baseRequest();
    setBlackGrass(request);
    request.initialIVAdvances = 0xffffffffU;
    request.maxIVAdvances = 1;
    request.chunkCount = 1;
    if (!check(gen5wild_search(&request) == 0 && gen5wild_last_error() == 1,
               "overflowing IV advance range was accepted"))
        return 1;
    return 0;
}
