/*
 * PokeRNGKit Gen VI Wild WebAssembly bridge.
 * Adapted from 3DSRNGTool revision 359bdd7a9ff7c145fec12302cf43da932923fa62.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#include "gen6wild_bridge.h"

#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>
#include <vector>

namespace
{
constexpr std::uint32_t apiVersion = 1;
constexpr std::uint32_t maxResults = 100000;
constexpr std::uint32_t maxFrame = 1000000000;
constexpr std::uint32_t browserFrame = 5000000;
constexpr std::size_t streamPadding = 512;
constexpr std::uint32_t allNatures = 0x1ffffffU;
constexpr std::uint32_t allHiddenPower = 0xffffU;

thread_local std::vector<Gen6WildPackedResult> results;
thread_local std::uint32_t processed = 0;
thread_local std::uint32_t error = 0;
thread_local bool limited = false;

class MersenneTwister
{
    static constexpr std::size_t n = 624;
    static constexpr std::size_t m = 397;
    static constexpr std::uint32_t matrixA = 0x9908b0dfU;
    static constexpr std::uint32_t upperMask = 0x80000000U;
    static constexpr std::uint32_t lowerMask = 0x7fffffffU;
    std::array<std::uint32_t, n> state{};
    std::size_t index = 0;

public:
    explicit MersenneTwister(std::uint32_t seed)
    {
        state[0] = seed;
        for (std::size_t i = 1; i < n; ++i)
            state[i] = 1812433253U * (state[i - 1] ^ (state[i - 1] >> 30)) +
                       static_cast<std::uint32_t>(i);
    }

    std::uint32_t next()
    {
        const auto nextIndex = index + 1 == n ? 0 : index + 1;
        const auto periodIndex = index + m < n ? index + m : index + m - n;
        const auto combined = (state[index] & upperMask) | (state[nextIndex] & lowerMask);
        state[index] = state[periodIndex] ^ (combined >> 1) ^
                       ((combined & 1U) != 0 ? matrixA : 0U);
        auto value = state[index];
        value ^= value >> 11;
        value ^= (value << 7) & 0x9d2c5680U;
        value ^= (value << 15) & 0xefc60000U;
        value ^= value >> 18;
        index = nextIndex;
        return value;
    }
};

class TinyMT
{
    std::array<std::uint32_t, 4> state{};
    static constexpr std::uint32_t mask = 0x7fffffffU;
    static constexpr std::uint32_t mat1 = 0x8f7011eeU;
    static constexpr std::uint32_t mat2 = 0xfc78ff1fU;
    static constexpr std::uint32_t tmat = 0x3793fdffU;

public:
    explicit TinyMT(std::uint32_t seed)
    {
        state = {seed, mat1, mat2, tmat};
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

std::uint8_t hiddenPower(const std::array<std::uint8_t, 6> &ivs)
{
    constexpr std::array<std::uint8_t, 6> order = {0, 1, 2, 4, 5, 3};
    std::uint32_t bits = 0;
    for (std::size_t i = 0; i < ivs.size(); ++i)
        bits += static_cast<std::uint32_t>(ivs[i] & 1U) << order[i];
    return static_cast<std::uint8_t>((bits * 15) / 63);
}

std::uint8_t shinyValue(std::uint32_t pid, std::uint32_t tsv, std::uint32_t trv)
{
    const auto xorValue = (pid >> 16) ^ (pid & 0xffffU);
    if ((xorValue >> 4) != tsv) return 0;
    return static_cast<std::uint8_t>((xorValue & 15U) == trv ? 2 : 1);
}

std::uint8_t genderSetting(std::uint32_t raw)
{
    if (raw == 0) return 1;
    if (raw == 254) return 2;
    if (raw > 15 && raw < 239) return static_cast<std::uint8_t>(raw - 1);
    return 0;
}

std::uint8_t heldItem(std::uint32_t value, bool compoundEyes)
{
    if (value < (compoundEyes ? 60U : 50U)) return 0;
    if (value < (compoundEyes ? 80U : 55U)) return 1;
    if (value < (compoundEyes ? 85U : 56U)) return 2;
    return 3;
}

std::uint8_t fluteBoost(std::uint32_t value)
{
    if (value < 40) return 1;
    if (value < 70) return 2;
    if (value < 90) return 3;
    return 4;
}

struct Generated
{
    std::uint32_t frame = 0;
    std::uint32_t random = 0;
    std::uint32_t ec = 0;
    std::uint32_t pid = 0;
    std::array<std::uint8_t, 6> ivs{};
    std::uint8_t nature = 0;
    std::uint8_t ability = 0;
    std::uint8_t gender = 0;
    std::uint8_t hiddenPower = 0;
    std::uint8_t shiny = 0;
    std::uint8_t item = 3;
    std::uint8_t slot = 0;
    std::uint16_t species = 0;
    std::uint8_t level = 0;
    std::uint32_t frameUsed = 0;
    bool synchronize = false;
    bool validPokemon = true;
};

std::uint32_t slotFor(const Gen6WildPackedRequest &request, std::uint32_t value)
{
    const auto slotCount = request.encounterType == 0 ? 12U :
                           request.encounterType == 1 || request.encounterType == 2 ? 5U : 3U;
    auto random = randRange(value, 100);
    for (std::uint32_t slot = 0; slot < slotCount; ++slot)
    {
        if (random < request.slotDistribution[slot]) return slot + 1;
        random -= request.slotDistribution[slot];
    }
    return slotCount;
}

bool valid(const Gen6WildPackedRequest *request)
{
    if (!request || request->version > 1 || request->encounterType > 3 ||
        request->frameCount == 0 || request->minFrame > maxFrame ||
        static_cast<std::uint64_t>(request->minFrame) + request->frameCount >
            static_cast<std::uint64_t>(maxFrame) + 1 ||
        request->delay > 4000 || request->considerDelay > 1 || request->tsv > 4095 ||
        request->trv > 15 || request->shinyCharm > 1 ||
        (request->syncNature != 255 && request->syncNature > 24) ||
        request->tinyFrame > maxFrame ||
        request->tinySynced > 1 || request->encounterRate > 100 || request->partyPokemon > 5 ||
        request->pidRolls == 0 || request->pidRolls > 40 || request->compoundEyes > 1 ||
        request->hiddenAbility > 1 || request->flute < -1 || request->flute > 1 ||
        request->hordeSlot > 3 || request->filtersDisabled > 1 || request->shinyMask > 7 ||
        request->genderFilter > 3 || request->abilityFilter > 3 ||
        request->natureMask > allNatures || request->hiddenPowerMask == 0 ||
        request->hiddenPowerMask > allHiddenPower || request->perfectIvValue > 31 ||
        request->perfectIvCount > 6 || request->itemFilter > 4 || request->resultLimit == 0 ||
        request->resultLimit > maxResults)
        return false;
    const auto slotCount = request->encounterType == 0 ? 12U :
                           request->encounterType == 1 || request->encounterType == 2 ? 5U : 3U;
    std::uint32_t total = 0;
    for (std::uint32_t slot = 0; slot < slotCount; ++slot)
    {
        if (request->species[slot + 1] > 721 || request->levels[slot + 1] > 100 ||
            request->slotMetadata[slot + 1] > 0xffffU)
            return false;
        total += request->slotDistribution[slot];
    }
    if (total != 100) return false;
    if (request->syncNature != 255 && request->syncNature > 24) return false;
    if (request->natureMask == 0 || request->natureMask > allNatures ||
        request->hiddenPowerMask == 0 || request->hiddenPowerMask > allHiddenPower)
        return false;
    for (std::size_t i = 0; i < 6; ++i)
        if (request->ivMin[i] > request->ivMax[i] || request->ivMax[i] > 31) return false;
    return true;
}

Generated generateOne(const Gen6WildPackedRequest &request, const std::vector<std::uint32_t> &stream,
                      std::uint32_t frame, TinyMT &tiny, std::uint32_t forcedSlot = 0,
                      std::uint32_t forcedItem = 101, bool prepareTiny = true,
                      bool preparedValid = true, bool preparedSync = false,
                      std::size_t *sharedCursor = nullptr)
{
    Generated result;
    result.frame = frame;
    result.random = stream[frame];
    std::size_t cursorStorage = static_cast<std::size_t>(frame) + 1;
    if (request.considerDelay != 0) cursorStorage += request.delay;
    auto &cursor = sharedCursor ? *sharedCursor : cursorStorage;
    const auto next = [&]() { return stream[cursor++]; };
    const auto randTiny = [&](std::uint32_t maximum) { return randRange(tiny.next(), maximum); };

    if (prepareTiny) tiny.advance(request.delay);
    if (prepareTiny && request.encounterType == 3)
    {
        tiny.advance(request.partyPokemon * 3U);
        const auto randomDelay = randTiny(7) * 30U + 60U;
        tiny.advance(randomDelay);
        cursor += 132U + randomDelay;
    }
    if (prepareTiny && request.encounterType == 2)
    {
        tiny.advance(4);
        result.validPokemon = randTiny(3) == 0;
    }

    const auto leadRandom = prepareTiny ? randTiny(100) : 0;
    const bool syncPass = prepareTiny ? (request.tinySynced || (request.lead == 1 && leadRandom < 50)) : preparedSync;
    const bool cutePass = request.lead == 2 || request.lead == 3 ? (prepareTiny ? leadRandom < 67 : false) : false;
    const bool levelPass = request.lead == 8 && (prepareTiny ? leadRandom < 50 : false);
    result.synchronize = syncPass;
    if (!prepareTiny) result.validPokemon = preparedValid;

    if (prepareTiny && request.encounterType != 1)
    {
        if (request.encounterType == 0 || request.encounterType == 3)
        {
            if (randTiny(100) >= request.encounterRate) result.validPokemon = false;
        }
        result.slot = forcedSlot != 0 ? static_cast<std::uint8_t>(forcedSlot) :
                    static_cast<std::uint8_t>(slotFor(request, tiny.next()));
    }
    else if (prepareTiny)
    {
        result.slot = forcedSlot != 0 ? static_cast<std::uint8_t>(forcedSlot) :
                    static_cast<std::uint8_t>(slotFor(request, tiny.next()));
    }

    if (prepareTiny && request.flute != 0) tiny.advance(1);
    const auto itemRandom = forcedItem <= 100 ? forcedItem : (prepareTiny ? randTiny(100) : 100);
    result.item = static_cast<std::uint8_t>(heldItem(itemRandom, request.compoundEyes != 0));
    if (!result.validPokemon) return result;

    if (prepareTiny) cursor += 60;
    const auto metadata = request.slotMetadata[result.slot];
    result.species = static_cast<std::uint16_t>(request.species[result.slot]);
    result.level = static_cast<std::uint8_t>(request.levels[result.slot]);
    if (levelPass && result.level < 100) result.level = 100;
    if (request.flute != 0)
    {
        const auto boost = fluteBoost(randTiny(100));
        auto level = static_cast<int>(result.level) + request.flute * static_cast<int>(boost);
        result.level = static_cast<std::uint8_t>(std::clamp(level, 1, 100));
    }
    result.ec = next();
    const auto rolls = request.shinyCharm != 0 ? std::max(1U, request.pidRolls) : 1U;
    for (std::uint32_t i = 0; i < rolls; ++i)
    {
        result.pid = next();
        if (shinyValue(result.pid, request.tsv, request.trv) != 0) break;
    }
    std::array<bool, 6> used{};
    auto perfect = (metadata & (1U << 9)) != 0 ? 3U : request.perfectIvCount;
    while (perfect > 0)
    {
        const auto index = randRange(next(), 6);
        if (!used[index])
        {
            used[index] = true;
            result.ivs[index] = 31;
            --perfect;
        }
    }
    for (auto &value : result.ivs)
        if (value == 0) value = static_cast<std::uint8_t>(next() >> 27);
    result.ability = request.hiddenAbility != 0 ? 3 : static_cast<std::uint8_t>((next() >> 31) + 1);
    result.nature = result.synchronize && request.syncNature < 25
                        ? static_cast<std::uint8_t>(request.syncNature)
                        : static_cast<std::uint8_t>(randRange(next(), 25));
    const auto rawGender = metadata & 0xffU;
    const auto setting = genderSetting(rawGender);
    const bool randomGender = rawGender > 15 && rawGender < 239;
    result.gender = randomGender ? static_cast<std::uint8_t>(cutePass ?
        (request.lead == 2 ? 2 : 1) : (randRange(next(), 252) >= setting ? 1 : 2)) : setting;
    result.hiddenPower = hiddenPower(result.ivs);
    const auto xorValue = (result.pid >> 16) ^ (result.pid & 0xffffU);
    result.shiny = shinyValue(result.pid, request.tsv, request.trv);
    result.frameUsed = static_cast<std::uint32_t>(cursor - (static_cast<std::size_t>(frame) + 1));
    return result;
}

bool passes(const Gen6WildPackedRequest &request, const Generated &result)
{
    if (!result.validPokemon) return false;
    if (request.filtersDisabled != 0) return true;
    if ((request.shinyMask & (1U << result.shiny)) == 0 ||
        (request.genderFilter != 3 && request.genderFilter != result.gender) ||
        (request.abilityFilter != 0 && request.abilityFilter != result.ability) ||
        (request.natureMask & (1U << result.nature)) == 0 ||
        (request.hiddenPowerMask & (1U << result.hiddenPower)) == 0 ||
        (request.slotMask != 0 && (request.slotMask & (1U << result.slot)) == 0) ||
        (request.itemFilter != 4 && request.itemFilter != result.item)) return false;
    const auto perfect = std::count_if(result.ivs.begin(), result.ivs.end(), [&](auto value) {
        return value >= request.perfectIvValue;
    });
    if (perfect < static_cast<int>(request.perfectIvCount)) return false;
    for (std::size_t i = 0; i < 6; ++i)
        if (result.ivs[i] < request.ivMin[i] || result.ivs[i] > request.ivMax[i]) return false;
    return true;
}

Gen6WildPackedResult pack(const Generated &result)
{
    std::uint32_t iv0 = 0;
    std::uint32_t iv1 = 0;
    for (std::size_t i = 0; i < 4; ++i) iv0 |= static_cast<std::uint32_t>(result.ivs[i]) << (i * 8);
    for (std::size_t i = 4; i < 6; ++i) iv1 |= static_cast<std::uint32_t>(result.ivs[i]) << ((i - 4) * 8);
    const auto metadata = result.nature | (static_cast<std::uint32_t>(result.ability) << 5) |
                          (static_cast<std::uint32_t>(result.gender) << 7) |
                          (static_cast<std::uint32_t>(result.hiddenPower) << 9) |
                          (static_cast<std::uint32_t>(result.shiny) << 13) |
                          (static_cast<std::uint32_t>(result.synchronize) << 15);
    const auto encounter = result.species | (static_cast<std::uint32_t>(result.level) << 11) |
                           (static_cast<std::uint32_t>(result.slot) << 18);
    const auto xorValue = (result.pid >> 16) ^ (result.pid & 0xffffU);
    return {result.frame, result.random, result.ec, result.pid, iv0, iv1, metadata, encounter,
            result.item, result.frameUsed, xorValue >> 4, xorValue & 15U, 0, 0, 0, 0};
}
} // namespace

extern "C"
{
std::uint32_t gen6wild_api_version() { return apiVersion; }

std::uint32_t gen6wild_generate(const Gen6WildPackedRequest *request)
{
    results.clear();
    processed = 0;
    error = 0;
    limited = false;
    if (!valid(request))
    {
        error = 1;
        return 0;
    }
    const auto required = static_cast<std::uint64_t>(request->minFrame) + request->frameCount +
                          request->delay + streamPadding + 512;
    MersenneTwister rng(request->seed);
    std::vector<std::uint32_t> stream;
    stream.reserve(static_cast<std::size_t>(required));
    for (std::uint64_t i = 0; i < required; ++i) stream.push_back(rng.next());

    for (std::uint32_t offset = 0; offset < request->frameCount; ++offset)
    {
        const auto frame = request->minFrame + offset;
        TinyMT tiny(request->tinySeed);
        tiny.advance(request->tinyFrame + frame);
        ++processed;
        if (request->encounterType == 1)
        {
            TinyMT hordeTiny(request->tinySeed);
            hordeTiny.advance(request->tinyFrame + frame);
            hordeTiny.advance(request->delay);
            const auto hordeLead = randRange(hordeTiny.next(), 100);
            const auto hordeSync = request->tinySynced || (request->lead == 1 && hordeLead < 50);
            std::array<std::uint32_t, 5> hordeItems{};
            for (auto &item : hordeItems)
            {
                if (request->flute != 0) hordeTiny.advance(1);
                item = heldItem(randRange(hordeTiny.next(), 100), request->compoundEyes != 0);
            }
            std::size_t hordeCursor = static_cast<std::size_t>(frame) + 1;
            if (request->considerDelay != 0) hordeCursor += request->delay;
            hordeCursor += 60;
            for (std::uint32_t slot = 1; slot <= 5; ++slot)
            {
                const auto result = generateOne(*request, stream, frame, hordeTiny, slot,
                                                 hordeItems[slot - 1], false, true, hordeSync,
                                                 &hordeCursor);
                if (passes(*request, result)) results.emplace_back(pack(result));
                if (results.size() >= request->resultLimit)
                {
                    limited = offset + 1 < request->frameCount;
                    return static_cast<std::uint32_t>(results.size());
                }
            }
        }
        else
        {
            const auto first = generateOne(*request, stream, frame, tiny);
            if (passes(*request, first)) results.emplace_back(pack(first));
            if (results.size() >= request->resultLimit)
            {
                limited = offset + 1 < request->frameCount;
                break;
            }
        }
    }
    return static_cast<std::uint32_t>(results.size());
}

std::uintptr_t gen6wild_result_ptr() { return results.empty() ? 0 : reinterpret_cast<std::uintptr_t>(results.data()); }
std::uint32_t gen6wild_result_count() { return static_cast<std::uint32_t>(results.size()); }
std::uint32_t gen6wild_processed_count() { return processed; }
std::uint32_t gen6wild_limit_reached() { return limited ? 1U : 0U; }
std::uint32_t gen6wild_last_error() { return error; }
}
