#include "gen7event_bridge.h"

#include <array>
#include <cassert>
#include <cstdint>

namespace
{
    Gen7EventPackedRequest request()
    {
        Gen7EventPackedRequest value {};
        value.seed = 0x12345678;
        value.minFrame = 418;
        value.maxFrame = 430;
        value.version = 0;
        value.tsv = 1234;
        value.trv = 5;
        value.npc = 0;
        value.delay = 62;
        value.considerDelay = 1;
        value.otherInfo = 1;
        value.pidType = 0;
        value.abilityLocked = 0;
        value.ability = 1;
        value.natureLocked = 0;
        value.genderLocked = 0;
        value.gender = 126;
        value.genderSetting = 126;
        value.species = 25;
        value.level = 50;
        value.randomPerfectIvCount = 3;
        for (int i = 0; i < 6; i++)
        {
            value.fixedIvs[i] = -1;
            value.ivMax[i] = 31;
        }
        value.perfectIvValue = 31;
        value.resultLimit = 100;
        return value;
    }
}

int main()
{
    assert(gen7event_api_version() == 1);
    auto first = request();
    assert(gen7event_begin(&first) == 1);
    assert(gen7event_step(5) == 5);
    assert(gen7event_step_processed() == 5);
    assert(gen7event_total_processed() == 5);
    assert(gen7event_result_count() == 5);
    const auto *firstResults = reinterpret_cast<const Gen7EventPackedResult *>(gen7event_result_ptr());
    std::array<Gen7EventPackedResult, 5> snapshot {};
    for (std::size_t i = 0; i < snapshot.size(); i++) snapshot[i] = firstResults[i];

    auto second = request();
    assert(gen7event_begin(&second) == 1);
    assert(gen7event_step(5) == 5);
    const auto *secondResults = reinterpret_cast<const Gen7EventPackedResult *>(gen7event_result_ptr());
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

    auto locked = request();
    locked.genderLocked = 1;
    locked.gender = 1;
    assert(gen7event_begin(&locked) == 1);

    auto invalid = request();
    invalid.gender = 125;
    assert(gen7event_begin(&invalid) == 0);
    assert(gen7event_last_error() == 1);
    return 0;
}
