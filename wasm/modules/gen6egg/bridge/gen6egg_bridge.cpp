/*
 * PokeRNGKit Gen VI Egg WebAssembly bridge.
 * Adapted from 3DSRNGTool Core/EggRNG.cs, Gen6/Egg6.cs and RNG/MT.cs.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#include "gen6egg_bridge.h"

#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>
#include <vector>

namespace
{
constexpr std::uint32_t apiVersion = 2;
constexpr std::uint32_t maxFrame = 100000000;
constexpr std::uint32_t requestWords = 154;
constexpr std::uint32_t maxStep = 16384;

struct Request
{
    std::uint32_t mainSeed = 0;
    std::uint32_t minFrame = 0;
    std::uint32_t frameCount = 0;
    std::uint32_t key0 = 0;
    std::uint32_t key1 = 0;
    std::uint32_t tsv = 0;
    std::uint32_t trv = 0;
    std::uint32_t gender = 126;
    std::uint32_t maleItem = 0;
    std::uint32_t femaleItem = 0;
    std::uint32_t inheritAbility = 0;
    std::uint32_t flags = 0;
    std::array<std::uint32_t, 6> maleIvs{};
    std::array<std::uint32_t, 6> femaleIvs{};
    std::array<std::uint32_t, 128> otherTsvs{};
};

thread_local Request request;
thread_local std::vector<Gen6EggResult> results;
thread_local std::uint32_t processed = 0;
thread_local std::uint32_t stepProcessed = 0;
thread_local std::uint32_t error = 0;
thread_local bool initialized = false;
thread_local bool currentPending = false;

class MersenneTwister
{
    static constexpr std::size_t n = 624;
    static constexpr std::size_t m = 397;
    static constexpr std::uint32_t matrixA = 0x9908b0dfU;
    static constexpr std::uint32_t upperMask = 0x80000000U;
    static constexpr std::uint32_t lowerMask = 0x7fffffffU;
    std::array<std::uint32_t, n> state{};
    std::size_t index = n;

public:
    explicit MersenneTwister(std::uint32_t seed) { seedOne(seed); }

    void seedOne(std::uint32_t seed)
    {
        state[0] = seed;
        for (index = 1; index < n; ++index)
            state[index] = 1812433253U * (state[index - 1] ^ (state[index - 1] >> 30)) + static_cast<std::uint32_t>(index);
        index = 0;
    }

    void seedArray(const std::array<std::uint32_t, 2> &key)
    {
        seedOne(0x12BD6AAU);
        std::size_t i = 1;
        std::size_t j = 0;
        for (std::size_t count = n > key.size() ? n : key.size(); count > 0; --count)
        {
            state[i] = (state[i] ^ ((state[i - 1] ^ (state[i - 1] >> 30)) * 0x0019660DU))
                + key[j] + static_cast<std::uint32_t>(j);
            ++i;
            ++j;
            if (i >= n)
            {
                state[0] = state[n - 1];
                i = 1;
            }
            if (j >= key.size()) j = 0;
        }
        for (std::size_t count = n - 1; count > 0; --count)
        {
            state[i] = (state[i] ^ ((state[i - 1] ^ (state[i - 1] >> 30)) * 0x5D588B65U))
                - static_cast<std::uint32_t>(i);
            ++i;
            if (i >= n)
            {
                state[0] = state[n - 1];
                i = 1;
            }
        }
        state[0] = 0x80000000U;
        index = 0;
    }

    std::uint32_t next()
    {
        const auto nextIndex = index + 1 >= n ? 0 : index + 1;
        const auto middleIndex = index + m >= n ? index + m - n : index + m;
        const auto y = (state[index] & upperMask) | (state[nextIndex] & lowerMask);
        state[index] = state[middleIndex] ^ (y >> 1) ^ ((y & 1U) ? matrixA : 0U);
        auto output = state[index];
        output ^= output >> 11;
        output ^= (output << 7) & 0x9d2c5680U;
        output ^= (output << 15) & 0xefc60000U;
        output ^= output >> 18;
        index = nextIndex;
        return output;
    }
};

MersenneTwister mainRng(0);
std::array<std::uint32_t, 20> mainValues{};

std::uint32_t randomRange(MersenneTwister &rng, std::uint32_t maximum)
{
    return static_cast<std::uint32_t>((static_cast<std::uint64_t>(rng.next()) * maximum) >> 32);
}

bool randomBit(MersenneTwister &rng) { return rng.next() < 0x80000000U; }

bool hasOtherTsv(std::uint32_t value)
{
    return value < 4096 && (request.otherTsvs[value >> 5] & (1U << (value & 31))) != 0;
}

int randomAbility(MersenneTwister &rng, std::uint32_t setting, std::uint32_t value)
{
    if (setting == 0) return value < 80 ? 1 : 2;
    if (setting == 1) return value < 20 ? 1 : 2;
    if (setting == 2)
    {
        if (value < 20) return 1;
        if (value < 40) return 2;
        return 3;
    }
    return 0;
}

std::uint32_t hiddenPowerType(const std::array<std::uint32_t, 6> &ivs)
{
    std::uint32_t value = 0;
    for (std::uint32_t i = 0; i < 6; ++i) value += (ivs[i] & 1U) << i;
    return (value * 15) / 63;
}

void packResult(Gen6EggResult &output, std::uint32_t frame, std::uint32_t random, std::uint32_t key0,
    std::uint32_t key1, std::uint32_t mainPid, bool hasMainPid, bool current)
{
    MersenneTwister rng(0);
    rng.seedArray({key0, key1});
    std::array<std::uint32_t, 6> ivs{};
    std::uint32_t gender = request.gender;
    if ((request.flags & 1U) != 0)
        gender = randomBit(rng) ? 1 : 2;
    else if (gender > 15)
        gender = randomRange(rng, 252) >= gender ? 1 : 2;

    const auto nature = randomRange(rng, 25);
    std::uint32_t natureParent = 0;
    const auto bothEverstone = request.maleItem == 1 && request.femaleItem == 1;
    if (bothEverstone)
        natureParent = randomBit(rng) ? 1 : 2;
    else if (request.maleItem == 1 || request.femaleItem == 1)
        natureParent = request.maleItem == 1 ? 1 : 2;

    const auto ability = static_cast<std::uint32_t>(randomAbility(rng, request.inheritAbility, randomRange(rng, 100)));
    std::array<bool, 6> inherited{};
    std::array<bool, 6> inheritedSet{};
    const auto malePower = request.maleItem > 2;
    const auto femalePower = request.femaleItem > 2;
    const auto power = malePower || femalePower;
    if (malePower && femalePower)
    {
        const auto inheritMale = randomBit(rng);
        const auto slot = inheritMale ? request.maleItem - 3 : request.femaleItem - 3;
        inherited[slot] = inheritMale;
        inheritedSet[slot] = true;
    }
    else if (malePower)
    {
        inherited[request.maleItem - 3] = true;
        inheritedSet[request.maleItem - 3] = true;
    }
    else if (femalePower)
    {
        inherited[request.femaleItem - 3] = false;
        inheritedSet[request.femaleItem - 3] = true;
    }

    const auto inheritCount = (request.maleItem == 2 || request.femaleItem == 2) ? 5U : 3U;
    const auto start = power ? 1U : 0U;
    for (std::uint32_t i = start; i < inheritCount; ++i)
    {
        std::uint32_t slot;
        do slot = randomRange(rng, 6); while (inheritedSet[slot]);
        inheritedSet[slot] = true;
        inherited[slot] = randomBit(rng);
    }
    for (std::uint32_t i = 0; i < 6; ++i)
        ivs[i] = inheritedSet[i] ? (inherited[i] ? request.maleIvs[i] : request.femaleIvs[i]) : rng.next() >> 27;

    const auto ec = rng.next();
    std::uint32_t pid = 0;
    bool shiny = false;
    bool square = false;
    const auto rerolls = ((request.flags & 2U) != 0 ? 2U : 0U) + ((request.flags & 4U) != 0 ? 6U : 0U);
    if (hasMainPid)
    {
        pid = mainPid;
        const auto xorValue = (pid >> 16) ^ (pid & 0xffffU);
        shiny = (xorValue >> 4) == request.tsv;
    }
    else
    {
        for (std::uint32_t i = 0; i < rerolls; ++i)
        {
            pid = rng.next();
            const auto xorValue = (pid >> 16) ^ (pid & 0xffffU);
            if ((xorValue >> 4) == request.tsv)
            {
                shiny = true;
                square = (xorValue & 15U) == request.trv;
                break;
            }
        }
    }
    const auto xorValue = (pid >> 16) ^ (pid & 0xffffU);
    if (!shiny && (request.flags & 8U) != 0) shiny = hasOtherTsv(xorValue >> 4);

    output.words[0] = frame;
    output.words[1] = random;
    output.words[2] = key0;
    output.words[3] = key1;
    output.words[4] = ec;
    output.words[5] = pid;
    for (std::uint32_t i = 0; i < 6; ++i) output.words[6 + i] = ivs[i];
    output.words[12] = nature | (ability << 5) | (gender << 8) | (shiny ? 1U << 10 : 0U)
        | (square ? 1U << 11 : 0U) | (current ? 1U << 12 : 0U);
    std::uint32_t maleMask = 0;
    std::uint32_t femaleMask = 0;
    for (std::uint32_t i = 0; i < 6; ++i) if (inheritedSet[i] && inherited[i]) maleMask |= 1U << i;
    for (std::uint32_t i = 0; i < 6; ++i) if (inheritedSet[i] && !inherited[i]) femaleMask |= 1U << i;
    output.words[13] = maleMask | (natureParent << 8);
    output.words[14] = xorValue >> 4;
    output.words[15] = xorValue & 15U;
    output.words[16] = hiddenPowerType(ivs);
    output.words[17] = hasMainPid ? mainPid : 0;
    output.words[18] = femaleMask;
    output.words[19] = 0;
    if (current && (request.flags & 16U) != 0)
    {
        output.words[5] = 0xffffffffU;
        output.words[14] = 0;
        output.words[15] = 0;
    }
}

bool valid(const std::uint32_t *input)
{
    if (!input || input[2] == 0 || input[1] > maxFrame
        || static_cast<std::uint64_t>(input[1]) + input[2] > static_cast<std::uint64_t>(maxFrame) + 1
        || input[5] > 4095 || input[6] > 15 || input[7] > 255 || input[8] > 8 || input[9] > 8
        || input[10] > 2 || (input[11] & ~63U) != 0 || input[25] > 4096)
        return false;
    for (std::uint32_t i = 0; i < 6; ++i)
        if (input[12 + i] > 31 || input[18 + i] > 31)
            return false;
    return true;
}
}

extern "C" std::uint32_t gen6egg_api_version() { return apiVersion; }

extern "C" std::uint32_t gen6egg_begin(const std::uint32_t *input)
{
    initialized = false;
    results.clear();
    processed = 0;
    stepProcessed = 0;
    error = 0;
    currentPending = false;
    if (!valid(input))
    {
        error = 1;
        return 0;
    }
    request.mainSeed = input[0];
    request.minFrame = input[1];
    request.frameCount = input[2];
    request.key0 = input[3];
    request.key1 = input[4];
    request.tsv = input[5];
    request.trv = input[6];
    request.gender = input[7];
    request.maleItem = input[8];
    request.femaleItem = input[9];
    request.inheritAbility = input[10];
    request.flags = input[11];
    for (std::uint32_t i = 0; i < 6; ++i)
    {
        request.maleIvs[i] = input[12 + i];
        request.femaleIvs[i] = input[18 + i];
    }
    for (std::uint32_t i = 0; i < 128; ++i) request.otherTsvs[i] = input[26 + i];

    mainRng.seedOne(request.mainSeed);
    for (std::uint32_t i = 0; i < request.minFrame; ++i) mainRng.next();
    for (auto &value : mainValues) value = mainRng.next();
    currentPending = true;
    initialized = true;
    return 1;
}

extern "C" std::uint32_t gen6egg_step(std::uint32_t maximumStates)
{
    results.clear();
    stepProcessed = 0;
    if (!initialized)
    {
        error = 2;
        return 0;
    }
    const auto count = std::min<std::uint32_t>(std::min(maximumStates, maxStep), request.frameCount - processed);
    results.reserve(count + (currentPending ? 1U : 0U));
    const bool mainPid = (request.flags & 16U) != 0;
    const auto delay = (request.flags & 32U) != 0 ? 16U : 0U;
    if (currentPending)
    {
        Gen6EggResult current{};
        packResult(current, 0xffffffffU, mainValues[0], request.key0, request.key1, 0, false, true);
        results.push_back(current);
        currentPending = false;
    }
    for (std::uint32_t i = 0; i < count; ++i)
    {
        Gen6EggResult output{};
        const auto keyOffset = delay + 1;
        const auto key0 = mainValues[keyOffset + (mainPid ? 1 : 0)];
        const auto key1 = mainValues[keyOffset + (mainPid ? 2 : 1)];
        const auto pid = mainPid ? mainValues[keyOffset] : 0;
        packResult(output, request.minFrame + processed, mainValues[0], key0, key1, pid, mainPid, false);
        results.push_back(output);
        for (std::size_t j = 0; j + 1 < mainValues.size(); ++j) mainValues[j] = mainValues[j + 1];
        mainValues.back() = mainRng.next();
        ++processed;
        ++stepProcessed;
    }
    return stepProcessed;
}

extern "C" std::uintptr_t gen6egg_result_ptr()
{
    return results.empty() ? 0 : reinterpret_cast<std::uintptr_t>(results.data());
}

extern "C" std::uint32_t gen6egg_result_count() { return static_cast<std::uint32_t>(results.size()); }
extern "C" std::uint32_t gen6egg_step_processed() { return stepProcessed; }
extern "C" std::uint32_t gen6egg_total_processed() { return processed; }
extern "C" std::uint32_t gen6egg_done() { return initialized && processed >= request.frameCount; }
extern "C" std::uint32_t gen6egg_last_error() { return error; }
