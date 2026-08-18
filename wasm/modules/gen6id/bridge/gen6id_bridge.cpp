/*
 * PokeRNGKit Gen VI ID WebAssembly bridge.
 * Adapted from 3DSRNGTool Gen6/ID6.cs, MainForm_Core.cs and RNG/TinyMT.cs.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#include "gen6id_bridge.h"

#include <algorithm>
#include <array>
#include <cstdint>
#include <vector>

namespace
{
constexpr std::uint32_t apiVersion = 1;
constexpr std::uint32_t maxFrame = 1000000000;
constexpr std::uint32_t maxStep = 65536;

class TinyMT
{
    std::array<std::uint32_t, 4> state{};
    static constexpr std::uint32_t mask = 0x7fffffffU;
    static constexpr std::uint32_t mat1 = 0x8f7011eeU;
    static constexpr std::uint32_t mat2 = 0xfc78ff1fU;
    static constexpr std::uint32_t tmat = 0x3793fdffU;

public:
    TinyMT() = default;

    void setState(const std::array<std::uint32_t, 4> &value) { state = value; }

    const std::array<std::uint32_t, 4> &currentState() const { return state; }

    void advance(std::uint32_t count)
    {
        while (count-- > 0) nextState();
    }

    std::uint32_t next()
    {
        nextState();
        auto t0 = state[3];
        const auto t1 = state[0] + (state[2] >> 8);
        t0 ^= t1;
        if ((t1 & 1U) != 0) t0 ^= tmat;
        return t0;
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
thread_local std::vector<Gen6IdResult> results;
thread_local std::uint32_t minFrame = 0;
thread_local std::uint32_t frameCount = 0;
thread_local std::uint32_t processed = 0;
thread_local std::uint32_t stepProcessed = 0;
thread_local std::uint32_t error = 0;
thread_local bool initialized = false;

bool valid(const std::uint32_t *request)
{
    return request != nullptr && request[5] > 0 && request[4] <= maxFrame
        && static_cast<std::uint64_t>(request[4]) + request[5] <= static_cast<std::uint64_t>(maxFrame) + 1;
}
}

extern "C" std::uint32_t gen6id_api_version() { return apiVersion; }

extern "C" std::uint32_t gen6id_begin(const std::uint32_t *request)
{
    initialized = false;
    results.clear();
    processed = 0;
    stepProcessed = 0;
    error = 0;
    if (!valid(request))
    {
        error = 1;
        return 0;
    }
    rng.setState({request[0], request[1], request[2], request[3]});
    minFrame = request[4];
    frameCount = request[5];
    rng.advance(minFrame);
    initialized = true;
    return 1;
}

extern "C" std::uint32_t gen6id_step(std::uint32_t maximumStates)
{
    results.clear();
    stepProcessed = 0;
    if (!initialized)
    {
        error = 2;
        return 0;
    }
    const auto count = std::min<std::uint32_t>(std::min(maximumStates, maxStep), frameCount - processed);
    results.reserve(count);
    for (std::uint32_t i = 0; i < count; ++i)
    {
        Gen6IdResult result{};
        result.words[0] = minFrame + processed;
        const auto state = rng.currentState();
        for (std::uint32_t word = 0; word < 4; ++word) result.words[2 + word] = state[word];
        result.words[1] = rng.next();
        results.push_back(result);
        ++processed;
        ++stepProcessed;
    }
    return stepProcessed;
}

extern "C" std::uintptr_t gen6id_result_ptr()
{
    return results.empty() ? 0 : reinterpret_cast<std::uintptr_t>(results.data());
}

extern "C" std::uint32_t gen6id_result_count()
{
    return static_cast<std::uint32_t>(results.size());
}

extern "C" std::uint32_t gen6id_step_processed() { return stepProcessed; }

extern "C" std::uint32_t gen6id_total_processed() { return processed; }

extern "C" std::uint32_t gen6id_done()
{
    return initialized && processed >= frameCount ? 1U : 0U;
}

extern "C" std::uint32_t gen6id_last_error() { return error; }
