/*
 * PokeRNGKit Gen III Jirachi Advancer WebAssembly bridge.
 * Copyright (C) 2017-2024 by Admiral_Fish, bumba, and EzPzStreamz
 * Copyright (C) 2026 Hakuhiro
 *
 * Derived from PokeFinder's JirachiPattern under GNU GPL-3.0-or-later.
 * The bridge API and packed action format are PokeRNGKit additions.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#include "gen3jirachi_bridge.h"

#include <Core/RNG/LCRNG.hpp>
#include <algorithm>
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
    constexpr std::uint32_t outsideRange = 1;
    constexpr std::uint32_t unobtainable = 2;

    thread_local std::vector<std::uint32_t> results;
    thread_local std::uint32_t targetAdvances = 0;
    thread_local std::uint32_t lastError = 0;

    void advanceCutscene(XDRNG &rng, std::uint32_t &count) { rng.advance(1, &count); }

    void advanceJirachi(XDRNG &rng, std::uint32_t &count)
    {
        rng.advance(4, &count);
        bool flag = false;
        if (rng.nextUShort(&count) <= 0x4000)
        {
            flag = true;
        }
        else
        {
            flag = rng.nextUShort(&count) <= 0x547a;
        }
        rng.advance(flag ? 1 : 2, &count);
    }

    void advanceMenu(XDRNG &rng, std::uint32_t &count)
    {
        std::uint8_t mask = 0;
        do
        {
            const std::uint8_t num = rng.nextUShort(&count) >> 14;
            mask |= 1 << num;
        } while (mask < 14);
    }

    void advanceTitleScreen(XDRNG &rng, std::uint32_t &count) { rng.advance(1, &count); }

    void incrementSearchActions(std::vector<std::uint8_t> &actions)
    {
        bool increment = true;
        for (std::size_t i = 0; i < actions.size(); i++)
        {
            const std::uint8_t compare = i == 0 ? 2 : 3;
            if (actions[i] >= compare)
            {
                increment = false;
                actions[i] = 0;
                if (i != actions.size() - 1)
                {
                    actions[i + 1]++;
                }
            }
            else if (increment)
            {
                actions[i]++;
                break;
            }
        }
    }

    std::vector<std::uint8_t> calculateActions(std::uint32_t seed, std::uint32_t targetAdvance, std::uint32_t bruteForce)
    {
        if (targetAdvance < 6)
        {
            return {};
        }
        if (targetAdvance <= 8)
        {
            XDRNG rng(seed);
            std::uint32_t count = 0;
            advanceJirachi(rng, count);
            if (count == targetAdvance)
            {
                return { 255 };
            }
        }

        XDRNG menu(seed);
        std::uint32_t menuAdvance = 0;
        std::uint32_t menuCount = 0;
        while (targetAdvance > bruteForce + menuAdvance)
        {
            menuCount++;
            advanceMenu(menu, menuAdvance);
        }

        for (std::size_t actionCount = 1;; actionCount++)
        {
            bool done = true;
            std::vector<std::uint8_t> searchActions(actionCount, 0);
            while (true)
            {
                std::uint32_t searchAdvance = menuAdvance;
                XDRNG rng(menu);
                bool valid = true;
                for (const std::uint8_t action : searchActions)
                {
                    if (action == 0)
                    {
                        advanceMenu(rng, searchAdvance);
                    }
                    else if (action == 1)
                    {
                        advanceJirachi(rng, searchAdvance);
                        advanceTitleScreen(rng, searchAdvance);
                        advanceMenu(rng, searchAdvance);
                    }
                    else
                    {
                        advanceCutscene(rng, searchAdvance);
                        advanceTitleScreen(rng, searchAdvance);
                        advanceMenu(rng, searchAdvance);
                    }
                    if (searchAdvance + 6 > targetAdvance)
                    {
                        valid = false;
                        break;
                    }
                }
                if (valid)
                {
                    done = false;
                    advanceJirachi(rng, searchAdvance);
                    if (searchAdvance == targetAdvance)
                    {
                        std::vector<std::uint8_t> actions(menuCount + searchActions.size() + 1, 0);
                        std::ranges::copy(searchActions, actions.begin() + menuCount);
                        actions.back() = 3;
                        return actions;
                    }
                }
                if (std::ranges::count(searchActions, 2) == static_cast<std::ptrdiff_t>(actionCount))
                {
                    break;
                }
                incrementSearchActions(searchActions);
            }
            if (done)
            {
                break;
            }
        }
        return {};
    }

    std::uint32_t computeJirachiSeed(std::uint32_t seed)
    {
        std::uint32_t count = 0;
        XDRNG rng(seed);
        advanceMenu(rng, count);
        advanceJirachi(rng, count);
        return rng.getSeed();
    }
}

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen3jirachi_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3jirachi_calculate(
        std::uint32_t startingSeed, std::uint32_t targetSeed, std::uint32_t maxAdvances, std::uint32_t bruteForceRange)
    {
        results.clear();
        lastError = 0;
        const std::uint32_t computedTarget = computeJirachiSeed(targetSeed);
        targetAdvances = XDRNG::distance(startingSeed, computedTarget);
        if (targetAdvances > maxAdvances)
        {
            lastError = outsideRange;
            return 0;
        }
        const auto actions = calculateActions(startingSeed, targetAdvances, bruteForceRange);
        if (actions.empty())
        {
            lastError = unobtainable;
            return 0;
        }
        results.assign(actions.begin(), actions.end());
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3jirachi_compute_seed(std::uint32_t seed)
    {
        return computeJirachiSeed(seed);
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3jirachi_target_advances() { return targetAdvances; }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen3jirachi_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3jirachi_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3jirachi_last_error() { return lastError; }
}
