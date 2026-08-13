#include "../bridge/gen3ngcseed_bridge.h"
#include <cassert>

int main()
{
    assert(gen3ngcseed_api_version() == 1);
    assert(gen3ngcseed_search_gales(5, 0, 0, 0, 0, 0, nullptr, 0, 0, 1) == 0);
    assert(gen3ngcseed_last_error() == 1);
    const std::uint32_t seed = 0;
    gen3ngcseed_search_gales(0, 0, 0, 0, 0, 0, &seed, 1, 0, 0);
    assert(gen3ngcseed_last_error() == 0);
    assert(gen3ngcseed_search_colo(8, 0, nullptr, 0, 0, 1) == 0);
    assert(gen3ngcseed_last_error() == 1);
    assert(gen3ngcseed_search_channel(nullptr, 9, 0x40000001, 1) == 0);
    assert(gen3ngcseed_last_error() == 1);
}
