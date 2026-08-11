/*
 * PokeRNGKit Gen III ID WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#include "gen3id_bridge.h"

#include <Core/Gen3/Generators/IDGenerator3.hpp>
#include <Core/Parents/States/IDState.hpp>
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
    constexpr std::uint32_t maxStatesPerCall = 100000;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidMode = 1,
        InvalidInput = 2,
        RangeTooLarge = 3,
    };

    thread_local std::vector<Id3PackedState> results;
    thread_local std::uint32_t lastError = ErrorCode::None;

    std::vector<u16> makeFilter(std::uint32_t flags, std::uint32_t flag, std::uint32_t value)
    {
        if ((flags & flag) == 0)
        {
            return { };
        }

        return { static_cast<u16>(value) };
    }

    void pack(const std::vector<IDState> &states)
    {
        results.clear();
        results.reserve(states.size());

        for (const auto &state : states)
        {
            results.push_back({ state.getAdvances(),
                                static_cast<std::uint32_t>(state.getTID())
                                    | (static_cast<std::uint32_t>(state.getSID()) << 16),
                                state.getTSV() });
        }
    }
}

static_assert(sizeof(Id3PackedState) == 12);

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen3id_api_version()
    {
        return apiVersion;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3id_generate(std::uint32_t mode, std::uint32_t input,
                                                   std::uint32_t initialAdvances, std::uint32_t maxAdvances,
                                                   std::uint32_t filterFlags, std::uint32_t tid,
                                                   std::uint32_t sid, std::uint32_t tsv)
    {
        results.clear();
        lastError = ErrorCode::None;

        if (maxAdvances >= maxStatesPerCall)
        {
            lastError = ErrorCode::RangeTooLarge;
            return 0;
        }

        if (((filterFlags & Id3FilterFlag::FilterTID) != 0 && tid > 0xffff)
            || ((filterFlags & Id3FilterFlag::FilterSID) != 0 && sid > 0xffff)
            || ((filterFlags & Id3FilterFlag::FilterTSV) != 0 && tsv > 0x1fff))
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }

        IDFilter filter(makeFilter(filterFlags, Id3FilterFlag::FilterTID, tid),
                        makeFilter(filterFlags, Id3FilterFlag::FilterSID, sid), { },
                        makeFilter(filterFlags, Id3FilterFlag::FilterTSV, tsv), { }, { });
        IDGenerator3 generator(initialAdvances, maxAdvances, filter);

        switch (static_cast<Id3Mode>(mode))
        {
        case Id3Mode::XDColo:
            pack(generator.generateXDColo(input));
            break;
        case Id3Mode::FRLGE:
            if (input > 0xffff)
            {
                lastError = ErrorCode::InvalidInput;
                return 0;
            }
            pack(generator.generateFRLGE(static_cast<u16>(input)));
            break;
        case Id3Mode::RS:
            if (input > 0xffff)
            {
                lastError = ErrorCode::InvalidInput;
                return 0;
            }
            pack(generator.generateRS(static_cast<u16>(input)));
            break;
        default:
            lastError = ErrorCode::InvalidMode;
            return 0;
        }

        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen3id_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3id_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3id_last_error()
    {
        return lastError;
    }
}
