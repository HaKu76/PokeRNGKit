#include "gen6tinytimeline_bridge.h"

#include <cassert>

int main() {
    std::uint32_t request[22] = {0x11111111U, 0x22222222U, 0x33333333U, 0x44444444U, 0, 64, 0, 1, 0, 0};
    request[16] = 6;
    request[18] = 0;
    request[19] = 0;
    request[20] = 0xffffffffU;
    request[21] = 1000;
    assert(gen6tinytimeline_api_version() == 1);
    const auto count = gen6tinytimeline_generate(request);
    assert(gen6tinytimeline_last_error() == 0);
    assert(count > 0);
    assert(gen6tinytimeline_result_count() == count);
    assert(gen6tinytimeline_processed_count() == 65);
    const auto *result = reinterpret_cast<const Gen6TinyTimelineResult *>(gen6tinytimeline_result_ptr());
    assert(result != nullptr);
    assert(result[0].words[0] == 0);
    assert(result[0].words[1] == 0xfffffffeU);
    assert(result[0].words[4] == 0x44dddddcU);
    assert(result[0].words[5] == 0x11111111U);

    request[6] = 4;
    request[16] = 6;
    request[17] = 0;
    request[18] = 0;
    assert(gen6tinytimeline_generate(request) > 0);
    result = reinterpret_cast<const Gen6TinyTimelineResult *>(gen6tinytimeline_result_ptr());
    assert(((result[0].words[9] >> 8) & 0xffU) == 4);
    assert(result[0].words[14] != 0 || result[0].words[15] != 0);

    request[6] = 0;
    request[18] = 4;
    assert(gen6tinytimeline_generate(request) > 0);
    assert(gen6tinytimeline_last_error() == 0);

    request[7] = 5;
    assert(gen6tinytimeline_generate(request) == 0);
    assert(gen6tinytimeline_last_error() == 1);
    return 0;
}
