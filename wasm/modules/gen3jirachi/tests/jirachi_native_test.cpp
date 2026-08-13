#include "../bridge/gen3jirachi_bridge.h"

#include <cassert>

int main()
{
    assert(gen3jirachi_api_version() == 1);
    assert(gen3jirachi_compute_seed(4116922500u) == 1670004433u);

    assert(gen3jirachi_calculate(0, 0, 0, 0) == 0);
    assert(gen3jirachi_target_advances() == 16);
    assert(gen3jirachi_last_error() == 1);

    const std::uint32_t computedTarget = gen3jirachi_compute_seed(0);
    assert(gen3jirachi_calculate(computedTarget, 0, 0, 0) == 0);
    assert(gen3jirachi_target_advances() == 0);
    assert(gen3jirachi_last_error() == 2);
    return 0;
}
