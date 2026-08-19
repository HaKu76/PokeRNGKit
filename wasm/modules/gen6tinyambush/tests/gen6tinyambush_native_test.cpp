#include "gen6tinyambush_bridge.h"

#include <array>
#include <cassert>
#include <cstdint>

int main()
{
    std::array<std::uint32_t, 35> request{};
    request[0] = 1;
    request[2] = 0x12345678;
    request[3] = 0x9abcdef0;
    request[4] = 0x13572468;
    request[5] = 0x24681357;
    request[7] = 4095;
    request[10] = 100000;
    for (std::uint32_t index = 0; index < 12; ++index)
    {
        request[11 + index] = 22 + index;
        request[23 + index] = 57 + index % 3;
    }
    assert(gen6tinyambush_api_version() == 1);
    assert(gen6tinyambush_begin(request.data()) == 1);
    assert(gen6tinyambush_step(4096) == 4096);
    assert(gen6tinyambush_result_count() > 0);
    const auto *rows = reinterpret_cast<const gen6tinyambushResult *>(gen6tinyambush_result_ptr());
    for (std::uint32_t index = 0; index < gen6tinyambush_result_count(); ++index)
    {
        assert(rows[index].words[1] < 100);
        assert(rows[index].words[7] <= 1);
        assert(rows[index].words[8] >= 1 && rows[index].words[8] <= 12);
        assert(rows[index].words[9] <= 2);
    }
    request[8] = 1;
    request[9] = 1;
    assert(gen6tinyambush_begin(request.data()) == 1);
    assert(gen6tinyambush_step(4096) == 4096);
    for (std::uint32_t index = 0; index < gen6tinyambush_result_count(); ++index)
    {
        const auto *row = &reinterpret_cast<const gen6tinyambushResult *>(gen6tinyambush_result_ptr())[index];
        assert(row->words[7] == 1);
        assert(row->words[8] == 1);
    }
    return 0;
}
