#include "gen7battletree_bridge.h"

#include <cassert>
#include <cstdint>

int main()
{
    assert(gen7battletree_api_version() == 1);

    Gen7BattleTreePackedRequest request {
        0x12345678U,
        418,
        422,
        0,
        0,
        0,
        1,
        254,
        100,
    };
    assert(gen7battletree_begin(&request) == 1);
    assert(gen7battletree_step(32) == 5);
    assert(gen7battletree_total_processed() == 5);
    assert(gen7battletree_total_results() == 5);
    assert(gen7battletree_done() == 1);
    const auto *results = reinterpret_cast<const Gen7BattleTreePackedResult *>(gen7battletree_result_ptr());
    assert(results != nullptr);
    constexpr Gen7BattleTreePackedResult expected[] {
        { 418, 422, 0, 0xcd3d5e71U, 0x662ef8bbU, 45, 0 },
        { 419, 423, 2, 0xaa99d08eU, 0xb55ba669U, 22, 0 },
        { 420, 424, 4, 0xc131f9ffU, 0x47acc346U, 14, 0 },
        { 421, 425, 6, 0x4e769f38U, 0xd36d2f2bU, 13, 0 },
        { 422, 426, 8, 0x853332cfU, 0xe0798ecaU, 33, 0 },
    };
    for (std::uint32_t i = 0; i < 5; i++)
    {
        assert(results[i].frame == expected[i].frame);
        assert(results[i].actualFrame == expected[i].actualFrame);
        assert(results[i].realTimeFrames == expected[i].realTimeFrames);
        assert(results[i].randomLow == expected[i].randomLow);
        assert(results[i].randomHigh == expected[i].randomHigh);
        assert(results[i].trainerId == expected[i].trainerId);
        assert(results[i].blink == expected[i].blink);
    }

    request.streak = 10;
    request.version = 2;
    request.minFrame = request.maxFrame = 478;
    assert(gen7battletree_begin(&request) == 1);
    assert(gen7battletree_step(1) == 1);
    results = reinterpret_cast<const Gen7BattleTreePackedResult *>(gen7battletree_result_ptr());
    assert(results[0].trainerId >= 192 && results[0].trainerId <= 205);

    request.trainerFilter = 0;
    assert(gen7battletree_begin(&request) == 1);
    gen7battletree_step(1);
    assert(gen7battletree_total_results() == 0);

    request.trainerFilter = 254;
    request.streak = 0;
    assert(gen7battletree_begin(&request) == 0);
    assert(gen7battletree_last_error() == 1);

    request.streak = 1;
    request.maxFrame = 5000001;
    assert(gen7battletree_begin(&request) == 0);
    assert(gen7battletree_last_error() == 1);
}
