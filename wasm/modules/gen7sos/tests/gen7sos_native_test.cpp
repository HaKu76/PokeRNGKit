#include "../bridge/gen7sos_bridge.h"

#include <cassert>
#include <cstdint>

int main()
{
    assert(gen7sos_api_version() == 1);
    Gen7SosPackedRequest request {};
    request.mode = 1;
    request.seed = 0x12345678;
    request.minFrame = 0;
    request.maxFrame = 9;
    request.resultLimit = 100;
    request.chainLength = 30;
    request.levelMin = 10;
    request.levelMax = 13;
    request.callRate = 9;
    request.hpBonus = 5;
    request.adrenalineOrb = 1;
    request.callFiltersDisabled = 1;
    request.species[0] = 25;
    request.species[1] = 25;
    request.species[2] = 25;
    request.species[3] = 25;
    request.species[4] = 25;
    request.species[5] = 25;
    request.species[6] = 25;

    assert(gen7sos_begin(&request) == 1);
    assert(gen7sos_step(10) <= 10);
    assert(gen7sos_done() == 1);
    assert(gen7sos_total_processed() == 10);
    assert(gen7sos_total_results() == 10);
    assert(gen7sos_result_ptr() != 0);
    assert(gen7sos_last_error() == 0);

    request.levelMin = 0;
    assert(gen7sos_begin(&request) == 0);
    assert(gen7sos_last_error() == 1);
    return 0;
}
