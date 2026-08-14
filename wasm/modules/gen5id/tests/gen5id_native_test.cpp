/*
 * PokeRNGKit Gen V ID native parity fixture
 * Copyright (C) 2026 Hakuhiro
 * GPL-3.0-or-later
 */
#include "gen5id_bridge.h"

#include <array>
#include <cstdint>
#include <iostream>

namespace
{
    struct Expected
    {
        std::uint32_t advances;
        std::uint16_t tid;
        std::uint16_t sid;
        std::uint16_t tsv;
    };

    constexpr std::array<Expected, 10> blackExpected = { {
        { 25, 18185, 39382, 7131 }, { 26, 45109, 2547, 5944 }, { 27, 33963, 62051, 3801 },
        { 28, 48671, 57259, 3126 }, { 29, 20018, 10415, 3283 }, { 30, 16700, 11109, 3403 },
        { 31, 17216, 3711, 2471 }, { 32, 5565, 2362, 912 }, { 33, 33146, 38423, 749 },
        { 34, 49315, 21809, 4786 },
    } };

    constexpr std::array<Expected, 10> black2Expected = { {
        { 34, 49315, 21809, 4786 }, { 35, 39672, 1101, 5078 }, { 36, 3049, 57482, 7532 },
        { 37, 4119, 52263, 7046 }, { 38, 16594, 6116, 2790 }, { 39, 40328, 62362, 3522 },
        { 40, 58488, 27093, 4533 }, { 41, 38204, 38998, 429 }, { 42, 59196, 33691, 3220 },
        { 43, 4707, 61973, 7182 },
    } };

    bool check(bool condition, const char *message)
    {
        if (!condition) std::cerr << message << '\n';
        return condition;
    }

    bool checkGenerator(std::uint32_t version, const std::array<Expected, 10> &expected)
    {
        std::array<Gen5IdPackedResult, 10> output = {};
        const auto count = gen5id_test_generate(0, version, 9, output.data(), output.size());
        if (count != output.size()) return check(false, "generator returned an unexpected result count");
        for (std::size_t index = 0; index < output.size(); index++)
        {
            const auto tid = output[index].tidSid & 0xffffU;
            const auto sid = output[index].tidSid >> 16;
            if (output[index].advances != expected[index].advances || tid != expected[index].tid
                || sid != expected[index].sid || output[index].tsv != expected[index].tsv)
                return check(false, "generator parity fixture failed");
        }
        return true;
    }

    Gen5IdPackedRequest request(std::uint32_t version, std::uint32_t vcount, std::uint32_t timer0)
    {
        Gen5IdPackedRequest value = {};
        value.operation = 1;
        value.version = version;
        value.language = 0;
        value.dsType = 0;
        constexpr std::uint64_t mac = 41860346966ULL;
        value.macLow = static_cast<std::uint32_t>(mac);
        value.macHigh = static_cast<std::uint32_t>(mac >> 32);
        value.vcount = vcount;
        value.timer0Min = value.timer0Max = timer0;
        value.gxstat = 6;
        value.vframe = 5;
        value.keypressCountMask = 1;
        value.maxAdvances = 9;
        value.resultLimit = 100;
        value.startYear = value.endYear = 2000;
        value.startMonth = value.endMonth = 1;
        value.startDay = value.endDay = 1;
        value.maxSecond = 59;
        value.chunkUnitCount = 1;
        return value;
    }

    bool checkSeedFinder(Gen5IdPackedRequest value, std::uint64_t expectedSeed, const char *message)
    {
        bool seedCalculationFound = false;
        for (std::uint32_t second = 0; second <= 59; second++)
            if (gen5id_test_seed(&value, second, 0, value.timer0Min) == expectedSeed) seedCalculationFound = true;
        if (!check(seedCalculationFound, message)) return false;

        Gen5IdPackedResult generated = {};
        if (!check(gen5id_test_generate(expectedSeed, value.version, 0, &generated, 1) == 1,
                   "seed fixture generator returned no result"))
            return false;
        value.tid = generated.tidSid & 0xffffU;
        const auto count = gen5id_search(&value);
        if (!check(count > 0, "seed finder returned no results")) return false;
        const auto *output = reinterpret_cast<const Gen5IdPackedResult *>(gen5id_result_ptr());
        for (std::uint32_t index = 0; index < count; index++)
        {
            const auto seed = (static_cast<std::uint64_t>(output[index].seedHigh) << 32) | output[index].seedLow;
            if (seed == expectedSeed && (output[index].tidSid & 0xffffU) == value.tid) return true;
        }
        return check(false, "seed finder did not return the expected seed");
    }
}

int main()
{
    if (!check(gen5id_api_version() == 1, "unexpected API version")) return 1;
    if (!checkGenerator(0, blackExpected) || !checkGenerator(2, black2Expected)) return 1;

    auto black = request(0, 46, 1544);
    if (!checkSeedFinder(black, 6812116909077463616ULL, "Black SHA fixture failed")) return 1;

    auto black2 = request(2, 72, 2418);
    if (!checkSeedFinder(black2, 5264333967543063602ULL, "Black 2 SHA fixture failed")) return 1;

    auto invalid = black;
    invalid.timer0Min = 2;
    invalid.timer0Max = 1;
    if (!check(gen5id_search(&invalid) == 0, "invalid range unexpectedly returned results")) return 1;
    if (!check(gen5id_last_error() == 0, "empty upstream range returned an error")) return 1;

    auto invalidChunk = black;
    invalidChunk.chunkStartUnit = 1;
    if (!check(gen5id_search(&invalidChunk) == 0, "invalid chunk unexpectedly returned results")) return 1;
    if (!check(gen5id_last_error() == 3, "invalid chunk returned the wrong error")) return 1;

    auto tooManyEvaluations = black;
    tooManyEvaluations.maxAdvances = 4166666;
    if (!check(gen5id_search(&tooManyEvaluations) == 0, "oversized evaluation range unexpectedly ran")) return 1;
    if (!check(gen5id_last_error() == 2, "oversized evaluation range returned the wrong error")) return 1;

    auto unfiltered = black;
    unfiltered.operation = 0;
    unfiltered.maxAdvances = 100;
    unfiltered.resultLimit = 10;
    if (!check(gen5id_search(&unfiltered) == 10, "unfiltered search did not stop at its result limit")) return 1;
    if (!check(gen5id_last_error() == 0 && gen5id_limit_reached() == 1,
               "unfiltered search returned the wrong completion state"))
        return 1;

    Gen5IdPackedResult overflowOutput = {};
    if (!check(gen5id_test_generate(0, 0, 0xffffffffU, &overflowOutput, 1) == 0,
               "absolute advance overflow unexpectedly generated a result"))
        return 1;
    return 0;
}
