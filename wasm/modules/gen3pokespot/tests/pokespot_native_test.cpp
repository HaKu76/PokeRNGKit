#include "gen3pokespot_bridge.h"

#include <cassert>
#include <cstdint>

int main()
{
    const std::uint32_t count = gen3pokespot_generate(
        0, 0, 0, 9, 0, 9, 0, 0, 0, 12345, 54321, 0, 0, 0, 0x1ffffff, 0xffff, 7,
        0, 0, 0, 0, 0, 0, 31, 31, 31, 31, 31, 31);
    assert(gen3pokespot_api_version() == 1);
    assert(gen3pokespot_last_error() == 0);
    assert(count == 30);
    assert(gen3pokespot_result_count() == count);

    const auto *states = reinterpret_cast<const Gen3PokeSpotPackedState *>(gen3pokespot_result_ptr());
    assert(states[0].foodAdvances == 2);
    assert(states[0].encounterAdvances == 0);
    assert(states[0].pid == 773136557);
    assert(states[0].species == 27);
    assert(states[0].slot == 0);
    assert(states[0].hp == 5 && states[0].attack == 12 && states[0].defense == 2);
    assert(states[0].specialAttack == 20 && states[0].specialDefense == 8 && states[0].speed == 23);
    assert(states[0].level == 20);
    assert(states[29].foodAdvances == 9);
    assert(states[29].encounterAdvances == 9);
    assert(states[29].species == 207);
    return 0;
}
