#include "gen4seedfinder_bridge.h"

#include <cassert>
#include <cstdint>

int main()
{
    assert(gen4seedfinder_api_version() == 1);
    const auto count = gen4seedfinder_search(0, 2005, 1, 1, 17, 0, 16, 16, 4364, 4364, 0, 0, 0, 4);
    assert(count == 1);
    const auto* result = reinterpret_cast<const Gen4SeedFinderPackedResult*>(gen4seedfinder_result_ptr());
    assert(result != nullptr);
    assert(result->seed == 0x11111111U);
    assert(result->second == 16);
    assert(result->delay == 4364);

    const auto filterLow = result->sequenceLow & 0xffU;
    const auto filtered = gen4seedfinder_search(0, 2005, 1, 1, 17, 0, 16, 16, 4364, 4364, filterLow, 0, 4, 4);
    assert(filtered == 1);
    const auto filteredResult = reinterpret_cast<const Gen4SeedFinderPackedResult*>(gen4seedfinder_result_ptr());
    assert((filteredResult->sequenceLow & 0xffU) == filterLow);
    assert(gen4seedfinder_search(0, 2005, 1, 1, 17, 0, 16, 16, 0, 100001, 0, 0, 0, 4) == 0);
    assert(gen4seedfinder_last_error() == 1);
    return 0;
}
