#include "gen6pokeradar_bridge.h"

#include <cassert>

int main()
{
    const Gen6PokeRadarRequest request{
        0x12345678,
        0,
        32,
        0,
        6,
        40,
        1,
        100,
    };
    assert(gen6pokeradar_api_version() == 2);
    assert(gen6pokeradar_generate(&request) == 32);
    assert(gen6pokeradar_last_error() == 0);
    assert(gen6pokeradar_processed_count() == 32);
    assert(gen6pokeradar_limit_reached() == 0);

    const auto *result = reinterpret_cast<const Gen6PokeRadarResult *>(gen6pokeradar_result_ptr());
    assert(result != nullptr);
    assert(result[0].frame == 0);
    assert(result[31].frame == 31);
    for (int i = 0; i < 5; ++i)
    {
        assert(((result[0].patches[i] >> 16) & 15) <= 8);
        assert(((result[0].patches[i] >> 20) & 15) <= 8);
    }

    auto limits = request;
    limits.partySize = 1;
    limits.chainLength = 255;
    assert(gen6pokeradar_generate(&limits) == 32);

    limits.chainLength = 256;
    assert(gen6pokeradar_generate(&limits) == 0);
    assert(gen6pokeradar_last_error() != 0);

    limits.chainLength = 0;
    limits.partySize = 0;
    assert(gen6pokeradar_generate(&limits) == 0);
    assert(gen6pokeradar_last_error() != 0);

    return 0;
}
