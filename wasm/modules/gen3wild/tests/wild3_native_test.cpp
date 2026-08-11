#include "gen3wild_bridge.h"

#include <array>
#include <cassert>

int main()
{
    assert(gen3wild_api_version() == 3);
    const std::array<Gen3WildPackedSlot, 12> slots = {
        Gen3WildPackedSlot { 27, 0, 20, 20, 127, 4 | (4 << 8) },
        Gen3WildPackedSlot { 328, 0, 20, 20, 127, 4 | (4 << 8) },
        Gen3WildPackedSlot { 27, 0, 21, 21, 127, 4 | (4 << 8) },
        Gen3WildPackedSlot { 328, 0, 21, 21, 127, 4 | (4 << 8) },
        Gen3WildPackedSlot { 343, 0, 19, 19, 255, 4 | (13 << 8) },
        Gen3WildPackedSlot { 343, 0, 21, 21, 255, 4 | (13 << 8) },
        Gen3WildPackedSlot { 27, 0, 19, 19, 127, 4 | (4 << 8) },
        Gen3WildPackedSlot { 328, 0, 19, 19, 127, 4 | (4 << 8) },
        Gen3WildPackedSlot { 343, 0, 20, 20, 255, 4 | (13 << 8) },
        Gen3WildPackedSlot { 331, 0, 20, 20, 127, 11 | (11 << 8) },
        Gen3WildPackedSlot { 331, 0, 22, 22, 127, 11 | (11 << 8) },
        Gen3WildPackedSlot { 331, 0, 22, 22, 127, 11 | (11 << 8) },
    };
    const auto count = gen3wild_generate(slots.data(), slots.size(), 477218588, 0, 9, 0, 1, 255, 0, 10,
                                         1, 0, 0, 0, 0, 0, 12345, 54321, 0x1ffffff);
    assert(count == 10);
    const auto *state = reinterpret_cast<const Gen3WildPackedState *>(gen3wild_result_ptr());
    assert(state->advances == 0);
    assert(state->pid == 1012584442);
    assert(state->encounterSlot == 3);
    assert(state->species == 328);
    assert(state->level == 21);
    assert(state->hp == 12);
    assert(state->attack == 31);
    assert(state->defense == 4);
    assert(state->specialAttack == 27);
    assert(state->specialDefense == 8);
    assert(state->speed == 20);
    assert((state->natureShiny & 0xff) == 17);

    assert(gen3wild_generate(slots.data(), slots.size(), 0, 0, 100000, 0, 1, 255, 0, 10,
                             1, 0, 0, 0, 0, 0, 0, 0, 0x1ffffff)
           == 0);
    assert(gen3wild_last_error() == 1);
    return 0;
}
