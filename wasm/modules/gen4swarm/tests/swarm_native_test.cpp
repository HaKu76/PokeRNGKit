#include "gen4swarm_bridge.h"

#include <cassert>
#include <cstdint>

int main()
{
    assert(gen4swarm_api_version() == 1);
    assert(gen4swarm_find_advances(0, 0xABCDU, 9, 10, 20) == 2);
    const auto *dp = reinterpret_cast<const Gen4SwarmPackedAdvance *>(gen4swarm_result_ptr());
    assert(dp[0].advance == 15);
    assert(dp[0].encounterIndex == 9);
    assert(dp[1].advance == 17);
    assert(dp[1].encounterIndex == 9);

    assert(gen4swarm_find_advances(1, 0xABCDU, 0, 0, 10) == 1);
    assert(gen4swarm_last_error() == 0);
    const auto *pt = reinterpret_cast<const Gen4SwarmPackedAdvance *>(gen4swarm_result_ptr());
    assert(pt[0].advance == 2);
    assert(pt[0].encounterIndex == 0);

    assert(gen4swarm_find_advances(2, 0xABCDU, 0, 0, 20) == 1);
    const auto *hg = reinterpret_cast<const Gen4SwarmPackedAdvance *>(gen4swarm_result_ptr());
    assert(hg[0].advance == 8);
    assert(hg[0].encounterIndex == 0);

    assert(gen4swarm_find_advances(3, 0xABCDU, 6, 0, 10) == 2);
    const auto *ss = reinterpret_cast<const Gen4SwarmPackedAdvance *>(gen4swarm_result_ptr());
    assert(ss[0].advance == 0);
    assert(ss[1].advance == 4);

    assert(gen4swarm_find_seed(0, 9, 600, 0, 0) == 1);
    const auto *seed = reinterpret_cast<const Gen4SwarmPackedSeed *>(gen4swarm_result_ptr());
    assert(seed[0].hour == 0);
    assert(seed[0].delay >= 600 && seed[0].delay <= 9999);
    assert((seed[0].seed & 0xFFFFU) == seed[0].delay);
    assert(((seed[0].seed >> 16) & 0xFFU) == seed[0].hour);
    assert(gen4swarm_find_advances(0, seed[0].seed, 9, 0, 0) == 1);

    assert(gen4swarm_find_advances(99, 0, 0, 0, 0) == 0);
    assert(gen4swarm_last_error() == 1);
    return 0;
}
