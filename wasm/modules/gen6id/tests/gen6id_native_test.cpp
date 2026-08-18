#include "gen6id_bridge.h"

#include <cassert>

int main()
{
    std::uint32_t request[6]{0x11111111, 0x22222222, 0x33333333, 0x44444444, 0, 32};
    assert(gen6id_api_version() == 1);
    assert(gen6id_begin(request) == 1);
    assert(gen6id_step(32) == 32);
    assert(gen6id_last_error() == 0);
    assert(gen6id_result_count() == 32);
    assert(gen6id_step_processed() == 32);
    assert(gen6id_total_processed() == 32);
    assert(gen6id_done() == 1);

    const auto *result = reinterpret_cast<const Gen6IdResult *>(gen6id_result_ptr());
    assert(result != nullptr);
    assert(result[0].words[0] == 0);
    assert(result[0].words[2] == request[0]);
    assert(result[0].words[3] == request[1]);
    assert(result[0].words[4] == request[2]);
    assert(result[0].words[5] == request[3]);
    assert(result[31].words[0] == 31);
    assert(result[0].words[1] == 0x44dddddcU);
    assert((result[0].words[1] & 0xffffU) == 56796U);
    assert((result[0].words[1] >> 16) == 17629U);
    assert(((result[0].words[1] & 0xffffU) ^ (result[0].words[1] >> 16)) >> 4 == 2448U);
    assert((((result[0].words[1] & 0xffffU) ^ (result[0].words[1] >> 16)) & 0xFU) == 1U);

    request[4] = 1;
    request[5] = 1;
    assert(gen6id_begin(request) == 1);
    assert(gen6id_step(1) == 1);
    result = reinterpret_cast<const Gen6IdResult *>(gen6id_result_ptr());
    assert(result[0].words[1] == 0xff111d50U);
    assert(result[0].words[2] == 0x22222222U);
    assert(result[0].words[3] == 0x33333333U);
    assert(result[0].words[4] == 0x99999800U);
    assert(result[0].words[5] == 0x66666666U);

    request[4] = 1000000000;
    request[5] = 2;
    assert(gen6id_begin(request) == 0);
    assert(gen6id_last_error() == 1);
    return 0;
}
