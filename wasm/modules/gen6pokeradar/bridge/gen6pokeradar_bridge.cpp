/*
 * PokeRNGKit Gen VI Poke Radar WebAssembly bridge.
 * Adapted from 3DSRNGTool Gen6/PokeRadar.cs and RNG/TinyMT.cs.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#include "gen6pokeradar_bridge.h"

#include <array>
#include <cstddef>
#include <cstdint>
#include <vector>

namespace
{
constexpr std::uint32_t apiVersion = 1;
constexpr std::uint32_t maxFrame = 1000000000;
constexpr std::uint32_t maxResults = 100000;
thread_local std::vector<Gen6PokeRadarResult> results;
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

std::uint32_t randRange(TinyMT &rng, std::uint32_t maximum)
{
    return static_cast<std::uint32_t>((static_cast<std::uint64_t>(rng.next()) * maximum) >> 32);
}

struct Patch
{
    std::uint8_t ring = 0;
    std::uint8_t direction = 0;
    std::uint8_t location = 0;
    std::uint8_t state = 0;
};

std::uint32_t packPatch(const Patch &patch)
{
    int x = 4;
    int y = 4;
    switch (patch.direction)
    {
    case 0:
        x = 3 - patch.ring + patch.location;
        y = 3 - patch.ring;
        break;
    case 1:
        x = 3 - patch.ring + patch.location;
        y = 5 + patch.ring;
        break;
    case 2:
        x = 3 - patch.ring;
        y = 3 - patch.ring + patch.location;
        break;
    default:
        x = 5 + patch.ring;
        y = 3 - patch.ring + patch.location;
        break;
    }

    return patch.ring | (static_cast<std::uint32_t>(patch.direction) << 4)
        | (static_cast<std::uint32_t>(patch.location) << 8)
        | (static_cast<std::uint32_t>(patch.state) << 12) | (static_cast<std::uint32_t>(x) << 16)
        | (static_cast<std::uint32_t>(y) << 20);
}

Gen6PokeRadarResult generate(const Gen6PokeRadarRequest &request, std::uint32_t frame)
{
    TinyMT rng(request.tinySeed);
    rng.advance(request.tinyFrame + frame + 3U * request.partySize);

    Gen6PokeRadarResult result{};
    result.frame = frame;

    const auto music = randRange(rng, 100);
    const bool boost = request.boost != 0 && music >= 50;
    bool shiny = false;
    result.music = music | (static_cast<std::uint32_t>(music < 2 ? 0 : music > 49 ? 2 : 1) << 8)
        | (boost ? 1U << 16 : 0);

    constexpr std::array<std::uint32_t, 4> goodRate = {23, 43, 63, 83};
    for (std::uint32_t ring = 0; ring < 4; ++ring)
    {
        Patch patch{
            static_cast<std::uint8_t>(ring),
            static_cast<std::uint8_t>(randRange(rng, 4)),
            static_cast<std::uint8_t>(randRange(rng, ring * 2 + 3)),
            0,
        };
        if (randRange(rng, 100) < goodRate[ring])
        {
            rng.next();
            const auto chance = boost || request.chainLength >= 40 ? 100U : 8100U - request.chainLength * 200U;
            patch.state = static_cast<std::uint8_t>(
                static_cast<std::uint64_t>(rng.next()) * chance <= 0xffffffffULL ? 2 : 1);
        }
        shiny = shiny || patch.state == 2;
        result.patches[ring] = packPatch(patch);
    }

    const auto emptyRing = randRange(rng, 3);
    const Patch empty{
        static_cast<std::uint8_t>(emptyRing),
        static_cast<std::uint8_t>(randRange(rng, 4)),
        static_cast<std::uint8_t>(randRange(rng, emptyRing * 2 + 3)),
        3,
    };
    result.patches[4] = packPatch(empty);
    if (shiny) result.music |= 1U << 17;
    return result;
}

bool valid(const Gen6PokeRadarRequest *request)
{
    return request != nullptr && request->frameCount > 0 && request->minFrame <= maxFrame
        && static_cast<std::uint64_t>(request->minFrame) + request->frameCount
            <= static_cast<std::uint64_t>(maxFrame) + 1
        && request->tinyFrame <= maxFrame && request->partySize <= 6 && request->chainLength <= 100
        && request->boost <= 1 && request->resultLimit > 0 && request->resultLimit <= maxResults;
}
}

extern "C" std::uint32_t gen6pokeradar_api_version() { return apiVersion; }

extern "C" std::uint32_t gen6pokeradar_generate(const Gen6PokeRadarRequest *request)
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

    results.reserve(request->resultLimit);
    for (std::uint32_t i = 0; i < request->frameCount; ++i)
    {
        results.push_back(generate(*request, request->minFrame + i));
        ++processed;
        if (results.size() >= request->resultLimit)
        {
            limited = processed < request->frameCount;
            break;
        }
    }
    return static_cast<std::uint32_t>(results.size());
}

extern "C" std::uintptr_t gen6pokeradar_result_ptr()
{
    return results.empty() ? 0 : reinterpret_cast<std::uintptr_t>(results.data());
}

extern "C" std::uint32_t gen6pokeradar_result_count()
{
    return static_cast<std::uint32_t>(results.size());
}

extern "C" std::uint32_t gen6pokeradar_processed_count() { return processed; }

extern "C" std::uint32_t gen6pokeradar_limit_reached() { return limited ? 1U : 0U; }

extern "C" std::uint32_t gen6pokeradar_last_error() { return error; }
