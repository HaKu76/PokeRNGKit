/*
 * PokeRNGKit Gen VI Main Seed Finder WebAssembly bridge.
 * Adapted from 3DSRNGTool Gen6MTSeedFinder, Util/MTSeedFinder.cs and RNG/MT.cs.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#include "gen6mainseed_bridge.h"

#include <array>
#include <cstddef>
#include <cstdint>
#include <vector>

namespace {
constexpr std::uint32_t apiVersion = 1;
constexpr std::uint32_t maxFirstFrame = 4'000;
constexpr std::uint32_t maxSecondFrame = 10'000;
constexpr std::uint32_t maxSingleSeedDistance = 0x1000'0000U;
constexpr std::size_t ivCount = 6;

enum RequestIndex : std::size_t {
    Mode,
    StartSeed,
    EndSeed,
    ChunkStart,
    ChunkEnd,
    FirstMinFrame,
    FirstMaxFrame,
    SecondMinFrame,
    SecondMaxFrame,
    Nature,
    FirstIv0,
    FirstIv1,
    FirstIv2,
    FirstIv3,
    FirstIv4,
    FirstIv5,
    SecondIv0,
    SecondIv1,
    SecondIv2,
    SecondIv3,
    SecondIv4,
    SecondIv5,
};

struct PackedResult {
    std::uint32_t seed;
    std::uint32_t frame1;
    std::uint32_t nature1;
    std::uint32_t frame2;
    std::uint32_t nature2;
    std::uint32_t gender;
};

thread_local std::vector<PackedResult> results;
thread_local std::uint32_t processed = 0;
thread_local std::uint32_t error = 0;

class MersenneTwisterFast {
    static constexpr std::size_t stateSize = 624;
    static constexpr std::size_t period = 397;
    static constexpr std::uint32_t matrixA = 0x9908b0dfU;
    static constexpr std::uint32_t upperMask = 0x80000000U;
    static constexpr std::uint32_t lowerMask = 0x7fffffffU;
    static constexpr std::uint32_t temperingMaskB = 0x9d2c5680U;
    static constexpr std::uint32_t temperingMaskC = 0xefc60000U;

    std::array<std::uint32_t, stateSize> state{};
    std::size_t index = stateSize;

    void twist() {
        std::size_t k = 0;
        for (; k < stateSize - period; ++k) {
            const auto y = (state[k] & upperMask) | (state[k + 1] & lowerMask);
            state[k] = state[k + period] ^ (y >> 1) ^ ((y & 1U) != 0 ? matrixA : 0U);
        }
        for (; k < stateSize - 1; ++k) {
            const auto y = (state[k] & upperMask) | (state[k + 1] & lowerMask);
            state[k] = state[k + period - stateSize] ^ (y >> 1) ^ ((y & 1U) != 0 ? matrixA : 0U);
        }
        const auto y = (state[stateSize - 1] & upperMask) | (state[0] & lowerMask);
        state[stateSize - 1] = state[period - 1] ^ (y >> 1) ^ ((y & 1U) != 0 ? matrixA : 0U);
    }

public:
    explicit MersenneTwisterFast(std::uint32_t seed) {
        state[0] = seed;
        for (std::size_t i = 1; i < stateSize; ++i)
            state[i] = 1812433253U * (state[i - 1] ^ (state[i - 1] >> 30)) +
                       static_cast<std::uint32_t>(i);
    }

    void skip(std::int32_t count) {
        if (count < 0) {
            index -= static_cast<std::size_t>(-count);
            return;
        }
        index += static_cast<std::size_t>(count);
        while (index >= stateSize) {
            index -= stateSize;
            twist();
        }
    }

    std::uint32_t next() {
        if (index >= stateSize) {
            twist();
            index = 0;
        }
        auto value = state[index++];
        value ^= value >> 11;
        value ^= (value << 7) & temperingMaskB;
        value ^= (value << 15) & temperingMaskC;
        value ^= value >> 18;
        return value;
    }
};

bool validIvs(const std::uint32_t *request, std::size_t offset) {
    for (std::size_t i = 0; i < ivCount; ++i)
        if (request[offset + i] > 31) return false;
    return true;
}

bool valid(const std::uint32_t *request) {
    if (request == nullptr || request[Mode] > 1 || request[StartSeed] > request[EndSeed] ||
        request[ChunkStart] < request[StartSeed] || request[ChunkEnd] > request[EndSeed] ||
        request[ChunkStart] > request[ChunkEnd] ||
        request[FirstMinFrame] > request[FirstMaxFrame] ||
        request[FirstMaxFrame] > maxFirstFrame || !validIvs(request, FirstIv0) ||
        !validIvs(request, SecondIv0))
        return false;
    if (request[Mode] == 0) {
        return request[SecondMinFrame] >= request[FirstMaxFrame] &&
               request[SecondMinFrame] <= request[SecondMaxFrame] &&
               request[SecondMaxFrame] <= maxSecondFrame;
    }
    if (request[Nature] > 24 || request[EndSeed] - request[StartSeed] > maxSingleSeedDistance)
        return false;
    for (std::size_t i = 0; i < ivCount; ++i) {
        const auto lower = request[FirstIv0 + i];
        const auto upper = request[SecondIv0 + i];
        if (upper < lower || upper > lower + 2) return false;
    }
    return true;
}

bool exactIvs(const std::uint32_t *request, std::size_t offset,
              const std::vector<std::uint32_t> &pool, std::size_t index) {
    for (std::size_t i = 0; i < ivCount; ++i)
        if (request[offset + i] != pool[index + i]) return false;
    return true;
}

std::uint32_t nature(std::uint32_t value) {
    return static_cast<std::uint32_t>((static_cast<std::uint64_t>(value) * 25U) >> 32);
}

std::uint32_t gender(std::uint32_t value) {
    return static_cast<std::uint32_t>((static_cast<std::uint64_t>(value) * 252U) >> 32);
}

std::array<std::uint32_t, 2> findTwoWildFrames(const std::uint32_t *request,
                                                std::uint32_t seed) {
    const auto firstSize = request[FirstMaxFrame] - request[FirstMinFrame] + 1;
    const auto secondSize = request[SecondMaxFrame] - request[SecondMinFrame] + 1;
    const auto firstWindows = firstSize >= ivCount ? firstSize - ivCount + 1 : 0;
    const auto secondWindows = secondSize >= ivCount ? secondSize - ivCount + 1 : 0;
    if (firstWindows == 0 || secondWindows == 0) return {0, 0};

    MersenneTwisterFast rng(seed);
    rng.skip(63U + request[FirstMinFrame]);
    std::vector<std::uint32_t> first(firstSize);
    for (auto &value : first) value = rng.next() >> 27;
    std::size_t firstIndex = 0;
    for (; firstIndex < firstWindows; ++firstIndex)
        if (exactIvs(request, FirstIv0, first, firstIndex)) break;
    if (firstIndex == firstWindows) return {0, 0};

    const auto gap = static_cast<std::int32_t>(request[SecondMinFrame]) -
                     static_cast<std::int32_t>(request[FirstMaxFrame]) - 1;
    rng.skip(gap);
    std::vector<std::uint32_t> second(secondSize);
    for (auto &value : second) value = rng.next() >> 27;
    std::size_t secondIndex = 0;
    for (; secondIndex < secondWindows; ++secondIndex)
        if (exactIvs(request, SecondIv0, second, secondIndex)) break;
    if (secondIndex == secondWindows) return {0, 0};
    return {request[FirstMinFrame] + static_cast<std::uint32_t>(firstIndex),
            request[SecondMinFrame] + static_cast<std::uint32_t>(secondIndex)};
}

std::uint32_t findOneWildFrame(const std::uint32_t *request, std::uint32_t seed) {
    const auto size = request[FirstMaxFrame] - request[FirstMinFrame] + 1;
    const auto windows = size >= ivCount ? size - ivCount + 1 : 0;
    if (windows == 0) return 0;
    MersenneTwisterFast rng(seed);
    rng.skip(63U + request[FirstMinFrame]);
    std::vector<std::uint32_t> pool(size);
    for (auto &value : pool) value = rng.next() >> 27;
    for (std::size_t i = 0; i < windows; ++i) {
        bool match = true;
        for (std::size_t iv = 0; iv < ivCount; ++iv)
            if (pool[i + iv] < request[FirstIv0 + iv] || pool[i + iv] > request[SecondIv0 + iv]) {
                match = false;
                break;
            }
        if (match) return request[FirstMinFrame] + static_cast<std::uint32_t>(i);
    }
    return 0;
}

void appendTwoWild(const std::uint32_t *request, std::uint32_t seed,
                   std::uint32_t frame1, std::uint32_t frame2) {
    MersenneTwisterFast rng(seed);
    rng.skip(63U + 7U + frame1);
    const auto nature1 = nature(rng.next());
    rng.skip(static_cast<std::int32_t>(frame2) - static_cast<std::int32_t>(frame1) - 1);
    const auto nature2 = nature(rng.next());
    results.push_back({seed, frame1, nature1, frame2, nature2, 0});
}

void appendOneWild(const std::uint32_t *request, std::uint32_t seed, std::uint32_t frame) {
    MersenneTwisterFast rng(seed);
    rng.skip(63U + 7U + frame);
    const auto natureValue = nature(rng.next());
    if (natureValue != request[Nature]) return;
    results.push_back({seed, frame, natureValue, 0, 0, gender(rng.next())});
}
} // namespace

extern "C" {
std::uint32_t gen6mainseed_api_version() { return apiVersion; }

std::uint32_t gen6mainseed_search(const std::uint32_t *request) {
    results.clear();
    processed = 0;
    error = 0;
    if (!valid(request)) {
        error = 1;
        return 0;
    }
    results.reserve(static_cast<std::size_t>(request[ChunkEnd] - request[ChunkStart]) + 1);
    for (std::uint64_t cursor = request[ChunkStart]; cursor <= request[ChunkEnd]; ++cursor) {
        const auto seed = static_cast<std::uint32_t>(cursor);
        if (request[Mode] == 0) {
            const auto frames = findTwoWildFrames(request, seed);
            if (frames[1] != 0) appendTwoWild(request, seed, frames[0], frames[1]);
        } else {
            const auto frame = findOneWildFrame(request, seed);
            if (frame != 0) appendOneWild(request, seed, frame);
        }
        ++processed;
        if (cursor == request[ChunkEnd]) break;
    }
    return static_cast<std::uint32_t>(results.size());
}

std::uintptr_t gen6mainseed_result_ptr() {
    return results.empty() ? 0 : reinterpret_cast<std::uintptr_t>(results.data());
}

std::uint32_t gen6mainseed_result_count() {
    return static_cast<std::uint32_t>(results.size());
}

std::uint32_t gen6mainseed_processed_count() { return processed; }

std::uint32_t gen6mainseed_last_error() { return error; }
}
