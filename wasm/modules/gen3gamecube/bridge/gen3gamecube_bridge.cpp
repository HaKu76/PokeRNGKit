/*
 * PokeRNGKit Gen III GameCube WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#include "gen3gamecube_bridge.h"

#include <Core/Enum/Game.hpp>
#include <Core/Enum/Method.hpp>
#include <Core/Enum/ShadowType.hpp>
#include <Core/Enum/Shiny.hpp>
#include <Core/Gen3/Generators/GameCubeGenerator.hpp>
#include <Core/Gen3/Searchers/GameCubeSearcher.hpp>
#include <Core/Gen3/ShadowTemplate.hpp>
#include <Core/Gen3/StaticTemplate3.hpp>
#include <Core/Parents/PersonalInfo.hpp>
#include <Core/Parents/States/State.hpp>
#include <algorithm>
#include <array>
#include <vector>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define POKERNGKIT_KEEPALIVE EMSCRIPTEN_KEEPALIVE
#else
#define POKERNGKIT_KEEPALIVE
#endif

namespace
{
    constexpr std::uint32_t apiVersion = 2;
    constexpr std::uint32_t requestWords = 57;
    constexpr std::uint32_t maxGeneratorStates = 100000;
    constexpr std::uint64_t maxSearcherStates = 50000000;
    constexpr std::uint32_t maxResults = 250000;

    enum RequestIndex : std::uint32_t
    {
        Category = 0,
        Version = 1,
        Species = 2,
        Level = 3,
        ShinyLock = 4,
        ShadowLockType = 5,
        LockCount = 6,
        Tid = 7,
        Sid = 8,
        FirstShadowUnset = 9,
        Seed = 10,
        InitialAdvances = 11,
        MaxAdvances = 12,
        Offset = 13,
        ShinyFilter = 14,
        GenderFilter = 15,
        AbilityFilter = 16,
        NatureFilter = 17,
        HiddenPowerFilter = 18,
        IvMinimum = 19,
        IvMaximum = 25,
        BaseStats = 31,
        GenderRatio = 37,
        AbilityOne = 38,
        AbilityTwo = 39,
        Locks = 40,
        PerfectIvValue = 55,
        PerfectIvCount = 56,
    };

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        ResultLimit = 2,
    };

    thread_local std::vector<Gen3GameCubePackedState> results;
    thread_local std::uint32_t lastError = ErrorCode::None;

    struct RequestContext
    {
        std::uint32_t category;
        Game version;
        Shiny shiny;
        ShadowType shadowType;
        std::array<std::uint8_t, 6> minimum;
        std::array<std::uint8_t, 6> maximum;
        std::array<std::uint8_t, 6> stats;
        std::array<bool, 25> natures;
        std::array<bool, 16> powers;
        std::array<LockInfo, 5> locks;
        PersonalInfo personal;
        Profile3 profile;
        StateFilter filter;
        StaticTemplate3 staticTemplate;
        ShadowTemplate shadowTemplate;

        explicit RequestContext(const std::uint32_t *request) :
            category(request[Category]),
            version(static_cast<Game>(request[Version])),
            shiny(static_cast<Shiny>(request[ShinyLock])),
            shadowType(static_cast<ShadowType>(request[ShadowLockType])),
            minimum(readBytes<6>(request + IvMinimum)),
            maximum(readBytes<6>(request + IvMaximum)),
            stats(readBytes<6>(request + BaseStats)),
            natures(readFlags<25>(request[NatureFilter])),
            powers(readFlags<16>(request[HiddenPowerFilter])),
            locks(readLocks(request)),
            personal(stats, { 0, 0 }, { 0, 0, 0 }, static_cast<std::uint8_t>(request[GenderRatio]),
                     { static_cast<std::uint16_t>(request[AbilityOne]), static_cast<std::uint16_t>(request[AbilityTwo]), 0 },
                     1, 0, static_cast<std::uint16_t>(request[Species]), true),
            profile("-", version, static_cast<std::uint16_t>(request[Tid]), static_cast<std::uint16_t>(request[Sid]), false),
            filter(static_cast<std::uint8_t>(request[GenderFilter]), static_cast<std::uint8_t>(request[AbilityFilter]),
                   static_cast<std::uint8_t>(request[ShinyFilter]), 1, 100, 0, 255, 0, 255, false,
                   minimum, maximum, natures, powers),
            staticTemplate(version, static_cast<std::uint16_t>(request[Species]), shiny,
                           static_cast<std::uint8_t>(request[Level]), &personal),
            shadowTemplate(version, static_cast<std::uint16_t>(request[Species]), shiny,
                           static_cast<std::uint8_t>(request[Level]), locks, static_cast<std::int8_t>(request[LockCount]),
                           shadowType, &personal)
        {
        }

    private:
        template <std::size_t Size>
        static std::array<std::uint8_t, Size> readBytes(const std::uint32_t *source)
        {
            std::array<std::uint8_t, Size> values;
            for (std::size_t index = 0; index < Size; index++) values[index] = static_cast<std::uint8_t>(source[index]);
            return values;
        }

        template <std::size_t Size>
        static std::array<bool, Size> readFlags(std::uint32_t mask)
        {
            std::array<bool, Size> values;
            for (std::size_t index = 0; index < Size; index++) values[index] = (mask & (1u << index)) != 0;
            return values;
        }

        static std::array<LockInfo, 5> readLocks(const std::uint32_t *request)
        {
            std::array<LockInfo, 5> values;
            for (std::size_t index = 0; index < values.size(); index++)
            {
                const auto offset = Locks + index * 3;
                values[index] = LockInfo(static_cast<std::uint8_t>(request[offset]),
                                         static_cast<std::uint8_t>(request[offset + 1]),
                                         static_cast<std::uint8_t>(request[offset + 2]));
            }
            return values;
        }
    };

    bool validRequest(const std::uint32_t *request, std::uint32_t wordCount, bool generator)
    {
        if (request == nullptr || wordCount != requestWords || request[Category] > 2
            || (request[Version] != toInt(Game::Gales) && request[Version] != toInt(Game::Colosseum)
                && request[Version] != toInt(Game::GC))
            || request[Species] < 1 || request[Species] > 386 || request[Level] < 1 || request[Level] > 100
            || request[ShinyLock] > toInt(Shiny::Static) || request[ShadowLockType] > 4 || request[LockCount] > 5
            || request[Tid] > 0xffff || request[Sid] > 0xffff || request[FirstShadowUnset] > 1
            || request[ShinyFilter] != 255 && request[ShinyFilter] > 3
            || request[GenderFilter] != 255 && request[GenderFilter] > 1
            || request[AbilityFilter] != 255 && request[AbilityFilter] > 1
            || request[NatureFilter] == 0 || request[NatureFilter] > 0x1ffffff
            || request[HiddenPowerFilter] == 0 || request[HiddenPowerFilter] > 0xffff
            || request[PerfectIvValue] > 31 || request[PerfectIvCount] > 6
            || generator && (request[MaxAdvances] >= maxGeneratorStates
                             || static_cast<std::uint64_t>(request[InitialAdvances]) + request[MaxAdvances]
                                     + request[Offset]
                                 > 0xffffffffULL))
        {
            return false;
        }
        for (std::size_t index = 0; index < 6; index++)
        {
            if (request[IvMinimum + index] > 31 || request[IvMaximum + index] > 31
                || request[IvMinimum + index] > request[IvMaximum + index] || request[BaseStats + index] > 255)
                return false;
        }
        if (!generator)
        {
            std::uint64_t searchStates = 1;
            for (std::size_t index = 0; index < 6; index++)
            {
                searchStates *= request[IvMaximum + index] - request[IvMinimum + index] + 1;
            }
            if (searchStates > maxSearcherStates) return false;
        }
        if (request[GenderRatio] > 255 || request[AbilityOne] > 0xffff || request[AbilityTwo] > 0xffff) return false;
        for (std::size_t index = 0; index < request[LockCount]; index++)
        {
            const auto offset = Locks + index * 3;
            if (request[offset] > 24 || request[offset + 1] > 2 || request[offset + 2] > 255) return false;
        }
        return true;
    }

    template <typename State>
    void pack(const std::vector<State> &states, std::uint32_t perfectIvValue, std::uint32_t perfectIvCount)
    {
        results.reserve(std::min<std::size_t>(states.size(), maxResults));
        for (const auto &state : states)
        {
            const auto ivs = state.getIVs();
            const auto perfect = std::count_if(ivs.begin(), ivs.end(), [perfectIvValue](std::uint8_t iv) {
                return iv >= perfectIvValue;
            });
            if (static_cast<std::uint32_t>(perfect) < perfectIvCount) continue;
            if (results.size() >= maxResults)
            {
                lastError = ErrorCode::ResultLimit;
                break;
            }
            std::uint32_t position;
            if constexpr (requires { state.getSeed(); })
                position = state.getSeed();
            else
                position = state.getAdvances();
            results.push_back({ position, state.getPID(), ivs[0], ivs[1], ivs[2],
                                ivs[3], ivs[4], ivs[5], state.getAbility(), state.getGender(), state.getLevel(),
                                static_cast<std::uint32_t>(state.getNature())
                                    | (static_cast<std::uint32_t>(state.getShiny()) << 8) });
        }
    }
}

static_assert(sizeof(Gen3GameCubePackedState) == 48);

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen3gamecube_api_version()
    {
        return apiVersion;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3gamecube_generate(const std::uint32_t *request, std::uint32_t wordCount)
    {
        results.clear();
        lastError = ErrorCode::None;
        if (!validRequest(request, wordCount, true))
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }

        RequestContext context(request);
        const Method method = context.category == 1 ? Method::Channel : Method::None;
        GameCubeGenerator generator(request[InitialAdvances], request[MaxAdvances], request[Offset], method,
                                    request[FirstShadowUnset] != 0, context.profile, context.filter);
        if (context.category == 2)
            pack(generator.generate(request[Seed], &context.shadowTemplate), request[PerfectIvValue], request[PerfectIvCount]);
        else
            pack(generator.generate(request[Seed], &context.staticTemplate), request[PerfectIvValue], request[PerfectIvCount]);
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3gamecube_search(const std::uint32_t *request, std::uint32_t wordCount)
    {
        results.clear();
        lastError = ErrorCode::None;
        if (!validRequest(request, wordCount, false))
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }

        RequestContext context(request);
        const Method method = context.category == 1 ? Method::Channel : Method::None;
        GameCubeSearcher searcher(method, request[FirstShadowUnset] != 0, context.profile, context.filter);
        if (context.category == 2)
            searcher.startSearch(context.minimum, context.maximum, &context.shadowTemplate);
        else
            searcher.startSearch(context.minimum, context.maximum, &context.staticTemplate);
        pack(searcher.getResults(), request[PerfectIvValue], request[PerfectIvCount]);
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen3gamecube_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3gamecube_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3gamecube_last_error()
    {
        return lastError;
    }
}
