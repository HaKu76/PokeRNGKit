#include "gen3static_bridge.h"

#include <cassert>
#include <cstdint>

int main()
{
    assert(gen3static_api_version() == 4);

    const auto count = gen3static_generate(0x12345678, 0, 0, 0, 1, 150, 70, 255, 0, 0, 0, 0, 0, 0, 0x1ffffff, 0xffff,
                                           0, 0, 0, 0, 0, 0, 31, 31, 31, 31, 31, 31, 31, 0);
    assert(count == 1);
    assert(gen3static_result_count() == 1);

    const auto *state = reinterpret_cast<const Gen3StaticPackedState *>(gen3static_result_ptr());
    assert(state->advances == 0);
    assert(state->pid == 0x84ea0b71);
    assert(state->hp == 10);
    assert(state->attack == 12);
    assert(state->defense == 22);
    assert(state->specialAttack == 7);
    assert(state->specialDefense == 29);
    assert(state->speed == 0);
    assert(state->gender == 2);
    assert(state->level == 70);
    assert((state->natureShiny & 0xff) == 15);
    assert((state->natureShiny >> 8) == 0);

    const auto method4Count = gen3static_generate(0x12345678, 0, 0, 0, 4, 150, 70, 255, 0, 0, 0, 0, 0, 0, 0x1ffffff, 0xffff,
                                                  0, 0, 0, 0, 0, 0, 31, 31, 31, 31, 31, 31, 31, 0);
    assert(method4Count == 1);
    state = reinterpret_cast<const Gen3StaticPackedState *>(gen3static_result_ptr());
    assert(state->specialAttack == 20);
    assert(state->specialDefense == 9);
    assert(state->speed == 4);

    const auto roamerCount = gen3static_generate(0x12345678, 0, 0, 0, 1, 381, 40, 0, 1, 0, 0, 0, 0, 0, 0x1ffffff, 0xffff,
                                                 0, 0, 0, 0, 0, 0, 31, 31, 31, 31, 31, 31, 31, 0);
    assert(roamerCount == 1);
    state = reinterpret_cast<const Gen3StaticPackedState *>(gen3static_result_ptr());
    assert(state->hp == 10);
    assert(state->attack == 4);
    assert(state->defense == 0);
    assert(state->specialAttack == 0);
    assert(state->specialDefense == 0);
    assert(state->speed == 0);

    assert(gen3static_generate(0, 0, 0, 0, 1, 150, 70, 255, 0, 0, 0, 0, 0, 0, 0x1ffffff, 0xffff,
                               32, 0, 0, 0, 0, 0, 31, 31, 31, 31, 31, 31, 31, 0)
           == 0);
    assert(gen3static_last_error() == 1);

    const auto searchCount = gen3static_search(0, 1, 4, 383, 45, 255, 0, 12345, 54321, 0, 0, 0, 0x1ffffff, 0xffff,
                                               31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 0);
    assert(searchCount == 4);
    assert(gen3static_result_count() == 4);

    const auto perfectSearchCount = gen3static_search(186, 1, 4, 383, 45, 255, 0, 12345, 54321, 0, 0, 0,
                                                      0x1ffffff, 0xffff, 0, 0, 0, 0, 0, 0, 31, 31, 31, 31,
                                                      31, 31, 31, 5);
    assert(perfectSearchCount == 4);
    state = reinterpret_cast<const Gen3StaticPackedState *>(gen3static_result_ptr());
    assert(state->hp == 31 && state->attack == 31 && state->defense == 31 && state->specialAttack == 31
           && state->specialDefense == 31 && state->speed == 31);
    assert(gen3static_search(187, 1, 4, 383, 45, 255, 0, 12345, 54321, 0, 0, 0, 0x1ffffff, 0xffff, 0, 0, 0,
                             0, 0, 0, 31, 31, 31, 31, 31, 31, 31, 5)
           == 0);
    assert(gen3static_last_error() == 1);

    const auto filtered = gen3static_generate(0x12345678, 0, 0, 0, 1, 150, 70, 255, 0, 0, 0, 0, 0, 0,
                                              1u << 15, 1u << 11, 0, 0, 0, 0, 0, 0, 31, 31, 31, 31, 31, 31, 31, 0);
    assert(filtered == 1);
    return 0;
}
