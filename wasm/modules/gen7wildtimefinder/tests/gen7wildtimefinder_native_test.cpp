#include "gen7wildtimefinder_bridge.h"

#include <cassert>

int main()
{
    assert(gen7wildtimefinder_api_version() == 1);
    Gen7WildTimeFinderPackedRequest request{};
    request.seed = 0x8eab05d2U;
    request.minFrame = 478;
    request.maxFrame = 478;
    request.encounterType = 0;
    request.useSynchronize = 0;
    request.genderRatio = 255;
    request.filtersDisabled = 1;
    request.resultLimit = 1;
    for (int index = 0; index < 6; index++) request.ivMax[index] = 31;

    assert(gen7wildtimefinder_begin(&request) == 1);
    assert(gen7wildtimefinder_step(1) == 1);
    assert(gen7wildtimefinder_result_count() == 1);
    const auto *result = reinterpret_cast<const Gen7WildTimeFinderPackedResult *>(gen7wildtimefinder_result_ptr());
    assert(result != nullptr);
    assert(result->frame == 478);
    assert(result->slot >= 1 && result->slot <= 10);
    assert(gen7wildtimefinder_done() == 1);
    return 0;
}
