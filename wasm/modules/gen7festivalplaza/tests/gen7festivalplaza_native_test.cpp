#include "gen7festivalplaza_bridge.h"

#include <algorithm>
#include <array>
#include <cassert>
#include <cstdint>

namespace
{
    constexpr std::uint32_t anyFilter = 0xffffffffU;

    bool contains(const std::uint32_t *values, std::size_t size, std::uint32_t target)
    {
        return std::find(values, values + size, target) != values + size;
    }
}

int main()
{
    assert(gen7festivalplaza_api_version() == 1);

    Gen7FestivalPlazaPackedRequest request {
        0x12345678U,
        0,
        4,
        0,
        0,
        0,
        18,
        0,
        anyFilter,
        anyFilter,
        anyFilter,
        1,
        100,
    };
    assert(gen7festivalplaza_begin(&request) == 1);
    assert(gen7festivalplaza_step(32) == 5);
    assert(gen7festivalplaza_total_processed() == 5);
    assert(gen7festivalplaza_total_results() == 5);
    assert(gen7festivalplaza_done() == 1);
    const auto *results = reinterpret_cast<const std::uint32_t *>(gen7festivalplaza_result_ptr());
    assert(results != nullptr);
    constexpr std::size_t resultWords = 11;
    constexpr std::array<std::array<std::uint32_t, resultWords>, 5> expected = {
        std::array<std::uint32_t, resultWords> { 0, 0, 0, 3333782814U, 1136957770U, 3, 27, 3, 1, 0, 0 },
        std::array<std::uint32_t, resultWords> { 1, 1, 2, 1268148952U, 3538888705U, 2, 14, 8, 0, 0, 0 },
        std::array<std::uint32_t, resultWords> { 2, 2, 4, 2454115098U, 2390879983U, 5, 14, 0, 2, 0, 0 },
        std::array<std::uint32_t, resultWords> { 3, 3, 6, 772645168U, 140358811U, 4, 14, 4, 0, 0, 0 },
        std::array<std::uint32_t, resultWords> { 4, 4, 8, 966833046U, 692982176U, 3, 25, 2, 1, 0, 0 },
    };
    for (std::uint32_t row = 0; row < 5; row++)
    {
        for (std::size_t word = 0; word < resultWords; word++)
            assert(results[row * resultWords + word] == expected[row][word]);
    }

    request.minFrame = 0;
    request.maxFrame = 999;
    request.version = 1;
    request.rank = 18;
    request.starFilter = 4;
    request.includeNpcStatus = 0;
    request.resultLimit = 1000;
    assert(gen7festivalplaza_begin(&request) == 1);
    gen7festivalplaza_step(1000);
    results = reinterpret_cast<const std::uint32_t *>(gen7festivalplaza_result_ptr());
    constexpr std::array<std::uint32_t, 6> moonStar4 = { 0, 1, 2, 11, 13, 15 };
    assert(gen7festivalplaza_result_count() > 0);
    for (std::uint32_t row = 0; row < gen7festivalplaza_result_count(); row++)
        assert(contains(moonStar4.data(), moonStar4.size(), results[row * 10 + 6]));

    request.version = 0;
    request.rank = 0;
    request.starFilter = 1;
    assert(gen7festivalplaza_begin(&request) == 1);
    gen7festivalplaza_step(1000);
    results = reinterpret_cast<const std::uint32_t *>(gen7festivalplaza_result_ptr());
    bool foundSwitcheroo = false;
    for (std::uint32_t row = 0; row < gen7festivalplaza_result_count(); row++)
        foundSwitcheroo |= results[row * 10 + 6] == 33;
    assert(!foundSwitcheroo);

    request.version = 2;
    assert(gen7festivalplaza_begin(&request) == 1);
    gen7festivalplaza_step(1000);
    results = reinterpret_cast<const std::uint32_t *>(gen7festivalplaza_result_ptr());
    foundSwitcheroo = false;
    for (std::uint32_t row = 0; row < gen7festivalplaza_result_count(); row++)
        foundSwitcheroo |= results[row * 10 + 6] == 33;
    assert(foundSwitcheroo);

    request.version = 0;
    request.rank = 10;
    request.starFilter = 4;
    assert(gen7festivalplaza_begin(&request) == 1);
    gen7festivalplaza_step(1000);
    assert(gen7festivalplaza_result_count() > 0);

    request.rank = 19;
    assert(gen7festivalplaza_begin(&request) == 0);
    assert(gen7festivalplaza_last_error() == 1);

    request.rank = 18;
    request.maxFrame = 5000001;
    assert(gen7festivalplaza_begin(&request) == 0);
    assert(gen7festivalplaza_last_error() == 1);
}
