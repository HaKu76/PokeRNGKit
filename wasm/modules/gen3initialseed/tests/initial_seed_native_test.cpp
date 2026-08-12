#include "../bridge/gen3initialseed_bridge.h"

#include <cassert>
#include <cstdint>

int main()
{
    auto count = gen3initialseed_find_rs_ids(48163, 64377);
    assert(gen3initialseed_last_error() == 0);
    assert(count == 2);

    const auto *states = reinterpret_cast<const Gen3InitialSeedPackedState *>(gen3initialseed_result_ptr());
    assert(states[0].initialSeed == 0x05a0);
    assert(states[0].advances == 0);
    assert(states[1].initialSeed == 0xc19b);
    assert(states[1].advances == 36724);

    count = gen3initialseed_find_target(0x00006073, 0, 1);
    assert(gen3initialseed_last_error() == 0);
    assert(count == 1);
    states = reinterpret_cast<const Gen3InitialSeedPackedState *>(gen3initialseed_result_ptr());
    assert(states[0].initialSeed == 0x0000);
    assert(states[0].advances == 1);

    assert(gen3initialseed_find_rs_ids(0x10000, 0) == 0);
    assert(gen3initialseed_last_error() == 1);
    assert(gen3initialseed_find_target(0, 0, 0) == 0);
    assert(gen3initialseed_last_error() == 1);
    assert(gen3initialseed_find_target(0, 0xffffffff, 1) == 0);
    assert(gen3initialseed_last_error() == 1);
    assert(gen3initialseed_find_target(0, 0, 500001) == 0);
    assert(gen3initialseed_last_error() == 2);
}
