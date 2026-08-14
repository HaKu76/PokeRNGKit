/*
 * PokeRNGKit Gen V SHA1 Cache Finder native parity fixture
 * Copyright (C) 2026 Hakuhiro
 * GPL-3.0-or-later
 */
#include "gen5sha1cache_bridge.h"

#include <array>
#include <cstdint>
#include <iostream>

namespace
{
    bool check(bool condition, const char *message)
    {
        if (!condition) std::cerr << message << '\n';
        return condition;
    }

    Gen5Sha1CachePackedRequest request(
        std::uint32_t version, std::uint32_t vcount, std::uint32_t timer0)
    {
        Gen5Sha1CachePackedRequest value = {};
        value.version = version;
        value.language = 0;
        value.dsType = 0;
        constexpr std::uint64_t mac = 41860346966ULL;
        value.macLow = static_cast<std::uint32_t>(mac);
        value.macHigh = static_cast<std::uint32_t>(mac >> 32);
        value.vcount = vcount;
        value.timer0 = timer0;
        value.gxstat = 6;
        value.vframe = 5;
        value.year = 2000;
        value.month = 1;
        value.day = 1;
        value.buttonMask = 0;
        value.resultLimit = 100;
        return value;
    }

    bool checkSeedFixture(const Gen5Sha1CachePackedRequest &value, std::uint64_t expected, const char *message)
    {
        return check(gen5sha1cache_test_seed(&value, 0) == expected, message);
    }
}

int main()
{
    if (!check(gen5sha1cache_api_version() == 1, "unexpected API version")) return 1;

    auto black = request(0, 46, 1544);
    constexpr std::uint64_t blackSeed = 6812116909077463616ULL;
    if (!checkSeedFixture(black, blackSeed, "Black SHA fixture failed")) return 1;

    auto black2 = request(2, 72, 2418);
    if (!checkSeedFixture(black2, 5264333967543063602ULL, "Black 2 SHA fixture failed")) return 1;

    auto white = request(1, 47, 1569);
    if (!checkSeedFixture(white, 12718926928427950449ULL, "White SHA fixture failed")) return 1;

    auto white2 = request(3, 72, 2415);
    if (!checkSeedFixture(white2, 16328266460923798414ULL, "White 2 SHA fixture failed")) return 1;

    constexpr std::uint32_t blackHigh = static_cast<std::uint32_t>(blackSeed >> 32);
    constexpr std::array<std::uint32_t, 3> entralink = { 0, blackHigh, 0xffffffffU };
    constexpr std::array<std::uint32_t, 1> normal = { blackHigh };
    constexpr std::array<std::uint32_t, 1> roamer = { blackHigh };
    const auto count = gen5sha1cache_search(
        &black,
        entralink.data(),
        entralink.size(),
        normal.data(),
        normal.size(),
        roamer.data(),
        roamer.size());
    if (!check(gen5sha1cache_last_error() == 0, "classification search returned an error")
        || !check(gen5sha1cache_processed_count() == 86400, "classification search did not scan a full day")
        || !check(gen5sha1cache_limit_reached() == 0, "classification search reported truncation"))
        return 1;

    std::array<bool, 3> found = {};
    const auto *output = reinterpret_cast<const Gen5Sha1CachePackedResult *>(gen5sha1cache_result_ptr());
    for (std::uint32_t index = 0; index < count; index++)
    {
        const auto seed = (static_cast<std::uint64_t>(output[index].seedHigh) << 32) | output[index].seedLow;
        if (seed == blackSeed && output[index].category < found.size()) found[output[index].category] = true;
    }
    if (!check(found[0] && found[1] && found[2], "classified cache hits were not returned")) return 1;

    auto limited = black;
    limited.resultLimit = 2;
    if (!check(gen5sha1cache_search(
                   &limited,
                   entralink.data(),
                   entralink.size(),
                   normal.data(),
                   normal.size(),
                   roamer.data(),
                   roamer.size())
                   == 2,
               "result limit did not stop the search")
        || !check(gen5sha1cache_limit_reached() == 1, "result limit did not report truncation"))
        return 1;

    if (!check(gen5sha1cache_search(&black, nullptr, 0, nullptr, 0, nullptr, 0) == 0,
               "empty cache lists returned results")
        || !check(gen5sha1cache_processed_count() == 86400, "empty cache lists did not scan a full day"))
        return 1;

    constexpr std::array<std::uint32_t, 2> unsorted = { blackHigh, 0 };
    if (!check(gen5sha1cache_search(&black, unsorted.data(), unsorted.size(), nullptr, 0, nullptr, 0) == 0,
               "unsorted cache data was accepted")
        || !check(gen5sha1cache_last_error() == 2, "unsorted cache data returned the wrong error"))
        return 1;

    if (!check(gen5sha1cache_search(&black, nullptr, 1, nullptr, 0, nullptr, 0) == 0,
               "null cache data was accepted")
        || !check(gen5sha1cache_last_error() == 2, "null cache data returned the wrong error"))
        return 1;

    auto invalid = black;
    invalid.day = 32;
    if (!check(gen5sha1cache_search(&invalid, nullptr, 0, nullptr, 0, nullptr, 0) == 0,
               "invalid date was accepted")
        || !check(gen5sha1cache_last_error() == 1, "invalid date returned the wrong error"))
        return 1;

    invalid = black;
    invalid.buttonMask = 0x300;
    if (!check(gen5sha1cache_search(&invalid, nullptr, 0, nullptr, 0, nullptr, 0) == 0,
               "conflicting keypress was accepted")
        || !check(gen5sha1cache_last_error() == 1, "conflicting keypress returned the wrong error"))
        return 1;

    return 0;
}
