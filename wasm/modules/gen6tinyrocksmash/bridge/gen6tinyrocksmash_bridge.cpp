/*
 * PokeRNGKit Gen VI TinyFinder Rock Smash WebAssembly bridge.
 * Adapted from TinyFinder Methods/Wild.cs, Utils/BlinkSystem.cs,
 * Utils/PrepareRow.cs and RNG/TinyMT.cs. Copyright (C) 2026 Hakuhiro.
 * GPL-3.0-or-later.
 */
#include "gen6tinyrocksmash_bridge.h"

#include <algorithm>
#include <array>
#include <cstdint>
#include <vector>

namespace
{
constexpr std::uint32_t apiVersion = 1;
constexpr std::uint32_t maxIndex = 10000000;
constexpr std::uint32_t maxBlink = 1000;
constexpr std::uint32_t maxInteract = 1000;
constexpr std::uint64_t maxTasks = 5000000;
constexpr std::uint32_t maxStep = 65536;
constexpr std::uint32_t slotCount = 5;

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
        return static_cast<std::uint32_t>((static_cast<std::uint64_t>(next()) * maximum) >> 32);
    }
    std::uint32_t next()
    {
        nextState();
        return currentRandom();
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
thread_local std::vector<Gen6TinyRockSmashResult> results;
thread_local std::array<std::uint32_t, 5> species{};
thread_local std::array<std::uint32_t, 5> levels{};
thread_local std::uint32_t inputMode = 0;
thread_local std::uint32_t initialSeed = 0;
thread_local std::uint32_t minValue = 0;
thread_local std::uint32_t maxValue = 0;
thread_local std::uint32_t blinkRand = 0;
thread_local std::uint32_t interactFrame = 0;
thread_local bool oras = false;
thread_local bool triggerOnly = false;
thread_local bool synchronizeOnly = false;
thread_local bool safeOnly = false;
thread_local std::uint32_t fluteFilter = 0;
thread_local std::uint32_t slotMask = 0;
thread_local std::uint32_t resultLimit = 0;
thread_local std::uint32_t currentIndex = 0;
thread_local std::uint32_t totalProcessed = 0;
thread_local std::uint32_t stepProcessed = 0;
thread_local std::uint32_t error = 0;
thread_local bool limited = false;
thread_local bool initialized = false;

std::uint32_t longCooldown(std::uint32_t random)
{
    return ((static_cast<std::uint64_t>(random) * 60U) >> 32U) * 2U + 124U;
}
std::uint32_t shortCooldown(std::uint32_t random) { return random > 0x55555555U ? 12U : 20U; }

void addBlink(std::vector<std::uint32_t> &timeline, std::uint32_t &advances,
              bool &shortHappened, std::uint32_t target)
{
    while (advances < target)
    {
        if (shortHappened)
        {
            advances += longCooldown(rng.next());
            shortHappened = false;
        }
        else
        {
            const auto random = rng.next();
            if (random > 0x55555555U)
            {
                advances += longCooldown(rng.next());
                shortHappened = false;
            }
            else
            {
                advances += shortCooldown(random);
                shortHappened = true;
            }
        }
        timeline.push_back(advances);
    }
}

bool closeTo(std::uint32_t target, const std::vector<std::uint32_t> &timeline)
{
    for (std::size_t index = 0; index < timeline.size(); ++index)
        if (timeline[index] == target)
        {
            if (index > 0 && target - timeline[index - 1] <= 4) return true;
            if (index + 1 < timeline.size() && timeline[index + 1] - target <= 4) return true;
        }
    return false;
}

struct Generated
{
    std::uint32_t random = 0;
    std::uint32_t encounter = 0;
    bool trigger = false;
    bool synchronize = false;
    std::uint32_t slot = 0;
    std::uint32_t itemSlot = 0;
    std::uint32_t flute = 0;
    std::uint32_t actualDelay = 0;
    bool risky = false;
    std::vector<std::uint32_t> timeline;
};

Generated generate()
{
    Generated result;
    result.random = rng.currentRandom();
    std::uint32_t advances = blinkRand + longCooldown(rng.currentRandom());
    if (oras && advances >= 16) advances -= 16;
    result.timeline.push_back(advances);
    bool shortHappened = false;
    result.actualDelay = interactFrame + 276;
    addBlink(result.timeline, advances, shortHappened, interactFrame + 18);
    rng.advance(3);
    result.timeline.push_back(interactFrame + 18);
    addBlink(result.timeline, advances, shortHappened, interactFrame + 66);
    rng.advance(1);
    result.timeline.push_back(interactFrame + 66);
    addBlink(result.timeline, advances, shortHappened, result.actualDelay);
    result.timeline.push_back(result.actualDelay);
    result.actualDelay -= interactFrame;
    result.encounter = rng.rand(3);
    result.trigger = result.encounter == 0;
    result.synchronize = rng.rand(100) < 50;
    result.slot = 1;
    auto slotRandom = rng.rand(100);
    constexpr std::array<std::uint32_t, 5> distribution = {50, 30, 15, 4, 1};
    for (std::uint32_t index = 0; index < slotCount; ++index)
    {
        if (slotRandom < distribution[index])
        {
            result.slot = index + 1;
            break;
        }
        slotRandom -= distribution[index];
    }
    if (oras)
    {
        const auto fluteRandom = rng.rand(100);
        result.flute = fluteRandom < 40 ? 1 : fluteRandom < 70 ? 2 : fluteRandom < 90 ? 3 : 4;
    }
    rng.advance(1);
    const auto itemRandom = rng.currentRange(100);
    result.itemSlot = itemRandom < 50 ? 0 : itemRandom < 55 ? 1 : 2;
    std::sort(result.timeline.begin(), result.timeline.end());
    result.risky = closeTo(interactFrame + 18, result.timeline) ||
                   closeTo(interactFrame + 66, result.timeline) ||
                   closeTo(interactFrame + result.actualDelay, result.timeline);
    return result;
}

bool passes(const Generated &result)
{
    if (triggerOnly && !result.trigger) return false;
    if (synchronizeOnly && !result.synchronize) return false;
    if (safeOnly && result.risky) return false;
    if (fluteFilter != 0 && result.flute != fluteFilter) return false;
    if (slotMask != 0 && (slotMask & (1U << (result.slot - 1))) == 0) return false;
    return true;
}

bool valid(const std::uint32_t *request)
{
    if (!request || request[0] > 1 || request[7] > maxIndex ||
        request[7] < request[6] || request[8] > maxBlink || request[9] > maxInteract ||
        request[10] > 1 || request[11] > 1 || request[12] > 1 || request[13] > 4 ||
        request[14] > 1 || request[15] > 0x1f || request[16] == 0 || request[16] > 100000 ||
        static_cast<std::uint64_t>(request[7]) - request[6] + 1 > maxTasks)
        return false;
    for (std::uint32_t index = 0; index < slotCount; ++index)
        if (request[17 + index] > 721 || request[22 + index] == 0 || request[22 + index] > 100)
            return false;
    return true;
}
}

extern "C" std::uint32_t gen6tinyrocksmash_api_version() { return apiVersion; }

extern "C" std::uint32_t gen6tinyrocksmash_begin(const std::uint32_t *request)
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
    blinkRand = request[8];
    interactFrame = request[9];
    oras = request[10] != 0;
    triggerOnly = request[11] != 0;
    synchronizeOnly = request[12] != 0;
    fluteFilter = request[13];
    safeOnly = request[14] != 0;
    slotMask = request[15];
    resultLimit = request[16];
    for (std::uint32_t index = 0; index < slotCount; ++index)
    {
        species[index] = request[17 + index];
        levels[index] = request[22 + index];
    }
    if (inputMode == 0) rng.initialize(initialSeed);
    rng.advance(minValue);
    currentIndex = minValue;
    initialized = true;
    return 1;
}

extern "C" std::uint32_t gen6tinyrocksmash_step(std::uint32_t maximumStates)
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
    while (stepProcessed < limit && !gen6tinyrocksmash_done())
    {
        const auto state = rng.currentState();
        const auto generated = generate();
        ++stepProcessed;
        ++totalProcessed;
        if (passes(generated))
        {
            Gen6TinyRockSmashResult row{};
            row.words[0] = currentIndex;
            row.words[1] = generated.random;
            for (std::uint32_t word = 0; word < 4; ++word) row.words[2 + word] = state[word];
            row.words[6] = inputMode == 0 ? initialSeed : 0;
            row.words[7] = generated.encounter;
            row.words[8] = (generated.trigger ? 1U : 0U) |
                           (generated.synchronize ? 2U : 0U) |
                           (generated.risky ? 4U : 0U);
            row.words[9] = generated.slot;
            row.words[10] = generated.itemSlot;
            row.words[11] = generated.flute;
            row.words[12] = generated.actualDelay;
            row.words[13] = static_cast<std::uint32_t>(generated.timeline.size());
            for (std::size_t index = 0; index < generated.timeline.size() && index < 8; ++index)
                row.words[14 + index] = generated.timeline[index];
            row.words[22] = species[generated.slot - 1];
            row.words[23] = levels[generated.slot - 1];
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

extern "C" std::uintptr_t gen6tinyrocksmash_result_ptr()
{
    return results.empty() ? 0 : reinterpret_cast<std::uintptr_t>(results.data());
}
extern "C" std::uint32_t gen6tinyrocksmash_result_count() { return static_cast<std::uint32_t>(results.size()); }
extern "C" std::uint32_t gen6tinyrocksmash_step_processed() { return stepProcessed; }
extern "C" std::uint32_t gen6tinyrocksmash_total_processed() { return totalProcessed; }
extern "C" std::uint32_t gen6tinyrocksmash_done() { return initialized && currentIndex > maxValue ? 1U : 0U; }
extern "C" std::uint32_t gen6tinyrocksmash_limit_reached() { return limited ? 1U : 0U; }
extern "C" std::uint32_t gen6tinyrocksmash_last_error() { return error; }
