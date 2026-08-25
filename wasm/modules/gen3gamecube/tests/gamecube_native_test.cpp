/*
 * PokeRNGKit Gen III GameCube native parity fixture
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#include "gen3gamecube_bridge.h"
#include <array>
#include <cassert>

int main()
{
    std::array<std::uint32_t, 57> request = {};
    request[0] = 1;
    request[1] = 96;
    request[2] = 385;
    request[3] = 5;
    request[7] = 12345;
    request[8] = 54321;
    request[12] = 9;
    request[14] = 255;
    request[15] = 255;
    request[16] = 255;
    request[17] = 0x1ffffff;
    request[18] = 0xffff;
    for (int index = 0; index < 6; index++) request[25 + index] = 31;
    request[31] = 100;
    request[32] = 100;
    request[33] = 100;
    request[34] = 100;
    request[35] = 100;
    request[36] = 100;
    request[37] = 255;
    request[38] = 32;
    request[39] = 32;
    request[55] = 31;
    request[56] = 0;

    assert(gen3gamecube_api_version() == 2);
    assert(gen3gamecube_generate(request.data(), request.size()) == 10);
    assert(gen3gamecube_last_error() == 0);
    const auto *states = reinterpret_cast<const Gen3GameCubePackedState *>(gen3gamecube_result_ptr());
    assert(states[0].advancesOrSeed == 0);
    assert(states[0].pid == 1722649525);
    assert(states[0].hp == 26 && states[0].attack == 28 && states[0].defense == 25);
    assert(states[0].specialAttack == 30 && states[0].specialDefense == 1 && states[0].speed == 16);
    assert(states[0].ability == 1 && states[0].gender == 2 && states[0].level == 5);
    return 0;
}
