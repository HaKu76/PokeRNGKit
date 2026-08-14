#include "gen5event_bridge.h"

#include <array>
#include <cstdint>
#include <iostream>
#include <string_view>

namespace
{
    struct Expected
    {
        std::uint32_t advances;
        std::uint32_t pid;
        std::uint16_t abilityIndex;
        std::array<std::uint8_t, 6> ivs;
        std::uint8_t nature;
        std::uint8_t ability;
        std::uint8_t gender;
        std::uint8_t shiny;
        std::uint8_t hiddenPower;
        std::uint8_t hiddenPowerStrength;
        std::uint8_t chatot;
    };

    Gen5EventPackedRequest baseRequest()
    {
        Gen5EventPackedRequest request = {};
        request.keypressCountMask = 1;
        request.maxAdvances = 9;
        request.resultLimit = 100;
        request.filtersDisabled = 1;
        request.abilityFilter = 255;
        request.genderFilter = 255;
        request.shinyFilter = 255;
        request.natureMask = 0x1ffffff;
        request.hiddenPowerMask = 0xffff;
        request.level = 1;
        request.startYear = 2000;
        request.startMonth = 1;
        request.startDay = 1;
        request.endYear = 2000;
        request.endMonth = 1;
        request.endDay = 1;
        request.chunkCount = 10;
        for (std::size_t index = 0; index < 6; index++)
        {
            request.ivMax[index] = 31;
        }
        return request;
    }

    bool compare(const Gen5EventPackedResult &actual, const Expected &expected)
    {
        const std::uint32_t metadata = actual.metadata;
        const std::array<std::uint8_t, 6> ivs = {
            static_cast<std::uint8_t>(actual.ivs0),
            static_cast<std::uint8_t>(actual.ivs0 >> 8),
            static_cast<std::uint8_t>(actual.ivs0 >> 16),
            static_cast<std::uint8_t>(actual.ivs0 >> 24),
            static_cast<std::uint8_t>(actual.ivs1),
            static_cast<std::uint8_t>(actual.ivs1 >> 8),
        };
        return actual.advances == expected.advances && actual.pid == expected.pid
            && actual.abilityIndex == expected.abilityIndex && ivs == expected.ivs
            && ((metadata >> 21) & 0x1fU) == expected.nature
            && ((metadata >> 10) & 3U) == expected.ability
            && ((metadata >> 12) & 3U) == expected.gender
            && ((metadata >> 26) & 3U) == expected.shiny
            && ((actual.ivs1 >> 16) & 0xffU) == expected.hiddenPower
            && ((actual.ivs1 >> 24) & 0xffU) == expected.hiddenPowerStrength
            && (metadata & 0x7fU) == expected.chatot;
    }

    bool check(bool condition, std::string_view message)
    {
        if (!condition) std::cerr << message << '\n';
        return condition;
    }

    template <std::size_t Size>
    bool runCase(std::string_view name, Gen5EventPackedRequest request, const std::array<Expected, Size> &expected)
    {
        std::array<Gen5EventPackedResult, Size> results = {};
        const auto count = gen5event_test_generate(&request, results.data(), results.size());
        if (count != expected.size())
        {
            std::cerr << name << ": expected " << expected.size() << " rows, got " << count << '\n';
            return false;
        }
        for (std::size_t index = 0; index < expected.size(); index++)
        {
            if (!compare(results[index], expected[index]))
            {
                std::cerr << name << ": mismatch at row " << index << '\n';
                return false;
            }
        }
        return true;
    }
}

int main()
{
    auto pidove = baseRequest();
    pidove.version = 0;
    pidove.species = 519;
    pidove.nature = 0;
    pidove.gender = 1;
    pidove.ability = 1;
    pidove.shiny = 1;
    pidove.level = 1;
    pidove.egg = 1;
    pidove.fixedIVMask = 1U << 1;
    pidove.ivs[1] = 31;
    const std::array<Expected, 10> pidoveExpected = { {
        { 39, 865167891, 105, { 11, 31, 9, 2, 10, 21 }, 0, 1, 1, 0, 3, 62, 95 },
        { 40, 644479330, 105, { 9, 31, 2, 10, 21, 29 }, 0, 1, 1, 0, 10, 43, 41 },
        { 41, 3313075213U, 105, { 2, 31, 10, 21, 29, 20 }, 0, 1, 1, 0, 11, 34, 59 },
        { 42, 417447769, 105, { 10, 31, 21, 29, 20, 6 }, 0, 1, 1, 0, 5, 36, 51 },
        { 43, 3001616718U, 105, { 21, 31, 29, 20, 6, 4 }, 0, 1, 1, 0, 1, 51, 94 },
        { 44, 2653287285U, 105, { 29, 31, 20, 6, 4, 24 }, 0, 1, 1, 0, 0, 41, 38 },
        { 45, 3963725892U, 105, { 20, 31, 6, 4, 24, 3 }, 0, 1, 1, 0, 2, 38, 27 },
        { 46, 2315327260U, 105, { 6, 31, 4, 24, 3, 22 }, 0, 1, 1, 0, 8, 57, 40 },
        { 47, 937245776, 105, { 4, 31, 24, 3, 22, 19 }, 0, 1, 1, 0, 6, 66, 55 },
        { 48, 2697546841U, 105, { 24, 31, 3, 22, 19, 29 }, 0, 1, 1, 0, 10, 64, 39 },
    } };

    auto meloetta = baseRequest();
    meloetta.version = 2;
    meloetta.eventTID = 3013;
    meloetta.species = 648;
    meloetta.nature = 255;
    meloetta.gender = 2;
    meloetta.ability = 0;
    meloetta.shiny = 1;
    meloetta.level = 50;
    const std::array<Expected, 10> meloettaExpected = { {
        { 46, 3027809660U, 32, { 24, 3, 22, 19, 29, 17 }, 18, 0, 2, 0, 13, 43, 40 },
        { 47, 3824719012U, 32, { 3, 22, 19, 29, 17, 6 }, 7, 0, 2, 0, 12, 39, 55 },
        { 48, 3137091428U, 32, { 22, 19, 29, 17, 6, 20 }, 9, 0, 2, 0, 5, 52, 39 },
        { 49, 1259397331, 32, { 19, 29, 17, 6, 20, 22 }, 20, 0, 2, 0, 1, 45, 2 },
        { 50, 1651300811, 32, { 29, 17, 6, 20, 22, 28 }, 7, 0, 2, 0, 0, 52, 43 },
        { 51, 3567315391U, 32, { 17, 6, 20, 22, 28, 23 }, 9, 0, 2, 0, 2, 46, 6 },
        { 52, 1203798972, 32, { 6, 20, 22, 28, 23, 9 }, 21, 0, 2, 0, 9, 53, 99 },
        { 53, 1629779644, 32, { 20, 22, 28, 23, 9, 12 }, 13, 0, 2, 0, 11, 41, 59 },
        { 54, 3774401416U, 32, { 22, 28, 23, 9, 12, 26 }, 23, 0, 2, 0, 4, 38, 5 },
        { 55, 2255491384U, 32, { 28, 23, 9, 12, 26, 8 }, 2, 0, 2, 0, 1, 51, 17 },
    } };

    auto zoroark = baseRequest();
    zoroark.version = 0;
    zoroark.eventTID = 9161;
    zoroark.species = 571;
    zoroark.nature = 24;
    zoroark.gender = 0;
    zoroark.ability = 0;
    zoroark.shiny = 1;
    zoroark.level = 50;
    const std::array<Expected, 10> zoroarkExpected = { {
        { 39, 417382330, 149, { 2, 10, 21, 29, 20, 6 }, 24, 0, 0, 0, 4, 36, 95 },
        { 40, 3001551272U, 149, { 10, 21, 29, 20, 6, 4 }, 24, 0, 0, 0, 1, 50, 41 },
        { 41, 2653221868U, 149, { 21, 29, 20, 6, 4, 24 }, 24, 0, 0, 0, 0, 40, 59 },
        { 42, 3963660439U, 149, { 29, 20, 6, 4, 24, 3 }, 24, 0, 0, 0, 2, 37, 51 },
        { 43, 2315261775U, 149, { 20, 6, 4, 24, 3, 22 }, 24, 0, 0, 0, 7, 56, 94 },
        { 44, 937180331, 149, { 6, 4, 24, 3, 22, 19 }, 24, 0, 0, 0, 5, 66, 38 },
        { 45, 2697481404U, 149, { 4, 24, 3, 22, 19, 29 }, 24, 0, 0, 0, 10, 63, 27 },
        { 46, 3027809765U, 149, { 24, 3, 22, 19, 29, 17 }, 24, 0, 0, 0, 13, 43, 40 },
        { 47, 3824719041U, 149, { 3, 22, 19, 29, 17, 6 }, 24, 0, 0, 0, 12, 39, 55 },
        { 48, 3137091424U, 149, { 22, 19, 29, 17, 6, 20 }, 24, 0, 0, 0, 5, 52, 39 },
    } };

    const bool passed = runCase("Secret Egg Pidove", pidove, pidoveExpected)
        && runCase("Spring Meloetta", meloetta, meloettaExpected)
        && runCase("Snarl Zoroark", zoroark, zoroarkExpected);
    if (!passed) return 1;

    auto noKeypressCounts = pidove;
    noKeypressCounts.keypressCountMask = 0;
    if (!check(gen5event_search(&noKeypressCounts) == 10 && gen5event_last_error() == 0,
               "generator rejected a profile without enabled keypress counts"))
        return 1;

    auto searcher = baseRequest();
    searcher.operation = 1;
    searcher.version = 2;
    searcher.maxAdvances = 0;
    searcher.filtersDisabled = 0;
    searcher.species = 1;
    searcher.nature = 0;
    searcher.gender = 0;
    searcher.ability = 0;
    searcher.shiny = 0;
    searcher.resultLimit = 2;
    constexpr std::uint64_t mac = 41860346966ULL;
    searcher.macLow = static_cast<std::uint32_t>(mac);
    searcher.macHigh = static_cast<std::uint32_t>(mac >> 32);
    searcher.vcount = 72;
    searcher.timer0Min = 2418;
    searcher.timer0Max = 2418;
    searcher.gxstat = 6;
    searcher.vframe = 5;
    searcher.startYear = searcher.endYear = 2000;
    searcher.startMonth = searcher.endMonth = 1;
    searcher.startDay = searcher.endDay = 1;
    constexpr std::uint64_t expectedSeed = 5264333967543063602ULL;
    std::uint32_t matchingSecond = 60;
    for (std::uint32_t second = 0; second < 60; second++)
        if (gen5event_test_seed(&searcher, second, 0, 2418) == expectedSeed) matchingSecond = second;
    if (!check(matchingSecond < 60, "Black 2 SHA fixture failed")) return 1;

    searcher.chunkStart = matchingSecond;
    searcher.chunkCount = 1;
    if (!check(gen5event_search(&searcher) == 1, "raw search fixture returned no result")) return 1;
    if (!check(gen5event_last_error() == 0, "raw search fixture returned an error")) return 1;
    if (!check(gen5event_processed_count() == 1, "raw search fixture processed the wrong unit count")) return 1;
    const auto raw = *reinterpret_cast<const Gen5EventPackedResult *>(gen5event_result_ptr());
    const std::uint64_t actualSeed = (static_cast<std::uint64_t>(raw.seedHigh) << 32) | raw.seedLow;
    if (!check(actualSeed == expectedSeed, "raw search fixture returned the wrong seed")) return 1;
    if (!check(raw.date == (2000U | (1U << 16) | (1U << 24)), "raw search fixture returned the wrong date")) return 1;
    if (!check(raw.seconds == matchingSecond, "raw search fixture returned the wrong time")) return 1;
    if (!check(raw.timer0Buttons == 2418, "raw search fixture returned the wrong Timer0 or buttons")) return 1;
    return 0;
}
