/*
 * PokeRNGKit Gen VIII ID native parity fixture
 * Copyright (C) 2026 Hakuhiro
 * GPL-3.0-or-later
 */
#include "gen8id_bridge.h"

#include <array>
#include <cstdint>
#include <iostream>

namespace
{
    struct Expected
    {
        std::uint32_t advances;
        std::uint32_t displayTid;
        std::uint16_t sid;
        std::uint16_t tid;
        std::uint16_t tsv;
    };

    constexpr std::array<Expected, 9> expected1 = { {
        { 0, 419776, 49216, 0, 3076 },
        { 1, 421832, 49216, 2056, 3204 },
        { 2, 483648, 32768, 0, 2048 },
        { 3, 483648, 32768, 0, 2048 },
        { 4, 241856, 49152, 16384, 2048 },
        { 5, 678016, 32832, 64, 2048 },
        { 6, 678024, 32832, 72, 2048 },
        { 7, 678016, 32832, 64, 2048 },
        { 8, 927368, 49666, 16392, 2080 },
    } };

    constexpr std::array<Expected, 9> expected2 = { {
        { 0, 388608, 128, 0, 8 },
        { 1, 392720, 128, 4112, 265 },
        { 2, 483648, 32768, 0, 2048 },
        { 3, 483648, 32768, 0, 2048 },
        { 4, 32768, 0, 32768, 2048 },
        { 5, 872384, 32896, 128, 2048 },
        { 6, 872400, 32896, 144, 2049 },
        { 7, 872384, 32896, 128, 2048 },
        { 8, 403792, 1028, 32784, 2113 },
    } };

    constexpr std::array<Expected, 9> expected3 = { {
        { 0, 324736, 16576, 0, 1036 },
        { 1, 330904, 16576, 6168, 1421 },
        { 2, 483648, 32768, 0, 2048 },
        { 3, 483648, 32768, 0, 2048 },
        { 4, 790976, 16384, 49152, 2048 },
        { 5, 66752, 32960, 192, 2048 },
        { 6, 66776, 32960, 216, 2049 },
        { 7, 66752, 32960, 192, 2048 },
        { 8, 847512, 17926, 49176, 2145 },
    } };

    constexpr std::array<Expected, 9> expected4 = { {
        { 0, 477496, 32767, 59384, 2432 },
        { 1, 483648, 32768, 0, 2048 },
        { 2, 477496, 32767, 59384, 2432 },
        { 3, 483648, 32768, 0, 2048 },
        { 4, 837215, 32575, 2015, 1934 },
        { 5, 843328, 32575, 8128, 1551 },
        { 6, 477496, 32767, 59384, 2432 },
        { 7, 483648, 32768, 0, 2048 },
        { 8, 592096, 30969, 7712, 1645 },
    } };

    bool check(bool condition, const char *message)
    {
        if (!condition) std::cerr << message << '\n';
        return condition;
    }

    bool checkExpected(const Gen8IdPackedState &state, const Expected &value)
    {
        return state.advances == value.advances && (state.tidSid & 0xffffU) == value.tid
            && (state.tidSid >> 16) == value.sid && state.tsv == value.tsv
            && state.displayTid == value.displayTid;
    }

    std::uint32_t generate(
        std::uint64_t seed, std::uint32_t initialAdvances, std::uint32_t chunkOffset,
        std::uint32_t count, std::uint32_t mode = 0,
        const std::uint32_t *values = nullptr, std::uint32_t valueCount = 0)
    {
        const auto low = static_cast<std::uint32_t>(seed);
        const auto high = static_cast<std::uint32_t>(seed >> 32);
        return gen8id_generate(
            low, high, low, high, initialAdvances, chunkOffset, count, mode, values, valueCount);
    }

    bool checkFixture(std::uint64_t seed, const std::array<Expected, 9> &expected)
    {
        if (!check(generate(seed, 0, 0, 9) == expected.size(),
                   "generator returned an unexpected result count"))
            return false;
        const auto *output = reinterpret_cast<const Gen8IdPackedState *>(gen8id_result_ptr());
        for (std::size_t index = 0; index < expected.size(); index++)
            if (!check(checkExpected(output[index], expected[index]), "upstream parity fixture failed")) return false;

        for (std::uint32_t chunkOffset = 1; chunkOffset < expected.size(); chunkOffset++)
        {
            const auto chunkSize = static_cast<std::uint32_t>(expected.size()) - chunkOffset;
            if (!check(generate(seed, 0, chunkOffset, chunkSize) == chunkSize,
                       "split fixture returned an unexpected result count"))
                return false;
            output = reinterpret_cast<const Gen8IdPackedState *>(gen8id_result_ptr());
            for (std::size_t index = 0; index < chunkSize; index++)
                if (!check(checkExpected(output[index], expected[index + chunkOffset]),
                           "split fixture did not match the complete generator"))
                    return false;
        }
        return true;
    }

    bool checkFilter(std::uint32_t mode, std::uint32_t value, std::uint32_t expectedAdvance)
    {
        if (!check(generate(0x4000000000000000ULL, 0, 0, 9, mode, &value, 1) == 1,
                   "filter returned an unexpected result count"))
            return false;
        const auto *output = reinterpret_cast<const Gen8IdPackedState *>(gen8id_result_ptr());
        return check(output[0].advances == expectedAdvance, "filter returned the wrong state");
    }
}

int main()
{
    if (!check(gen8id_api_version() == 2, "unexpected API version")) return 1;
    if (!checkFixture(0x4000000000000000ULL, expected1)) return 1;
    if (!checkFixture(0x8000000000000000ULL, expected2)) return 1;
    if (!checkFixture(0xc000000000000000ULL, expected3)) return 1;
    if (!checkFixture(0xffffffffffffffffULL, expected4)) return 1;

    if (!check(generate(0x4000000000000000ULL, 0, 4, 5) == 5,
               "chunk generator returned an unexpected result count"))
        return 1;
    auto *output = reinterpret_cast<const Gen8IdPackedState *>(gen8id_result_ptr());
    for (std::size_t index = 0; index < 5; index++)
        if (!check(checkExpected(output[index], expected1[index + 4]), "chunk parity fixture failed")) return 1;

    if (!checkFilter(1, 2056, 1)) return 1;
    if (!checkFilter(2, 49152, 4)) return 1;
    if (!checkFilter(3, (49216U << 16) | 2056U, 1)) return 1;
    if (!checkFilter(4, 0xc0400000U, 0)) return 1;
    if (!checkFilter(5, 2080, 8)) return 1;
    if (!checkFilter(6, 241856, 4)) return 1;
    if (!check(generate(0x4000000000000000ULL, 0, 0, 9, 1, nullptr, 0) == 9,
               "empty selected filter did not pass every state"))
        return 1;

    if (!check(gen8id_generate(0, 0, 0, 0, 0, 0, 1, 0, nullptr, 0) == 0,
               "zero seeds unexpectedly generated results"))
        return 1;
    if (!check(gen8id_last_error() == 1, "zero seeds returned the wrong error")) return 1;

    if (!check(gen8id_generate(0, 0, 0, 0x40000000U, 0, 0, 1, 0, nullptr, 0) == 1,
               "single zero seed unexpectedly failed"))
        return 1;
    if (!check(gen8id_last_error() == 0, "single zero seed returned an error")) return 1;

    if (!check(generate(0x4000000000000000ULL, 0xffffffffU, 0, 2) == 2,
               "wrapping advance range did not run"))
        return 1;
    output = reinterpret_cast<const Gen8IdPackedState *>(gen8id_result_ptr());
    if (!check(output[0].advances == 0xffffffffU && output[1].advances == 0,
               "advance labels did not wrap as uint32"))
        return 1;

    std::array<Gen8IdPackedState, 9> wrapping = {};
    if (!check(generate(0x4000000000000000ULL, 0xfffffffcU, 0, 9) == wrapping.size(),
               "wrapping reference range did not run"))
        return 1;
    output = reinterpret_cast<const Gen8IdPackedState *>(gen8id_result_ptr());
    for (std::size_t index = 0; index < wrapping.size(); index++) wrapping[index] = output[index];
    if (!check(generate(0x4000000000000000ULL, 0xfffffffcU, 4, 5) == 5,
               "wrapping chunk did not run"))
        return 1;
    output = reinterpret_cast<const Gen8IdPackedState *>(gen8id_result_ptr());
    for (std::size_t index = 0; index < 5; index++)
        if (!check(
                output[index].advances == wrapping[index + 4].advances
                    && output[index].tidSid == wrapping[index + 4].tidSid
                    && output[index].tsv == wrapping[index + 4].tsv
                    && output[index].displayTid == wrapping[index + 4].displayTid,
                "wrapping chunk parity fixture failed"))
            return 1;

    if (!check(generate(0x4000000000000000ULL, 0, 0, 100001) == 0,
               "oversized chunk unexpectedly ran"))
        return 1;
    if (!check(gen8id_last_error() == 2, "oversized chunk returned the wrong error")) return 1;

    if (!check(generate(0x4000000000000000ULL, 0, 250000000U, 1) == 0,
               "oversized task range unexpectedly ran"))
        return 1;
    if (!check(gen8id_last_error() == 2, "oversized task range returned the wrong error")) return 1;

    if (!check(generate(0x4000000000000000ULL, 0, 0, 0) == 0 && gen8id_last_error() == 0,
               "zero-count request returned the wrong completion state"))
        return 1;
    return 0;
}
