#include "gen5ivcache_bridge.h"

#include <cassert>

int main()
{
    assert(gen5ivcache_search(0, 5, 0, 0x10000) == 0);
    assert(gen5ivcache_last_error() == 2);
    assert(gen5ivcache_result_count() == 0);
    assert(gen5ivcache_processed_count() < 0x10000);
    return 0;
}
