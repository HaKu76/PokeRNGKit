#include "../bridge/gen7egg_bridge.h"

#include <cassert>
#include <array>
#include <cstdint>

namespace
{
    Gen7EggPackedRequest baseRequest()
    {
        Gen7EggPackedRequest request {};
        request.mode = 0;
        request.status[0] = 0x12345678;
        request.status[1] = 0x9abcdef0;
        request.status[2] = 0x0fedcba9;
        request.status[3] = 0x87654321;
        request.rangeEnd = 2;
        request.resultLimit = 100;
        request.tsv = 1234;
        request.trv = 8;
        request.maleItem = 2;
        request.femaleItem = 1;
        request.maleAbility = 0;
        request.femaleAbility = 2;
        for (int i = 0; i < 6; i++)
        {
            request.maleIvs[i] = 31;
            request.femaleIvs[i] = static_cast<std::uint32_t>(i);
            request.ivMax[i] = 31;
        }
        request.genderRatio = 126;
        request.shinyCharm = 1;
        request.masudaMethod = 1;
        request.homogeneous = 1;
        request.considerOtherTsv = 1;
        request.otherTsvMask[0] = 1U << 1;
        request.otherTsvMask[64] = 1;
        request.otherTsvMask[127] = 1U << 31;
        request.filtersDisabled = 1;
        request.shinyOnly = 1;
        request.natureMask = 0x1ffffff;
        request.hiddenPowerMask = 0xffff;
        request.perfectIvValue = 31;
        return request;
    }
}

int main()
{
    assert(gen7egg_api_version() == 1);
    auto request = baseRequest();
    assert(gen7egg_begin(&request) == 1);
    assert(gen7egg_step(3) == 3);
    assert(gen7egg_done() == 1);
    assert(gen7egg_total_processed() == 3);
    assert(gen7egg_total_results() == 3);
    assert(gen7egg_result_ptr() != 0);
    assert(gen7egg_last_error() == 0);
    const auto *results = reinterpret_cast<const Gen7EggPackedResult *>(gen7egg_result_ptr());
    const auto &first = results[0];
    assert(first.frame == 0);
    assert(first.eggNumber == 0);
    assert((std::array<std::uint32_t, 4> { first.state[0], first.state[1], first.state[2], first.state[3] } ==
            std::array<std::uint32_t, 4> { 0x12345678, 0x9abcdef0, 0x0fedcba9, 0x87654321 }));
    assert((std::array<std::uint32_t, 4> { first.afterState[0], first.afterState[1], first.afterState[2],
                                          first.afterState[3] } ==
            std::array<std::uint32_t, 4> { 0xb19eaee1, 0xd5e70aa9, 0xc8c43680, 0x675e5811 }));
    assert(first.random == 0xe1cdd550);
    assert(first.ec == 0xda924146);
    assert(first.pid == 0xa602f7b5);
    const std::array<std::uint32_t, 6> expectedIvs = { 31, 1, 2, 31, 4, 26 };
    for (int i = 0; i < 6; i++) assert(((first.ivs >> (i * 5)) & 0x1f) == expectedIvs[i]);
    assert((first.metadata & 0x1f) == 6);
    assert(((first.metadata >> 5) & 0x3) == 3);
    assert(((first.metadata >> 7) & 0x3) == 1);
    assert(((first.metadata >> 9) & 0xf) == 4);
    assert(((first.metadata >> 13) & 1) == 0);
    assert(((first.metadata >> 15) & 0x3) == 2);
    assert(((first.metadata >> 17) & 0x3) == 2);
    assert(first.framesUsed == 33);
    assert(first.inheritedMaleMask == 9);
    assert(first.inheritedFemaleMask == 22);
    assert(first.psv == 1307);
    assert(first.prv == 7);

    request.mode = 1;
    request.rangeStart = 1;
    request.rangeEnd = 5;
    request.targetFrame = 50;
    assert(gen7egg_begin(&request) == 1);
    assert(gen7egg_step(5) == 5);
    assert(gen7egg_done() == 1);
    assert(gen7egg_target_found() == 1);
    assert(gen7egg_summary_accepts() == 1);
    assert(gen7egg_summary_rejects() == 17);

    request.mode = 2;
    request.rangeStart = 0;
    request.rangeEnd = 0;
    request.targetFrame = 50;
    assert(gen7egg_begin(&request) == 1);
    while (gen7egg_done() == 0) gen7egg_step(16);
    assert(gen7egg_target_found() == 1);
    assert(gen7egg_summary_accepts() == 1);
    assert(gen7egg_summary_rejects() == 10);
    assert(gen7egg_total_processed() == 51);
    assert(gen7egg_total_results() == 12);
    assert(gen7egg_result_count() == 12);
    results = reinterpret_cast<const Gen7EggPackedResult *>(gen7egg_result_ptr());
    const std::array<std::uint32_t, 12> expectedPath = { 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 50 };
    for (std::size_t i = 0; i < expectedPath.size(); i++) assert(results[i].frame == expectedPath[i]);
    assert(((results[0].metadata >> 19) & 0x3) == 2);
    assert(((results[10].metadata >> 19) & 0x3) == 1);
    assert(((results[11].metadata >> 19) & 0x3) == 1);

    request.maleItem = 9;
    assert(gen7egg_begin(&request) == 0);
    assert(gen7egg_last_error() == 1);

    request = baseRequest();
    request.genderRatio = 0;
    request.homogeneous = 0;
    assert(gen7egg_begin(&request) == 0);
    request.femaleIsDitto = 1;
    assert(gen7egg_begin(&request) == 1);

    request = baseRequest();
    request.mode = 2;
    request.targetFrame = 5'000'001;
    assert(gen7egg_begin(&request) == 0);
    assert(gen7egg_last_error() == 1);
    return 0;
}
