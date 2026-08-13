#include "../bridge/gen3pidtoiv_bridge.h"

#include <cassert>

int main()
{
    assert(gen3pidtoiv_api_version() == 1);
    assert(gen3pidtoiv_calculate(0) == 8);
    assert(gen3pidtoiv_last_error() == 0);
    const auto *states = reinterpret_cast<const Gen3PidToIvPackedState *>(gen3pidtoiv_result_ptr());
    assert(states[0].seed == 171270561u);
    assert(states[0].method == 1u);
    assert(states[0].hp == 30u && states[0].atk == 11u && states[0].def == 26u);
    assert(states[0].spa == 19u && states[0].spd == 20u && states[0].spe == 17u);
    assert(states[7].seed == 3100732230u);
    assert(states[7].method == 6u);
    return 0;
}
