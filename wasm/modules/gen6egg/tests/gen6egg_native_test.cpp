#include "gen6egg_bridge.h"

#include <cassert>

int main()
{
    std::uint32_t request[154]{};
    request[0] = 0x12345678;
    request[1] = 0;
    request[2] = 32;
    request[3] = 0x11111111;
    request[4] = 0x22222222;
    request[5] = 0;
    request[6] = 0;
    request[7] = 126;
    request[8] = 2;
    request[9] = 1;
    request[24] = 100;
    for (int i = 0; i < 6; ++i)
    {
        request[12 + i] = 31 - i;
        request[18 + i] = i;
    }

    request[11] = 48; // accepted egg with main RNG PID and the 16-frame delay
    assert(gen6egg_api_version() == 2);
    assert(gen6egg_begin(request) == 1);
    assert(gen6egg_step(32) == 32);
    assert(gen6egg_last_error() == 0);
    assert(gen6egg_result_count() == 33); // the unfiltered Current row precedes frame rows
    assert(gen6egg_step_processed() == 32);
    assert(gen6egg_total_processed() == 32);
    assert(gen6egg_done() == 1);
    const auto *result = reinterpret_cast<const Gen6EggResult *>(gen6egg_result_ptr());
    assert(result != nullptr);
    assert(result[0].words[0] == 0xffffffffU);
    assert((result[0].words[12] & (1U << 12)) != 0);
    assert(result[0].words[1] == 3331822403U);
    assert(result[0].words[4] == 3213679472U);
    assert(result[0].words[5] == 0xffffffffU);
    assert(result[0].words[6] == 0U && result[0].words[7] == 30U && result[0].words[8] == 2U);
    assert(result[1].words[0] == 0);
    assert(result[1].words[2] == 3580589326U);
    assert(result[1].words[3] == 2989097300U);
    assert(result[1].words[5] == 2645831018U);
    assert(result[1].words[6] == 31U && result[1].words[7] == 30U && result[1].words[8] == 29U);
    assert(result[32].words[0] == 31);
    assert(result[1].words[4] != 0);

    request[3] = 1;
    request[4] = 2;
    request[8] = 3;
    request[9] = 8;
    assert(gen6egg_begin(request) == 1);
    assert(gen6egg_step(1) == 1);
    assert(gen6egg_result_count() == 2);
    const auto *powerResult = reinterpret_cast<const Gen6EggResult *>(gen6egg_result_ptr());
    const auto maleMask = powerResult[0].words[13] & 63U;
    const auto femaleMask = powerResult[0].words[18] & 63U;
    assert(((maleMask & 1U) != 0) != ((femaleMask & (1U << 5)) != 0));
    if ((maleMask & 1U) != 0)
        assert(powerResult[0].words[6] == 31);
    else
        assert(powerResult[0].words[11] == 5);
    return 0;
}
