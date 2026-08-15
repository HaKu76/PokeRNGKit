#include "gen7stationary_bridge.h"

#include <array>
#include <cassert>
#include <cstdint>

namespace
{
    Gen7StationaryPackedRequest request()
    {
        Gen7StationaryPackedRequest value {};
        value.seed = 0x12345678;
        value.minFrame = 418;
        value.maxFrame = 430;
        value.version = 0;
        value.tsv = 1234;
        value.trv = 5;
        value.syncNature = 0xff;
        value.npc = 0;
        value.considerDelay = 1;
        value.species = 785;
        value.level = 60;
        value.ivs[0] = value.ivs[1] = value.ivs[2] = -1;
        value.ivs[3] = value.ivs[4] = value.ivs[5] = -1;
        value.shinyLocked = 1;
        value.ivMax[0] = value.ivMax[1] = value.ivMax[2] = 31;
        value.ivMax[3] = value.ivMax[4] = value.ivMax[5] = 31;
        value.perfectIvValue = 31;
        value.resultLimit = 100;
        return value;
    }
}

int main()
{
    assert(gen7stationary_api_version() == 1);
    auto first = request();
    assert(gen7stationary_begin(&first) == 1);
    assert(gen7stationary_step(5) == 5);
    assert(gen7stationary_step_processed() == 5);
    assert(gen7stationary_total_processed() == 5);
    assert(gen7stationary_result_count() == 5);
    const auto *firstResults = reinterpret_cast<const Gen7StationaryPackedResult *>(gen7stationary_result_ptr());
    std::array<Gen7StationaryPackedResult, 5> snapshot {};
    for (std::size_t i = 0; i < snapshot.size(); i++) snapshot[i] = firstResults[i];

    auto second = request();
    assert(gen7stationary_begin(&second) == 1);
    assert(gen7stationary_step(5) == 5);
    const auto *secondResults = reinterpret_cast<const Gen7StationaryPackedResult *>(gen7stationary_result_ptr());
    for (std::size_t i = 0; i < snapshot.size(); i++)
    {
        assert(snapshot[i].frame == secondResults[i].frame);
        assert(snapshot[i].randomLow == secondResults[i].randomLow);
        assert(snapshot[i].randomHigh == secondResults[i].randomHigh);
        assert(snapshot[i].ec == secondResults[i].ec);
        assert(snapshot[i].pid == secondResults[i].pid);
        assert(snapshot[i].ivs == secondResults[i].ivs);
        assert(snapshot[i].metadata == secondResults[i].metadata);
        assert(snapshot[i].delay == secondResults[i].delay);
    }

    auto invalid = request();
    invalid.minFrame = 417;
    assert(gen7stationary_begin(&invalid) == 0);
    assert(gen7stationary_last_error() == 1);
    return 0;
}
