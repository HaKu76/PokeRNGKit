#include "gen6event_bridge.h"

#include <array>
#include <cassert>
#include <cstdint>
#include <iostream>

namespace {
constexpr std::size_t kRequestWords = 54;
constexpr std::size_t kResultWords = 16;
constexpr std::size_t kSeed = 0;
constexpr std::size_t kMinFrame = 1;
constexpr std::size_t kCount = 2;
constexpr std::size_t kDelay = 3;
constexpr std::size_t kConsiderDelay = 4;
constexpr std::size_t kTsv = 5;
constexpr std::size_t kTrv = 6;
constexpr std::size_t kIsOras = 7;
constexpr std::size_t kYourId = 8;
constexpr std::size_t kPidType = 11;
constexpr std::size_t kTid = 12;
constexpr std::size_t kSid = 13;
constexpr std::size_t kEc = 14;
constexpr std::size_t kPid = 15;
constexpr std::size_t kAbilityLocked = 16;
constexpr std::size_t kAbility = 17;
constexpr std::size_t kNatureLocked = 18;
constexpr std::size_t kNature = 19;
constexpr std::size_t kGenderLocked = 20;
constexpr std::size_t kGender = 21;
constexpr std::size_t kGenderRatio = 22;
constexpr std::size_t kSpecies = 23;
constexpr std::size_t kForm = 24;
constexpr std::size_t kLevel = 25;
constexpr std::size_t kPerfectIvCount = 26;
constexpr std::size_t kFixedIvs = 27;
constexpr std::size_t kFiltersDisabled = 33;
constexpr std::size_t kShinyMask = 34;
constexpr std::size_t kGenderFilter = 35;
constexpr std::size_t kAbilityFilter = 36;
constexpr std::size_t kNatureMask = 37;
constexpr std::size_t kPowerMask = 38;
constexpr std::size_t kIvMin = 39;
constexpr std::size_t kIvMax = 45;
constexpr std::size_t kPerfectValue = 51;
constexpr std::size_t kPerfectCount = 52;
constexpr std::size_t kResultLimit = 53;

std::array<std::uint32_t, kRequestWords> request() {
    std::array<std::uint32_t, kRequestWords> value{};
    value[kCount] = 2;
    value[kTsv] = 0;
    value[kTrv] = 0;
    value[kSpecies] = 25;
    value[kGenderRatio] = 126;
    value[kLevel] = 50;
    value[kNature] = 0;
    value[kNatureMask] = 0x1ffffff;
    value[kPowerMask] = 0xffff;
    value[kGenderFilter] = 255;
    value[kAbilityFilter] = 255;
    value[kResultLimit] = 100;
    for (std::size_t i = 0; i < 6; ++i) {
        value[kFixedIvs + i] = 0xffffffffU;
        value[kIvMin + i] = 0;
        value[kIvMax + i] = 31;
    }
    value[kFiltersDisabled] = 1;
    value[kShinyMask] = 7;
    value[kPerfectValue] = 31;
    return value;
}

const std::uint32_t *results() {
    return reinterpret_cast<const std::uint32_t *>(gen6event_result_ptr());
}
} // namespace

int main() {
    assert(gen6event_api_version() == 1);
    assert(gen6event_generate(nullptr) == 0);
    assert(gen6event_last_error() == 1);

    auto xy = request();
    xy[kSeed] = 0;
    xy[kMinFrame] = 0;
    assert(gen6event_generate(xy.data()) == 2);
    assert(gen6event_last_error() == 0);
    assert(gen6event_processed_count() == 2);
    assert(gen6event_result_count() == 2);
    assert(results()[0] == 0);
    assert(results()[1 * kResultWords] == 1);
    assert(results()[1] == 0x8c7f0aacU);
    const auto xyEc = results()[2];

    auto oras = xy;
    oras[kIsOras] = 1;
    assert(gen6event_generate(oras.data()) == 2);
    assert(gen6event_processed_count() == 2);
    assert(results()[0] == 0);
    assert(results()[2] != xyEc);

    auto locked = xy;
    locked[kCount] = 1;
    locked[kEc] = 0x12345678U;
    locked[kPidType] = 3;
    locked[kPid] = 0x12340056U;
    locked[kAbilityLocked] = 1;
    locked[kAbility] = 2;
    locked[kNatureLocked] = 1;
    locked[kNature] = 7;
    locked[kGenderLocked] = 1;
    locked[kGender] = 1;
    locked[kPerfectIvCount] = 2;
    locked[kFixedIvs] = 31;
    locked[kFixedIvs + 1] = 30;
    assert(gen6event_generate(locked.data()) == 1);
    const auto *lockedResult = results();
    assert(lockedResult[2] == 0x12345678U);
    assert(lockedResult[3] == 0x12340056U);
    assert((lockedResult[4] & 31U) == 7);
    assert(((lockedResult[4] >> 5) & 3U) == 2);
    assert(((lockedResult[4] >> 7) & 3U) == 1);
    assert((lockedResult[5] & 0xffU) == 31U);
    assert(((lockedResult[5] >> 8) & 0xffU) == 30U);

    auto limited = xy;
    limited[kCount] = 4;
    limited[kResultLimit] = 2;
    assert(gen6event_generate(limited.data()) == 2);
    assert(gen6event_processed_count() == 2);
    assert(gen6event_limit_reached() == 1);

    auto invalid = xy;
    invalid[kSpecies] = 722;
    assert(gen6event_generate(invalid.data()) == 0);
    assert(gen6event_last_error() == 1);

    std::cout << "gen6event_native_parity: 6/6\n";
    return 0;
}
