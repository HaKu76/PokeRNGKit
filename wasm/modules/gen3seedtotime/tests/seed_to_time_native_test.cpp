#include "../bridge/gen3seedtotime_bridge.h"

#include <cassert>
#include <cstdint>

namespace
{
    struct ExpectedTime
    {
        std::uint32_t year;
        std::uint32_t month;
        std::uint32_t day;
        std::uint32_t hour;
        std::uint32_t minute;
    };

    void assertTimes(std::uint32_t seed, std::uint32_t year, const ExpectedTime *expected, std::uint32_t expectedCount)
    {
        const auto count = gen3seedtotime_calculate(seed, year);
        assert(gen3seedtotime_last_error() == 0);
        assert(count == expectedCount);
        const auto *states = reinterpret_cast<const Gen3SeedToTimePackedState *>(gen3seedtotime_result_ptr());
        for (std::uint32_t i = 0; i < count; i++)
        {
            assert(states[i].year == expected[i].year);
            assert(states[i].month == expected[i].month);
            assert(states[i].day == expected[i].day);
            assert(states[i].hour == expected[i].hour);
            assert(states[i].minute == expected[i].minute);
        }
    }
}

int main()
{
    assert(gen3seedtotime_api_version() == 1);

    constexpr ExpectedTime seed0Times[] = {
        { 2000, 3, 30, 18, 22 }, { 2000, 3, 31, 0, 22 }, { 2000, 6, 29, 18, 44 },
        { 2000, 6, 29, 19, 8 }, { 2000, 6, 30, 0, 44 }, { 2000, 6, 30, 1, 8 },
        { 2000, 12, 29, 2, 10 },
    };
    constexpr ExpectedTime seed4000Times[] = {
        { 2009, 1, 2, 2, 48 }, { 2009, 5, 18, 10, 3 }, { 2009, 7, 3, 3, 50 },
        { 2009, 7, 3, 4, 14 }, { 2009, 8, 17, 10, 25 }, { 2009, 10, 2, 4, 36 },
        { 2009, 11, 16, 10, 47 },
    };
    constexpr ExpectedTime seed8000Times[] = {
        { 2018, 1, 2, 20, 28 }, { 2018, 1, 3, 8, 28 }, { 2018, 2, 17, 14, 39 },
        { 2018, 7, 3, 21, 30 }, { 2018, 7, 4, 9, 30 }, { 2018, 8, 18, 15, 41 },
        { 2018, 8, 18, 16, 5 }, { 2018, 10, 2, 21, 52 }, { 2018, 10, 2, 22, 16 },
        { 2018, 10, 3, 9, 52 }, { 2018, 11, 17, 16, 27 },
    };
    constexpr ExpectedTime seedC000Times[] = {
        { 2027, 2, 18, 19, 55 }, { 2027, 2, 19, 1, 55 }, { 2027, 2, 19, 2, 19 },
        { 2027, 8, 20, 3, 21 }, { 2027, 11, 19, 3, 43 }, { 2027, 11, 19, 4, 7 },
    };

    assertTimes(0, 2000, seed0Times, 7);
    assert(gen3seedtotime_origin_seed() == 0);
    assert(gen3seedtotime_advances() == 0);
    assertTimes(0x4000, 2009, seed4000Times, 7);
    assertTimes(0x8000, 2018, seed8000Times, 11);
    assertTimes(0xc000, 2027, seedC000Times, 6);

    gen3seedtotime_calculate(0x40000000, 2000);
    assert(gen3seedtotime_last_error() == 0);
    assert(gen3seedtotime_origin_seed() == 0x1aa5);
    assert(gen3seedtotime_advances() == 66861);
    gen3seedtotime_calculate(0x80000000, 2000);
    assert(gen3seedtotime_last_error() == 0);
    assert(gen3seedtotime_origin_seed() == 0x19cb);
    assert(gen3seedtotime_advances() == 10055);
    gen3seedtotime_calculate(0xc0000000, 2000);
    assert(gen3seedtotime_last_error() == 0);
    assert(gen3seedtotime_origin_seed() == 0x672c);
    assert(gen3seedtotime_advances() == 44340);

    assert(gen3seedtotime_calculate(0, 1999) == 0);
    assert(gen3seedtotime_last_error() == 1);
    assert(gen3seedtotime_calculate(0, 2038) == 0);
    assert(gen3seedtotime_last_error() == 1);
    return 0;
}
