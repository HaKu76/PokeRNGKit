/*
 * PokeRNGKit Gen VI TinyFinder Ambush WebAssembly bridge.
 * Adapted from TinyFinder Methods/Wild.cs, Classes/Index.cs and RNG/TinyMT.cs.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#include "gen6tinyambush_bridge.h"

#include <array>
#include <cstdint>
#include <vector>

namespace
{
constexpr std::uint32_t apiVersion = 1;
constexpr std::uint32_t maxIndex = 10000000;
constexpr std::uint64_t maxTasks = 5000000;
constexpr std::uint32_t maxStep = 65536;
constexpr std::uint32_t slotCount = 12;

class TinyMT
{
    std::array<std::uint32_t, 4> state{};
    static constexpr std::uint32_t mask = 0x7fffffffU;
    static constexpr std::uint32_t mat1 = 0x8f7011eeU;
    static constexpr std::uint32_t mat2 = 0xfc78ff1fU;
    static constexpr std::uint32_t tmat = 0x3793fdffU;

public:
    void setState(const std::array<std::uint32_t, 4> &value) { state = value; }
    void initialize(std::uint32_t seed)
    {
        state = {seed, mat1, mat2, tmat};
        for (std::uint32_t i = 1; i < 8; ++i)
            state[i & 3] ^= i + 1812433253U *
                                       (state[(i - 1) & 3] ^
                                        (state[(i - 1) & 3] >> 30));
        advance(8);
    }
    const std::array<std::uint32_t, 4> &currentState() const { return state; }
    void advance(std::uint32_t count)
    {
        while (count-- > 0) nextState();
    }
    std::uint32_t currentRandom() const
    {
        auto t0 = state[3];
        const auto t1 = state[0] + (state[2] >> 8);
        t0 ^= t1;
        if ((t1 & 1U) != 0) t0 ^= tmat;
        return t0;
    }
    std::uint32_t currentRange(std::uint32_t maximum) const
    {
        return static_cast<std::uint32_t>((static_cast<std::uint64_t>(currentRandom()) * maximum) >> 32);
    }
    std::uint32_t rand(std::uint32_t maximum)
    {
        nextState();
        return currentRange(maximum);
    }
    void next()
    {
        nextState();
    }

private:
    void nextState()
    {
        auto y = state[3];
        auto x = (state[0] & mask) ^ state[1] ^ state[2];
        x ^= x << 1;
        y ^= (y >> 1) ^ x;
        state[0] = state[1];
        state[1] = state[2];
        state[2] = x ^ (y << 10);
        state[3] = y;
        if ((y & 1U) != 0)
        {
            state[1] ^= mat1;
            state[2] ^= mat2;
        }
    }
};

thread_local TinyMT rng;
thread_local std::vector<gen6tinyambushResult> results;
thread_local std::array<std::uint32_t, slotCount> species{};
thread_local std::array<std::uint32_t, slotCount> levels{};
thread_local std::uint32_t inputMode = 0;
thread_local std::uint32_t initialSeed = 0;
thread_local std::uint32_t minValue = 0;
thread_local std::uint32_t maxValue = 0;
thread_local bool synchronizeOnly = false;
thread_local std::uint32_t slotMask = 0;
thread_local std::uint32_t resultLimit = 0;
thread_local std::uint32_t currentIndex = 0;
thread_local std::uint32_t totalProcessed = 0;
thread_local std::uint32_t stepProcessed = 0;
thread_local std::uint32_t error = 0;
thread_local bool limited = false;
thread_local bool initialized = false;

std::uint32_t selectSlot(std::uint32_t random)
{
    constexpr std::array<std::uint32_t, slotCount> distribution = {
        10, 10, 10, 10, 10, 10, 10, 10, 10, 5, 4, 1};
    for (std::uint32_t index = 0; index < slotCount; ++index)
    {
        if (random < distribution[index]) return index + 1;
        random -= distribution[index];
    }
    return slotCount;
}

struct Generated
{
    std::uint32_t rand100 = 0;
    bool synchronize = false;
    std::uint32_t slot = 1;
    std::uint32_t itemSlot = 0;
};

Generated generate()
{
    Generated result;
    result.slot = selectSlot(rng.rand(100));
    result.rand100 = rng.currentRange(100);
    result.synchronize = rng.rand(100) < 50;
    rng.next();
    const auto itemRandom = rng.currentRange(100);
    result.itemSlot = itemRandom < 50 ? 0 : itemRandom < 55 ? 1 : 2;
    return result;
}

bool passes(const Generated &result)
{
    if (synchronizeOnly && !result.synchronize) return false;
    if (slotMask != 0 && (slotMask & (1U << (result.slot - 1))) == 0) return false;
    return true;
}

bool valid(const std::uint32_t *request)
{
    if (!request || request[0] > 1 || request[7] > maxIndex ||
        request[7] < request[6] || request[8] > 1 || request[9] > 0xfff ||
        request[10] == 0 || request[10] > 100000 ||
        static_cast<std::uint64_t>(request[7]) - request[6] + 1 > maxTasks)
        return false;
    for (std::uint32_t index = 0; index < slotCount; ++index)
        if (request[11 + index] > 721 || request[23 + index] == 0 ||
            request[23 + index] > 100)
            return false;
    return true;
}
}

extern "C" std::uint32_t gen6tinyambush_api_version() { return apiVersion; }

extern "C" std::uint32_t gen6tinyambush_begin(const std::uint32_t *request)
{
    results.clear();
    totalProcessed = stepProcessed = 0;
    error = 0;
    limited = false;
    initialized = false;
    if (!valid(request))
    {
        error = 1;
        return 0;
    }
    inputMode = request[0];
    initialSeed = request[1];
    rng.setState({request[2], request[3], request[4], request[5]});
    minValue = request[6];
    maxValue = request[7];
    synchronizeOnly = request[8] != 0;
    slotMask = request[9];
    resultLimit = request[10];
    for (std::uint32_t index = 0; index < slotCount; ++index)
    {
        species[index] = request[11 + index];
        levels[index] = request[23 + index];
    }
    if (inputMode == 0) rng.initialize(initialSeed);
    rng.advance(minValue);
    currentIndex = minValue;
    initialized = true;
    return 1;
}

extern "C" std::uint32_t gen6tinyambush_step(std::uint32_t maximumStates)
{
    results.clear();
    stepProcessed = 0;
    if (!initialized)
    {
        error = 2;
        return 0;
    }
    const auto limit = std::min(maximumStates, maxStep);
    results.reserve(limit);
    while (stepProcessed < limit && !gen6tinyambush_done())
    {
        const auto state = rng.currentState();
        const auto generated = generate();
        ++stepProcessed;
        ++totalProcessed;
        if (passes(generated))
        {
            gen6tinyambushResult row{};
            row.words[0] = currentIndex;
            row.words[1] = generated.rand100;
            for (std::uint32_t word = 0; word < 4; ++word) row.words[2 + word] = state[word];
            row.words[6] = inputMode == 0 ? initialSeed : 0;
            row.words[7] = generated.synchronize ? 1U : 0U;
            row.words[8] = generated.slot;
            row.words[9] = generated.itemSlot;
            row.words[10] = species[generated.slot - 1];
            row.words[11] = levels[generated.slot - 1];
            results.push_back(row);
            if (results.size() >= resultLimit)
            {
                limited = currentIndex != maxValue;
                break;
            }
        }
        if (currentIndex == maxValue) currentIndex = maxValue + 1;
        else
        {
            rng.setState(state);
            ++currentIndex;
            rng.next();
        }
    }
    return stepProcessed;
}

extern "C" std::uintptr_t gen6tinyambush_result_ptr()
{
    return results.empty() ? 0 : reinterpret_cast<std::uintptr_t>(results.data());
}
extern "C" std::uint32_t gen6tinyambush_result_count() { return static_cast<std::uint32_t>(results.size()); }
extern "C" std::uint32_t gen6tinyambush_step_processed() { return stepProcessed; }
extern "C" std::uint32_t gen6tinyambush_total_processed() { return totalProcessed; }
extern "C" std::uint32_t gen6tinyambush_done() { return initialized && currentIndex > maxValue ? 1U : 0U; }
extern "C" std::uint32_t gen6tinyambush_limit_reached() { return limited ? 1U : 0U; }
extern "C" std::uint32_t gen6tinyambush_last_error() { return error; }
