/*
 * PokeRNGKit Gen VI DexNav WebAssembly bridge.
 * Adapted from 3DSRNGTool Gen6/DexNav.cs and RNG/TinyMT.cs.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#include "gen6dexnav_bridge.h"

#include <array>
#include <cstddef>
#include <cstdint>
#include <vector>

namespace
{
constexpr std::uint32_t apiVersion = 1;
constexpr std::uint32_t maxResults = 100000;
constexpr std::uint32_t maxFrame = 1000000000;
thread_local std::vector<Gen6DexNavPackedResult> results;
thread_local std::uint32_t processed = 0;
thread_local std::uint32_t error = 0;
thread_local bool limited = false;

class TinyMT
{
    std::array<std::uint32_t, 4> state{};
    static constexpr std::uint32_t mask = 0x7fffffffU;
    static constexpr std::uint32_t mat1 = 0x8f7011eeU;
    static constexpr std::uint32_t mat2 = 0xfc78ff1fU;
    static constexpr std::uint32_t tmat = 0x3793fdffU;

public:
    explicit TinyMT(std::uint32_t seed) : state{seed, mat1, mat2, tmat}
    {
        for (std::uint32_t i = 1; i < 8; ++i)
            state[i & 3] ^= i + 1812433253U * (state[(i - 1) & 3] ^ (state[(i - 1) & 3] >> 30));
        for (int i = 0; i < 8; ++i) nextState();
    }

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

std::uint32_t randRange(std::uint32_t value, std::uint32_t maximum)
{
    return static_cast<std::uint32_t>((static_cast<std::uint64_t>(value) * maximum) >> 32);
}

std::uint32_t rand100(TinyMT &rng) { return randRange(rng.next(), 100); }

std::uint8_t gradeFor(std::uint32_t searchLevel)
{
    constexpr std::array<std::uint32_t, 5> ranges = {5, 10, 25, 50, 100};
    for (std::uint8_t grade = 0; grade < ranges.size(); ++grade)
        if (searchLevel < ranges[grade]) return grade;
    return 5;
}

std::uint8_t fluteBoost(std::uint32_t value)
{
    if (value < 40) return 1;
    if (value < 70) return 2;
    if (value < 90) return 3;
    return 4;
}

std::uint8_t slotCount(std::uint32_t type)
{
    return type == 2 ? 5 : type == 3 ? 3 : 12;
}

struct Generated
{
    std::int32_t x = 0;
    std::int32_t y = 0;
    std::uint8_t additionalDelay = 0;
    std::uint8_t slot = 0;
    std::uint8_t slotType = 0;
    bool boost = false;
    std::uint8_t lead = 0;
    std::uint8_t levelBoost = 0;
    std::uint8_t flute = 0;
    bool ha = false;
    std::uint8_t potential = 0;
    bool eggMove = false;
    std::uint8_t heldItem = 3;
    bool forcedShiny = false;
    bool sync = false;
    std::uint8_t grade = 0;
};

Generated generateOne(const Gen6DexNavPackedRequest &request, TinyMT &rng)
{
    Generated output;
    if (!request.activeSearch)
    {
        rng.next();
        rng.next();
        if (rand100(rng) >= 50) return output;
    }

    // FindPatch and PostCheck are successful placeholders in the upstream class.
    output.x = -9;
    output.y = -9;
    switch (randRange(rng.next(), 4))
    {
    case 0: output.x = -9 + static_cast<std::int32_t>(randRange(rng.next(), 18)); output.y = -9 + static_cast<std::int32_t>(randRange(rng.next(), 3)); break;
    case 1: output.x = -9 + static_cast<std::int32_t>(randRange(rng.next(), 3)); output.y = -7 + static_cast<std::int32_t>(randRange(rng.next(), 14)); break;
    case 2: output.x = 7 + static_cast<std::int32_t>(randRange(rng.next(), 3)); output.y = -7 + static_cast<std::int32_t>(randRange(rng.next(), 14)); break;
    default: output.x = -9 + static_cast<std::int32_t>(randRange(rng.next(), 18)); output.y = 7 + static_cast<std::int32_t>(randRange(rng.next(), 3)); break;
    }

    output.slotType = rand100(rng) < 30 && request.hasDexNav ? 3 : static_cast<std::uint8_t>(request.encounterType);
    output.boost = (request.chainLength > 0 && (request.chainLength + 1) % 5 == 0) || rand100(rng) < 4;
    output.lead = static_cast<std::uint8_t>(rand100(rng));
    output.sync = output.lead < 50;
    if (!request.activeSearch)
    {
        output.slot = slotCount(output.slotType);
        for (int slot = static_cast<int>(output.slot) - 1; slot >= 0; --slot)
        {
            if (rand100(rng) < 30)
            {
                output.slot = static_cast<std::uint8_t>(slot);
                break;
            }
            if (slot == 0) output.slot = 0;
        }
    }
    rng.next();
    output.grade = gradeFor(request.searchLevel);
    output.levelBoost = static_cast<std::uint8_t>(request.chainLength / 5 + (output.boost ? 10 : 0));
    output.flute = fluteBoost(rand100(rng));
    constexpr std::array<std::uint8_t, 6> haRate = {0, 0, 5, 15, 20, 25};
    const auto haRoll = rand100(rng);
    output.ha = request.navHa || haRoll < haRate[output.grade];
    constexpr std::array<std::uint8_t, 18> ivRate = {0,0,0, 10,0,0, 15,10,0, 20,15,5, 15,20,5, 10,25,10};
    int index = 0;
    for (index = 2; index >= 0; --index)
        if (rand100(rng) < ivRate[3 * output.grade + index]) break;
    index += output.boost ? 2 : 1;
    output.potential = static_cast<std::uint8_t>(index > 3 ? 3 : index);
    const auto eggMoveRoll = rand100(rng);
    output.eggMove = eggMoveRoll < std::array<std::uint8_t, 6>{20,50,55,60,65,80}[output.grade] || output.boost;
    auto itemRandom = rand100(rng);
    constexpr std::array<std::uint8_t, 12> itemRate = {40,10, 40,10, 45,15, 50,20, 50,20, 50,30};
    int item = 0;
    for (; item < 2; ++item)
    {
        auto threshold = itemRate[output.grade * 2 + item] + (request.compoundEyes ? 5U : 0U);
        if (itemRandom < threshold) break;
        itemRandom -= threshold;
    }
    output.heldItem = item >= 2 ? 3 : static_cast<std::uint8_t>(item);
    int checkCount = request.shinyCharm ? 3 : 1;
    if (output.boost) checkCount += 4;
    if (request.chainLength == 49) checkCount += 5;
    else if (request.chainLength == 99) checkCount += 10;
    const auto target = request.searchLevel > 200 ? request.searchLevel + 600 : request.searchLevel > 100 ? 2 * request.searchLevel + 400 : 6 * request.searchLevel;
    for (int i = 0; i < checkCount; ++i)
        if (randRange(rng.next(), 10000) < target) output.forcedShiny = true;
    output.forcedShiny = output.forcedShiny || request.forcedShiny;
    rng.next();
    rng.next();
    return output;
}

bool valid(const Gen6DexNavPackedRequest *request)
{
    if (!request || request->minFrame > maxFrame || request->frameCount == 0 ||
        static_cast<std::uint64_t>(request->minFrame) + request->frameCount > static_cast<std::uint64_t>(maxFrame) + 1 ||
        request->tinyFrame > maxFrame || request->encounterType > 2 || request->activeSearch > 1 ||
        request->hasDexNav > 1 || request->searchLevel > 999 || request->chainLength > 999 ||
        request->shinyCharm > 1 || request->compoundEyes > 1 || request->forcedShiny > 1 ||
        request->navHa > 1 || request->navUnown > 1 || request->potential > 3 || request->flute < -1 || request->flute > 1 ||
        request->tsv > 4095 || request->trv > 15 || request->resultLimit == 0 || request->resultLimit > maxResults)
        return false;
    for (std::size_t i = 0; i < 13; ++i)
        if (request->species[i] > 721 || request->levels[i] > 100) return false;
    return true;
}

Gen6DexNavPackedResult pack(const Gen6DexNavPackedRequest &request, std::uint32_t frame, const Generated &value)
{
    Gen6DexNavPackedResult result{};
    result.frame = frame;
    result.random = request.tinySeed;
    result.coordinates = static_cast<std::uint32_t>(static_cast<std::uint16_t>(value.x)) |
                         (static_cast<std::uint32_t>(static_cast<std::uint16_t>(value.y)) << 16);
    result.slot = value.slot | (static_cast<std::uint32_t>(value.slotType) << 8);
    result.details = value.additionalDelay | (static_cast<std::uint32_t>(value.lead) << 8) |
                     (static_cast<std::uint32_t>(value.levelBoost) << 16) | (static_cast<std::uint32_t>(value.flute) << 24);
    result.flags = (value.boost ? 1U : 0U) | (value.sync ? 2U : 0U) | (value.ha ? 4U : 0U) |
                   (value.eggMove ? 8U : 0U) | (value.forcedShiny ? 16U : 0U) | (request.activeSearch ? 32U : 0U);
    result.species = request.navUnown ? 201U : request.species[value.slotType == 3 ? 0 : value.slot + 1];
    const auto baseLevel = static_cast<int>(request.levels[value.slotType == 3 ? 0 : value.slot + 1]);
    auto adjustedLevel = baseLevel + static_cast<int>(value.levelBoost) + static_cast<int>(request.flute) * value.flute;
    if (adjustedLevel < 1) adjustedLevel = 1;
    if (adjustedLevel > 100) adjustedLevel = 100;
    result.level = static_cast<std::uint32_t>(adjustedLevel);
    const auto displayedPotential = value.potential < request.potential ? request.potential : value.potential;
    result.grade = value.grade | (static_cast<std::uint32_t>(displayedPotential) << 8) | (static_cast<std::uint32_t>(value.heldItem) << 16);
    result.searchLevel = request.searchLevel;
    return result;
}
}

extern "C" std::uint32_t gen6dexnav_api_version() { return apiVersion; }

extern "C" std::uint32_t gen6dexnav_generate(const Gen6DexNavPackedRequest *request)
{
    results.clear();
    processed = 0;
    error = 0;
    limited = false;
    if (!valid(request)) { error = 1; return 0; }
    results.reserve(request->resultLimit);
    for (std::uint32_t offset = 0; offset < request->frameCount; ++offset)
    {
        const auto frame = request->minFrame + offset;
        TinyMT rng(request->tinySeed);
        rng.advance(request->tinyFrame + frame);
        const auto generated = generateOne(*request, rng);
        ++processed;
        if (generated.forcedShiny || request->forcedShiny == 0)
        {
            results.push_back(pack(*request, frame, generated));
            if (results.size() >= request->resultLimit) { limited = true; break; }
        }
    }
    return static_cast<std::uint32_t>(results.size());
}

extern "C" std::uintptr_t gen6dexnav_result_ptr() { return results.empty() ? 0 : reinterpret_cast<std::uintptr_t>(results.data()); }
extern "C" std::uint32_t gen6dexnav_result_count() { return static_cast<std::uint32_t>(results.size()); }
extern "C" std::uint32_t gen6dexnav_processed_count() { return processed; }
extern "C" std::uint32_t gen6dexnav_limit_reached() { return limited ? 1U : 0U; }
extern "C" std::uint32_t gen6dexnav_last_error() { return error; }
