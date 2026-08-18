#include "gen6stationary_bridge.h"

#include <algorithm>
#include <array>
#include <cassert>
#include <cstdint>
#include <iostream>

namespace {
constexpr std::size_t requestWords = 49;
constexpr std::size_t resultWords = 16;

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

std::array<std::uint32_t, requestWords> baseRequest() {
    std::array<std::uint32_t, requestWords> request{};
    request[Seed] = 0x12345678U;
    request[Count] = 1;
    request[SyncNature] = 255;
    request[BankTarget] = 1;
    request[Species] = 377;
    request[GenderRatio] = 255;
    request[Nature] = 255;
    request[NumPokemon] = 1;
    request[OtTsv] = 0xffffffffU;
    request[FiltersDisabled] = 1;
    request[ShinyMask] = 7;
    request[GenderFilter] = 255;
    request[AbilityFilter] = 255;
    request[NatureMask] = 0x1ffffffU;
    request[PowerMask] = 0xffffU;
    request[PerfectValue] = 31;
    request[ResultLimit] = 100;
    for (std::size_t i = 0; i < 6; ++i) {
        request[FixedIvs + i] = 0xffffffffU;
        request[IvMin + i] = 0;
        request[IvMax + i] = 31;
    }
    return request;
}

const std::uint32_t *row(std::size_t index = 0) {
    return reinterpret_cast<const std::uint32_t *>(
               gen6stationary_result_ptr()) +
           index * resultWords;
}

std::uint8_t metadata(std::size_t shift, std::uint32_t mask) {
    return static_cast<std::uint8_t>((row()[4] >> shift) & mask);
}

std::uint8_t iv(std::size_t index) {
    const std::uint32_t packed = row()[index < 4 ? 5 : 6];
    return static_cast<std::uint8_t>(
        (packed >> ((index < 4 ? index : index - 4) * 8)) & 0xffU);
}

std::uint32_t genderList(std::initializer_list<std::uint8_t> values) {
    std::uint32_t encoded = 0;
    std::uint32_t multiplier = 1;
    for (const auto value : values) {
        encoded += value * multiplier;
        multiplier *= 3;
    }
    return encoded;
}

std::uint32_t perfectIvs() {
    std::uint32_t count = 0;
    for (std::size_t index = 0; index < 6; ++index) {
        count += iv(index) == 31 ? 1U : 0U;
    }
    return count;
}

void generate(const std::array<std::uint32_t, requestWords> &request,
              std::uint32_t expectedCount = 1) {
    const auto count = gen6stationary_generate(request.data());
    if (count != expectedCount) {
        std::cerr << "count=" << count
                  << " error=" << gen6stationary_last_error()
                  << " processed=" << gen6stationary_processed_count() << '\n';
    }
    assert(count == expectedCount);
    assert(gen6stationary_result_count() == expectedCount);
    assert(expectedCount == 0 || gen6stationary_result_ptr() != 0);
}
} // namespace

int main() {
    assert(gen6stationary_api_version() == 2);
    assert(gen6stationary_generate(nullptr) == 0);
    assert(gen6stationary_last_error() == 1);

    auto request = baseRequest();
    generate(request);
    std::array<std::uint32_t, resultWords> baseline{};
    std::copy_n(row(), resultWords, baseline.begin());
    assert(row()[0] == 0);
    assert(row()[8] == 70);
    assert(metadata(15, 1) == 0);
    generate(request);
    assert(std::equal(baseline.begin(), baseline.end(), row()));

    request = baseRequest();
    request[AlwaysSync] = 1;
    request[SyncNature] = 9;
    request[Ability] = 1;
    request[GenderRatio] = 254;
    generate(request);
    assert(row()[8] == 8);
    assert(metadata(0, 31) == 9);
    assert(metadata(5, 3) == 1);
    assert(metadata(7, 3) == 2);
    assert(metadata(15, 1) == 1);

    request = baseRequest();
    request[AssumeSync] = 1;
    request[SyncNature] = 13;
    generate(request);
    assert(metadata(0, 31) == 13);
    assert(metadata(15, 1) == 1);
    assert(row()[8] == 69);

    request = baseRequest();
    request[AlwaysSync] = 1;
    request[Ability] = 1;
    request[Nature] = 0;
    for (std::size_t i = 0; i < 6; ++i) {
        request[FixedIvs + i] = 0;
    }
    request[FixedIvs + 3] = 1;
    generate(request);
    assert(metadata(9, 15) == 3);
    assert(row()[8] == 2);

    request = baseRequest();
    generate(request);
    const std::uint32_t pid = row()[3];
    const std::uint32_t xorValue = (pid >> 16) ^ (pid & 0xffffU);
    request[Tsv] = xorValue >> 4;
    request[Trv] = xorValue & 15U;
    generate(request);
    assert(metadata(13, 3) == 2);
    request[Trv] = (request[Trv] + 1) & 15U;
    generate(request);
    assert(metadata(13, 3) == 1);
    request[ShinyLocked] = 1;
    generate(request);
    assert(row()[3] == (pid ^ 0x10000000U));
    assert(metadata(13, 3) == 0);

    request = baseRequest();
    request[PerfectIvCount] = 3;
    generate(request);
    assert(perfectIvs() == 3);

    request = baseRequest();
    request[AlwaysSync] = 1;
    request[Bank] = 1;
    request[NumPokemon] = 3;
    request[BankTarget] = 1;
    request[Ability] = 3;
    generate(request);
    const auto firstTargetEc = row()[2];
    request[BankTarget] = 2;
    generate(request);
    const auto secondTargetEc = row()[2];
    request[BankTarget] = 3;
    generate(request);
    const auto thirdTargetEc = row()[2];
    assert(firstTargetEc != secondTargetEc);
    assert(secondTargetEc != thirdTargetEc);
    assert(row()[8] == 9);

    request = baseRequest();
    request[AlwaysSync] = 1;
    request[Bank] = 1;
    request[NumPokemon] = 20;
    request[BankTarget] = 2;
    request[PerfectIvCount] = 3;
    request[Ability] = 3;
    request[BankGenderList] = genderList({0});
    generate(request);
    const auto fixedGenderEc = row()[2];
    request[BankGenderList] = genderList({1});
    generate(request);
    const auto randomGenderEc = row()[2];
    request[BankGenderList] = genderList({2});
    generate(request);
    const auto mewEc = row()[2];
    assert(fixedGenderEc != randomGenderEc);
    assert(randomGenderEc != mewEc);

    request[PerfectIvCount] = 5;
    generate(request);
    assert(perfectIvs() == 5);

    request = baseRequest();
    request[Count] = 3;
    request[ResultLimit] = 2;
    generate(request, 2);
    assert(gen6stationary_processed_count() == 2);
    assert(gen6stationary_limit_reached() == 1);

    request = baseRequest();
    request[BankGenderList] = 3486784401U;
    generate(request, 0);
    assert(gen6stationary_last_error() == 1);
    request = baseRequest();
    request[IvMin] = 32;
    generate(request, 0);
    assert(gen6stationary_last_error() == 1);

    std::cout << "gen6stationary_native_parity: 12/12\n";
    return 0;
}
