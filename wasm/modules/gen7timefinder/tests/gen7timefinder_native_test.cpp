#include "gen7timefinder_bridge.h"

#include <cassert>

int main()
{
    assert(gen7timefinder_api_version() == 1);
    const auto first = gen7timefinder_initial_seed(0x041d9cb9U, 0, 0);
    const auto second = gen7timefinder_initial_seed(0x041d9cb9U, 1000, 0);
    assert(first != second);
    assert(first == 0x8eab05d2U);
    assert(second == 0xac595b5bU);
    assert(first == gen7timefinder_initial_seed(0x041d9cb9U, 0, 0));
    assert(gen7timefinder_initial_seed(0x043b1cf3U, 0, 0) != first);
    return 0;
}
