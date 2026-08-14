#include "gen5ivcache_bridge.h"

#include <cassert>
#include <cstdint>

int main()
{
    assert(gen5ivcache_api_version() == 1);
    assert(gen5ivcache_search(0, 5, 0, 0) == 0);
    assert(gen5ivcache_last_error() == 1);
    assert(gen5ivcache_search(0, 21, 0, 1) == 0);
    assert(gen5ivcache_last_error() == 1);
    assert(gen5ivcache_search(1, 0, 0, 1) == 0);
    assert(gen5ivcache_last_error() == 1);
    gen5ivcache_search(0, 20, 0xffffffff, 1);
    assert(gen5ivcache_last_error() == 0);
    assert(gen5ivcache_processed_count() == 1);
    assert(gen5ivcache_search(0, 5, 0xffffffff, 2) == 0);
    assert(gen5ivcache_last_error() == 1);
    gen5ivcache_search(0, 0, 0xffffffff, 1);
    assert(gen5ivcache_last_error() == 0);
    assert(gen5ivcache_processed_count() == 1);

    const std::uint32_t resultCount = gen5ivcache_search(0, 5, 0, 0x10000);
    assert(gen5ivcache_last_error() == 0);
    assert(gen5ivcache_processed_count() == 0x10000);
    assert(resultCount == gen5ivcache_result_count());
    constexpr Gen5IvCachePackedHit expected[] = {
        { 2, 1, 26324 },
        { 0, 4, 26708 },
        { 1, 0, 33431 },
        { 0, 8, 34202 },
        { 1, 2, 44681 },
        { 1, 5, 53735 },
        { 0, 1, 56872 },
    };
    assert(resultCount == sizeof(expected) / sizeof(expected[0]));
    const auto *hits = reinterpret_cast<const Gen5IvCachePackedHit *>(gen5ivcache_result_ptr());
    for (std::uint32_t index = 0; index < resultCount; index++)
    {
        assert(hits[index].type == expected[index].type);
        assert(hits[index].advanceIndex == expected[index].advanceIndex);
        assert(hits[index].seed == expected[index].seed);
    }

    return 0;
}
