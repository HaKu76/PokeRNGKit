#include <cassert>
#include <cstdint>
#include <iostream>

#include "gen7eggseedfinder_bridge.h"

int main() {
    assert(gen7eggseedfinder_api_version() == 1);

    const std::uint32_t natures[8] = {9, 19, 23, 11, 11, 10, 22, 11};
    const auto count = gen7eggseedfinder_search(0, 0, natures, 0);
    assert(count == 1);
    assert(count == gen7eggseedfinder_result_count());
    assert(gen7eggseedfinder_last_error() == 0);
    const auto *searchState = gen7eggseedfinder_result_ptr();
    assert(searchState[0].state0 == 0x78a495aeU);
    assert(searchState[0].state1 == 0x60127f96U);
    assert(searchState[0].state2 == 0x0d6f15e9U);
    assert(searchState[0].state3 == 0x1969de6cU);

    std::uint8_t invalid[126]{};
    assert(gen7eggseedfinder_magikarp(invalid, 126) == 0);
    assert(gen7eggseedfinder_last_error() != 0);

    std::uint8_t bits[127]{};
    const auto stateCount = gen7eggseedfinder_magikarp(bits, 127);
    assert(stateCount == 1);
    const auto *state = gen7eggseedfinder_magikarp_result_ptr();
    assert(state != nullptr);
    assert(gen7eggseedfinder_last_error() == 0);

    std::uint8_t ones[127];
    for (auto &bit : ones) bit = 1;
    assert(gen7eggseedfinder_magikarp(ones, 127) == 1);
    const auto *onesState = gen7eggseedfinder_magikarp_result_ptr();
    assert(onesState[0] == 0x7e46e861U);
    assert(onesState[1] == 0x785b9c60U);
    assert(onesState[2] == 0x89435273U);
    assert(onesState[3] == 0x3050eaddU);

    std::cout << "gen7eggseedfinder_native_parity passed: " << state[0]
              << "," << state[1] << "," << state[2] << "," << state[3]
              << "\n";
    return 0;
}
