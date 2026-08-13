#include "gen4chainedsid_bridge.h"

#include <array>
#include <cassert>
#include <cstdint>

int main()
{
    assert(gen4chainedsid_api_version() == 1);

    const std::array<Gen4ChainedSidPackedEntry, 3> entries = {
        Gen4ChainedSidPackedEntry { 7, 29, 18, 14, 23, 22, 22, 0, 11, 22, 22, 127 },
        Gen4ChainedSidPackedEntry { 22, 14, 23, 11, 4, 24, 22, 0, 5, 22, 22, 127 },
        Gen4ChainedSidPackedEntry { 24, 11, 4, 29, 9, 6, 22, 0, 22, 22, 22, 127 },
    };
    assert(gen4chainedsid_calculate(12345, entries.data(), entries.size()) == 1);
    assert(gen4chainedsid_result_count() == 1);
    const auto *results = reinterpret_cast<const std::uint32_t *>(gen4chainedsid_result_ptr());
    assert(results[0] == 54320);

    assert(gen4chainedsid_calculate(0x10000, entries.data(), entries.size()) == 0);
    assert(gen4chainedsid_last_error() == 1);
    return 0;
}
