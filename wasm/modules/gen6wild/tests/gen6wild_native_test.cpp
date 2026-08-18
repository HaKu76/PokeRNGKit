/* PokeRNGKit Gen VI Wild native fixture. GPL-3.0-or-later. */
#include "gen6wild_bridge.h"

#include <cassert>

int main()
{
    Gen6WildPackedRequest request {};
    request.version = 1;
    request.encounterType = 0;
    request.seed = 0x12345678;
    request.minFrame = 0;
    request.frameCount = 32;
    request.tsv = 0;
    request.syncNature = 255;
    request.tinySeed = 0xabcdef01;
    request.encounterRate = 100;
    request.pidRolls = 1;
    request.slotDistribution[0] = 100;
    request.species[1] = 205;
    request.levels[1] = 38;
    request.slotMetadata[1] = 127;
    request.shinyMask = 7;
    request.genderFilter = 3;
    request.natureMask = 0x1ffffff;
    request.hiddenPowerMask = 0xffff;
    request.perfectIvValue = 31;
    request.itemFilter = 4;
    request.resultLimit = 1000;
    for (int i = 0; i < 6; ++i) request.ivMax[i] = 31;

    assert(gen6wild_api_version() == 1);
    assert(gen6wild_generate(&request) > 0);
    assert(gen6wild_processed_count() == 32);
    assert(gen6wild_last_error() == 0);
    request.encounterType = 1;
    request.slotDistribution[0] = 20;
    request.slotDistribution[1] = 20;
    request.slotDistribution[2] = 20;
    request.slotDistribution[3] = 20;
    request.slotDistribution[4] = 20;
    request.species[2] = 206;
    request.species[3] = 207;
    request.species[4] = 208;
    request.species[5] = 209;
    request.levels[2] = request.levels[3] = request.levels[4] = request.levels[5] = 38;
    assert(gen6wild_generate(&request) == 160);
    assert(gen6wild_processed_count() == 32);
    request.slotDistribution[0] = 99;
    assert(gen6wild_generate(&request) == 0);
    assert(gen6wild_last_error() == 1);
    return 0;
}
