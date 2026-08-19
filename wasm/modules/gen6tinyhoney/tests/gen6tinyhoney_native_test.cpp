#include "gen6tinyhoney_bridge.h"

#include <array>
#include <cassert>
#include <cstdint>

int main()
{
    std::array<std::uint32_t, 44> request{};
    request[0] = 1;
    request[2] = 0x12345678;
    request[3] = 0x9abcdef0;
    request[4] = 0x13572468;
    request[5] = 0x24681357;
    request[7] = 4095;
    request[8] = 60;
    request[9] = 110;
    request[10] = 6;
    request[11] = 27;
    request[12] = 1;
    request[14] = 4;
    request[19] = 100000;
    for (std::uint32_t index = 0; index < 12; ++index)
    {
        request[20 + index] = 75 + index;
        request[32 + index] = 20 + index;
    }
    assert(gen6tinyhoney_api_version() == 1);
    assert(gen6tinyhoney_begin(request.data()) == 1);
    assert(gen6tinyhoney_step(4096) == 4096);
    assert(gen6tinyhoney_result_count() > 0);
    const auto *water = reinterpret_cast<const gen6tinyhoneyResult *>(gen6tinyhoney_result_ptr());
    for (std::uint32_t index = 0; index < gen6tinyhoney_result_count(); ++index)
        assert(water[index].words[9] >= 1 && water[index].words[9] <= 5);

    request[14] = 0;
    assert(gen6tinyhoney_begin(request.data()) == 1);
    assert(gen6tinyhoney_step(4096) == 4096);
    assert(gen6tinyhoney_result_count() > 0);
    const auto *normal = reinterpret_cast<const gen6tinyhoneyResult *>(gen6tinyhoney_result_ptr());
    for (std::uint32_t index = 0; index < gen6tinyhoney_result_count(); ++index)
        assert(normal[index].words[9] >= 1 && normal[index].words[9] <= 12);
    return 0;
}
