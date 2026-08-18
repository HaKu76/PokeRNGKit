/*
 * PokeRNGKit Gen VI Stationary WebAssembly bridge.
 * Adapted from 3DSRNGTool Stationary6, StationaryRNG and MersenneTwister.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#include "gen6stationary_bridge.h"

#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>
#include <vector>

namespace {
constexpr std::uint32_t apiVersion = 2;
constexpr std::uint32_t maxResults = 100000;
constexpr std::uint32_t maxFrame = 1000000000;
constexpr std::uint32_t maxGenderList = 3486784400U;
constexpr std::size_t streamPadding = 8192;

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
    std::uint32_t frameUsed = 0;
    std::array<std::uint8_t, 6> ivs{};
    std::uint8_t nature = 0;
    std::uint8_t ability = 0;
    std::uint8_t gender = 0;
    std::uint8_t hiddenPower = 0;
    std::uint8_t shiny = 0;
    bool synchronize = false;
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
        for (std::size_t i = 1; i < stateSize; ++i) {
            state[i] = 1812433253U * (state[i - 1] ^ (state[i - 1] >> 30)) +
                       static_cast<std::uint32_t>(i);
        }
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
    for (std::size_t i = 0; i < ivs.size(); ++i) {
        bits += static_cast<std::uint32_t>(ivs[i] & 1U) << reorder[i];
    }
    return static_cast<std::uint8_t>((bits * 15) / 63);
}

std::uint8_t shinyValue(std::uint32_t pid, std::uint32_t tsv, std::uint32_t trv) {
    const std::uint32_t xorValue = (pid >> 16) ^ (pid & 0xffffU);
    if ((xorValue >> 4) != tsv) {
        return 0;
    }
    return static_cast<std::uint8_t>((xorValue & 15U) == trv ? 2 : 1);
}

std::uint8_t genderType(std::uint32_t encoded, std::uint32_t index) {
    for (std::uint32_t i = 0; i < index; ++i) {
        encoded /= 3;
    }
    return static_cast<std::uint8_t>(encoded % 3);
}

bool valid(const std::uint32_t *request) {
    if (request == nullptr) {
        return false;
    }
    const std::uint64_t frameEnd =
        static_cast<std::uint64_t>(request[MinFrame]) + request[Count];
    if (request[Count] == 0 || frameEnd > static_cast<std::uint64_t>(maxFrame) + 1 ||
        request[Delay] > 4000 || request[ConsiderDelay] > 1 || request[Tsv] > 4095 ||
        request[Trv] > 15 ||
        (request[SyncNature] != 255 && request[SyncNature] > 24) ||
        request[PerfectIvCount] > 6 || request[AlwaysSync] > 1 ||
        request[ShinyLocked] > 1 || request[AssumeSync] > 1 || request[Bank] > 1 ||
        request[NumPokemon] == 0 || request[NumPokemon] > 20 ||
        request[BankTarget] == 0 || request[BankTarget] > request[NumPokemon] ||
        request[Species] > 721 || request[GenderRatio] > 255 || request[Ability] > 3 ||
        (request[Nature] != 255 && request[Nature] > 24) ||
        (request[OtTsv] != 0xffffffffU && request[OtTsv] > 4095) ||
        request[FiltersDisabled] > 1 || request[ShinyMask] > 7 ||
        (request[GenderFilter] != 255 && request[GenderFilter] > 2) ||
        (request[AbilityFilter] != 255 &&
         (request[AbilityFilter] == 0 || request[AbilityFilter] > 3)) ||
        request[NatureMask] == 0 || request[NatureMask] > 0x1ffffffU ||
        request[PowerMask] == 0 || request[PowerMask] > 0xffffU ||
        request[PerfectValue] > 31 || request[PerfectCount] > 6 ||
        request[ResultLimit] == 0 || request[ResultLimit] > maxResults ||
        request[BankGenderList] > maxGenderList) {
        return false;
    }

    std::uint32_t randomIvSlots = 0;
    for (std::size_t i = 0; i < 6; ++i) {
        if (request[FixedIvs + i] == 0xffffffffU) {
            ++randomIvSlots;
        } else if (request[FixedIvs + i] > 31) {
            return false;
        }
        if (request[IvMin + i] > request[IvMax + i] || request[IvMax + i] > 31) {
            return false;
        }
    }
    return request[PerfectIvCount] <= randomIvSlots;
}

bool passes(const std::uint32_t *request, const State &state) {
    if (request[FiltersDisabled] != 0) {
        return true;
    }
    if ((request[ShinyMask] & (1U << state.shiny)) == 0 ||
        (request[GenderFilter] != 255 && request[GenderFilter] != state.gender) ||
        (request[AbilityFilter] != 255 && request[AbilityFilter] != state.ability) ||
        (request[NatureMask] & (1U << state.nature)) == 0 ||
        (request[PowerMask] & (1U << state.hiddenPower)) == 0) {
        return false;
    }
    const auto perfectCount = std::count_if(
        state.ivs.begin(), state.ivs.end(),
        [&](std::uint8_t value) { return value >= request[PerfectValue]; });
    if (perfectCount < static_cast<int>(request[PerfectCount])) {
        return false;
    }
    for (std::size_t i = 0; i < state.ivs.size(); ++i) {
        if (state.ivs[i] < request[IvMin + i] || state.ivs[i] > request[IvMax + i]) {
            return false;
        }
    }
    return true;
}

Packed pack(const State &state) {
    const std::uint32_t metadata =
        state.nature | (static_cast<std::uint32_t>(state.ability) << 5) |
        (static_cast<std::uint32_t>(state.gender) << 7) |
        (static_cast<std::uint32_t>(state.hiddenPower) << 9) |
        (static_cast<std::uint32_t>(state.shiny) << 13) |
        (static_cast<std::uint32_t>(state.synchronize) << 15);
    std::uint32_t iv0 = 0;
    std::uint32_t iv1 = 0;
    for (std::size_t i = 0; i < 4; ++i) {
        iv0 |= static_cast<std::uint32_t>(state.ivs[i]) << (i * 8);
    }
    for (std::size_t i = 4; i < 6; ++i) {
        iv1 |= static_cast<std::uint32_t>(state.ivs[i]) << ((i - 4) * 8);
    }
    return {state.frame, state.random, state.ec, state.pid, metadata, iv0, iv1, 0,
            state.frameUsed, state.psv, state.prv, 0, 0, 0, 0, 0};
}

bool generateOne(const std::uint32_t *request,
                 const std::vector<std::uint32_t> &stream, std::uint32_t frame,
                 State &state) {
    state = {};
    state.frame = frame;
    state.random = stream[frame];
    std::size_t cursor = static_cast<std::size_t>(frame) + 1;
    if (request[ConsiderDelay] != 0) {
        cursor += request[Delay];
    }
    bool streamExhausted = false;
    const auto next = [&]() {
        if (cursor >= stream.size()) {
            streamExhausted = true;
            return 0U;
        }
        return stream[cursor++];
    };
    const auto advance = [&](std::size_t amount) {
        cursor += amount;
        if (cursor > stream.size()) {
            streamExhausted = true;
        }
    };

    if (request[Bank] != 0) {
        constexpr std::array<std::uint8_t, 3> advanceTable = {4, 5, 2};
        for (std::uint32_t index = 0; index + 1 < request[BankTarget]; ++index) {
            if (request[PerfectIvCount] == 0) {
                advance(10);
                continue;
            }
            advance(2);
            const std::uint8_t type = genderType(request[BankGenderList], index);
            std::array<bool, 6> used{};
            std::uint32_t remaining = type == 2 ? 5 : 3;
            while (remaining > 0 && !streamExhausted) {
                const auto slot = randRange(next(), 6);
                if (!used[slot]) {
                    used[slot] = true;
                    --remaining;
                }
            }
            advance(advanceTable[type]);
        }
    }

    const std::size_t generationStart = cursor;
    state.synchronize = request[AlwaysSync] != 0 || request[AssumeSync] != 0;
    if (request[AlwaysSync] == 0) {
        advance(60);
    }
    state.ec = next();

    const std::uint32_t tsv =
        request[OtTsv] == 0xffffffffU ? request[Tsv] : request[OtTsv];
    const std::uint32_t pidRolls = request[ShinyCharm] != 0 &&
                                           request[ShinyLocked] == 0 &&
                                           request[AlwaysSync] == 0
                                       ? 3
                                       : 1;
    for (std::uint32_t i = 0; i < pidRolls; ++i) {
        state.pid = next();
        if ((((state.pid >> 16) ^ (state.pid & 0xffffU)) >> 4) == tsv) {
            if (request[ShinyLocked] != 0) {
                state.pid ^= 0x10000000U;
            }
            break;
        }
    }

    state.ivs.fill(0xff);
    for (std::size_t i = 0; i < state.ivs.size(); ++i) {
        if (request[FixedIvs + i] != 0xffffffffU) {
            state.ivs[i] = static_cast<std::uint8_t>(request[FixedIvs + i]);
        }
    }
    std::uint32_t remainingPerfect = request[PerfectIvCount];
    while (remainingPerfect > 0 && !streamExhausted) {
        const auto slot = randRange(next(), 6);
        if (state.ivs[slot] == 0xff) {
            state.ivs[slot] = 31;
            --remainingPerfect;
        }
    }
    for (auto &value : state.ivs) {
        if (value == 0xff) {
            value = static_cast<std::uint8_t>(next() >> 27);
        }
    }

    state.ability = request[Ability] != 0
                        ? static_cast<std::uint8_t>(request[Ability])
                        : static_cast<std::uint8_t>((next() >> 31) + 1);
    const std::uint32_t syncNature =
        request[Nature] < 25 ? request[Nature] : request[SyncNature];
    state.nature = state.synchronize && syncNature < 25
                       ? static_cast<std::uint8_t>(syncNature)
                       : static_cast<std::uint8_t>(randRange(next(), 25));

    if (request[GenderRatio] == 255) {
        state.gender = 0;
    } else if (request[GenderRatio] == 0) {
        state.gender = 1;
    } else if (request[GenderRatio] == 254) {
        state.gender = 2;
    } else {
        state.gender = static_cast<std::uint8_t>(
            randRange(next(), 252) >= request[GenderRatio] ? 1 : 2);
    }

    const std::uint32_t xorValue = (state.pid >> 16) ^ (state.pid & 0xffffU);
    state.psv = xorValue >> 4;
    state.prv = xorValue & 15U;
    state.hiddenPower = hiddenPower(state.ivs);
    state.shiny = shinyValue(state.pid, tsv, request[Trv]);
    state.frameUsed = static_cast<std::uint32_t>(cursor - generationStart);
    return !streamExhausted;
}
} // namespace

extern "C" {
std::uint32_t gen6stationary_api_version() { return apiVersion; }

std::uint32_t gen6stationary_generate(const std::uint32_t *request) {
    results.clear();
    processed = 0;
    error = 0;
    limited = false;
    if (!valid(request)) {
        error = 1;
        return 0;
    }

    const std::uint32_t first = request[MinFrame];
    const std::uint64_t required = static_cast<std::uint64_t>(first) +
                                   request[Count] + request[Delay] + streamPadding;
    MersenneTwister rng(request[Seed]);
    std::vector<std::uint32_t> stream;
    stream.reserve(static_cast<std::size_t>(required));
    for (std::uint64_t i = 0; i < required; ++i) {
        stream.push_back(rng.next());
    }

    for (std::uint32_t i = 0; i < request[Count]; ++i) {
        State state;
        if (!generateOne(request, stream, first + i, state)) {
            error = 2;
            results.clear();
            return 0;
        }
        ++processed;
        if (!passes(request, state)) {
            continue;
        }
        results.emplace_back(pack(state));
        if (results.size() >= request[ResultLimit]) {
            limited = processed < request[Count];
            break;
        }
    }
    return static_cast<std::uint32_t>(results.size());
}

std::uintptr_t gen6stationary_result_ptr() {
    return results.empty() ? 0 : reinterpret_cast<std::uintptr_t>(results.data());
}

std::uint32_t gen6stationary_result_count() {
    return static_cast<std::uint32_t>(results.size());
}

std::uint32_t gen6stationary_processed_count() { return processed; }

std::uint32_t gen6stationary_limit_reached() { return limited ? 1U : 0U; }

std::uint32_t gen6stationary_last_error() { return error; }
}
