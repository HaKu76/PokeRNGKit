#include "gen6tinyindex_bridge.h"

#include <cassert>

int main()
{
    std::uint32_t generator[12]{0, 0x11111111, 0x22222222, 0x33333333, 0x44444444,
                                0, 0, 1, 2000, 1, 0, 1};
    assert(gen6tinyindex_api_version() == 1);
    assert(gen6tinyindex_begin(generator) == 1);
    assert(gen6tinyindex_step(2) == 2);
    assert(gen6tinyindex_result_count() == 2);
    assert(gen6tinyindex_done() == 1);
    const auto *rows = reinterpret_cast<const Gen6TinyIndexResult *>(gen6tinyindex_result_ptr());
    assert(rows != nullptr);
    assert(rows[0].words[0] == 0);
    assert(rows[0].words[1] == 0x44dddddcU);
    assert(rows[0].words[2] == 0x22222222U);
    assert(rows[1].words[0] == 1);
    assert(rows[1].words[1] == 0xff111d50U);

    std::uint32_t date[12]{1, 0, 0, 0, 0, 111, 0, 0, 2000, 1, 0, 2};
    assert(gen6tinyindex_begin(date) == 1);
    assert(gen6tinyindex_step(2) == 2);
    rows = reinterpret_cast<const Gen6TinyIndexResult *>(gen6tinyindex_result_ptr());
    assert(rows[0].words[6] == 86400111U);
    assert(rows[0].words[7] == 86400U);
    assert(rows[1].words[0] == 0);
    assert(rows[1].words[6] == 86401111U);
    assert(gen6tinyindex_done() == 1);

    generator[7] = 10000001;
    assert(gen6tinyindex_begin(generator) == 0);
    assert(gen6tinyindex_last_error() == 1);
    return 0;
}
