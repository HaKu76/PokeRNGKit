#include "gen7eventtimefinder_bridge.h"

#include <cassert>

int main()
{
    assert(gen7eventtimefinder_api_version() == 1);
    Gen7EventTimeFinderPackedRequest request{};
    request.seed = 0x8eab05d2U;
    request.minFrame = 478;
    request.maxFrame = 478;
    request.version = 2;
    request.tid = 0;
    request.sid = 0;
    request.profileTid = 0;
    request.profileSid = 0;
    request.pidType = 0;
    request.abilityLocked = 1;
    request.ability = 0;
    request.genderLocked = 0;
    request.natureMask = 0x1ffffffU;
    request.hiddenPowerMask = 0xffffU;
    request.filtersDisabled = 1;
    request.resultLimit = 10;
    for (int i = 0; i < 6; i++)
    {
        request.fixedIvs[i] = -1;
        request.ivMin[i] = 0;
        request.ivMax[i] = 31;
    }
    assert(gen7eventtimefinder_begin(&request) == 1);
    assert(gen7eventtimefinder_step(1) == 1);
    assert(gen7eventtimefinder_result_count() == 1);
    const auto *result = reinterpret_cast<const Gen7EventTimeFinderPackedResult *>(gen7eventtimefinder_result_ptr());
    assert(result != nullptr);
    assert(result->frame == 478);
    assert(result->ec == 0x6aafdfbcU);
    assert(result->pid == 0x1798443dU);
    assert(result->ivs == 0x0d393668U);
    assert(result->metadata == 0x12afU);
    assert((result->ivs & 31U) == 8U);
    assert(((result->ivs >> 5) & 31U) == 19U);
    assert(((result->ivs >> 10) & 31U) == 13U);
    assert(((result->ivs >> 15) & 31U) == 18U);
    assert(((result->ivs >> 20) & 31U) == 19U);
    assert(((result->ivs >> 25) & 31U) == 6U);
    assert((result->metadata & 31U) == 15U);
    assert(((result->metadata >> 5) & 3U) == 1U);
    assert(((result->metadata >> 7) & 3U) == 1U);
    assert(((result->metadata >> 9) & 15U) == 9U);
    assert(((result->metadata >> 13) & 3U) == 0U);
    assert(gen7eventtimefinder_done() == 1);
    return 0;
}
