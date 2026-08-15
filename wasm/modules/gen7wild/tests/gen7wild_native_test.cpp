/*
 * PokeRNGKit Gen VII Wild native fixture
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen7wild_bridge.h"

#include <cassert>
#include <cstdint>

int main()
{
    Gen7WildPackedRequest request {};
    request.version = 2;
    request.seed = 0x12345678;
    request.minFrame = 478;
    request.maxFrame = 578;
    request.tsv = 1234;
    request.trv = 8;
    request.syncNature = 0xff;
    request.npc = 1;
    request.considerDelay = 1;
    request.levelMin = 2;
    request.levelMax = 5;
    request.slotType = 0;
    request.delayTime = 6;
    request.honeyDelay = 63;
    request.platformDelay = 14;
    request.pokemonDelay = 1;
    request.species[1] = 734;
    request.slotMetadata[1] = 126 | (1U << 8);
    request.slotDistribution[0] = 100;
    request.natureMask = 0x1ffffff;
    request.hiddenPowerMask = 0xffff;
    for (int i = 0; i < 6; i++) request.ivMax[i] = 31;
    request.perfectIvValue = 31;
    request.resultLimit = 1000;

    assert(gen7wild_api_version() == 1);
    assert(gen7wild_begin(&request) == 1);
    while (gen7wild_done() == 0) gen7wild_step(32);
    assert(gen7wild_total_processed() == 101);
    assert(gen7wild_total_results() > 0);
    assert(gen7wild_last_error() == 0);
    return 0;
}
