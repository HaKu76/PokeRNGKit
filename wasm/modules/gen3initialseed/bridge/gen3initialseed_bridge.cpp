/*
 * PokeRNGKit Gen III Initial Seed Finder WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * The two workflows are based on the published algorithms in
 * Real96/RSIDsInitialSeedFinder and Real96/FRLGRSEInitialSeedsFinder.
 * This bridge is an independent implementation and does not include their code.
 */

#include "gen3initialseed_bridge.h"

#include <Core/RNG/LCRNG.hpp>
#include <vector>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define POKERNGKIT_KEEPALIVE EMSCRIPTEN_KEEPALIVE
#else
#define POKERNGKIT_KEEPALIVE
#endif

namespace
{
    constexpr std::uint32_t apiVersion = 1;
    constexpr std::uint32_t maxStatesPerCall = 500000;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        RangeTooLarge = 2,
    };

    struct Jump
    {
        std::uint32_t multiplier;
        std::uint32_t addend;
    };

    thread_local std::vector<Gen3InitialSeedPackedState> results;
    thread_local std::uint32_t lastError = ErrorCode::None;

    std::uint32_t reverse(std::uint32_t state)
    {
        return state * PokeRNGR::getMult() + PokeRNGR::getAdd();
    }

    Jump compose(Jump after, Jump before)
    {
        return { after.multiplier * before.multiplier,
                 after.multiplier * before.addend + after.addend };
    }

    std::uint32_t reverseJump(std::uint32_t state, std::uint32_t advances)
    {
        Jump accumulated = { 1, 0 };
        Jump current = { PokeRNGR::getMult(), PokeRNGR::getAdd() };
        while (advances > 0)
        {
            if ((advances & 1) != 0)
            {
                accumulated = compose(current, accumulated);
            }
            current = compose(current, current);
            advances >>= 1;
        }
        return accumulated.multiplier * state + accumulated.addend;
    }

    void appendRsIdsResult(std::uint32_t sidState)
    {
        PokeRNGR rng(sidState);
        std::uint32_t initialSeed = rng.next();
        std::uint32_t advances = 0;
        while (initialSeed > 0xffff)
        {
            initialSeed = rng.next();
            advances++;
        }
        results.push_back({ initialSeed, advances });
    }
}

static_assert(sizeof(Gen3InitialSeedPackedState) == 8);

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen3initialseed_api_version()
    {
        return apiVersion;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3initialseed_find_rs_ids(std::uint32_t tid, std::uint32_t sid)
    {
        results.clear();
        lastError = ErrorCode::None;
        if (tid > 0xffff || sid > 0xffff)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }

        for (std::uint32_t low = 0; low <= 0xffff; low++)
        {
            const std::uint32_t sidState = (sid << 16) | low;
            PokeRNG forward(sidState);
            if (forward.nextUShort() == tid)
            {
                appendRsIdsResult(sidState);
            }
        }
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3initialseed_find_target(
        std::uint32_t targetSeed, std::uint32_t startAdvance, std::uint32_t stateCount)
    {
        results.clear();
        lastError = ErrorCode::None;
        if (stateCount == 0
            || stateCount > maxStatesPerCall
            || static_cast<std::uint64_t>(startAdvance) + stateCount > 0xffffffffULL)
        {
            lastError = stateCount > maxStatesPerCall ? ErrorCode::RangeTooLarge : ErrorCode::InvalidInput;
            return 0;
        }

        std::uint32_t state = reverseJump(targetSeed, startAdvance);
        results.reserve(16);
        for (std::uint32_t offset = 0; offset < stateCount; offset++)
        {
            state = reverse(state);
            if (state <= 0xffff)
            {
                results.push_back({ state, startAdvance + offset + 1 });
            }
        }
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen3initialseed_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3initialseed_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3initialseed_last_error()
    {
        return lastError;
    }
}
