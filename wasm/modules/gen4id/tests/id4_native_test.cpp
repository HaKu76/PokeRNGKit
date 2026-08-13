#include "gen4id_bridge.h"

#include <cassert>
#include <cstdint>

int main()
{
    assert(gen4id_api_version() == 1);

    const std::uint32_t tid = 12345;
    std::uint32_t generatedCount = 0;
    Gen4IdPackedState firstGenerated {};
    Gen4IdPackedState lastGenerated {};
    for (std::uint32_t second = 0; second < 60; second++)
    {
        generatedCount += gen4id_generate(second, 5000, 7000, 2000, 1, 1, 0, 0, 1, &tid, 1);
        const auto *batch = reinterpret_cast<const Gen4IdPackedState *>(gen4id_result_ptr());
        if (gen4id_result_count() != 0)
        {
            if (firstGenerated.seed == 0) firstGenerated = batch[0];
            lastGenerated = batch[gen4id_result_count() - 1];
        }
    }
    assert(generatedCount == 2);
    assert(firstGenerated.seed == 167778999 && firstGenerated.delay == 6839 && firstGenerated.seconds == 9);
    assert(firstGenerated.tid == 12345 && firstGenerated.sid == 48356 && firstGenerated.tsv == 4507);
    assert(lastGenerated.seed == 419437345 && lastGenerated.delay == 6945 && lastGenerated.seconds == 24);

    std::uint32_t searchedCount = 0;
    Gen4IdPackedState firstSearched {};
    Gen4IdPackedState lastSearched {};
    for (std::uint32_t delay = 5000; delay <= 6000; delay += 16)
    {
        const auto maximum = delay > 5984 ? 6000 : delay + 15;
        searchedCount += gen4id_search(delay, maximum, 2000, 1, &tid, 1);
        const auto *batch = reinterpret_cast<const Gen4IdPackedState *>(gen4id_result_ptr());
        if (gen4id_result_count() != 0)
        {
            if (firstSearched.seed == 0) firstSearched = batch[0];
            lastSearched = batch[gen4id_result_count() - 1];
        }
    }
    assert(searchedCount == 100);
    assert(firstSearched.seed == 4278719391U && firstSearched.delay == 5023);
    assert(firstSearched.tid == 12345 && firstSearched.sid == 16333 && firstSearched.tsv == 510);
    assert(lastSearched.seed == 1963595617U);

    assert(gen4id_generate(60, 5000, 7000, 2000, 1, 1, 0, 0, 0, nullptr, 0) == 0);
    assert(gen4id_last_error() == 1);
    return 0;
}
