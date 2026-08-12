#include "gen3ivtopid_bridge.h"

#include <cassert>
#include <cstdint>

int main()
{
    assert(gen3ivtopid_api_version() == 1);
    const auto count = gen3ivtopid_calculate(0, 0, 0, 0, 0, 0, 0, 12345);
    assert(gen3ivtopid_last_error() == 0);
    assert(count == 1);
    const auto *states = reinterpret_cast<const Gen3IvToPidPackedState *>(gen3ivtopid_result_ptr());
    assert(states[0].seed == 1449478200);
    assert(states[0].pid == 3693978225);
    assert(states[0].sid == 48333);
    assert(states[0].method == 6);

    const auto method2Count = gen3ivtopid_calculate(31, 31, 31, 0, 31, 31, 0, 12345);
    assert(method2Count == 1);
    states = reinterpret_cast<const Gen3IvToPidPackedState *>(gen3ivtopid_result_ptr());
    assert(states[0].seed == 921075850);
    assert(states[0].pid == 45092875);
    assert(states[0].sid == 8832);
    assert(states[0].method == 3);

    const auto invalid = gen3ivtopid_calculate(32, 0, 0, 0, 0, 0, 0, 12345);
    assert(invalid == 0);
    assert(gen3ivtopid_last_error() == 1);
    return 0;
}
