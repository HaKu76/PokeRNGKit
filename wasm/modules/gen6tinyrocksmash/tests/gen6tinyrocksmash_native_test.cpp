#include "gen6tinyrocksmash_bridge.h"

#include <cassert>
#include <array>
#include <cstdint>

int main()
{
    std::uint32_t request[27] = {
        1, 0, 0x12345678, 0x9abcdef0, 0x13572468, 0x24681357,
        0, 3, 60, 300, 1, 0, 0, 0, 0, 0, 10,
        75, 74, 299, 74, 299, 10, 11, 10, 12, 12,
    };
    assert(gen6tinyrocksmash_api_version() == 1);
    assert(gen6tinyrocksmash_begin(request) == 1);
    assert(gen6tinyrocksmash_step(4) > 0);
    assert(gen6tinyrocksmash_result_count() > 0);
    assert(gen6tinyrocksmash_result_ptr() != 0);
    assert(gen6tinyrocksmash_total_processed() <= 4);
    const auto *first = reinterpret_cast<const Gen6TinyRockSmashResult *>(gen6tinyrocksmash_result_ptr());
    assert(first[0].words[1] == 0x362fbecbU);

    request[7] = 4095;
    request[15] = 0;
    request[16] = 100000;
    assert(gen6tinyrocksmash_begin(request) == 1);
    assert(gen6tinyrocksmash_step(4096) == 4096);
    const auto *unfiltered = reinterpret_cast<const Gen6TinyRockSmashResult *>(gen6tinyrocksmash_result_ptr());
    const auto unfilteredCount = gen6tinyrocksmash_result_count();
    assert(unfilteredCount == 4096);
    std::array<bool, 5> observed{};
    for (std::uint32_t index = 0; index < unfilteredCount; ++index)
    {
        const auto slot = unfiltered[index].words[9];
        assert(slot >= 1 && slot <= 5);
        observed[slot - 1] = true;
    }
    for (const auto value : observed) assert(value);

    for (std::uint32_t slot = 1; slot <= 5; ++slot)
    {
        request[15] = 1U << (slot - 1);
        assert(gen6tinyrocksmash_begin(request) == 1);
        assert(gen6tinyrocksmash_step(4096) == 4096);
        const auto *filtered = reinterpret_cast<const Gen6TinyRockSmashResult *>(gen6tinyrocksmash_result_ptr());
        const auto filteredCount = gen6tinyrocksmash_result_count();
        assert(filteredCount > 0);
        for (std::uint32_t index = 0; index < filteredCount; ++index)
            assert(filtered[index].words[9] == slot);
    }
    return 0;
}
