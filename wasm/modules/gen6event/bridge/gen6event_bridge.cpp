/*
 * PokeRNGKit Gen VI Event WebAssembly bridge.
 * Adapted from 3DSRNGTool Event6, EventRNG and MersenneTwister.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#include "gen6event_bridge.h"

#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>
#include <vector>

#include "gen6_event_personal.inc"

namespace {
constexpr std::uint32_t apiVersion = 1;
constexpr std::uint32_t maxResults = 100000;
constexpr std::uint32_t maxFrame = 1000000000;
constexpr std::size_t streamPadding = 64;

enum Index : std::size_t {
    Seed,
    MinFrame,
    Count,
    Delay,
    ConsiderDelay,
    Tsv,
    Trv,
    IsOras,
    YourId,
    IsEgg,
    OtherInfo,
    PidType,
    Tid,
    Sid,
    Ec,
    Pid,
    AbilityLocked,
    Ability,
    NatureLocked,
    Nature,
    GenderLocked,
    Gender,
    GenderRatio,
    Species,
    Form,
    Level,
    PerfectIvCount,
    FixedIvs,
    FiltersDisabled = 33,
    ShinyMask,
    GenderFilter,
    AbilityFilter,
    NatureMask,
    PowerMask,
    IvMin,
    IvMax = 45,
    PerfectValue = 51,
    PerfectCount,
    ResultLimit,
};

struct Packed {
    std::uint32_t frame;
    std::uint32_t random;
    std::uint32_t ec;
    std::uint32_t pid;
    std::uint32_t metadata;
    std::uint32_t iv0;
    std::uint32_t iv1;
    std::uint32_t delay;
    std::uint32_t frameUsed;
    std::uint32_t psv;
    std::uint32_t prv;
    std::uint32_t reserved0;
    std::uint32_t reserved1;
    std::uint32_t reserved2;
    std::uint32_t reserved3;
    std::uint32_t reserved4;
};

struct State {
    std::uint32_t frame = 0;
    std::uint32_t random = 0;
    std::uint32_t ec = 0;
    std::uint32_t pid = 0;
    std::uint32_t psv = 0;
    std::uint32_t prv = 0;
    std::uint32_t delay = 0;
    std::uint32_t frameUsed = 0;
    std::array<std::uint8_t, 6> ivs{};
    std::uint8_t nature = 0;
    std::uint8_t ability = 0;
    std::uint8_t gender = 0;
    std::uint8_t hiddenPower = 0;
    std::uint8_t shiny = 0;
};

thread_local std::vector<Packed> results;
thread_local std::uint32_t processed = 0;
thread_local std::uint32_t error = 0;
thread_local bool limited = false;

class MersenneTwister {
    static constexpr std::size_t stateSize = 624;
    static constexpr std::size_t period = 397;
    static constexpr std::uint32_t matrixA = 0x9908b0dfU;
    static constexpr std::uint32_t upperMask = 0x80000000U;
    static constexpr std::uint32_t lowerMask = 0x7fffffffU;
    std::array<std::uint32_t, stateSize> state{};
    std::size_t index = 0;

public:
    explicit MersenneTwister(std::uint32_t seed) {
        state[0] = seed;
        for (std::size_t i = 1; i < stateSize; ++i)
            state[i] = 1812433253U * (state[i - 1] ^ (state[i - 1] >> 30)) +
                       static_cast<std::uint32_t>(i);
    }

    std::uint32_t next() {
        const std::size_t nextIndex = index + 1 == stateSize ? 0 : index + 1;
        const std::size_t periodIndex =
            index + period < stateSize ? index + period : index + period - stateSize;
        const std::uint32_t combined =
            (state[index] & upperMask) | (state[nextIndex] & lowerMask);
        state[index] = state[periodIndex] ^ (combined >> 1) ^
                       ((combined & 1U) != 0 ? matrixA : 0U);
        std::uint32_t value = state[index];
        value ^= value >> 11;
        value ^= (value << 7) & 0x9d2c5680U;
        value ^= (value << 15) & 0xefc60000U;
        value ^= value >> 18;
        index = nextIndex;
        return value;
    }
};

std::uint32_t randRange(std::uint32_t value, std::uint32_t maximum) {
    return static_cast<std::uint32_t>(
        (static_cast<std::uint64_t>(value) * maximum) >> 32);
}

std::uint8_t hiddenPower(const std::array<std::uint8_t, 6> &ivs) {
    constexpr std::array<std::uint8_t, 6> reorder = {0, 1, 2, 4, 5, 3};
    std::uint32_t bits = 0;
    for (std::size_t i = 0; i < ivs.size(); ++i)
        bits += static_cast<std::uint32_t>(ivs[i] & 1U) << reorder[i];
    return static_cast<std::uint8_t>((bits * 15) / 63);
}

bool valid(const std::uint32_t *request) {
    if (request == nullptr) return false;
    const auto frameEnd = static_cast<std::uint64_t>(request[MinFrame]) + request[Count];
    if (request[Count] == 0 || frameEnd > static_cast<std::uint64_t>(maxFrame) + 1 ||
        request[Delay] > 4000 || request[ConsiderDelay] > 1 || request[Tsv] > 4095 ||
        request[Trv] > 15 || request[IsOras] > 1 || request[YourId] > 1 ||
        request[IsEgg] > 1 || request[OtherInfo] > 1 || request[PidType] > 3 ||
        request[AbilityLocked] > 1 || request[Ability] > 3 || request[NatureLocked] > 1 ||
        request[Nature] > 24 || request[GenderLocked] > 1 || request[Gender] > 2 ||
        request[GenderRatio] > 255 || request[Species] > 721 ||
        request[Form] >= gen6EventSpecies[request[Species]].formCount || request[Level] > 100 ||
        request[PerfectIvCount] > 5 || request[FiltersDisabled] > 1 ||
        request[ShinyMask] > 7 || request[GenderFilter] != 255 && request[GenderFilter] > 2 ||
        request[AbilityFilter] != 255 && request[AbilityFilter] > 3 || request[NatureMask] == 0 ||
        request[NatureMask] > 0x1ffffffU || request[PowerMask] == 0 || request[PowerMask] > 0xffffU ||
        request[PerfectValue] > 31 || request[PerfectCount] > 6 || request[ResultLimit] == 0 ||
        request[ResultLimit] > maxResults)
        return false;
    std::uint32_t randomSlots = 0;
    for (std::size_t i = 0; i < 6; ++i) {
        const auto fixed = request[FixedIvs + i];
        if (fixed == 0xffffffffU)
            ++randomSlots;
        else if (fixed > 31)
            return false;
        if (request[IvMin + i] > request[IvMax + i] || request[IvMax + i] > 31)
            return false;
    }
    return request[PerfectIvCount] <= randomSlots;
}

bool passes(const std::uint32_t *request, const State &state) {
    if (request[FiltersDisabled] != 0) return true;
    if ((request[ShinyMask] & (1U << state.shiny)) == 0 ||
        (request[GenderFilter] != 255 && request[GenderFilter] != state.gender) ||
        (request[AbilityFilter] != 255 && request[AbilityFilter] != state.ability) ||
        (request[NatureMask] & (1U << state.nature)) == 0 ||
        (request[PowerMask] & (1U << state.hiddenPower)) == 0)
        return false;
    const auto perfect = std::count_if(
        state.ivs.begin(), state.ivs.end(), [&](std::uint8_t value) {
            return value >= request[PerfectValue];
        });
    if (perfect < static_cast<int>(request[PerfectCount])) return false;
    for (std::size_t i = 0; i < 6; ++i)
        if (state.ivs[i] < request[IvMin + i] || state.ivs[i] > request[IvMax + i])
            return false;
    return true;
}

Packed pack(const State &state) {
    const auto metadata = state.nature | (static_cast<std::uint32_t>(state.ability) << 5) |
                           (static_cast<std::uint32_t>(state.gender) << 7) |
                           (static_cast<std::uint32_t>(state.hiddenPower) << 9) |
                           (static_cast<std::uint32_t>(state.shiny) << 13);
    std::uint32_t iv0 = 0;
    std::uint32_t iv1 = 0;
    for (std::size_t i = 0; i < 4; ++i) iv0 |= static_cast<std::uint32_t>(state.ivs[i]) << (i * 8);
    for (std::size_t i = 4; i < 6; ++i) iv1 |= static_cast<std::uint32_t>(state.ivs[i]) << ((i - 4) * 8);
    return {state.frame, state.random, state.ec, state.pid, metadata, iv0, iv1, state.delay,
            state.frameUsed, state.psv, state.prv, 0, 0, 0, 0, 0};
}

bool generateOnce(const std::uint32_t *request, const std::vector<std::uint32_t> &stream,
                  std::uint32_t frame, std::size_t &cursor, State &state) {
    bool exhausted = false;
    const auto next = [&]() {
        if (cursor >= stream.size()) {
            exhausted = true;
            return 0U;
        }
        return stream[cursor++];
    };
    const auto rand = [&](std::uint32_t maximum) { return randRange(next(), maximum); };

    state.ec = request[Ec] > 0 ? request[Ec] : next();
    switch (request[PidType]) {
    case 0:
        state.pid = next();
        if ((((state.pid >> 16) ^ (state.pid & 0xffffU)) >> 4) == request[Tsv])
            state.shiny = 2;
        break;
    case 1:
        state.pid = next();
        if (((state.pid >> 16) ^ (state.pid & 0xffffU)) >> 4 == request[Tsv])
            state.pid ^= 0x10000000U;
        break;
    case 2:
        state.pid = next();
        if (request[OtherInfo] != 0)
            state.pid = ((request[Tid] ^ request[Sid] ^ (state.pid & 0xffffU)) << 16) +
                        (state.pid & 0xffffU);
        state.shiny = 2;
        break;
    default:
        state.pid = request[Pid];
        if (((state.pid >> 16) ^ (state.pid & 0xffffU)) >> 4 == request[Tsv])
            state.shiny = 2;
        break;
    }

    state.ivs.fill(0xff);
    for (std::size_t i = 0; i < 6; ++i)
        if (request[FixedIvs + i] != 0xffffffffU)
            state.ivs[i] = static_cast<std::uint8_t>(request[FixedIvs + i]);
    std::uint32_t remaining = request[PerfectIvCount];
    std::array<bool, 6> used{};
    while (remaining > 0 && !exhausted) {
        const auto slot = rand(6);
        if (!used[slot] && state.ivs[slot] == 0xff) {
            used[slot] = true;
            state.ivs[slot] = 31;
            --remaining;
        }
    }
    for (auto &value : state.ivs)
        if (value == 0xff) value = static_cast<std::uint8_t>(next() >> 27);

    state.ability = request[AbilityLocked] != 0
                        ? static_cast<std::uint8_t>(request[Ability])
                        : static_cast<std::uint8_t>(rand(request[Ability] + 2) + 1);
    state.nature = request[NatureLocked] != 0
                       ? static_cast<std::uint8_t>(request[Nature])
                       : static_cast<std::uint8_t>(rand(25));
    state.gender = request[GenderLocked] != 0
                       ? static_cast<std::uint8_t>(request[Gender])
                       : static_cast<std::uint8_t>(randRange(next(), 252) >= request[GenderRatio] ? 1 : 2);
    const auto xorValue = (state.pid >> 16) ^ (state.pid & 0xffffU);
    state.psv = xorValue >> 4;
    state.prv = xorValue & 15U;
    state.hiddenPower = hiddenPower(state.ivs);
    return !exhausted;
}
} // namespace

extern "C" {
std::uint32_t gen6event_api_version() { return apiVersion; }

std::uint32_t gen6event_generate(const std::uint32_t *request) {
    results.clear();
    processed = 0;
    error = 0;
    limited = false;
    if (!valid(request)) {
        error = 1;
        return 0;
    }
    const auto first = request[MinFrame];
    const auto required = static_cast<std::uint64_t>(first) + request[Count] +
                          request[Delay] + streamPadding + 32;
    MersenneTwister rng(request[Seed]);
    std::vector<std::uint32_t> stream;
    stream.reserve(static_cast<std::size_t>(required));
    for (std::uint64_t i = 0; i < required; ++i) stream.push_back(rng.next());

    for (std::uint32_t i = 0; i < request[Count]; ++i) {
        const auto frame = first + i;
        State state{};
        state.frame = frame;
        state.random = stream[frame];
        state.delay = request[Delay];
        std::size_t cursor = static_cast<std::size_t>(frame) + 1 +
                             (request[ConsiderDelay] != 0 ? request[Delay] : 0);
        if (!generateOnce(request, stream, frame, cursor, state) ||
            (request[IsOras] != 0 && !generateOnce(request, stream, frame, cursor, state))) {
            error = 2;
            results.clear();
            return 0;
        }
        state.frameUsed = static_cast<std::uint32_t>(cursor - frame + 1);
        ++processed;
        if (!passes(request, state)) continue;
        results.emplace_back(pack(state));
        if (results.size() >= request[ResultLimit]) {
            limited = processed < request[Count];
            break;
        }
    }
    return static_cast<std::uint32_t>(results.size());
}

std::uintptr_t gen6event_result_ptr() {
    return results.empty() ? 0 : reinterpret_cast<std::uintptr_t>(results.data());
}
std::uint32_t gen6event_result_count() { return static_cast<std::uint32_t>(results.size()); }
std::uint32_t gen6event_processed_count() { return processed; }
std::uint32_t gen6event_limit_reached() { return limited ? 1U : 0U; }
std::uint32_t gen6event_last_error() { return error; }
}
