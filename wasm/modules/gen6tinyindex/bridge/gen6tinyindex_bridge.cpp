/*
 * PokeRNGKit Gen VI TinyMT Index WebAssembly bridge.
 * Adapted from TinyFinder RNG/TinyMT.cs and Main/FindResults.cs.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#include "gen6tinyindex_bridge.h"

#include <algorithm>
#include <array>
#include <cstdint>
#include <vector>

namespace
{
constexpr std::uint32_t apiVersion = 1;
constexpr std::uint32_t maxIndex = 10000000;
constexpr std::uint32_t maxDateSeconds = 31622400;
constexpr std::uint64_t maxTasks = 5000000;
constexpr std::uint32_t maxStep = 65536;

class TinyMT
{
    std::array<std::uint32_t, 4> state{};
    static constexpr std::uint32_t mask = 0x7fffffffU;
    static constexpr std::uint32_t mat1 = 0x8f7011eeU;
    static constexpr std::uint32_t mat2 = 0xfc78ff1fU;
    static constexpr std::uint32_t tmat = 0x3793fdffU;

public:
    void setState(const std::array<std::uint32_t, 4> &value) { state = value; }
    const std::array<std::uint32_t, 4> &currentState() const { return state; }

    void initialize(std::uint32_t seed)
    {
        state = {seed, mat1, mat2, tmat};
        for (std::uint32_t i = 1; i < 8; ++i)
            state[i & 3] ^= i + 1812433253U *
                                      (state[(i - 1) & 3] ^
                                       (state[(i - 1) & 3] >> 30));
        advance(8);
    }

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
thread_local std::vector<Gen6TinyIndexResult> results;
thread_local std::uint32_t mode = 0;
thread_local std::uint32_t baseSeed = 0;
thread_local std::uint32_t minIndex = 0;
thread_local std::uint32_t maxIndexValue = 0;
thread_local std::uint32_t year = 2000;
thread_local std::uint32_t month = 1;
thread_local std::uint32_t startSecond = 0;
thread_local std::uint32_t secondCount = 1;
thread_local std::uint32_t currentSecond = 0;
thread_local std::uint32_t currentIndex = 0;
thread_local std::uint32_t totalProcessed = 0;
thread_local std::uint32_t stepProcessed = 0;
thread_local std::uint32_t error = 0;
thread_local bool initialized = false;

std::uint32_t monthOffsetSeconds(std::uint32_t targetYear, std::uint32_t targetMonth)
{
    constexpr std::uint32_t days[] = {31, 28, 31, 30, 31, 30,
                                       31, 31, 30, 31, 30, 31};
    const bool leap = targetYear % 4 == 0 &&
                      (targetYear % 100 != 0 || targetYear % 400 == 0);
    std::uint32_t seconds = leap ? 86400U : 0U;
    for (std::uint32_t index = 0; index + 1 < targetMonth; ++index)
        seconds += days[index] * 86400U;
    return seconds;
}

void initializeCurrentState()
{
    if (mode == 0)
        return;
    const auto offset = monthOffsetSeconds(year, month);
    const auto seed = baseSeed + (offset + startSecond + currentSecond) * 1000U;
    rng.initialize(seed);
    // TinyFinder's Index consumers call AdvanceOnce before reading the
    // tempered value; preserve that boot advance for both modes.
    rng.advance(minIndex + 1);
}

bool valid(const std::uint32_t *request)
{
    if (request == nullptr || request[0] > 1 || request[6] > request[7] ||
        request[7] > maxIndex || request[8] < 2000 || request[8] > 2080 ||
        request[9] < 1 || request[9] > 12 || request[10] >= maxDateSeconds ||
        request[11] < 1 || request[11] > maxDateSeconds ||
        static_cast<std::uint64_t>(request[10]) + request[11] > maxDateSeconds)
        return false;
    const auto seconds = request[0] == 1 ? request[11] : 1U;
    const auto indexes = static_cast<std::uint64_t>(request[7]) - request[6] + 1;
    return indexes * seconds <= maxTasks;
}
}

extern "C" std::uint32_t gen6tinyindex_api_version() { return apiVersion; }

extern "C" std::uint32_t gen6tinyindex_begin(const std::uint32_t *request)
{
    initialized = false;
    results.clear();
    totalProcessed = 0;
    stepProcessed = 0;
    error = 0;
    if (!valid(request))
    {
        error = 1;
        return 0;
    }
    mode = request[0];
    rng.setState({request[1], request[2], request[3], request[4]});
    baseSeed = request[5];
    minIndex = request[6];
    maxIndexValue = request[7];
    year = request[8];
    month = request[9];
    startSecond = request[10];
    secondCount = mode == 1 ? request[11] : 1U;
    currentSecond = 0;
    currentIndex = minIndex;
    if (mode == 1)
        initializeCurrentState();
    else
        rng.advance(minIndex + 1);
    initialized = true;
    return 1;
}

extern "C" std::uint32_t gen6tinyindex_step(std::uint32_t maximumStates)
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
    while (stepProcessed < limit && !gen6tinyindex_done())
    {
        Gen6TinyIndexResult result{};
        result.words[0] = currentIndex;
        result.words[1] = rng.currentRandom();
        const auto state = rng.currentState();
        for (std::uint32_t word = 0; word < 4; ++word)
            result.words[2 + word] = state[word];
        result.words[6] = mode == 1
                              ? baseSeed +
                                    (monthOffsetSeconds(year, month) +
                                     startSecond + currentSecond) * 1000U
                              : 0U;
        result.words[7] = mode == 1
                              ? monthOffsetSeconds(year, month) + startSecond +
                                    currentSecond
                              : 0U;
        results.push_back(result);
        ++stepProcessed;
        ++totalProcessed;
        rng.nextState();
        if (currentIndex == maxIndexValue)
        {
            if (mode == 0 || currentSecond + 1 >= secondCount)
                currentSecond = secondCount;
            else
            {
                ++currentSecond;
                currentIndex = minIndex;
                initializeCurrentState();
            }
        }
        else
            ++currentIndex;
    }
    return stepProcessed;
}

extern "C" std::uintptr_t gen6tinyindex_result_ptr()
{
    return results.empty() ? 0 : reinterpret_cast<std::uintptr_t>(results.data());
}

extern "C" std::uint32_t gen6tinyindex_result_count()
{
    return static_cast<std::uint32_t>(results.size());
}

extern "C" std::uint32_t gen6tinyindex_step_processed() { return stepProcessed; }
extern "C" std::uint32_t gen6tinyindex_total_processed() { return totalProcessed; }

extern "C" std::uint32_t gen6tinyindex_done()
{
    return initialized &&
                   ((mode == 0 && currentSecond >= 1) ||
                    (mode == 1 && currentSecond >= secondCount))
               ? 1U
               : 0U;
}

extern "C" std::uint32_t gen6tinyindex_last_error() { return error; }
