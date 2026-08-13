#include "../bridge/gen7id_bridge.h"
#include <cassert>
#include <cstdint>

int main()
{
    assert(gen7id_api_version() == 1);
    assert(gen7id_generate(0, 0, 9, 0, 0, 0, 0, 0xffffffffU, 0xffffffffU, 0xffffffffU, 0) == 10);
    const auto *results = reinterpret_cast<const Gen7IdPackedState *>(gen7id_result_ptr());
    assert(results[0].advances == 0);
    const auto tid = results[0].tidSID & 0xffffU;
    const auto sid = results[0].tidSID >> 16;
    assert((results[0].tsvTRV & 0xffffU) == ((tid ^ sid) >> 4));
    assert((results[0].tsvTRV >> 16) == ((tid ^ sid) & 0xf));
    assert(results[0].g7tid == (results[0].tidSID % 1000000U));
    const auto rand = (static_cast<std::uint64_t>(results[0].randHigh) << 32) | results[0].randLow;
    assert(results[0].clock == rand % 17);
    const auto fullId = results[0].tidSID;
    const auto filterDigits = fullId % 1000000U;
    assert(gen7id_generate(0, 0, 0, 0, 4, filterDigits, 6, 0xffffffffU,
                           0xffffffffU, 0xffffffffU, 0) == 1);
    assert(gen7id_generate(0, 0, 100000, 0, 0, 0, 0, 0xffffffffU, 0xffffffffU, 0xffffffffU, 0) == 0);
    assert(gen7id_last_error() == 1);
    assert(gen7id_generate(0, 0, 0xffffffffU, 0, 0, 0, 0, 0xffffffffU, 0xffffffffU, 0xffffffffU, 0) == 0);
    assert(gen7id_last_error() == 1);
    return 0;
}
