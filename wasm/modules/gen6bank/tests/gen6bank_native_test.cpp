#include "gen6bank_bridge.h"

#include <array>
#include <cassert>
#include <cstdint>
#include <limits>

namespace {
constexpr std::size_t requestWords = 49;
enum Index : std::size_t {
    Seed,
    MinFrame,
    Count,
    Delay,
    ConsiderDelay,
    Tsv,
    Trv,
    ShinyCharm,
    SyncNature,
    PerfectIvCount,
    AlwaysSync,
    ShinyLocked,
    AssumeSync,
    Bank,
    BankTarget,
    Species,
    GenderRatio,
    Ability,
    Nature,
    NumPokemon,
    OtTsv,
    FixedIvs,
    FiltersDisabled = 27,
    ShinyMask,
    GenderFilter,
    AbilityFilter,
    NatureMask,
    PowerMask,
    IvMin,
    IvMax = 39,
    PerfectValue = 45,
    PerfectCount,
    ResultLimit,
    BankGenderList,
};

std::array<std::uint32_t, requestWords> request() {
    std::array<std::uint32_t, requestWords> value{};
    value[Seed] = 0x12345678U;
    value[MinFrame] = 0;
    value[Count] = 8;
    value[Delay] = 16;
    value[ConsiderDelay] = 1;
    value[Tsv] = 0;
    value[Trv] = 0;
    value[SyncNature] = 255;
    value[AlwaysSync] = 1;
    value[Bank] = 1;
    value[BankTarget] = 2;
    value[Species] = 151;
    value[GenderRatio] = 255;
    value[Ability] = 1;
    value[Nature] = 255;
    value[NumPokemon] = 20;
    value[OtTsv] = std::numeric_limits<std::uint32_t>::max();
    for (std::size_t i = 0; i < 6; ++i) {
        value[FixedIvs + i] = std::numeric_limits<std::uint32_t>::max();
        value[IvMin + i] = 0;
        value[IvMax + i] = 31;
    }
    value[ShinyMask] = 7;
    value[GenderFilter] = 255;
    value[AbilityFilter] = 255;
    value[NatureMask] = 0x1ffffffU;
    value[PowerMask] = 0xffffU;
    value[PerfectValue] = 31;
    value[ResultLimit] = 100;
    value[BankGenderList] = 2;
    return value;
}
} // namespace

int main() {
    assert(gen6bank_api_version() == 2);
    assert(gen6bank_generate(nullptr) == 0);
    assert(gen6bank_last_error() == 1);

    auto first = request();
    auto nonBank = first;
    nonBank[Bank] = 0;
    assert(gen6bank_generate(nonBank.data()) == 0);
    assert(gen6bank_last_error() == 1);

    const auto firstCount = gen6bank_generate(first.data());
    assert(firstCount > 0);
    assert(firstCount == gen6bank_result_count());
    const auto *firstResults = reinterpret_cast<const std::uint32_t *>(
        gen6bank_result_ptr());
    assert(firstResults != nullptr);
    const auto firstFrame = firstResults[0];

    const auto secondCount = gen6bank_generate(first.data());
    assert(secondCount == firstCount);
    const auto *secondResults = reinterpret_cast<const std::uint32_t *>(
        gen6bank_result_ptr());
    assert(secondResults[0] == firstFrame);
    assert(gen6bank_processed_count() == first[Count]);
    return 0;
}
