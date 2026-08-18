#include "gen6dexnav_bridge.h"

#include <cassert>
#include <cstdint>

int main()
{
    Gen6DexNavPackedRequest request{};
    request.tinySeed = 0x12345678;
    request.minFrame = 0;
    request.frameCount = 32;
    request.tinyFrame = 0;
    request.encounterType = 0;
    request.activeSearch = 1;
    request.hasDexNav = 1;
    request.searchLevel = 100;
    request.chainLength = 0;
    request.resultLimit = 100;
    request.species[0] = 261;
    request.levels[0] = 5;
    for (std::size_t i = 1; i < 13; ++i) { request.species[i] = 261; request.levels[i] = 5; }
    assert(gen6dexnav_api_version() == 1);
    const auto count = gen6dexnav_generate(&request);
    assert(gen6dexnav_last_error() == 0);
    assert(count == 32);
    assert(gen6dexnav_processed_count() == 32);
    const auto *result = reinterpret_cast<const Gen6DexNavPackedResult *>(gen6dexnav_result_ptr());
    assert(result != nullptr);
    assert(result[0].frame == 0);
    assert(result[31].frame == 31);
    assert((result[0].slot >> 8) <= 3);
    return 0;
}
